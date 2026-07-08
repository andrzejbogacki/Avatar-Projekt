'use strict';

// Cykl odpytywania zewnętrznych API (qac_prompt_v2.md, sekcja 2).
const CYKL_ODPYTYWANIA_MS = 60_000;

// Próg świeżości dla regulatora 9b: rekord starszy = status 'stale' i odrzucenie.
// Punkt otwarty O2 — wartość robocza 5 cykli, wymaga zatwierdzenia Suwerena.
const PROG_SWIEZOSCI_MS = 5 * CYKL_ODPYTYWANIA_MS;

// Limit czasu pojedynczego zapytania HTTP.
const TIMEOUT_ZAPYTANIA_MS = 10_000;

// Endpointy źródeł zewnętrznych.
const ZRODLA = Object.freeze({
    noaa_xray: Object.freeze({
        nazwa: 'NOAA SWPC — X-ray flux (GOES)',
        url: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
    }),
    noaa_wiatr: Object.freeze({
        nazwa: 'NOAA SWPC — wiatr słoneczny (plazma)',
        url: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
    }),
    kp_noaa: Object.freeze({
        nazwa: 'NOAA — planetarny indeks Kp (dane GFZ Potsdam)',
        url: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    }),
    schumann: Object.freeze({
        nazwa: 'Rezonans Schumanna',
        // Punkt otwarty O5: stacja/endpoint niezdefiniowane. Brak URL = źródło
        // zwraca jawny status braku danych — zakaz cichej wartości domyślnej.
        url: null,
    }),
});

// Konfiguracja połączenia Redis (bufor główny; fallback in-memory przy braku).
const REDIS = Object.freeze({
    url: process.env.QAC_REDIS_URL || 'redis://127.0.0.1:6379',
    prefiks_klucza: 'qac:cache:',
    timeout_polaczenia_ms: 2_000,
});

module.exports = Object.freeze({
    CYKL_ODPYTYWANIA_MS,
    PROG_SWIEZOSCI_MS,
    TIMEOUT_ZAPYTANIA_MS,
    ZRODLA,
    REDIS,
});
