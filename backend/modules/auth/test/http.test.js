'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const auth = require('../index');

const SUWEREN = konfig.konta.SUWEREN_AVATAR_ID;
const HASLO_SUWERENA = 'haslo-suwerena-123';

async function uruchomSerwer() {
    const instancja = auth.utworzAuth({
        katalogKont: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-http-konta-')),
        katalogZaproszen: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-http-zapr-')),
    });
    const serwer = http.createServer((req, res) => {
        instancja.obsluzZadanie(req, res).then((obsluzone) => {
            if (!obsluzone) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ status: 'nie_znaleziono' }));
            }
        });
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;

    // bootstrap Suwerena przez kontrakt modułu (nie przez HTTP)
    const { token_aktywacji } = await instancja.bootstrapSuwerena();
    await instancja.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: token_aktywacji, nowe_haslo: HASLO_SUWERENA,
    });
    return { serwer, baza, instancja };
}

function cookieZOdpowiedzi(odpowiedz) {
    const naglowek = odpowiedz.headers.get('set-cookie');
    assert.ok(naglowek, 'oczekiwano Set-Cookie');
    assert.match(naglowek, /HttpOnly/);
    return naglowek.split(';')[0];
}

async function zapytaj(baza, metoda, sciezka, { cialo, cookie } = {}) {
    const odpowiedz = await fetch(`${baza}${sciezka}`, {
        method: metoda,
        headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: cialo ? JSON.stringify(cialo) : undefined,
    });
    return { odpowiedz, dane: await odpowiedz.json() };
}

test('http: pełny przepływ — logowanie Suwerena, sesja, zaproszenie, decyzja, aktywacja, logowanie nowego', async () => {
    const { serwer, baza } = await uruchomSerwer();
    try {
        // sesja bez logowania = jawny brak
        const bezSesji = await zapytaj(baza, 'GET', '/api/auth/sesja');
        assert.deepEqual(bezSesji.dane, { status: 'brak_sesji' });

        // logowanie Suwerena
        const logowanie = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
            cialo: { avatar_id: SUWEREN, haslo: HASLO_SUWERENA },
        });
        assert.equal(logowanie.odpowiedz.status, 200);
        assert.equal(logowanie.dane.status, 'zalogowano');
        const cookie = cookieZOdpowiedzi(logowanie.odpowiedz);

        const sesja = await zapytaj(baza, 'GET', '/api/auth/sesja', { cookie });
        assert.deepEqual(sesja.dane, { status: 'aktywna', avatar_id: SUWEREN });

        // propozycja zaproszenia (zapraszający = z sesji)
        const propozycja = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cookie, cialo: { kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'znam osobiście' },
        });
        assert.equal(propozycja.odpowiedz.status, 201);
        const idPropozycji = propozycja.dane.propozycja.id;

        // lista oczekujących (Suweren)
        const lista = await zapytaj(baza, 'GET', '/api/auth/zaproszenia', { cookie });
        assert.equal(lista.dane.propozycje.length, 1);

        // decyzja Suwerena
        const decyzja = await zapytaj(baza, 'POST', `/api/auth/zaproszenia/${idPropozycji}/decyzja`, {
            cookie, cialo: { decyzja: 'zatwierdzona' },
        });
        assert.equal(decyzja.dane.status, 'zatwierdzono');
        const token = decyzja.dane.token_aktywacji;

        // aktywacja nowego konta i logowanie
        const aktywacja = await zapytaj(baza, 'POST', '/api/auth/aktywacja', {
            cialo: { avatar_id: 'jan_kowalski', token, nowe_haslo: 'haslo-jana-1234' },
        });
        assert.equal(aktywacja.dane.status, 'aktywowano');

        const noweLogowanie = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
            cialo: { avatar_id: 'jan_kowalski', haslo: 'haslo-jana-1234' },
        });
        assert.equal(noweLogowanie.dane.status, 'zalogowano');

        // wylogowanie
        const wylogowanie = await zapytaj(baza, 'POST', '/api/auth/wylogowanie', { cookie });
        assert.equal(wylogowanie.dane.status, 'wylogowano');
        const poWylogowaniu = await zapytaj(baza, 'GET', '/api/auth/sesja', { cookie });
        assert.deepEqual(poWylogowaniu.dane, { status: 'brak_sesji' });
    } finally {
        serwer.close();
    }
});

test('http: ochrona endpointów — zaproszenia wymagają sesji, decyzja wymaga Suwerena', async () => {
    const { serwer, baza, instancja } = await uruchomSerwer();
    try {
        // bez sesji
        const bezSesji = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cialo: { kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x' },
        });
        assert.equal(bezSesji.odpowiedz.status, 401);

        // przygotowanie: zwykły Avatar przez pełną ścieżkę
        const suweren = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
            cialo: { avatar_id: SUWEREN, haslo: HASLO_SUWERENA },
        });
        const cookieSuwerena = cookieZOdpowiedzi(suweren.odpowiedz);
        const prop = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cookie: cookieSuwerena, cialo: { kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x' },
        });
        const dec = await zapytaj(baza, 'POST', `/api/auth/zaproszenia/${prop.dane.propozycja.id}/decyzja`, {
            cookie: cookieSuwerena, cialo: { decyzja: 'zatwierdzona' },
        });
        await instancja.usluga_logowania.aktywujKonto({
            avatar_id: 'jan_kowalski', token: dec.dane.token_aktywacji, nowe_haslo: 'haslo-jana-1234',
        });
        const jan = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
            cialo: { avatar_id: 'jan_kowalski', haslo: 'haslo-jana-1234' },
        });
        const cookieJana = cookieZOdpowiedzi(jan.odpowiedz);

        // zwykły Avatar może proponować…
        const propJana = await zapytaj(baza, 'POST', '/api/auth/zaproszenia', {
            cookie: cookieJana, cialo: { kandydat_avatar_id: 'anna_nowak', uzasadnienie: 'x' },
        });
        assert.equal(propJana.odpowiedz.status, 201);

        // …ale nie może listować ani decydować
        const listaJana = await zapytaj(baza, 'GET', '/api/auth/zaproszenia', { cookie: cookieJana });
        assert.equal(listaJana.odpowiedz.status, 403);
        const decyzjaJana = await zapytaj(baza, 'POST',
            `/api/auth/zaproszenia/${propJana.dane.propozycja.id}/decyzja`, {
                cookie: cookieJana, cialo: { decyzja: 'zatwierdzona' },
            });
        assert.equal(decyzjaJana.odpowiedz.status, 403);
    } finally {
        serwer.close();
    }
});

test('http: błędne logowanie zwraca 401 z jawnym statusem', async () => {
    const { serwer, baza } = await uruchomSerwer();
    try {
        const wynik = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
            cialo: { avatar_id: SUWEREN, haslo: 'zle-haslo-1234' },
        });
        assert.equal(wynik.odpowiedz.status, 401);
        assert.equal(wynik.dane.status, 'bledne_dane');
    } finally {
        serwer.close();
    }
});

test('kontrakt: bootstrapSuwerena odmawia, gdy istnieje jakiekolwiek konto', async () => {
    const instancja = auth.utworzAuth({
        katalogKont: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-boot-')),
        katalogZaproszen: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-boot-zapr-')),
    });
    const pierwszy = await instancja.bootstrapSuwerena();
    assert.equal(pierwszy.status, 'utworzono');
    assert.equal(pierwszy.avatar_id, SUWEREN);
    assert.match(pierwszy.token_aktywacji, /^[0-9a-f]+$/);
    const drugi = await instancja.bootstrapSuwerena();
    assert.equal(drugi.status, 'odmowa');
});
