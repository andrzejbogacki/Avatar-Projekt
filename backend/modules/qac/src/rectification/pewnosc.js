'use strict';

const { rektyfikacja } = require('../../config');

/**
 * Metryka `pewnosc` wyniku rektyfikacji — obowiązkowa; zakaz zwracania
 * czasu bez metryki. Formuła robocza (punkt otwarty O8):
 * pewnosc = w_d · dopasowanie_najlepszego + w_m · margines_nad_drugim, ∈ [0,1].
 */
function wybierzNajlepszego(oceny) {
    if (!Array.isArray(oceny) || oceny.length === 0) {
        throw new Error('QRT: brak ocen kandydatów — pewnosc niewyznaczalna');
    }
    const posortowane = [...oceny].sort((a, b) => b.dopasowanie - a.dopasowanie);
    const najlepszy = posortowane[0];
    const drugi = posortowane[1] || null;

    const margines =
        najlepszy.dopasowanie > 0 && drugi
            ? (najlepszy.dopasowanie - drugi.dopasowanie) / najlepszy.dopasowanie
            : 0;
    const { WAGA_DOPASOWANIA, WAGA_MARGINESU } = rektyfikacja.PEWNOSC;
    const pewnosc = WAGA_DOPASOWANIA * najlepszy.dopasowanie + WAGA_MARGINESU * margines;

    return {
        jd_et: najlepszy.jd_et,
        jd_ut: najlepszy.jd_ut,
        pewnosc,
        skladowe_pewnosci: {
            dopasowanie: najlepszy.dopasowanie,
            margines_nad_drugim: margines,
            formula: 'robocza (O8)',
        },
        liczba_kandydatow: oceny.length,
    };
}

module.exports = { wybierzNajlepszego };
