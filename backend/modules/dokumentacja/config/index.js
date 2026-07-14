'use strict';

// Konfiguracja modułu Dokumentacja (ADR-007) — jedyny punkt importu stałych.
const path = require('node:path');

const KATALOG_REPO = path.resolve(__dirname, '..', '..', '..', '..');

module.exports = Object.freeze({
    // korzeń repozytorium — wszystkie ścieżki manifestu są względne wobec niego
    KATALOG_REPO,
    // manifest dokumentów // TERMIN-KANDYDAT — rejestr artefaktów treściowych projektu
    SCIEZKA_MANIFESTU: path.join(KATALOG_REPO, 'docs', 'dokumenty', 'manifest.json'),
    TYPY_DOKUMENTU: Object.freeze(['strategia', 'zrodlo_prawdy', 'specyfikacja', 'blueprint']),
    // statusy wg KONWENCJE §5: piaskownica | zamrożony_vN (zapis bez diakrytyków)
    WZORZEC_STATUSU: /^(piaskownica|zamrozony_v\d+)$/,
    WZORZEC_ID: /^[a-z0-9_]{1,64}$/,
    FORMATY: Object.freeze({
        markdown: 'text/markdown; charset=utf-8',
        json: 'application/json; charset=utf-8',
    }),
    MAKS_DLUGOSC_TYTULU: 300,
    MAKS_BAJTY_DOKUMENTU: 5_000_000,
    WERSJA_MANIFESTU: 1,
});
