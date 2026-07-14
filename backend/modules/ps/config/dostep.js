'use strict';

// Moduł 4 — Protokół Relacji: hierarchia, stany, macierz S1, mapa S2 (ADR-003).
const { OSIE } = require('./osie');

const HIERARCHIA_POZIOMOW = Object.freeze(['niesklasyfikowany', 'uczen', 'adept', 'mistrz']);
const STANY_DOSTEPU = Object.freeze(['brak', 'warunkowy', 'akceptacja', 'dozwolony']);

// Decyzja Suwerena 2026-07-12 (ADR-003): wszystkie poziomy startują od „brak"
// dla wszystkich osi — dostęp relacyjny wyłącznie przez ręczne nadpisania.
const WIERSZ_DOMYSLNY = Object.freeze({
    niesklasyfikowany: 'brak', uczen: 'brak', adept: 'brak', mistrz: 'brak',
});
const MACIERZ_DOMYSLNA = Object.freeze(
    Object.fromEntries(OSIE.map((os) => [os, WIERSZ_DOMYSLNY]))
);

// Strumień 2 — mapa ZATWIERDZONA (roadmapa): sekcje widoczne per poziom.
// Uczeń widzi Moduł 3 okrojony (bez warunek/mapowanie_369/alokacji Volt — ADR-003).
const STRUMIEN_2 = Object.freeze({
    niesklasyfikowany: Object.freeze({ dane_podstawowe: true }),
    uczen: Object.freeze({ dane_podstawowe: true, modul_2: true, modul_3_okrojony: true }),
    adept: Object.freeze({ dane_podstawowe: true, modul_2: true, modul_3: true, modul_1: true }),
    mistrz: Object.freeze({
        dane_podstawowe: true, modul_2: true, modul_3: true, modul_1: true, modul_4: true,
    }),
});
const POLA_TOKENU_UCZEN = Object.freeze(['token', 'akceptacja', 'opis']);

module.exports = Object.freeze({
    HIERARCHIA_POZIOMOW,
    STANY_DOSTEPU,
    MACIERZ_DOMYSLNA,
    STRUMIEN_2,
    POLA_TOKENU_UCZEN,
    STATUSY_AKCEPTACJI: Object.freeze(['pelna', 'warunkowa', 'brak']),
    STATUSY_ZGODY: Object.freeze(['oczekujaca', 'zaakceptowana', 'odrzucona']),
    DLUGOSC_ID_GOSCIA_BAJTY: 16,
    NAZWA_COOKIE_GOSCIA: 'ps_gosc',
    MAKS_DLUGOSC_TEKSTU: 2000,
});
