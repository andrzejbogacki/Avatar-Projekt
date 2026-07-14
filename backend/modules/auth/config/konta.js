'use strict';

// Parametry magazynu kont (pozycja 6 — forma): JSON per avatar_id (ADR-002).
module.exports = Object.freeze({
    STATUSY_KONTA: Object.freeze(['oczekuje_aktywacji', 'aktywne', 'zablokowane']),
    WZORZEC_AVATAR_ID: /^[a-z][a-z0-9_]{2,63}$/, // snake_case, bez diakrytyków (KONWENCJE §1)
    SUWEREN_AVATAR_ID: 'andrzej_bogacki',
    // Stan certyfikacji PS przy utworzeniu konta — wartość certyfikatu NIEROZSTRZYGNIĘTA
    // (ADR-002, decyzja Suwerena odroczona); stan jawny zamiast cichego domyślnego.
    STATUS_CERTYFIKACJI_STARTOWY: 'certyfikacja_oczekujaca',
});
