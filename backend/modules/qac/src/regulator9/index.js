'use strict';

// 9b — REGULATOR (aspekt regulacyjny pozycji 9, kernel_specyfikacja_v1.md):
// nad systemem, nie uczestniczy w obiegu obliczeniowym — kontroluje go.
// Trzy funkcje kontrolne: walidacja wejść, kontrola świeżości cache,
// bramka zapisu profilu.
const { walidujDaneWejsciowe } = require('./walidacja_wejscia');
const { kontrolujSwiezosc } = require('./kontrola_swiezosci');
const { autoryzujIZapisz, autoryzujIUsun, walidujProfil, KATALOG_PROFILI, KATALOG_KOSZA } = require('./bramka_zapisu');

module.exports = {
    walidujDaneWejsciowe,
    kontrolujSwiezosc,
    autoryzujIZapisz,
    autoryzujIUsun,
    walidujProfil,
    KATALOG_PROFILI,
    KATALOG_KOSZA,
};
