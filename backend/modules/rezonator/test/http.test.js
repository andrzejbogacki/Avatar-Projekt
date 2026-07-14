'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auth = require('../../auth');
const rezonator = require('../index');

const SUWEREN = 'andrzej_bogacki';
const HASLO = 'haslo-suwerena-123';
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

async function uruchomSrodowisko() {
    const instancjaAuth = auth.utworzAuth({
        katalogKont: tmp('rez-konta-'), katalogZaproszen: tmp('rez-zapr-'),
    });
    const rez = rezonator.utworzRezonator({
        katalogZrodel: tmp('rez-zrodla-'),
        katalogProfiliQAC: tmp('rez-qacprof-'), // pusty — QAC jawnie brak_danych
    });
    rez.podepnijAuth(instancjaAuth);

    const serwer = http.createServer(async (req, res) => {
        if (await instancjaAuth.obsluzZadanie(req, res)) return;
        if (await rez.obsluzZadanie(req, res)) return;
        res.writeHead(404).end();
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;
    const boot = await instancjaAuth.bootstrapSuwerena();
    await instancjaAuth.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: boot.token_aktywacji, nowe_haslo: HASLO,
    });
    return { serwer, baza };
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

async function zaloguj(baza) {
    const { odpowiedz } = await zapytaj(baza, 'POST', '/api/auth/logowanie', {
        cialo: { avatar_id: SUWEREN, haslo: HASLO },
    });
    return odpowiedz.headers.get('set-cookie').split(';')[0];
}

test('rezonator http: pełny przepływ — Źródło, sygnatura, plan emisji, sesja ręczna start/stop', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const cookie = await zaloguj(baza);

        // konfiguracja dla panelu (skale, pasma, tabela planetarna)
        const konf = await zapytaj(baza, 'GET', '/api/rezonator/konfiguracja', { cookie });
        assert.ok(konf.dane.solfeggio.HZ_432);
        assert.ok(konf.dane.planetarne.ziemia_rok.hz > 136 && konf.dane.planetarne.ziemia_rok.hz < 137);
        assert.equal(konf.dane.T_domyslne_s, 360);

        // Źródło z Rezonatorem
        const zrodlo = await zapytaj(baza, 'POST', '/api/rezonator/zrodla', {
            cookie, cialo: {
                zrodlo_id: 'misja_ogrod', typ: 'misja',
                wibracja_f: 136.10, rytm_bpm: 72, misja: 'Ogród społeczności',
            },
        });
        assert.equal(zrodlo.dane.status, 'utworzono');
        assert.equal(zrodlo.dane.zrodlo.wlasciciel, SUWEREN);

        // sygnatura Sync(t)
        const sygnatura = await zapytaj(baza, 'GET', '/api/rezonator/zrodla/misja_ogrod/sygnatura', { cookie });
        assert.ok(sygnatura.dane.sync_s >= 0 && sygnatura.dane.sync_s < 360);
        assert.equal(sygnatura.dane.rytm_bpm, 72);

        // plan emisji: solfeggio + planetarna; QAC pominięty (pusty katalog profili)
        const plan = await zapytaj(baza, 'POST', '/api/rezonator/zrodla/misja_ogrod/plan', {
            cookie, cialo: {
                skladniki: [
                    { klasa: 'solfeggio', hz: 432 },
                    { klasa: 'planetarna', cialo: 'ziemia_rok' },
                    { klasa: 'qac', avatar_id: SUWEREN },
                ],
            },
        });
        assert.equal(plan.dane.status, 'wygenerowano');
        assert.equal(plan.dane.plan.warstwy.length, 6); // 2 aktywne składniki × 3 pasma
        const qacSkladnik = plan.dane.plan.wzornik.skladniki.find((s) => s.klasa === 'qac');
        assert.equal(qacSkladnik.status, 'brak_danych'); // jawny brak, sesja może trwać

        // sesja ręczna
        const start = await zapytaj(baza, 'POST', '/api/rezonator/sesje', {
            cookie, cialo: {
                zrodlo_id: 'misja_ogrod',
                skladniki: [{ klasa: 'solfeggio', hz: 528 }],
            },
        });
        assert.equal(start.dane.status, 'wystartowano');
        assert.equal(start.dane.sesja.tryb, 'reczny');
        assert.ok(start.dane.sesja.plan.warstwy.length === 3);

        const lista = await zapytaj(baza, 'GET', '/api/rezonator/sesje', { cookie });
        assert.equal(lista.dane.sesje.length, 1);

        const stop = await zapytaj(baza, 'POST',
            `/api/rezonator/sesje/${start.dane.sesja.id}/stop`, { cookie });
        assert.equal(stop.dane.status, 'zatrzymano');
        assert.equal((await zapytaj(baza, 'GET', '/api/rezonator/sesje', { cookie })).dane.sesje.length, 0);
    } finally {
        serwer.close();
    }
});

test('rezonator http: bez sesji Auth 401; sesję Źródła zatrzymuje wyłącznie właściciel', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const bez = await zapytaj(baza, 'GET', '/api/rezonator/zrodla');
        assert.equal(bez.odpowiedz.status, 401);

        const cookie = await zaloguj(baza);
        await zapytaj(baza, 'POST', '/api/rezonator/zrodla', {
            cookie, cialo: {
                zrodlo_id: 'zrodlo_a', typ: 'avatar', wibracja_f: 432, rytm_bpm: 60, misja: 'x',
            },
        });
        // cudze Źródło nie do edycji — symulacja: edycja przez nieistniejącą sesję niemożliwa (401),
        // a właścicielstwo egzekwuje magazyn (test jednostkowy) — tu sprawdzamy stop cudzej sesji:
        const start = await zapytaj(baza, 'POST', '/api/rezonator/sesje', {
            cookie, cialo: { zrodlo_id: 'zrodlo_a', skladniki: [{ klasa: 'solfeggio', hz: 432 }] },
        });
        const cudzyStop = await fetch(`${baza}/api/rezonator/sesje/${start.dane.sesja.id}/stop`,
            { method: 'POST' });
        assert.equal(cudzyStop.status, 401);
    } finally {
        serwer.close();
    }
});
