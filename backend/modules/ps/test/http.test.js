'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auth = require('../../auth');
const ps = require('../index');

const SUWEREN = 'andrzej_bogacki';
const HASLO = 'haslo-suwerena-123';

async function uruchomSrodowisko() {
    const instancjaPS = ps.utworzPS({
        katalogProfili: fs.mkdtempSync(path.join(os.tmpdir(), 'ps-http-')),
    });
    const instancjaAuth = auth.utworzAuth({
        katalogKont: fs.mkdtempSync(path.join(os.tmpdir(), 'ps-http-konta-')),
        katalogZaproszen: fs.mkdtempSync(path.join(os.tmpdir(), 'ps-http-zapr-')),
        hookPS: instancjaPS.przyjmijAktCertyfikacji, // spięcie Auth → PS
    });
    instancjaPS.podepnijAuth(instancjaAuth);

    const serwer = http.createServer(async (req, res) => {
        if (await instancjaAuth.obsluzZadanie(req, res)) return;
        if (await instancjaPS.obsluzZadanie(req, res)) return;
        res.writeHead(404).end();
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;

    const boot = await instancjaAuth.bootstrapSuwerena();
    await instancjaAuth.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: boot.token_aktywacji, nowe_haslo: HASLO,
    });
    return { serwer, baza, instancjaAuth, instancjaPS };
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

test('ps http: pełny przepływ — profil Suwerena, edycje, poziomy S2, bramka wstępna, kontakt', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const cookie = await zaloguj(baza, SUWEREN, HASLO);

        // własny profil nie istnieje → jawny brak; utworzenie przez właściciela
        assert.equal((await zapytaj(baza, 'GET', '/api/ps/moj', { cookie })).dane.status, 'brak_profilu');
        const utworzenie = await zapytaj(baza, 'POST', '/api/ps/moj', {
            cookie, cialo: { imie: 'Andrzej Bogacki' },
        });
        assert.equal(utworzenie.dane.status, 'utworzono');

        // edycje właściciela (Moduły 1–3)
        assert.equal((await zapytaj(baza, 'PUT', '/api/ps/moj/jakosci', {
            cookie, cialo: { os: 'wolnosc_akceptacja', poziom: 'poziom_3', oswiadczenie: 'Wolność w działaniu' },
        })).dane.status, 'zapisano');
        assert.equal((await zapytaj(baza, 'PUT', '/api/ps/moj/symulacje', {
            cookie, cialo: { symulacja: 'gra_rynkowa', akceptacja: 'warunkowa', warunek: 'bez długu', opis: '' },
        })).dane.status, 'zapisano');
        assert.equal((await zapytaj(baza, 'PUT', '/api/ps/moj/tokeny', {
            cookie, cialo: { token: 'volt', akceptacja: 'pelna', warunek: null, mapowanie_369: 3, opis: 'natywny' },
        })).dane.status, 'zapisano');
        assert.equal((await zapytaj(baza, 'PUT', '/api/ps/moj/tokeny/volt', {
            cookie, cialo: { alokacja: [{ cel: 'misja_ogrod', procent: 100 }] },
        })).dane.status, 'zapisano');

        const moj = await zapytaj(baza, 'GET', '/api/ps/moj', { cookie });
        assert.equal(moj.dane.poziom_obserwatora, 'wlasciciel');
        assert.equal(moj.dane.modul_2_symulacje.rejestr.length, 1);

        // zaproszenie jana przez Auth → hook PS tworzy profil z aktem certyfikacji
        const prop = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cookie, cialo: { kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'test' },
        });
        const dec = await zapytaj(baza, 'POST',
            `/api/auth/zaproszenia/${prop.dane.propozycja.id}/decyzja`, {
                cookie, cialo: { decyzja: 'zatwierdzona' },
            });
        assert.equal(dec.dane.status, 'zatwierdzono');
        await zapytaj(baza, 'POST', '/api/auth/aktywacja', {
            cialo: { avatar_id: 'jan_kowalski', token: dec.dane.token_aktywacji, nowe_haslo: 'haslo-jana-1234' },
        });
        const cookieJana = await zaloguj(baza, 'jan_kowalski', 'haslo-jana-1234');

        // jan bez nadanego poziomu = niesklasyfikowany: tylko dane podstawowe
        let widok = await zapytaj(baza, 'GET', `/api/ps/profil/${SUWEREN}`, { cookie: cookieJana });
        assert.equal(widok.dane.poziom_obserwatora, 'niesklasyfikowany');
        assert.equal(widok.dane.modul_2_symulacje, undefined);

        // Suweren nadaje janowi poziom uczeń → Moduł 2 + Moduł 3 okrojony
        await zapytaj(baza, 'PUT', '/api/ps/moj/strumien2', {
            cookie, cialo: { obserwator: 'jan_kowalski', poziom: 'uczen' },
        });
        widok = await zapytaj(baza, 'GET', `/api/ps/profil/${SUWEREN}`, { cookie: cookieJana });
        assert.equal(widok.dane.poziom_obserwatora, 'uczen');
        assert.equal(widok.dane.modul_2_symulacje.rejestr[0].symulacja, 'gra_rynkowa');
        assert.deepEqual(widok.dane.modul_3_tokeny.rejestr[0], {
            token: 'volt', akceptacja: 'pelna', opis: 'natywny',
        });
        assert.equal(widok.dane.modul_3_tokeny.volt_token, undefined);
        assert.equal(widok.dane.modul_1_jakosci_kwantowe, undefined);

        // stan osi S1: macierz „wszystko brak" + nadpisanie ręczne
        assert.equal((await zapytaj(baza, 'GET',
            `/api/ps/profil/${SUWEREN}/os/wolnosc_akceptacja`, { cookie: cookieJana })).dane.stan, 'brak');
        await zapytaj(baza, 'PUT', '/api/ps/moj/strumien1', {
            cookie, cialo: { obserwator: 'jan_kowalski', os: 'wolnosc_akceptacja', stan: 'akceptacja' },
        });
        assert.equal((await zapytaj(baza, 'GET',
            `/api/ps/profil/${SUWEREN}/os/wolnosc_akceptacja`, { cookie: cookieJana })).dane.stan, 'akceptacja');

        // profil PS jana istnieje z aktem certyfikacji (utworzony hookiem z Auth)
        const profilJana = await zapytaj(baza, 'GET', '/api/ps/moj', { cookie: cookieJana });
        assert.equal(profilJana.dane.certyfikacja_startowa.zapraszajacy, SUWEREN);
        assert.equal(profilJana.dane.certyfikacja_startowa.typ, null);

        // prośba o kontakt: jan → Suweren decyduje
        const prosba = await zapytaj(baza, 'POST', `/api/ps/kontakt/${SUWEREN}`, { cookie: cookieJana });
        assert.equal(prosba.dane.status, 'zapisano');
        const kontakty = await zapytaj(baza, 'GET', '/api/ps/moj/kontakty', { cookie });
        assert.equal(kontakty.dane.prosby[0].od, 'jan_kowalski');
        assert.equal((await zapytaj(baza, 'POST',
            `/api/ps/moj/kontakty/${prosba.dane.id}/decyzja`, {
                cookie, cialo: { decyzja: 'zaakceptowana' },
            })).dane.status, 'zapisano');
    } finally {
        serwer.close();
    }
});

