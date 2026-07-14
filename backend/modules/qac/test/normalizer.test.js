'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { skladowa3 } = require('../src/normalizer/skladowa_3');
const { skladowa6, katSrodkaBramki } = require('../src/normalizer/skladowa_6');
const { interferencja, czynnikModulacji, wymiarZKata } = require('../src/normalizer/interferencja');
const { normalizuj } = require('../src/normalizer');
const { walidujDaneWejsciowe } = require('../src/regulator9/walidacja_wejscia');
const { kontrolujSwiezosc } = require('../src/regulator9/kontrola_swiezosci');
const { autoryzujIZapisz } = require('../src/regulator9/bramka_zapisu');

// Dane syntetyczne (bez efemeryd — czysta warstwa matematyczna).
function pozycja(dlugosc, predkosc = 0.1) {
    return {
        dlugosc_ekliptyczna_deg: dlugosc,
        szerokosc_ekliptyczna_deg: 0,
        odleglosc_au: 1,
        predkosc_dlugosci_deg_d: predkosc,
    };
}

function aktywacja(bramka) {
    return { bramka, linia: 1, kolor: 1, ton: 1, base: 1, pozycja_w_bramce_deg: 0 };
}

const daneSurowe = {
    forma_swiadoma: {
        pozycje: { pluton: pozycja(217.5, 0.02), wezel_polnocny: pozycja(95.0, -0.05), chiron: pozycja(8.4, 0.03) },
        aktywacje: { slonce: aktywacja(15), ksiezyc: aktywacja(33) },
    },
    forma_nieswiadoma: {
        aktywacje: { slonce: aktywacja(2), ksiezyc: aktywacja(60) },
    },
};

test('skladowa3: Pluton + oś Węzłów + Chiron, jawny status braku progresji', () => {
    const s = skladowa3(daneSurowe.forma_swiadoma.pozycje);
    // Pluton, węzeł północny, węzeł południowy (wyprowadzony) + Chiron = 4 wektory bazowe.
    assert.equal(s.wektory.length, 4);
    const poludniowy = s.wektory.find((w) => w.cialo === 'wezel_poludniowy');
    assert.equal(poludniowy.kat_deg, (95 + 180) % 360);
    const chiron = s.wektory.find((w) => w.cialo === 'chiron');
    assert.equal(chiron.kat_deg, 8.4);
    assert.match(s.status_progresji, /brak/);
});

test('skladowa3: progresje jako wektory pędu', () => {
    const s = skladowa3(daneSurowe.forma_swiadoma.pozycje, { slonce: pozycja(120, 0.98) });
    // 4 wektory bazowe (z Chironem) + 1 progresja = 5.
    assert.equal(s.wektory.length, 5);
    assert.equal(s.status_progresji, 'uwzglednione');
});

test('skladowa6: aktywacje obu form z fazą środka bramki', () => {
    const s = skladowa6(
        daneSurowe.forma_swiadoma.aktywacje,
        daneSurowe.forma_nieswiadoma.aktywacje
    );
    assert.equal(s.aktywacje.length, 4);
    // Pierwsza brama koła rave (indeks 0) ma środek w ½ szerokości bramki od startu.
    const pierwszaBrama = konfig.bramki.KOLEJNOSC_BRAMEK[0];
    assert.equal(katSrodkaBramki(pierwszaBrama), konfig.bramki.SZEROKOSC_BRAMKI_DEG / 2);
    assert.throws(() => skladowa6(null, {}), /obu form/);
});

test('interferencja: wektor 12D znormalizowany, brak parametrów = czynnik neutralny', () => {
    const skl3 = skladowa3(daneSurowe.forma_swiadoma.pozycje);
    const skl6 = skladowa6(
        daneSurowe.forma_swiadoma.aktywacje,
        daneSurowe.forma_nieswiadoma.aktywacje
    );
    const mapa = interferencja(skl3, skl6, {});
    assert.equal(mapa.wektor_czestotliwosci_12d.length, konfig.siatka12d.LICZBA_WYMIAROW);
    const suma = mapa.wektor_czestotliwosci_12d.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(suma - 1) < 1e-12, `suma=${suma}`);
    assert.equal(mapa.czynnik_modulacji, 1);
    assert.equal(mapa.czestotliwosc_odniesienia_hz, konfig.czestotliwosci.POZYCJA_6_HZ);
});

