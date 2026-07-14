'use strict';

// Synchronizacja (pozycja 9a — rezonans): Sync(t) = mod(t, T).
// Cykliczne odświeżanie sygnatury Źródła — analogia zegara systemowego.

const MS_W_SEKUNDZIE = 1000;

function sync(t_s, T_s) {
    return t_s % T_s;
}

// Sygnatura Źródła w chwili t (ms) — samodzielny odczyt stanu rezonansu.
function sygnaturaZrodla(zrodlo, teraz_ms) {
    const t_s = Math.floor(teraz_ms / MS_W_SEKUNDZIE);
    const sync_s = sync(t_s, zrodlo.T_s);
    return {
        zrodlo_id: zrodlo.zrodlo_id,
        wibracja_f: zrodlo.wibracja_f,
        rytm_bpm: zrodlo.rytm_bpm,
        misja: zrodlo.misja,
        T_s: zrodlo.T_s,
        sync_s,
        faza_cyklu: sync_s / zrodlo.T_s,
        timestamp: new Date(teraz_ms).toISOString(),
    };
}

module.exports = { sync, sygnaturaZrodla, MS_W_SEKUNDZIE };
