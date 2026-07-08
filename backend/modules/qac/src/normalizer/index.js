'use strict';

// 9a — REZONATOR (aspekt rezonansowy pozycji 9): punkt między 3 a 6.
// Sprowadzenie danych surowych do wspólnego mianownika częstotliwościowego
// w strukturze Węgla-12. // TERMIN-KANDYDAT: Węgiel-12 (6-6-6)
const { skladowa3 } = require('./skladowa_3');
const { skladowa6 } = require('./skladowa_6');
const { interferencja } = require('./interferencja');

/**
 * Pełna normalizacja 3-6-9 danych surowych kalkulatora.
 * `migawkaCache` — parametry środowiskowe ze stemplami (cache/index.js);
 * `progresje` — opcjonalne pozycje progresywne.
 */
function normalizuj(daneSurowe, migawkaCache = {}, progresje = null) {
    const skl3 = skladowa3(daneSurowe.forma_swiadoma.pozycje, progresje);
    const skl6 = skladowa6(
        daneSurowe.forma_swiadoma.aktywacje,
        daneSurowe.forma_nieswiadoma.aktywacje
    );
    const mapa = interferencja(skl3, skl6, migawkaCache);
    return {
        ...mapa,
        skladowa_3: { status_progresji: skl3.status_progresji, liczba_wektorow: skl3.wektory.length },
        skladowa_6: { liczba_aktywacji: skl6.aktywacje.length },
    };
}

module.exports = { normalizuj, skladowa3, skladowa6, interferencja };
