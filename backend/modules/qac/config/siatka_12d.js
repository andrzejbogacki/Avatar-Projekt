'use strict';

// Siatka 12D — parametry Symulatora 12D. // TERMIN-KANDYDAT: Symulator 12D
// Węgiel-12 (6-6-6) jako kod bazowy gęstości 3D. // TERMIN-KANDYDAT: Węgiel-12 (6-6-6)
const LICZBA_WYMIAROW = 12;

// Parametry C-12: izotop węgla-12 — 6 protonów, 6 neutronów, 6 elektronów.
const C12 = Object.freeze({
    PROTONY: 6,
    NEUTRONY: 6,
    ELEKTRONY: 6,
});

// Rozkład pozycji matrycy 3·6·9 w siatce 12D:
// pozycje impulsu (3), formy (6) i regulacji/rezonansu (9).
const MATRYCA_369 = Object.freeze({
    POZYCJA_3: 3,
    POZYCJA_6: 6,
    POZYCJA_9: 9,
});

module.exports = Object.freeze({
    LICZBA_WYMIAROW,
    C12,
    MATRYCA_369,
});
