'use strict';

// Agregator konfiguracji Rezonatora — jedyny punkt importu stałych.
module.exports = Object.freeze({
    czestotliwosci: require('./czestotliwosci'),
    pasma: require('./pasma'),
    sync: require('./sync'),
    TYPY_ZRODEL: Object.freeze(['avatar', 'obiekt', 'misja']),
    WZORZEC_ZRODLO_ID: /^[a-z][a-z0-9_]{1,63}$/,
    KLASY_CZESTOTLIWOSCI: Object.freeze(['solfeggio', 'planetarna', 'qac']),
    MAKS_DLUGOSC_TEKSTU: 2000,
});
