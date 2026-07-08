'use strict';

// 9b — REGULATOR: kontrola świeżości parametrów środowiskowych.
// Parametry o statusie 'stale' (wiek > próg świeżości, config/cache.js — O2)
// są odrzucane z obliczenia; odrzucenie jest jawnie raportowane.

/**
 * Filtruje migawkę cache: przyjęte (live|cache) trafiają do rezonatora 9a,
 * odrzucone (stale / brak wartości) pozostają w raporcie ze stemplem.
 */
function kontrolujSwiezosc(migawka) {
    const przyjete = {};
    const odrzucone = {};
    for (const [klucz, rekord] of Object.entries(migawka || {})) {
        if (!rekord || rekord.status === 'stale' || rekord.wartosc === null) {
            odrzucone[klucz] = rekord || {
                zrodlo: klucz,
                timestamp: null,
                status: 'stale',
                blad: 'brak rekordu w buforze',
            };
            continue;
        }
        przyjete[klucz] = rekord;
    }
    return { przyjete, odrzucone };
}

module.exports = { kontrolujSwiezosc };
