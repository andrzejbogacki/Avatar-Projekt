'use strict';

// Synchronizacja (ADR-005): Sync(t) = mod(t, T).
module.exports = Object.freeze({
    T_DOMYSLNE_S: 360, // 6 min — rytm matrycy 3·6·9 (3·120 = 6·60 = 9·40); decyzja Suwerena 2026-07-12
    RYTM_BPM_DOMYSLNY: 60,
    RYTM_BPM_MIN: 20,
    RYTM_BPM_MAKS: 300,
});
