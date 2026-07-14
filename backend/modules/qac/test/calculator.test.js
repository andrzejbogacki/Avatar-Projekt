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

    // Granice liczone względem startu koła rave (START_KOLA_DEG = 302°).
    const start = konfig.bramki.START_KOLA_DEG;

    // Początek koła → pierwsza brama rave (41), wszystkie podpodziały = 1.
    const p0 = kwantyzuj(start);
    assert.deepEqual(
        [p0.bramka, p0.linia, p0.kolor, p0.ton, p0.base],
        [41, 1, 1, 1, 1]
    );

    const koniecB1 = kwantyzuj(start + szer - 1e-9);
    assert.equal(koniecB1.bramka, 41);
    assert.equal(koniecB1.linia, 6);

    const startB2 = kwantyzuj(start + szer);
    assert.equal(startB2.bramka, 19); // druga brama koła rave
    assert.equal(startB2.linia, 1);

    const ostatnia = kwantyzuj(start - 1e-9);
    assert.equal(ostatnia.bramka, 60); // ostatnia brama koła rave (tuż przed startem)
    assert.equal(ostatnia.linia, 6);

    // pełny obrót — normalizacja (start+360 ≡ start)
    assert.equal(kwantyzuj(start + 360).bramka, 41);
    assert.equal(kwantyzuj(start - 1e-9).bramka, 60);
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

test('pozycje: zodiak sideralny (Lahiri) — pole sideralna, ayanamsa ≈ 23,54° dla 1977 (wymaga efemeryd)', (t) => {
    if (!efemerydyDostepne) {
        t.skip('POMINIĘTO — pliki efemeryd niedostarczone (ephemeris/README.md)');
        return;
    }
    // Gdańsk, 11.01.1977, 13:12 UTC — obie formy liczone wspólną pętlą po CIALA.
    const wynik = obliczDaneSurowe({
        czas_utc: { rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0 },
        obserwator: { dlugosc_geo: 18.6466, szerokosc_geo: 54.3520, wysokosc_npm_m: 6 },
    });
    // get_ayanamsa(jd_et 1977) = 23,536° (Lahiri). Różnica tropikalna−sideralna
    // to ayanamsa — stała dla wszystkich ciał w danej chwili.
    const AYANAMSA_LAHIRI_1977 = 23.54;

    for (const forma of ['forma_swiadoma', 'forma_nieswiadoma']) {
        const pozycje = wynik[forma].pozycje;
        for (const [nazwa, p] of Object.entries(pozycje)) {
            assert.ok(p.sideralna, `${forma}.${nazwa}: brak pola sideralna`);
            assert.ok(Number.isFinite(p.sideralna.dlugosc_ekliptyczna_deg),
                `${forma}.${nazwa}: sideralna.dlugosc niefinitowa`);
            const ayanamsa = normalizujKat(p.dlugosc_ekliptyczna_deg - p.sideralna.dlugosc_ekliptyczna_deg);
            assert.ok(Math.abs(ayanamsa - AYANAMSA_LAHIRI_1977) < 0.1,
                `${forma}.${nazwa}: tropikalna−sideralna=${ayanamsa.toFixed(4)}° poza ${AYANAMSA_LAHIRI_1977}±0.1`);
        }
    }
});

test('nakszatry: mapa dla wszystkich obiektów formy świadomej, Księżyc → 12/0 (wymaga efemeryd)', (t) => {
    if (!efemerydyDostepne) {
        t.skip('POMINIĘTO — pliki efemeryd niedostarczone (ephemeris/README.md)');
        return;
    }
    // Gdańsk, 11.01.1977, 13:12 UTC
    const wynik = obliczDaneSurowe({
        czas_utc: { rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0 },
        obserwator: { dlugosc_geo: 18.6466, szerokosc_geo: 54.3520, wysokosc_npm_m: 6 },
    });

    const nak = wynik.forma_swiadoma.nakszatry;
    assert.ok(nak, 'brak mapy nakszatr w formie świadomej');
    // TYLKO forma świadoma — forma nieświadoma nie ma nakszatr.
    assert.equal(wynik.forma_nieswiadoma.nakszatry, undefined, 'nakszatry nie powinny istnieć w formie nieświadomej');

    // Pełne pokrycie: dokładnie te same obiekty co w pozycjach świadomych.
    assert.deepEqual(
        Object.keys(nak).sort(),
        Object.keys(wynik.forma_swiadoma.pozycje).sort()
    );

    for (const [nazwa, n] of Object.entries(nak)) {
        assert.ok(Number.isInteger(n.numer) && n.numer >= 0 && n.numer <= 26, `${nazwa}.numer=${n.numer}`);
        assert.ok(Number.isInteger(n.pada) && n.pada >= 0 && n.pada <= 3, `${nazwa}.pada=${n.pada}`);
    }

    // Kluczowa asercja: Księżyc sideralnie ≈161,25° → nakszatra 12, pada 0.
    assert.deepEqual(nak.ksiezyc, { numer: 12, pada: 0 });
});

