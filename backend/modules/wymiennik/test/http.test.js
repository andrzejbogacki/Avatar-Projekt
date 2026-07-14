'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auth = require('../../auth');
const psModul = require('../../ps');
const wymiennik = require('../index');

const SUWEREN = 'andrzej_bogacki';
const HASLO = 'haslo-suwerena-123';

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

async function uruchomSrodowisko() {
    const ps = psModul.utworzPS({ katalogProfili: tmp('wymh-ps-') });
    const instancjaAuth = auth.utworzAuth({
        katalogKont: tmp('wymh-konta-'),
        katalogZaproszen: tmp('wymh-zapr-'),
        hookPS: ps.przyjmijAktCertyfikacji,
    });
    ps.podepnijAuth(instancjaAuth);
    const wym = wymiennik.utworzWymiennik({
        katalogTokenow: tmp('wymh-tok-'),
        katalogSald: tmp('wymh-sal-'),
        katalogTransakcji: tmp('wymh-trans-'),
        katalogOfert: tmp('wymh-ofe-'),
    });
    wym.podepnijAuth(instancjaAuth);
    wym.podepnijPS(ps);

    const serwer = http.createServer(async (req, res) => {
        if (await instancjaAuth.obsluzZadanie(req, res)) return;
        if (await ps.obsluzZadanie(req, res)) return;
        if (await wym.obsluzZadanie(req, res)) return;
        res.writeHead(404).end();
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;

    // konta: suweren + jan (przez pełną ścieżkę zaproszenia)
    const boot = await instancjaAuth.bootstrapSuwerena();
    await instancjaAuth.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: boot.token_aktywacji, nowe_haslo: HASLO,
    });
    return { serwer, baza, instancjaAuth, ps };
}

async function zapytaj(baza, metoda, sciezka, { cialo, cookie } = {}) {
    const odpowiedz = await fetch(`${baza}${sciezka}`, {
        method: metoda,
        headers: {
            ...(cialo ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: cialo ? JSON.stringify(cialo) : undefined,
    });
    return { odpowiedz, dane: await odpowiedz.json() };
}

async function zaloguj(baza, avatar_id, haslo) {
    const { odpowiedz } = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
        cialo: { avatar_id, haslo },
    });
    return odpowiedz.headers.get('set-cookie').split(';')[0];
}

