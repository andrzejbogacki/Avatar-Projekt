'use strict';

// Definicje tokenów Wymiennika (ADR-004): klasy, podaż, podzielność.
module.exports = Object.freeze({
    KLASY_TOKENOW: Object.freeze(['avatar', 'wewnetrzny', 'zewnetrzny']),
    TYPY_PODAZY: Object.freeze(['stala', 'nieograniczona']),
    STATUSY_TOKENU: Object.freeze(['aktywny', 'wycofany']),
    WZORZEC_TOKEN_ID: /^[a-z][a-z0-9_]{1,63}$/,
    MAKS_PODZIELNOSC: 8,
    MAKS_DLUGOSC_TEKSTU: 2000,
    // klasa avatar: voucher osobisty — dokładnie jeden token tej klasy per Avatar,
    // podaż zawsze nieograniczona (emisja = wytworzenie produktu/usługi)
    JEDEN_TOKEN_AVATAR_NA_EMITENTA: true,
});
