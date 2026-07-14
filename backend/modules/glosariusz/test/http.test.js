'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auth = require('../../auth');
const glosariusz = require('../index');

const SUWEREN = 'andrzej_bogacki';
const HASLO = 'haslo-suwerena-123';
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

const TERMINY_STARTOWE = [
    { nazwa: 'Avatar', status: 'piaskownica', wprowadzenie: 'Istota suwerenna.', rozszerzenie: 'Pełny opis Avatara.' },
];

async function uruchomSrodowisko() {
    const katalog = tmp('glo-dane-');
    const sciezkaGlosariusza = path.join(katalog, 'glosariusz.json');
    fs.writeFileSync(sciezkaGlosariusza, JSON.stringify(TERMINY_STARTOWE, null, 2), 'utf8');

    const instancjaAuth = auth.utworzAuth({
        katalogKont: tmp('glo-konta-'), katalogZaproszen: tmp('glo-zapr-'),
    });
    const glo = glosariusz.utworzGlosariusz({
        sciezkaGlosariusza,
        sciezkaIndeksu: path.join(katalog, 'formy.json'),
        katalogPropozycji: tmp('glo-prop-'),
    });
    glo.podepnijAuth(instancjaAuth);
    await glo.przebudujIndeks();

    const serwer = http.createServer(async (req, res) => {
        if (await instancjaAuth.obsluzZadanie(req, res)) return;
        if (await glo.obsluzZadanie(req, res)) return;
        res.writeHead(404).end();
    });
    await new Promise((r) => serwer.listen(0, r));
    const baza = `http://localhost:${serwer.address().port}`;
    const boot = await instancjaAuth.bootstrapSuwerena();
    await instancjaAuth.usluga_logowania.aktywujKonto({
        avatar_id: SUWEREN, token: boot.token_aktywacji, nowe_haslo: HASLO,
    });
    return { serwer, baza, sciezkaGlosariusza };
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

test('glosariusz http: odczyt i skanowanie działają BEZ sesji (moduł bez zależności od Auth)', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const terminy = await zapytaj(baza, 'GET', '/api/glosariusz/terminy');
        assert.equal(terminy.odpowiedz.status, 200);
        assert.equal(terminy.dane.terminy[0].nazwa, 'Avatar');

        const pelny = await zapytaj(baza, 'GET', `/api/glosariusz/terminy/${encodeURIComponent('Avatar')}`);
        assert.equal(pelny.dane.rozszerzenie, 'Pełny opis Avatara.');

        const oznacz = await zapytaj(baza, 'POST', '/api/glosariusz/oznacz', {
            cialo: { tekst: 'Rozmowa o Avatarze trwa.' },
        });
        const trafienie = oznacz.dane.segmenty.find((s) => s.termin);
        assert.equal(trafienie.termin, 'Avatar');
        assert.equal(trafienie.wprowadzenie, 'Istota suwerenna.'); // hover
        assert.equal(oznacz.dane.indeks.aktualny, true);
        assert.equal(oznacz.dane.indeks.silnik, 'regulowy');
    } finally {
        serwer.close();
    }
});