test('bramki: KOLEJNOSC_BRAMEK = kanoniczne koło rave (64 bramy, komplet 1–64, start bramą 41)', () => {
    const kolo = konfig.bramki.KOLEJNOSC_BRAMEK;
    assert.equal(kolo.length, 64, 'koło musi mieć 64 bramy');
    assert.equal(new Set(kolo).size, 64, 'duplikaty w kole rave');
    for (let g = 1; g <= 64; g++) {
        assert.ok(kolo.includes(g), `brak bramy ${g} w kole rave`);
    }
    // Kanoniczny start koła rave: brama 41 na 2° Wodnika = 302° tropikalne.
    assert.equal(kolo[0], 41, 'koło rave zaczyna się bramą 41');
    assert.equal(konfig.bramki.START_KOLA_DEG, 302, 'start koła = 302° (2° Wodnika)');
});

test('kwantyzacja E2E: Słońce natalne (tropikalne) → brama 61 koła rave (wymaga efemeryd)', (t) => {
    if (!efemerydyDostepne) {
        t.skip('POMINIĘTO — pliki efemeryd niedostarczone (ephemeris/README.md)');
        return;
    }
    // Gdańsk, 11.01.1977, 13:12 UTC
    const wynik = obliczDaneSurowe({
        czas_utc: { rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0 },
        obserwator: { dlugosc_geo: 18.6466, szerokosc_geo: 54.3520, wysokosc_npm_m: 6 },
    });
    const slonce = wynik.forma_swiadoma.pozycje.slonce;

    // Potwierdzenie kanału: aktywacja = kwantyzacja długości TROPIKALNEJ, nie sideralnej.
    const bramaTropikalna = kwantyzuj(slonce.dlugosc_ekliptyczna_deg).bramka;
    const bramaSideralna = kwantyzuj(slonce.sideralna.dlugosc_ekliptyczna_deg).bramka;
    assert.equal(wynik.forma_swiadoma.aktywacje.slonce.bramka, bramaTropikalna);
    assert.notEqual(bramaTropikalna, bramaSideralna); // gdyby użyto sideralnej — inna brama

    // Kluczowa asercja: Słońce 291,21° tropikalne → brama 61.
    assert.equal(wynik.forma_swiadoma.aktywacje.slonce.bramka, 61);
});

// --- Konwersja czasu lokalnego na UTC (strefy IANA, reguły DST) ---

const { lokalnyNaUtc, znanaStrefa } = require('../src/calculator/czas');

test('czas lokalny→UTC: czas zimowy w Warszawie (CET, +1 h)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 1, minuta: 10, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 10, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 60);
});

test('czas lokalny→UTC: czas letni w Warszawie (CEST, +2 h)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1990, miesiac: 6, dzien: 15, godzina: 6, minuta: 30, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 120);
});

test('czas lokalny→UTC: historyczna reguła sprzed reformy (1977)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1977, miesiac: 1, dzien: 11, godzina: 14, minuta: 12, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 60);
});

test('czas lokalny→UTC: przejście przez północ cofa datę', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 30, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1982, miesiac: 11, dzien: 14, godzina: 23, minuta: 30, sekunda: 0,
    });
});

test('czas lokalny→UTC: godzina nieistniejąca (przeskok na czas letni) odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 2026, miesiac: 3, dzien: 29, godzina: 2, minuta: 30, sekunda: 0 },
            'Europe/Warsaw'
        ),
        /nie istnieje/
    );
});

test('czas lokalny→UTC: godzina dwuznaczna (powrót na czas zimowy) odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 2026, miesiac: 10, dzien: 25, godzina: 2, minuta: 30, sekunda: 0 },
            'Europe/Warsaw'
        ),
        /dwuznaczny/
    );
});

test('czas lokalny→UTC: nieznana strefa odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
            'Europe/Gdansk'
        ),
        /Nieznana strefa/
    );
});

test('czas lokalny→UTC: brakująca składowa odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc({ rok: 1990, miesiac: 6, dzien: 15, godzina: 8 }, 'Europe/Warsaw'),
        /składowa czasu lokalnego/
    );
});

test('czas lokalny→UTC: strefa UTC jest akceptowana (brak w supportedValuesOf)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 2000, miesiac: 1, dzien: 1, godzina: 12, minuta: 0, sekunda: 0 },
        'UTC'
    );
    assert.equal(wynik.offset_minuty, 0);
    assert.deepEqual(wynik.czas_utc, {
        rok: 2000, miesiac: 1, dzien: 1, godzina: 12, minuta: 0, sekunda: 0,
    });
});

test('czas: round-trip lokalny→UTC→skale czasowe zgodny z bezpośrednim UTC', () => {
    const { czas_utc } = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 1, minuta: 10, sekunda: 0 },
        'Europe/Warsaw'
    );
    const przez = utcNaSkaleCzasowe(czas_utc);
    const wprost = utcNaSkaleCzasowe({
        rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 10, sekunda: 0,
    });
    assert.equal(przez.jd_ut, wprost.jd_ut);
});

test('znanaStrefa: rozpoznaje poprawne i odrzuca błędne identyfikatory', () => {
    assert.equal(znanaStrefa('Europe/Warsaw'), true);
    assert.equal(znanaStrefa('UTC'), true);
    assert.equal(znanaStrefa('Europe/Gdansk'), false);
    assert.equal(znanaStrefa(''), false);
});
