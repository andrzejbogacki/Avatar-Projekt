'use strict';

// Parametry kryptograficzne modułu Auth (ADR-002).
// Wyłącznie prymitywy node:crypto — scrypt wg zaleceń OWASP (N=2^17, r=8, p=1).
module.exports = Object.freeze({
    SCRYPT: Object.freeze({
        KOSZT_N: 131072,          // 2^17 — koszt CPU/pamięci
        ROZMIAR_BLOKU_R: 8,
        ROWNOLEGLOSC_P: 1,
        DLUGOSC_KLUCZA_BAJTY: 64,
        MAKS_PAMIEC_BAJTY: 256 * 1024 * 1024, // wymagane > 128*N*r
    }),
    DLUGOSC_SOLI_BAJTY: 32,
    DLUGOSC_TOKENU_AKTYWACJI_BAJTY: 32, // token jednorazowy, hex
    MIN_DLUGOSC_HASLA: 12,
});
