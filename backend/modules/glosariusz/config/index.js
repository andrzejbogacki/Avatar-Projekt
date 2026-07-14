'use strict';

// Konfiguracja Glosariusza (ADR-006) — jedyny punkt importu stałych.
const path = require('node:path');

module.exports = Object.freeze({
    // źródło prawdy terminologii (ARCHITEKTURA §3) — moduł czyta, zapis wyłącznie
    // przez bramkę dwufazową regulatora
    SCIEZKA_GLOSARIUSZA: path.join(__dirname, '..', '..', '..', '..', 'docs', 'glosariusz.json'),
    SCIEZKA_INDEKSU: path.join(__dirname, '..', 'indeks', 'formy.json'),
    SILNIKI: Object.freeze(['regulowy', 'morfeusz2']),
    SILNIK_BIEZACY: 'regulowy', // Morfeusz2 = silnik kanoniczny, dołączany później (ADR-006)
    STATUSY_FORM: Object.freeze(['podstawowa', 'przyblizone', 'pelne']),
    STATUSY_TERMINU: Object.freeze(['piaskownica', 'zatwierdzony']),
    MAKS_FORM_NA_TERMIN: 400,
    MAKS_DLUGOSC_TEKSTU_SKANU: 1_000_000,
    MAKS_DLUGOSC_POLA: 4000,
    DLUGOSC_ID_PROPOZYCJI_BAJTY: 16,
    WERSJA_INDEKSU: 1,
});
