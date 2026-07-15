'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const qac = require('../index');
const { BuforSrodowiskowy } = require('../cache');

// Syntetyczny silnik o kształcie kontraktu kalkulatora — pełny przebieg
// bez plików efemeryd (rzeczywisty silnik testowany w calculator.test.js).
function pozycja(dlugosc, predkosc = 0.1) {
    return {
        dlugosc_ekliptyczna_deg: dlugosc,
        szerokosc_ekliptyczna_deg: 0.5,
        odleglosc_au: 1.2,
        predkosc_dlugosci_deg_d: predkosc,
    };
}

const silnikSyntetyczny = {
    obliczDaneSurowe({ czas_utc, obserwator }) {
        const pozycje = {
            slonce: pozycja(84.1),
            pluton: pozycja(223.4, 0.01),
            wezel_polnocny: pozycja(310.2, -0.05),
            chiron: pozycja(8.4, 0.03),
        };
        const pozycjeNieswiadome = {
            slonce: pozycja(356.1),
            pluton: pozycja(222.9, 0.01),
            wezel_polnocny: pozycja(314.8, -0.05),
            chiron: pozycja(7.9, 0.03),
        };
        const aktywuj = (zbior) =>
            Object.fromEntries(
                Object.entries(zbior).map(([c, p]) => [c, qac.kalkulator.kwantyzuj(p.dlugosc_ekliptyczna_deg)])
            );
        return {
            czas: { jd_et: 2448057.855, jd_ut: 2448057.854, delta_t_s: 57.3, skala: 'TT (test)' },
            obserwator,
            forma_swiadoma: { jd_et: 2448057.855, pozycje, aktywacje: aktywuj(pozycje) },
            forma_nieswiadoma: { jd_et: 2447967.1, pozycje: pozycjeNieswiadome, aktywacje: aktywuj(pozycjeNieswiadome) },
        };
    },
};

const daneWejsciowe = {
    avatar_id: 'andrzej_bogacki',
    czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
    strefa: 'Europe/Warsaw',
    obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
    miejsce: 'Warszawa, Polska',
};

test('profil: pełny przebieg z buforem — schemat, stemple, zapis przez bramkę 9b', async () => {
    const zrodloZywe = {
        klucz: 'kp',
        async pobierz() { return { zrodlo: 'NOAA Kp', wartosc: { kp: 3 } }; },
    };
    const zrodloMartwe = {
        klucz: 'schumann',
        async pobierz() { throw new Error('endpoint niezdefiniowany (O5)'); },
    };
    const bufor = await new BuforSrodowiskowy({ zrodla: [zrodloZywe, zrodloMartwe] }).inicjalizuj();
    await bufor.odswiez();

    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-pipeline-'));
    const { profil, sciezka } = await qac.generujProfil(daneWejsciowe, {
        bufor,
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });

    // nagłówek rozszerzony
    assert.equal(profil.naglowek.avatar_id, 'andrzej_bogacki');
    assert.equal(profil.naglowek.adres_rejestru, 'modul.qac');
    assert.equal(profil.naglowek.wersja_schematu, '1.1.0');
    assert.equal(profil.naglowek.status, 'piaskownica');
    assert.ok(profil.naglowek.wygenerowano);

    // dane surowe: czas TDB/TT + ΔT + pozycje topocentryczne obu form
    assert.equal(profil.dane_surowe.czas.delta_t_s, 57.3);
    assert.ok(profil.dane_surowe.forma_swiadoma.pozycje.slonce);
    assert.ok(profil.dane_surowe.forma_nieswiadoma.jd_et < profil.dane_surowe.forma_swiadoma.jd_et);

    // aktywacje obu form
    assert.ok(profil.aktywacje.forma_swiadoma.slonce.bramka >= 1);
    assert.ok(profil.aktywacje.forma_nieswiadoma.slonce.bramka >= 1);

    // mapa 369: wektor 12D + stemple per parametr (żywy i odrzucony)
    assert.equal(profil.mapa_369.wektor_czestotliwosci_12d.length, 12);
    assert.equal(profil.mapa_369.stemple_srodowiskowe.kp.status, 'live');
    assert.equal(profil.mapa_369.stemple_srodowiskowe.schumann.status, 'stale');
    assert.match(profil.mapa_369.stemple_srodowiskowe.schumann.odrzucony_przez, /regulator9/);

    // macierz relacyjna przygotowana pod kompozyty i phase-locking
    assert.equal(profil.macierz_relacyjna.status, 'przygotowana');
    assert.deepEqual(profil.macierz_relacyjna.wektor_12d, profil.mapa_369.wektor_czestotliwosci_12d);

    // zapis przez bramkę: czysty JSON UTF-8 pod kluczem avatar_id
    assert.equal(path.basename(sciezka), 'andrzej_bogacki.json');
    const zapisany = JSON.parse(fs.readFileSync(sciezka, 'utf8'));
    assert.deepEqual(zapisany.naglowek.avatar_id, profil.naglowek.avatar_id);

    await bufor.zamknij();
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil: regulator 9b zatrzymuje przebieg przy złym avatar_id', async () => {
    await assert.rejects(
        () => qac.generujProfil({ ...daneWejsciowe, avatar_id: 'Zły-Format' }, { silnik: silnikSyntetyczny, zapisz: false }),
        /Regulator 9b odrzucił/
    );
});

