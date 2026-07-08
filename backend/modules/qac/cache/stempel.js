'use strict';

const { cache } = require('../config');

/**
 * Stempel pochodzenia danych — każdy rekord środowiskowy nosi
 * {zrodlo, timestamp, status: live|cache|stale}. Zakaz cichych wartości domyślnych.
 */
function stemplujLive(zrodlo, wartosc, terazMs = Date.now()) {
    return {
        wartosc,
        zrodlo,
        timestamp: new Date(terazMs).toISOString(),
        status: 'live',
    };
}

// Rekord jawnego braku danych — zamiast wartości domyślnej.
function stempelBrakuDanych(zrodlo, powod) {
    return {
        wartosc: null,
        zrodlo,
        timestamp: null,
        status: 'stale',
        blad: powod,
    };
}

/**
 * Wyprowadzenie statusu z wieku rekordu (wniosek logiczny):
 * wiek ≤ cykl odpytywania → 'live'; ≤ próg świeżości → 'cache'; powyżej → 'stale'.
 */
function zWyprowadzonymStatusem(rekord, terazMs = Date.now()) {
    if (!rekord) return null;
    if (rekord.timestamp === null) return { ...rekord, status: 'stale' };
    const wiekMs = terazMs - Date.parse(rekord.timestamp);
    let status = 'stale';
    if (wiekMs <= cache.CYKL_ODPYTYWANIA_MS) status = 'live';
    else if (wiekMs <= cache.PROG_SWIEZOSCI_MS) status = 'cache';
    return { ...rekord, status, wiek_ms: wiekMs };
}

module.exports = { stemplujLive, stempelBrakuDanych, zWyprowadzonymStatusem };
