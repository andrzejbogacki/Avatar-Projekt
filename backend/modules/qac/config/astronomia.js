'use strict';

const path = require('node:path');

// Przesunięcie słoneczne formy nieświadomej: dokładnie 88° łuku słonecznego
// wstecz od pozycji urodzenia (qac_prompt_v2.md, sekcja 1).
const LUK_SLONECZNY_FORMY_NIESWIADOMEJ_DEG = 88;

// Okno startowe wyszukiwania przecięcia łuku −88°: Słońce pokonuje 88° w ~86–92 dni;
// start iteracji 100 dni przed urodzeniem gwarantuje objęcie przecięcia.
const OKNO_WYSZUKIWANIA_LUKU_DNI = 100;

// Katalog plików efemeryd (JPL DE440/441 lub Swiss .se1) — dostarczane poza repo.
const SCIEZKA_EFEMERYD = path.join(__dirname, '..', 'ephemeris');

// Źródło efemeryd. Dozwolone: 'swieph' (pliki .se1), 'jpleph' (pliki JPL DE440/441).
// Kategoryczny zakaz źródła 'moshier' (algorytm przybliżony) — walidacja w src/calculator/pozycje.js.
const ZRODLO_EFEMERYD = 'swieph';
const PLIK_JPL = 'de440.eph'; // nazwa pliku przy ZRODLO_EFEMERYD='jpleph'

// Ciała obliczane do profilu (klucze = identyfikatory wewnętrzne, wartości = stałe sweph).
// TRUE_NODE: oś Węzłów Księżycowych dla składowej 3 (Astrologia Ewolucyjna).
// TERMIN-KANDYDAT: Astrologia Ewolucyjna
const CIALA = Object.freeze({
    slonce: 'SE_SUN',
    ksiezyc: 'SE_MOON',
    merkury: 'SE_MERCURY',
    wenus: 'SE_VENUS',
    mars: 'SE_MARS',
    jowisz: 'SE_JUPITER',
    saturn: 'SE_SATURN',
    uran: 'SE_URANUS',
    neptun: 'SE_NEPTUNE',
    pluton: 'SE_PLUTO',
    wezel_polnocny: 'SE_TRUE_NODE',
});

// Wymagana precyzja długości ekliptycznej: ułamki sekundy kątowej.
const PROG_PRECYZJI_ARCSEC = 0.01;
const ARCSEC_NA_STOPIEN = 3600;
const SEKUND_NA_DOBE = 86_400;

module.exports = Object.freeze({
    LUK_SLONECZNY_FORMY_NIESWIADOMEJ_DEG,
    OKNO_WYSZUKIWANIA_LUKU_DNI,
    SCIEZKA_EFEMERYD,
    ZRODLO_EFEMERYD,
    PLIK_JPL,
    CIALA,
    PROG_PRECYZJI_ARCSEC,
    ARCSEC_NA_STOPIEN,
    SEKUND_NA_DOBE,
});
