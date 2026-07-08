'use strict';

// Częstotliwości projektu — jedyne źródło wartości Hz w module (zakaz magic numbers).
// Pozycja 6 matrycy 3·6·9 — częstotliwość formy/materializacji.
const POZYCJA_6_HZ = 420;

// Solfeggio — częstotliwości odniesienia projektu.
const SOLFEGGIO_HZ = Object.freeze({
    HZ_432: 432,
    HZ_528: 528,
});

// Pik bazowy Rezonansu Schumanna (odniesienie dla parsera cache/zrodla/schumann.js).
const SCHUMANN_PIK_BAZOWY_HZ = 7.83;

module.exports = Object.freeze({
    POZYCJA_6_HZ,
    SOLFEGGIO_HZ,
    SCHUMANN_PIK_BAZOWY_HZ,
});
