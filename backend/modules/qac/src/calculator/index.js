'use strict';

// Fasada silnika astronomiczno-matematycznego (pozycja 3 — impuls, mikro=makro).
const { utcNaSkaleCzasowe } = require('./czas');
const { pozycjeTopocentryczne } = require('./pozycje');
const { kwantyzuj } = require('./kwantyzacja');
const { momentFormyNieswiadomej } = require('./luk_sloneczny');
const { osieKatowe } = require('./osie');
const { parsFortunae } = require('./pars_fortunae');
const { nakszatra } = require('./nakszatry');

function aktywacjeZPozycji(pozycje) {
    const aktywacje = {};
    for (const [cialo, p] of Object.entries(pozycje)) {
        aktywacje[cialo] = kwantyzuj(p.dlugosc_ekliptyczna_deg);
    }
    return aktywacje;
}

// Mapa nakszatr (numer, pada) z długości SIDERALNEJ każdego obiektu.
// Same liczby — nazwy i władcy należą do warstwy znaczeń.
function nakszatryZPozycji(pozycje) {
    const nakszatry = {};
    for (const [cialo, p] of Object.entries(pozycje)) {
        nakszatry[cialo] = nakszatra(p.sideralna.dlugosc_ekliptyczna_deg);
    }
    return nakszatry;
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

    // Osie kątowe i Pars Fortunae tylko dla formy świadomej — zależą od horyzontu
    // i południka miejsca/chwili urodzenia (jd_ut, nie jd_et). Forma nieświadoma
    // (−88° łuku słonecznego) jest przesunięciem czasowym pozycji, nie odrębnym
    // momentem obserwacji, więc osie geograficzne dla niej nie mają sensu.
    const osie = osieKatowe(czas.jd_ut, obserwator);
    const pars = parsFortunae({
        dlugoscSlonca: pozycjeSwiadome.slonce.dlugosc_ekliptyczna_deg,
        dlugoscKsiezyca: pozycjeSwiadome.ksiezyc.dlugosc_ekliptyczna_deg,
        ascendent: osie.ascendent.dlugosc_ekliptyczna_deg,
    });

    return {
        czas,
        obserwator,
        forma_swiadoma: {
            jd_et: czas.jd_et,
            pozycje: pozycjeSwiadome,
            aktywacje: aktywacjeZPozycji(pozycjeSwiadome),
            osie,
            pars_fortunae: pars,
            nakszatry: nakszatryZPozycji(pozycjeSwiadome),
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