test('profil: brak bufora = pusta migawka, stemple bez konfabulacji', async () => {
    const { profil } = await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny,
        zapisz: false,
    });
    assert.deepEqual(profil.mapa_369.stemple_srodowiskowe, {});
    assert.equal(profil.mapa_369.czynnik_modulacji, 1);
});

test('kontrakt modułu: eksportowane wyłącznie jawne kanały', () => {
    assert.deepEqual(
        Object.keys(qac).sort(),
        // wczytajProfil: odczyt zapisanego profilu dla klientów QAC (Rezonator) — ADR-005
        // listujAvatary/usunProfil: kontrakty listowania i usuwania (kosz) — zadanie 4
        [
            'generujProfil', 'inicjalizujBufor', 'kalkulator', 'konfiguracja', 'qrt',
            'regulator9', 'wczytajProfil', 'listujAvatary', 'usunProfil',
        ].sort()
    );
    assert.equal(typeof qac.qrt.zlecRektyfikacje, 'function');
    assert.equal(typeof qac.wczytajProfil, 'function');
    assert.equal(typeof qac.listujAvatary, 'function');
    assert.equal(typeof qac.usunProfil, 'function');
});

// --- Regulator 9b: walidacja wejścia po przejściu na czas lokalny ---

const wejscieMinimalne = () => ({
    avatar_id: 'jan_kowalski',
    czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
    strefa: 'Europe/Warsaw',
    obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
});

test('regulator 9b: poprawne wejście z czasem lokalnym przechodzi', () => {
    assert.deepEqual(qac.regulator9.walidujDaneWejsciowe(wejscieMinimalne()), { poprawne: true });
});

test('regulator 9b: miejsce jest opcjonalne', () => {
    const dane = { ...wejscieMinimalne(), miejsce: 'Warszawa, Polska' };
    assert.deepEqual(qac.regulator9.walidujDaneWejsciowe(dane), { poprawne: true });
});

test('regulator 9b: brak strefy odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.strefa;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /strefa/);
});

test('regulator 9b: nieznana strefa odrzucona — bez cichego Europe/Warsaw', () => {
    const dane = { ...wejscieMinimalne(), strefa: 'Europe/Gdansk' };
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /Europe\/Gdansk/);
});

test('regulator 9b: brak czas_lokalny odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.czas_lokalny;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /czas_lokalny/);
});

test('regulator 9b: niepełny czas_lokalny odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.czas_lokalny.minuta;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /czas_lokalny\.minuta/);
});

test('regulator 9b: puste miejsce odrzucone', () => {
    const dane = { ...wejscieMinimalne(), miejsce: '   ' };
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /miejsce/);
});

test('regulator 9b: zwraca wszystkie braki naraz', () => {
    assert.throws(
        () => qac.regulator9.walidujDaneWejsciowe({ avatar_id: 'zle id!' }),
        (blad) =>
            /avatar_id/.test(blad.message) &&
            /czas_lokalny/.test(blad.message) &&
            /strefa/.test(blad.message) &&
            /obserwator/.test(blad.message)
    );
});

// --- Profil 1.1.0: sekcja dane_wejsciowe (ADR-009) ---

