'use strict';

// Adresacja kanoniczna modułu (rejestr.json) — statusy: kandydat do czasu
// zasilenia rejestru decyzją Suwerena (punkt decyzyjny D2).
const ADRES_MODULU = 'modul.qac';          // kandydat // TERMIN-KANDYDAT: Quantum Avatar Core
const ADRES_QRT = 'modul.qac.qrt';         // kandydat // TERMIN-KANDYDAT: Quantum Rectification Tool
const STATUS_ADRESU = 'kandydat';

const WERSJA_SCHEMATU_PROFILU = '1.0.0';
const STATUS_ARTEFAKTU = 'piaskownica';

// Wzorzec avatar_id wg Protokołu Suwerenności (przykład kanoniczny: andrzej_bogacki).
// Wniosek logiczny: snake_case, małe litery ASCII, min. dwa człony.
const WZORZEC_AVATAR_ID = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

module.exports = Object.freeze({
    ADRES_MODULU,
    ADRES_QRT,
    STATUS_ADRESU,
    WERSJA_SCHEMATU_PROFILU,
    STATUS_ARTEFAKTU,
    WZORZEC_AVATAR_ID,
});
