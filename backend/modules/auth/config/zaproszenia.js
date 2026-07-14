'use strict';

// Parametry mechanizmu zaproszeń (dwufazowy: propozycja → zatwierdzenie Suwerena → zapis).
module.exports = Object.freeze({
    TTL_TOKENU_AKTYWACJI_MS: 7 * 24 * 60 * 60 * 1000, // 7 dni na aktywację konta
    STATUSY_ZAPROSZENIA: Object.freeze(['oczekujaca', 'zatwierdzona', 'odrzucona']),
    MAKS_DLUGOSC_UZASADNIENIA: 2000,
});
