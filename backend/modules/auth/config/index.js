'use strict';

// Agregator konfiguracji Auth — jedyny punkt importu stałych dla src/ i index.js.
// Zakaz magic numbers poza warstwą config/ (ARCHITEKTURA.md, reguła 4).
module.exports = Object.freeze({
    krypto: require('./krypto'),
    sesje: require('./sesje'),
    zaproszenia: require('./zaproszenia'),
    konta: require('./konta'),
});
