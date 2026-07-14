'use strict';

// Reguły wymiany (ADR-004): kurs 1:1 dla pary avatar↔avatar (zasada Gebo,
// zakodowana), tryby rozliczenia, statusy transakcji i ofert.
module.exports = Object.freeze({
    TRYBY_ROZLICZENIA: Object.freeze(['system', 'poza_systemem', 'zewnetrzny']),
    STATUSY_TRANSAKCJI: Object.freeze([
        'proponowana',          // czeka na akceptację drugiej strony
        'odrzucona',            // druga strona odmówiła
        'wycofana',             // proponujący wycofał przed akceptacją
        'rozliczona',           // transfer sald wykonany
        'oczekuje_potwierdzen', // poza systemem: czeka na OBA potwierdzenia (bezterminowo)
        'anulowana',            // poza systemem: OBIE strony anulowały
        'umowa_zewnetrzna',     // zarejestrowana w systemie zewnętrznym przez adapter
    ]),
    STATUSY_OFERTY: Object.freeze(['aktywna', 'wycofana', 'przyjeta']),
    STATUSY_AKCEPTACJI_PS: Object.freeze(['pelna', 'warunkowa']), // dopuszczające wymianę
    DLUGOSC_ID_BAJTY: 16,
});