test('modulacja: parametry live modulują, stale wykluczone ze stemplem', () => {
    const migawka = {
        kp: { wartosc: { kp: 4.5 }, zrodlo: 'NOAA Kp', timestamp: new Date().toISOString(), status: 'live' },
        schumann: { wartosc: null, zrodlo: 'schumann', timestamp: null, status: 'stale', blad: 'O5' },
    };
    const { czynnik, stemple } = czynnikModulacji(migawka);
    const oczekiwany = 1 + konfig.normalizacja.MODULACJA.WAGA_KP * (4.5 / konfig.normalizacja.MODULACJA.KP_MAX);
    assert.ok(Math.abs(czynnik - oczekiwany) < 1e-12);
    assert.equal(stemple.kp.status, 'live');
    assert.equal(stemple.schumann.status, 'stale');
    assert.equal(stemple.schumann.blad, 'O5');
});

test('wymiarZKata: 12 sektorów po 30°', () => {
    assert.equal(wymiarZKata(0), 0);
    assert.equal(wymiarZKata(29.999), 0);
    assert.equal(wymiarZKata(30), 1);
    assert.equal(wymiarZKata(359.999), 11);
});

test('normalizuj: pełna mapa 369 ze stemplami per parametr', () => {
    const mapa = normalizuj(daneSurowe, {
        kp: { wartosc: { kp: 2 }, zrodlo: 'NOAA Kp', timestamp: new Date().toISOString(), status: 'live' },
    });
    assert.ok(mapa.pozycja_3 > 0);
    assert.ok(mapa.pozycja_6 > 0);
    assert.ok(mapa.pozycja_9_rezonans > 0);
    assert.ok(mapa.stemple_srodowiskowe.kp);
    assert.match(mapa.formula, /O7/);
});

test('regulator9: walidacja wejścia zgłasza wszystkie braki naraz', () => {
    assert.throws(
        () => walidujDaneWejsciowe({ avatar_id: 'ZlyFormat', czas_utc: { rok: 1990 }, obserwator: {} }),
        (blad) => {
            assert.match(blad.message, /avatar_id/);
            assert.match(blad.message, /czas_utc\.miesiac/);
            assert.match(blad.message, /obserwator\.dlugosc_geo/);
            return true;
        }
    );
    assert.deepEqual(
        walidujDaneWejsciowe({
            avatar_id: 'andrzej_bogacki',
            czas_utc: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
            obserwator: { dlugosc_geo: 21.0, szerokosc_geo: 52.2, wysokosc_npm_m: 113 },
        }),
        { poprawne: true }
    );
});

test('regulator9: kontrola świeżości oddziela stale od przyjętych', () => {
    const { przyjete, odrzucone } = kontrolujSwiezosc({
        a: { wartosc: 1, status: 'live', zrodlo: 'a', timestamp: 't' },
        b: { wartosc: 2, status: 'cache', zrodlo: 'b', timestamp: 't' },
        c: { wartosc: 3, status: 'stale', zrodlo: 'c', timestamp: 't' },
        d: null,
    });
    assert.deepEqual(Object.keys(przyjete), ['a', 'b']);
    assert.deepEqual(Object.keys(odrzucone).sort(), ['c', 'd']);
});

test('regulator9: bramka zapisu odmawia przy niekompletnym profilu i zapisuje kompletny', () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-profil-'));
    assert.throws(() => autoryzujIZapisz({ naglowek: { avatar_id: 'a_b' } }, katalog), /odmówiła autoryzacji/);

    const profil = {
        naglowek: {
            avatar_id: 'andrzej_bogacki',
            adres_rejestru: konfig.rejestr.ADRES_MODULU,
            wersja_schematu: konfig.rejestr.WERSJA_SCHEMATU_PROFILU,
            status: konfig.rejestr.STATUS_ARTEFAKTU,
            wygenerowano: new Date().toISOString(),
        },
        dane_surowe: { x: 1 },
        aktywacje: { y: 2 },
        mapa_369: { stemple_srodowiskowe: {} },
        macierz_relacyjna: { status: 'przygotowana' },
    };
    const sciezka = autoryzujIZapisz(profil, katalog);
    const odczyt = JSON.parse(fs.readFileSync(sciezka, 'utf8'));
    assert.equal(odczyt.naglowek.avatar_id, 'andrzej_bogacki');
    fs.rmSync(katalog, { recursive: true, force: true });
});
