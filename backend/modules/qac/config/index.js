'use strict';

// Agregator konfiguracji QAC — jedyny punkt importu stałych dla src/, cache/ i index.js.
// Zakaz magic numbers poza warstwą config/ (ARCHITEKTURA.md, reguła 4).
module.exports = Object.freeze({
    czestotliwosci: require('./czestotliwosci'),
    siatka12d: require('./siatka_12d'),
    bramki: require('./bramki'),
    astronomia: require('./astronomia'),
    normalizacja: require('./normalizacja'),
    rektyfikacja: require('./rektyfikacja'),
    cache: require('./cache'),
    rejestr: require('./rejestr'),
});
