'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auth = require('../../auth');
const glosariusz = require('../../glosariusz');
const dokumentacja = require('../index');

const SUWEREN = 'andrzej_bogacki';
const HASLO = 'haslo-suwerena-123';
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

const TRESC_STRATEGII = 'Strategia opisuje sieć suwerenną i rolę Avatara w komórce lokalnej.\n';

async function uruchomSrodowisko({ zGlosariuszem = true } = {}) {
    const repo = tmp('dok-http-');
    const katalogDokumentow = path.join(repo, 'docs', 'dokumenty');
    fs.mkdirSync(katalogDokumentow, { recursive: true });
    fs.writeFileSync(path.join(katalogDokumentow, 'strategia.md'), TRESC_STRATEGII, 'utf8');
    const sciezkaManifestu = path.join(katalogDokumentow, 'manifest.json');
    fs.writeFileSync(sciezkaManifestu, JSON.stringify({
        wersja: 1,
        zbudowano_ts: null,
        dokumenty: [{
            id: 'strategia', tytul: 'Strategia testowa', typ: 'strategia',
            status: 'piaskownica', wersja_dokumentu: 'v1', format: 'markdown',
            sciezka: 'docs/dokumenty/strategia.md', hash_zrodla: null, bajty: null,
        }],
    }, null, 2), 'utf8');

    const instancjaAuth = auth.utworzAuth({
        katalogKont: tmp('dok-konta-'), katalogZaproszen: tmp('dok-zapr-'),
    });
    const dok = dokumentacja.utworzDokumentacje({ sciezkaManifestu, katalogRepo: repo });
    dok.podepnijAuth(instancjaAuth);
    await dok.przebudujManifest();

    if (zGlosariuszem) {
        const sciezkaGlosariusza = path.join(repo, 'docs', 'glosariusz.json');
        fs.writeFileSync(sciezkaGlosariusza, JSON.stringify([
            { nazwa: 'Avatar', status: 'piaskownica', wprowadzenie: 'Istota suwerenna.', rozszerzenie: null },
        ]), 'utf8');
        const glo = glosariusz.utworzGlosariusz({
            sciezkaGlosariusza,
            sciezkaIndeksu: path.join(repo, 'docs', 'formy.json'),
            katalogPropozycji: tmp('dok-prop-'),
        });
        await glo.przebudujIndeks();
        dok.podepnijGlosariusz(glo);
    }

    const serwer = http.createServer(async (req, res) => {
        if (await instancjaAuth.obsluzZadanie(req, res)) return;
        if (await dok.obsluzZadanie(req, res)) return;
        res.writeHead(404).end();
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;
    const boot = await instancjaAuth.bootstrapSuwerena();
    await instancjaAuth.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: boot.token_aktywacji, nowe_haslo: HASLO,
    });
    return { serwer, baza, repo };
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

test('dokumentacja http: manifest i treść dokumentu dostępne BEZ sesji (odczyt publiczny)', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const manifest = await zapytaj(baza, 'GET', '/api/dokumentacja/manifest');
        assert.equal(manifest.odpowiedz.status, 200);
        assert.equal(manifest.dane.aktualny, true);
        assert.equal(manifest.dane.dokumenty[0].id, 'strategia');
        assert.equal(manifest.dane.dokumenty[0].typ, 'strategia');

        const dokument = await zapytaj(baza, 'GET', '/api/dokumentacja/dokumenty/strategia');
        assert.equal(dokument.dane.tresc, TRESC_STRATEGII);
        assert.equal(dokument.dane.stempel.status, 'live');

        const brak = await zapytaj(baza, 'GET', '/api/dokumentacja/dokumenty/nie_ma');
        assert.equal(brak.odpowiedz.status, 404);
        assert.equal(brak.dane.status, 'brak_dokumentu');
    } finally {
        serwer.close();
    }
});

test('dokumentacja http: dokument oznaczony terminami podpiętego glosariusza', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const { dane } = await zapytaj(baza, 'GET', '/api/dokumentacja/dokumenty/strategia/oznaczony');
        const trafienie = dane.segmenty.find((s) => s.termin);
        assert.equal(trafienie.termin, 'Avatar');
        assert.equal(trafienie.wprowadzenie, 'Istota suwerenna.');
        // segmenty sklejają się do oryginału co do znaku (wierność treści)
        assert.equal(dane.segmenty.map((s) => s.tekst).join(''), TRESC_STRATEGII);
        assert.equal(dane.tresc, undefined); // oznaczony zwraca segmenty, nie duplikuje treści
    } finally {
        serwer.close();
    }
});

test('dokumentacja http: brak podpiętego glosariusza = jawny status, rdzeń działa', async () => {
    const { serwer, baza } = await uruchomSrodowisko({ zGlosariuszem: false });
    try {
        const oznaczony = await zapytaj(baza, 'GET', '/api/dokumentacja/dokumenty/strategia/oznaczony');
        assert.equal(oznaczony.odpowiedz.status, 503);
        assert.equal(oznaczony.dane.status, 'glosariusz_niepodpiety');

        // odczyt rdzenia niezależny od glosariusza
        const dokument = await zapytaj(baza, 'GET', '/api/dokumentacja/dokumenty/strategia');
        assert.equal(dokument.odpowiedz.status, 200);
    } finally {
        serwer.close();
    }
});

test('dokumentacja http: przebudowa manifestu wymaga sesji; wykrywa zmianę treści', async () => {
    const { serwer, baza, repo } = await uruchomSrodowisko();
    try {
        fs.appendFileSync(path.join(repo, 'docs', 'dokumenty', 'strategia.md'), 'Dopisek.\n', 'utf8');
        let manifest = await zapytaj(baza, 'GET', '/api/dokumentacja/manifest');
        assert.equal(manifest.dane.aktualny, false); // rozjazd hash = jawna nieaktualność

        const bez = await zapytaj(baza, 'POST', '/api/dokumentacja/manifest/przebuduj');
        assert.equal(bez.odpowiedz.status, 401);

        const cookie = await zaloguj(baza);
        const przebudowa = await zapytaj(baza, 'POST', '/api/dokumentacja/manifest/przebuduj', { cookie });
        assert.equal(przebudowa.dane.status, 'przebudowano');
        assert.equal(przebudowa.dane.aktualny, true);
    } finally {
        serwer.close();
    }
});
