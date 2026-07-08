'use strict';

const { cache } = require('../../config');
const { pobierzJson } = require('./noaa_swpc');

// Geomagnetyzm: planetarny indeks Kp (dane źródłowe GFZ Potsdam, dystrybucja NOAA).
const kp = {
    klucz: 'kp',
    async pobierz(fetchFn = fetch) {
        const zrodlo = cache.ZRODLA.kp_noaa;
        const dane = await pobierzJson(zrodlo.url, fetchFn);
        const [naglowki, ...wiersze] = dane;
        const ostatni = wiersze[wiersze.length - 1];
        if (!ostatni) throw new Error('Brak wierszy danych indeksu Kp');
        const rekord = Object.fromEntries(naglowki.map((n, i) => [n, ostatni[i]]));
        return {
            zrodlo: zrodlo.nazwa,
            wartosc: { kp: Number(rekord.Kp), czas_pomiaru: rekord.time_tag },
        };
    },
};

module.exports = { kp };
