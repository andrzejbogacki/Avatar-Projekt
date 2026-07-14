'use strict';

// Parametry warstwy normalizacji 3-6-9.
// Formuły i wagi = wnioski logiczne (formuła robocza) — spec nie definiuje
// liczbowo interferencji; kanoniczna formuła = punkt otwarty O7.

// Wagi wektorów składowej 3 (potencjał elektryczny / intencja — Astrologia Ewolucyjna).
const WAGI_SKLADOWEJ_3 = Object.freeze({
    pluton: 1,
    wezel_polnocny: 1,
    wezel_poludniowy: 1,
    // Chiron — wektor Astrologii Ewolucyjnej (decyzja Suwerena). Waga robocza = 1.
    chiron: 1,
    progresja: 1,
});

// Wagi aktywacji składowej 6 (matryca magnetyczna / forma — 64 bramki, siatka Kathara).
// TERMIN-KANDYDAT: Kathara (MCEO)
const WAGI_SKLADOWEJ_6 = Object.freeze({
    swiadoma: 1,
    nieswiadoma: 1,
});

// Modulacja środowiskowa rezonatora 9a (parametry z cache/).
const MODULACJA = Object.freeze({
    // Skala planetarnego indeksu Kp: 0–9.
    KP_MAX: 9,
    // Udział odchylenia Schumanna i Kp w czynniku modulacji (formuła robocza O7).
    WAGA_SCHUMANN: 0.5,
    WAGA_KP: 0.5,
});

// Skala pędu: prędkość długości ekliptycznej [°/d] odniesiona do średniego
// ruchu Słońca (~360°/365,25 d) — bezwymiarowy wektor pędu.
const SREDNI_RUCH_SLONCA_DEG_D = 360 / 365.25;

module.exports = Object.freeze({
    WAGI_SKLADOWEJ_3,
    WAGI_SKLADOWEJ_6,
    MODULACJA,
    SREDNI_RUCH_SLONCA_DEG_D,
});
