'use strict';

// Agregator konfiguracji PS — jedyny punkt importu stałych dla src/ i index.js.
module.exports = Object.freeze({
    osie: require('./osie'),
    dostep: require('./dostep'),
    volt: require('./volt'),
    WERSJA_SCHEMATU: 'ps_v1',
    SUWEREN_AVATAR_ID: 'andrzej_bogacki',
});
