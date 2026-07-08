'use strict';

// Fasada silnika astronomiczno-matematycznego (pozycja 3 — impuls, mikro=makro).
const { utcNaSkaleCzasowe } = require('./czas');
const { pozycjeTopocentryczne } = require('./pozycje');
const { kwantyzuj } = require('./kwantyzacja');
const { momentFormyNieswiadomej } = require('./luk_sloneczny');

function aktywacjeZPozycji(pozycje) {
    const aktywacje = {};
    for (const [cialo, p] of Object.entries(pozycje)) {
        aktywacje[cialo] = kwantyzuj(p.dlugosc_ekliptyczna_deg);
    }
    return aktywacje;
}

/**
 * Pełny przebieg obliczeniowy dla danych urodzeniowych:
 * skale czasowe → pozycje topocentryczne (forma świadoma) → moment −88°
 * (forma nieświadoma) → kwantyzacja 64 bramek dla obu form.
 */
function obliczDaneSurowe(daneUrodzeniowe) {
    const { czas_utc, obserwator } = daneUrodzeniowe;
    const czas = utcNaSkaleCzasowe(czas_utc);
    const pozycjeSwiadome = pozycjeTopocentryczne(czas.jd_et, obserwator);

    const nieswiadome = momentFormyNieswiadomej(
        czas.jd_et,
        pozycjeSwiadome.slonce.dlugosc_ekliptyczna_deg
    );
    const pozycjeNieswiadome = pozycjeTopocentryczne(nieswiadome.jd_et, obserwator);

    return {
        czas,
        obserwator,
        forma_swiadoma: {
            jd_et: czas.jd_et,
            pozycje: pozycjeSwiadome,
            aktywacje: aktywacjeZPozycji(pozycjeSwiadome),
        },
        forma_nieswiadoma: {
            jd_et: nieswiadome.jd_et,
            pozycje: pozycjeNieswiadome,
            aktywacje: aktywacjeZPozycji(pozycjeNieswiadome),
        },
    };
}

module.exports = {
    obliczDaneSurowe,
    utcNaSkaleCzasowe,
    pozycjeTopocentryczne,
    kwantyzuj,
    momentFormyNieswiadomej,
};
