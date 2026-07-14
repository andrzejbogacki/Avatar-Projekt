'use strict';

// Parametry warstwy sesji (pozycja 9a — rezonator; wniosek logiczny zatwierdzony 2026-07-11).
module.exports = Object.freeze({
    TTL_SESJI_MS: 12 * 60 * 60 * 1000, // 12 h
    DLUGOSC_ID_SESJI_BAJTY: 32,
    NAZWA_COOKIE: 'avatar_sesja',
    // Rejestr w pamięci: restart serwera = ponowne logowanie (konsekwencja jawna, ADR-002).
});
