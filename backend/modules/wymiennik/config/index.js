'use strict';

// Agregator konfiguracji Wymiennika — jedyny punkt importu stałych.
module.exports = Object.freeze({
    tokeny: require('./tokeny'),
    wymiana: require('./wymiana'),
});
