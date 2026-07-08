'use strict';

const sweph = require('sweph');
const { astronomia } = require('../../config');

/**
 * Konwersja czasu UTC na skale czasowe efemerydalne.
 * jd_et to TT (Terrestrial Time); różnica TDB−TT (człony okresowe ≤ 1,7 ms)
 * jest uwzględniana wewnętrznie przez libswe przy odczycie efemeryd JPL.
 */
function utcNaSkaleCzasowe({ rok, miesiac, dzien, godzina, minuta, sekunda }) {
    for (const [nazwa, wartosc] of Object.entries({ rok, miesiac, dzien, godzina, minuta, sekunda })) {
        if (!Number.isFinite(wartosc)) {
            throw new Error(`Nieprawidłowa składowa czasu UTC: ${nazwa}=${wartosc}`);
        }
    }
    const wynik = sweph.utc_to_jd(
        rok, miesiac, dzien, godzina, minuta, sekunda,
        sweph.constants.SE_GREG_CAL
    );
    if (wynik.flag !== sweph.constants.OK) {
        throw new Error(`Konwersja UTC→JD nieudana: ${wynik.error}`);
    }
    const [jd_et, jd_ut] = wynik.data;
    const delta_t_dni = sweph.deltat(jd_ut);
    return {
        jd_et,
        jd_ut,
        delta_t_s: delta_t_dni * astronomia.SEKUND_NA_DOBE,
        skala: 'TT (≈TDB; różnica okresowa obsługiwana przez libswe)',
    };
}

module.exports = { utcNaSkaleCzasowe };