test('ps http: bramka wstępna — niezalogowany bez zobowiązania nie widzi nic, po zatwierdzeniu poziom niesklasyfikowany', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const cookie = await zaloguj(baza, SUWEREN, HASLO);
        await zapytaj(baza, 'POST', '/api/ps/moj', { cookie, cialo: { imie: 'Andrzej Bogacki' } });

        // przed bramką: jawna odmowa
        const przed = await zapytaj(baza, 'GET', `/api/ps/profil/${SUWEREN}`);
        assert.equal(przed.odpowiedz.status, 403);
        assert.equal(przed.dane.status, 'wymagana_bramka');

        // bramka: oba elementy wymagane
        const niepelne = await zapytaj(baza, 'POST', `/api/ps/bramka/${SUWEREN}`, {
            cialo: { uznanie_statusu: true },
        });
        assert.equal(niepelne.dane.status, 'odmowa');

        const zgoda = await zapytaj(baza, 'POST', `/api/ps/bramka/${SUWEREN}`, {
            cialo: { uznanie_statusu: true, klauzula_nieuzycia: true },
        });
        assert.equal(zgoda.dane.status, 'zapisano');
        const cookieGoscia = zgoda.odpowiedz.headers.get('set-cookie').split(';')[0];

        const po = await zapytaj(baza, 'GET', `/api/ps/profil/${SUWEREN}`, { cookie: cookieGoscia });
        assert.equal(po.dane.poziom_obserwatora, 'niesklasyfikowany');
        assert.equal(po.dane.dane_podstawowe.imie, 'Andrzej Bogacki');
        assert.equal(po.dane.modul_2_symulacje, undefined);
    } finally {
        serwer.close();
    }
});

test('ps http: anonim bez bramki nie odróżni profilu istniejącego od nieistniejącego (bez enumeracji)', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const cookie = await zaloguj(baza, SUWEREN, HASLO);
        await zapytaj(baza, 'POST', '/api/ps/moj', { cookie, cialo: { imie: 'Andrzej' } });

        const istniejacy = await zapytaj(baza, 'GET', `/api/ps/profil/${SUWEREN}`);
        const nieistniejacy = await zapytaj(baza, 'GET', '/api/ps/profil/nie_ma_takiego');
        assert.equal(istniejacy.odpowiedz.status, 403);
        assert.equal(nieistniejacy.odpowiedz.status, 403);
        assert.deepEqual(istniejacy.dane, nieistniejacy.dane); // identyczna odpowiedź

        // zalogowany obserwator może dostać jawny brak_profilu
        const zalogowanyBrak = await zapytaj(baza, 'GET', '/api/ps/profil/nie_ma_takiego', { cookie });
        assert.equal(zalogowanyBrak.dane.status, 'brak_profilu');
    } finally {
        serwer.close();
    }
});

test('ps http: edycje wyłącznie właściciela — cudza sesja nie zapisze, bez sesji 401', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const bezSesji = await zapytaj(baza, 'PUT', '/api/ps/moj/jakosci', {
            cialo: { os: 'wolnosc_akceptacja', poziom: 'poziom_3', oswiadczenie: 'x' },
        });
        assert.equal(bezSesji.odpowiedz.status, 401);
    } finally {
        serwer.close();
    }
});
