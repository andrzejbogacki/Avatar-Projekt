'use strict';

const sweph = require('sweph');
const { astronomia } = require('../../config');
const { normalizujKat } = require('./kwantyzacja');
const { inicjalizuj, flagiObliczen } = require('./pozycje');

/**
 * Moment wejścia formy nieświadomej: dokładne odjęcie 88° łuku słonecznego
 * od pozycji urodzenia. Wyszukiwanie numeryczne przecięcia długości Słońca
 * (swe_solcross libswe) — bez przybliżeń własnych.
 */
function momentFormyNieswiadomej(jd_et_urodzenia, dlugoscSloncaUrodzeniaDeg) {
    inicjalizuj();
    const cel = normalizujKat(
        dlugoscSloncaUrodzeniaDeg - astronomia.LUK_SLONECZNY_FORMY_NIESWIADOMEJ_DEG
    );
    const start = jd_et_urodzenia - astronomia.OKNO_WYSZUKIWANIA_LUKU_DNI;
    const wynik = sweph.solcross(cel, start, flagiObliczen());
    if (wynik.error) {
        throw new Error(`Wyszukiwanie łuku −88° nieudane: ${wynik.error}`);
    }
    if (!(wynik.date > start && wynik.date < jd_et_urodzenia)) {
        throw new Error(
            `Przecięcie łuku −88° poza oknem [${start}, ${jd_et_urodzenia}]: ${wynik.date}`
        );
    }
    return { jd_et: wynik.date, dlugosc_celu_deg: cel };
}

module.exports = { momentFormyNieswiadomej };