test('profil 1.1.0: sekcja dane_wejsciowe odwzorowuje wejście, UTC wyliczony ze strefy', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const { profil } = await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });

    assert.deepEqual(profil.dane_wejsciowe, {
        avatar_id: 'andrzej_bogacki',
        czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
        strefa: 'Europe/Warsaw',
        obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
        miejsce: 'Warszawa, Polska',
    });
    // 15 czerwca = czas letni (CEST, +2 h)
    assert.equal(profil.dane_surowe.czas.offset_minuty, 120);
    assert.deepEqual(profil.dane_surowe.czas.czas_utc, {
        rok: 1990, miesiac: 6, dzien: 15, godzina: 6, minuta: 30, sekunda: 0,
    });
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: brak miejsca zapisany jako null, nie pominięty', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const dane = { ...daneWejsciowe };
    delete dane.miejsce;
    const { profil } = await qac.generujProfil(dane, {
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });
    assert.equal(profil.dane_wejsciowe.miejsce, null);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: reprodukowalność — dane_wejsciowe dają identyczny profil', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const pierwszy = (await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny, katalogProfili: katalog,
    })).profil;

    const drugi = (await qac.generujProfil(pierwszy.dane_wejsciowe, {
        silnik: silnikSyntetyczny, katalogProfili: katalog,
    })).profil;

    // Pomijamy znacznik generacji — zmienia się z definicji.
    const bezZnacznika = (p) => {
        const kopia = JSON.parse(JSON.stringify(p));
        delete kopia.naglowek.wygenerowano;
        return kopia;
    };
    assert.deepEqual(bezZnacznika(drugi), bezZnacznika(pierwszy));
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: bramka 9b odrzuca profil bez sekcji dane_wejsciowe', () => {
    const profil = {
        naglowek: {
            avatar_id: 'jan_kowalski', adres_rejestru: 'modul.qac',
            wersja_schematu: '1.1.0', status: 'piaskownica', wygenerowano: '2026-07-15T00:00:00.000Z',
        },
        dane_surowe: {}, aktywacje: {},
        mapa_369: { stemple_srodowiskowe: {} }, macierz_relacyjna: {},
    };
    assert.throws(() => qac.regulator9.walidujProfil(profil), /dane_wejsciowe/);
});

// --- Listowanie i usuwanie profili (kontrakty modułu) ---

function zapiszProfilProbny(katalog, avatar_id) {
    fs.mkdirSync(katalog, { recursive: true });
    fs.writeFileSync(
        path.join(katalog, `${avatar_id}.json`),
        JSON.stringify({ naglowek: { avatar_id } }),
        'utf8'
    );
}

test('listujAvatary: zwraca posortowane identyfikatory z plików json', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-lista-'));
    zapiszProfilProbny(katalog, 'zofia_nowak');
    zapiszProfilProbny(katalog, 'jan_kowalski');
    assert.deepEqual(await qac.listujAvatary(katalog), ['jan_kowalski', 'zofia_nowak']);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('listujAvatary: pomija kosz i pliki spoza wzorca', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-lista-'));
    zapiszProfilProbny(katalog, 'jan_kowalski');
    fs.mkdirSync(path.join(katalog, '.kosz'), { recursive: true });
    fs.writeFileSync(path.join(katalog, '.kosz', 'stary_profil-20260101-000000.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(katalog, 'notatka.txt'), 'x', 'utf8');
    fs.writeFileSync(path.join(katalog, 'ZleID.json'), '{}', 'utf8');
    assert.deepEqual(await qac.listujAvatary(katalog), ['jan_kowalski']);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('listujAvatary: nieistniejący katalog daje pustą listę', async () => {
    assert.deepEqual(await qac.listujAvatary(path.join(os.tmpdir(), 'qac-brak-' + Date.now())), []);
});

test('usunProfil: przenosi plik do kosza ze znacznikiem czasu', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    zapiszProfilProbny(katalog, 'jan_kowalski');
    const cel = await qac.usunProfil('jan_kowalski', katalog);

    assert.equal(fs.existsSync(path.join(katalog, 'jan_kowalski.json')), false);
    assert.equal(fs.existsSync(cel), true);
    assert.match(path.basename(cel), /^jan_kowalski-\d{8}-\d{6}\.json$/);
    assert.equal(path.basename(path.dirname(cel)), '.kosz');
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('usunProfil: nieistniejący profil daje null, nie wyjątek', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    assert.equal(await qac.usunProfil('jan_kowalski', katalog), null);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('usunProfil: odrzuca avatar_id z próbą wyjścia poza katalog profili', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    for (const zleId of ['../../etc/passwd', 'jan/../../x', '.', 'ZleID', 'jan kowalski']) {
        await assert.rejects(
            async () => qac.usunProfil(zleId, katalog),
            /wzorcem/,
            `powinno odrzucić: ${zleId}`
        );
    }
    fs.rmSync(katalog, { recursive: true, force: true });
});
