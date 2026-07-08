'use strict';

const { cache } = require('../../config');

// Space Weather: rozbłyski (X-ray flux GOES) i wiatr słoneczny — NOAA SWPC.

async function pobierzJson(url, fetchFn) {
    const odpowiedz = await fetchFn(url, {
        signal: AbortSignal.timeout(cache.TIMEOUT_ZAPYTANIA_MS),
    });
    if (!odpowiedz.ok) {
        throw new Error(`HTTP ${odpowiedz.status} z ${url}`);
    }
    return odpowiedz.json();
}

const xray = {
    klucz: 'noaa_xray',
    async pobierz(fetchFn = fetch) {
        const zrodlo = cache.ZRODLA.noaa_xray;
        const dane = await pobierzJson(zrodlo.url, fetchFn);
        // Pasmo 0.1–0.8 nm = kanał klasyfikacji rozbłysków (A/B/C/M/X)
        const pasmo = dane.filter((r) => r.energy === '0.1-0.8nm');
        const ostatni = pasmo[pasmo.length - 1];
        if (!ostatni) throw new Error('Brak rekordów pasma 0.1-0.8nm w odpowiedzi NOAA');
        return {
            zrodlo: zrodlo.nazwa,
            wartosc: { flux_w_m2: Number(ostatni.flux), czas_pomiaru: ostatni.time_tag },
        };
    },
};

const wiatr = {
    klucz: 'noaa_wiatr',
    async pobierz(fetchFn = fetch) {
        const zrodlo = cache.ZRODLA.noaa_wiatr;
        const dane = await pobierzJson(zrodlo.url, fetchFn);
        // Format products: [nagłówki, ...wiersze]
        const [naglowki, ...wiersze] = dane;
        const ostatni = wiersze[wiersze.length - 1];
        if (!ostatni) throw new Error('Brak wierszy danych wiatru słonecznego');
        const rekord = Object.fromEntries(naglowki.map((n, i) => [n, ostatni[i]]));
        return {
            zrodlo: zrodlo.nazwa,
            wartosc: {
                gestosc_p_cm3: Number(rekord.density),
                predkosc_km_s: Number(rekord.speed),
                temperatura_k: Number(rekord.temperature),
                czas_pomiaru: rekord.time_tag,
            },
        };
    },
};

module.exports = { xray, wiatr, pobierzJson };
