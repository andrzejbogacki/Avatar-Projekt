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

test('integracja: osie kątowe + Pars Fortunae w formie świadomej (wymaga efemeryd)', (t) => {
    if (!efemerydyDostepne) {
        t.skip('POMINIĘTO — pliki efemeryd niedostarczone (ephemeris/README.md)');
        return;
    }
    // Gdańsk, 11.01.1977, 13:12 UTC
    const wynik = obliczDaneSurowe({
        czas_utc: { rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0 },
        obserwator: { dlugosc_geo: 18.6466, szerokosc_geo: 54.3520, wysokosc_npm_m: 6 },
    });

    const fs = wynik.forma_swiadoma;
    const roznicaKata = (a, b) => { const d = normalizujKat(a - b); return Math.min(d, 360 - d); };
    const wZakresie = (d) => Number.isFinite(d) && d >= 0 && d < 360;

    // Osie liczone TYLKO dla formy świadomej; forma nieświadoma (−88°) ich nie ma.
    assert.ok(fs.osie, 'brak osi w formie świadomej');
    assert.equal(wynik.forma_nieswiadoma.osie, undefined, 'osie nie powinny być liczone dla formy nieświadomej');
    assert.equal(wynik.forma_nieswiadoma.pars_fortunae, undefined, 'Pars nie powinien być liczony dla formy nieświadomej');

    for (const os of ['ascendent', 'mc', 'descendent', 'ic']) {
        assert.ok(wZakresie(fs.osie[os].dlugosc_ekliptyczna_deg), `${os}=${fs.osie[os]?.dlugosc_ekliptyczna_deg}`);
    }
    // Dsc/IC = opozycje (+180°) Asc/MC — wyprowadzane, nie osobne wywołania.
    const asc = fs.osie.ascendent.dlugosc_ekliptyczna_deg;
    const mc = fs.osie.mc.dlugosc_ekliptyczna_deg;
    assert.ok(roznicaKata(fs.osie.descendent.dlugosc_ekliptyczna_deg, asc + 180) < 1e-9, 'Dsc ≠ Asc+180');
    assert.ok(roznicaKata(fs.osie.ic.dlugosc_ekliptyczna_deg, mc + 180) < 1e-9, 'IC ≠ MC+180');

    // Pars Fortunae — zgodność z formułą sektowej wg Ascendentu i pozycji świadomych.
    const pf = fs.pars_fortunae;
    assert.ok(pf, 'brak Pars Fortunae');
    assert.ok(['dzienna', 'nocna'].includes(pf.sekta), `sekta=${pf.sekta}`);
    assert.ok(wZakresie(pf.dlugosc_ekliptyczna_deg), `pars=${pf.dlugosc_ekliptyczna_deg}`);

    const slonce = fs.pozycje.slonce.dlugosc_ekliptyczna_deg;
    const ksiezyc = fs.pozycje.ksiezyc.dlugosc_ekliptyczna_deg;
    const oczekiwanyPars = pf.sekta === 'dzienna'
        ? normalizujKat(asc + ksiezyc - slonce)
        : normalizujKat(asc + slonce - ksiezyc);
    assert.ok(roznicaKata(pf.dlugosc_ekliptyczna_deg, oczekiwanyPars) < 1e-9,
        `pars=${pf.dlugosc_ekliptyczna_deg} oczekiwany=${oczekiwanyPars}`);
});
