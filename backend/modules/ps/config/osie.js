'use strict';

// Moduł 1 — Jakości Kwantowe: 4 osie, poziomy 3 i 6 (schemat ps_v1, ADR-003).
module.exports = Object.freeze({
    OSIE: Object.freeze([
        'wolnosc_akceptacja',
        'madrosc_piekno',
        'sprawiedliwosc_dobro',
        'odpowiedzialnosc_prawda',
    ]),
    POZIOMY_OSI: Object.freeze(['poziom_3', 'poziom_6']),
    STATUSY_AUTOCERTYFIKATU: Object.freeze(['brak', 'zadeklarowany']),
});