test('wymiennik http: pełny przepływ — vouchery, akceptacje PS, oferta publiczna, rozliczenie', async () => {
    const { serwer, baza, instancjaAuth } = await uruchomSrodowisko();
    try {
        const cs = await zaloguj(baza, SUWEREN, HASLO);

        // drugi avatar przez zaproszenie
        const prop = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cookie: cs, cialo: { kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x' },
        });
        const dec = await zapytaj(baza, 'POST',
            `/api/auth/zaproszenia/${prop.dane.propozycja.id}/decyzja`, {
                cookie: cs, cialo: { decyzja: 'zatwierdzona' },
            });
        await instancjaAuth.usluga_logowania.aktywujKonto({
            avatar_id: 'jan_kowalski', token: dec.dane.token_aktywacji, nowe_haslo: 'haslo-jana-1234',
        });
        const cj = await zaloguj(baza, 'jan_kowalski', 'haslo-jana-1234');

        // profil PS suwerena przez HTTP (profil jana powstał hookiem z zaproszenia)
        await zapytaj(baza, 'POST', '/api/ps/moj', { cookie: cs, cialo: { imie: 'Andrzej' } });

        // vouchery osobiste obu stron + emisja
        for (const [cookie, id, nazwa] of [[cs, 'voucher_andrzej', 'Mentoring'], [cj, 'voucher_jan', 'Stolarka']]) {
            const utworzony = await zapytaj(baza, 'POST', '/api/wymiennik/tokeny', {
                cookie, cialo: {
                    token_id: id, nazwa, opis: '', klasa: 'avatar',
                    podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
                },
            });
            assert.equal(utworzony.dane.status, 'utworzono');
            const emisja = await zapytaj(baza, 'POST', `/api/wymiennik/tokeny/${id}/emisja`, {
                cookie, cialo: { ilosc: 5 },
            });
            assert.equal(emisja.dane.status, 'wyemitowano');
        }

        // akceptacje PS: obie strony akceptują oba tokeny (przez API PS)
        for (const cookie of [cs, cj]) {
            for (const token of ['voucher_andrzej', 'voucher_jan']) {
                await zapytaj(baza, 'PUT', '/api/ps/moj/tokeny', {
                    cookie, cialo: { token, akceptacja: 'pelna', warunek: null, mapowanie_369: null, opis: '' },
                });
            }
        }

        // oferta publiczna suwerena → jan przyjmuje → rozliczenie automatyczne
        const oferta = await zapytaj(baza, 'POST', '/api/wymiennik/oferty', {
            cookie: cs, cialo: {
                oddaje: { token_id: 'voucher_andrzej', ilosc: 2 },
                oczekuje: { token_id: 'voucher_jan', ilosc: 2 },
                opis: 'mentoring za stolarkę', tryb: 'system',
            },
        });
        assert.equal(oferta.dane.status, 'zapisano');
        const lista = await zapytaj(baza, 'GET', '/api/wymiennik/oferty', { cookie: cj });
        assert.equal(lista.dane.oferty.length, 1);

        const przyjecie = await zapytaj(baza, 'POST',
            `/api/wymiennik/oferty/${oferta.dane.oferta.id}/przyjmij`, { cookie: cj });
        assert.equal(przyjecie.dane.status, 'rozliczona');

        const saldaJana = await zapytaj(baza, 'GET', '/api/wymiennik/moje/salda', { cookie: cj });
        assert.equal(saldaJana.dane.salda.voucher_andrzej, 2);
        assert.equal(saldaJana.dane.salda.voucher_jan, 3);

        const transakcje = await zapytaj(baza, 'GET', '/api/wymiennik/moje/transakcje', { cookie: cj });
        assert.equal(transakcje.dane.transakcje.length, 1);
        assert.equal(transakcje.dane.transakcje[0].status, 'rozliczona');
    } finally {
        serwer.close();
    }
});

test('wymiennik http: bez sesji 401; kurs 1:1 egzekwowany przez API', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const bez = await zapytaj(baza, 'GET', '/api/wymiennik/moje/salda');
        assert.equal(bez.odpowiedz.status, 401);

        const cs = await zaloguj(baza, SUWEREN, HASLO);
        await zapytaj(baza, 'POST', '/api/wymiennik/tokeny', {
            cookie: cs, cialo: {
                token_id: 'voucher_andrzej', nazwa: 'Mentoring', opis: '', klasa: 'avatar',
                podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
            },
        });
        await zapytaj(baza, 'POST', '/api/wymiennik/tokeny', {
            cookie: cs, cialo: {
                token_id: 'voucher_obcy', nazwa: 'x', opis: '', klasa: 'wewnetrzny',
                podaz: { typ: 'stala', wielkosc: 10 }, podzielnosc: 0, mapowanie_369: null,
            },
        });
        // avatar↔avatar wymaga równych ilości — tu drugi token nie jest avatar, więc przejdzie walidację kursu,
        // ale nierówny avatar↔avatar musi zostać odrzucony:
        await zapytaj(baza, 'POST', '/api/wymiennik/tokeny', {
            cookie: cs, cialo: {
                token_id: 'voucher_bis', nazwa: 'y', opis: '', klasa: 'avatar',
                podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
            },
        });
        // (drugi token avatar tego samego emitenta — odmowa "jeden na Avatara")
        const transakcja = await zapytaj(baza, 'POST', '/api/wymiennik/transakcje', {
            cookie: cs, cialo: {
                do: 'jan_kowalski',
                oddaje: { token_id: 'voucher_andrzej', ilosc: 3 },
                oczekuje: { token_id: 'voucher_andrzej', ilosc: 2 },
                tryb: 'system',
            },
        });
        assert.equal(transakcja.dane.status, 'odmowa');
        assert.match(transakcja.dane.powod, /1:1/);
    } finally {
        serwer.close();
    }
});
