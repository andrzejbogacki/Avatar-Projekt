'use strict';

const { cache, czestotliwosci } = require('../../config');

/**
 * Rezonans Schumanna — parser częstotliwości i amplitudy piku bazowego (7,83 Hz).
 * Punkt otwarty O5: stacja/endpoint niewskazane przez Suwerena. Do czasu decyzji
 * źródło zgłasza jawny brak danych — zakaz cichej wartości domyślnej.
 */
const schumann = {
    klucz: 'schumann',
    async pobierz() {
        const zrodlo = cache.ZRODLA.schumann;
        if (!zrodlo.url) {
            throw new Error(
                `Endpoint Rezonansu Schumanna niezdefiniowany (punkt otwarty O5) — pik odniesienia ${czestotliwosci.SCHUMANN_PIK_BAZOWY_HZ} Hz`
            );
        }
        throw new Error('Parser stacji Schumanna niezaimplementowany — oczekuje decyzji O5');
    },
};

module.exports = { schumann };
