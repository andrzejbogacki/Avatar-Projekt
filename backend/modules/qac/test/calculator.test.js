'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const konfig = require('../config');
const { utcNaSkaleCzasowe } = require('../src/calculator/czas');
const { kwantyzuj, normalizujKat } = require('../src/calculator/kwantyzacja');
const { pozycjeTopocentryczne, walidujPlikiEfemeryd } = require('../src/calculator/pozycje');
const { obliczDaneSurowe } = require('../src/calculator');

const efemerydyDostepne = (() => {
    try { walidujPlikiEfemeryd(); return true; } catch { return false; }
})();

test('czas: JD epoki J2000 (2000-01-01 12:00 UTC)', () => {
    const w = utcNaSkaleCzasowe({ rok: 2000, miesiac: 1, dzien: 1, godzina: 12, minuta: 0, sekunda: 0 });
    // JD_UT dla J2000 = 2451545.0 (± sekundy skoku UTC↔UT1)
    assert.ok(Math.abs(w.jd_ut - 2451545.0) < 0.001, `jd_ut=${w.jd_ut}`);
    // ΔT w 2000 r. ≈ 63,8 s (Espenak/Meeus)
    assert.ok(w.delta_t_s > 60 && w.delta_t_s < 68, `delta_t_s=${w.delta_t_s}`);
    // jd_et = jd_ut + ΔT
    assert.ok(Math.abs((w.jd_et - w.jd_ut) * konfig.astronomia.SEKUND_NA_DOBE - w.delta_t_s) < 0.01);
});

test('czas: odrzucenie niekompletnych składowych', () => {
    assert.throws(
        () => utcNaSkaleCzasowe({ rok: 2000, miesiac: 1, dzien: 1, godzina: NaN, minuta: 0, sekunda: 0 }),
        /Nieprawidłowa składowa/
    );
});

test('kwantyzacja: granice bramek i linii', () => {
    const szer = konfig.bramki.SZEROKOSC_BRAMKI_DEG;
    assert.equal(szer, 5.625);
    assert.equal(konfig.bramki.SZEROKOSC_LINII_DEG, 0.9375);

    const p0 = kwantyzuj(0);
    assert.deepEqual(
        [p0.bramka, p0.linia, p0.kolor, p0.ton, p0.base],
        [1, 1, 1, 1, 1]
    );

    const koniecB1 = kwantyzuj(szer - 1e-9);
    assert.equal(koniecB1.bramka, 1);
    assert.equal(koniecB1.linia, 6);

    const startB2 = kwantyzuj(szer);
    assert.equal(startB2.bramka, 2);
    assert.equal(startB2.linia, 1);

    const ostatnia = kwantyzuj(360 - 1e-9);
    assert.equal(ostatnia.bramka, 64);
    assert.equal(ostatnia.linia, 6);

    // pełny obrót — normalizacja
    assert.equal(kwantyzuj(360).bramka, 1);
    assert.equal(kwantyzuj(-1e-9).bramka, 64);
});

test('kwantyzacja: zakresy podpodziałów kolor/ton/base', () => {
    for (const kat of [0, 13.37, 88, 179.999, 271.05, 359.5]) {
        const p = kwantyzuj(kat);
        assert.ok(p.bramka >= 1 && p.bramka <= konfig.bramki.LICZBA_BRAMEK);
        assert.ok(p.linia >= 1 && p.linia <= konfig.bramki.LINII_NA_BRAMKE);
        assert.ok(p.kolor >= 1 && p.kolor <= konfig.bramki.KOLOROW_NA_LINIE);
        assert.ok(p.ton >= 1 && p.ton <= konfig.bramki.TONOW_NA_KOLOR);
        assert.ok(p.base >= 1 && p.base <= konfig.bramki.BASE_NA_TON);
    }
});

test('normalizacja kąta', () => {
    assert.equal(normalizujKat(-90), 270);
    assert.equal(normalizujKat(450), 90);
    assert.equal(normalizujKat(0), 0);
});

test('pozycje: brak plików efemeryd = jawny błąd (zakaz fallbacku Moshiera)', (t) => {
    if (efemerydyDostepne) {
        t.skip('pliki efemeryd obecne — ścieżka błędu nieosiągalna');
        return;
    }
    assert.throws(
        () => pozycjeTopocentryczne(2451545.0, { dlugosc_geo: 21.0, szerokosc_geo: 52.2, wysokosc_npm_m: 100 }),
        /Brak plików efemeryd/
    );
});

test('pozycje: odrzucenie nieprawidłowego obserwatora', () => {
    const { walidujPlikiEfemeryd: _, ...poz } = require('../src/calculator/pozycje');
    if (!efemerydyDostepne) {
        // walidacja plików uruchamia się przed walidacją obserwatora — test wymaga plików
        assert.throws(
            () => poz.pozycjeTopocentryczne(2451545.0, { dlugosc_geo: 999, szerokosc_geo: 0, wysokosc_npm_m: 0 }),
            /Brak plików efemeryd|Nieprawidłowa długość/
        );
        return;
    }
    assert.throws(
        () => poz.pozycjeTopocentryczne(2451545.0, { dlugosc_geo: 999, szerokosc_geo: 0, wysokosc_npm_m: 0 }),
        /Nieprawidłowa długość geograficzna/
    );
});

test('integracja: pełny przebieg obliczeniowy (wymaga efemeryd)', (t) => {
    if (!efemerydyDostepne) {
        t.skip('POMINIĘTO — pliki efemeryd niedostarczone (ephemeris/README.md)');
        return;
    }
    const wynik = obliczDaneSurowe({
        czas_utc: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
        obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
    });
    // Słońce ~24° Bliźniąt w połowie czerwca (~83–85° długości ekliptycznej)
    const slonce = wynik.forma_swiadoma.pozycje.slonce.dlugosc_ekliptyczna_deg;
    assert.ok(slonce > 82 && slonce < 86, `slonce=${slonce}`);
    // forma nieświadoma: dokładnie 88° łuku wstecz
    const nieswiadomeSlonce = wynik.forma_nieswiadoma.pozycje.slonce.dlugosc_ekliptyczna_deg;
    const roznica = normalizujKat(slonce - nieswiadomeSlonce);
    assert.ok(Math.abs(roznica - 88) < 0.01, `łuk=${roznica}`);
    assert.ok(wynik.forma_nieswiadoma.jd_et < wynik.forma_swiadoma.jd_et);
});