test('glosariusz http: dwufazowo — propozycja (sesja) → zatwierdzenie Suwerena → zapis + przebudowa indeksu', async () => {
    const { serwer, baza, sciezkaGlosariusza } = await uruchomSrodowisko();
    try {
        // propozycja bez sesji = 401 (tożsamość proponującego konieczna)
        const bez = await zapytaj(baza, 'POST', '/api/glosariusz/propozycje', {
            cialo: { nazwa: 'Gebo', wprowadzenie: 'Wymiana jako równowaga.', rozszerzenie: null },
        });
        assert.equal(bez.odpowiedz.status, 401);

        const cookie = await zaloguj(baza);
        const prop = await zapytaj(baza, 'POST', '/api/glosariusz/propozycje', {
            cookie, cialo: { nazwa: 'Gebo', wprowadzenie: 'Wymiana jako równowaga.', rozszerzenie: 'Zero długu.' },
        });
        assert.equal(prop.dane.status, 'zapisano');

        // przed zatwierdzeniem: terminu nie ma, skan go nie wykrywa
        let oznacz = await zapytaj(baza, 'POST', '/api/glosariusz/oznacz', {
            cialo: { tekst: 'Zasada Gebo obowiązuje.' },
        });
        assert.equal(oznacz.dane.segmenty.filter((s) => s.termin).length, 0);

        const decyzja = await zapytaj(baza, 'POST',
            `/api/glosariusz/propozycje/${prop.dane.propozycja.id}/decyzja`, {
                cookie, cialo: { decyzja: 'zatwierdzona' },
            });
        assert.equal(decyzja.dane.status, 'zatwierdzono');
        assert.equal(decyzja.dane.indeks_przebudowany, true); // zapis = wyzwalacz przebudowy

        // termin zapisany w glosariuszu, indeks wykrywa formę odmienioną
        const zapisane = JSON.parse(fs.readFileSync(sciezkaGlosariusza, 'utf8'));
        assert.ok(zapisane.some((t) => t.nazwa === 'Gebo'));
        oznacz = await zapytaj(baza, 'POST', '/api/glosariusz/oznacz', {
            cialo: { tekst: 'Rozmowa o Gebo i zasadach Geba.' },
        });
        assert.ok(oznacz.dane.segmenty.some((s) => s.termin === 'Gebo'));
    } finally {
        serwer.close();
    }
});

test('glosariusz http: decyzja wyłącznie Suwerena; propozycja rozstrzygnięta nie wraca', async () => {
    const { serwer, baza } = await uruchomSrodowisko();
    try {
        const cookie = await zaloguj(baza);
        // drugi avatar przez zaproszenie nie jest tu potrzebny — sprawdzamy kontrakt usługi:
        const prop = await zapytaj(baza, 'POST', '/api/glosariusz/propozycje', {
            cookie, cialo: { nazwa: 'Wzornik', wprowadzenie: 'Matryca organizująca.', rozszerzenie: null },
        });
        const lista = await zapytaj(baza, 'GET', '/api/glosariusz/propozycje', { cookie });
        assert.equal(lista.dane.propozycje.length, 1);

        await zapytaj(baza, 'POST', `/api/glosariusz/propozycje/${prop.dane.propozycja.id}/decyzja`, {
            cookie, cialo: { decyzja: 'odrzucona' },
        });
        const ponownie = await zapytaj(baza, 'POST',
            `/api/glosariusz/propozycje/${prop.dane.propozycja.id}/decyzja`, {
                cookie, cialo: { decyzja: 'zatwierdzona' },
            });
        assert.equal(ponownie.dane.status, 'odmowa');
        assert.equal((await zapytaj(baza, 'GET', '/api/glosariusz/propozycje', { cookie }))
            .dane.propozycje.length, 0);
    } finally {
        serwer.close();
    }
});

test('glosariusz http: status indeksu — zgodność hash ze źródłem', async () => {
    const { serwer, baza, sciezkaGlosariusza } = await uruchomSrodowisko();
    try {
        let status = await zapytaj(baza, 'GET', '/api/glosariusz/indeks');
        assert.equal(status.dane.aktualny, true);

        // ręczna zmiana źródła poza bramką = jawna nieaktualność indeksu
        const terminy = JSON.parse(fs.readFileSync(sciezkaGlosariusza, 'utf8'));
        terminy.push({ nazwa: 'Obcy', status: 'piaskownica', wprowadzenie: 'x', rozszerzenie: null });
        fs.writeFileSync(sciezkaGlosariusza, JSON.stringify(terminy), 'utf8');

        status = await zapytaj(baza, 'GET', '/api/glosariusz/indeks');
        assert.equal(status.dane.aktualny, false);
    } finally {
        serwer.close();
    }
});
