'use strict';

// Pasma emisji (ADR-005): trójwarstwowe mapowanie + rozszerzenia sprzętowe.
// Sub i ultra DOMYŚLNIE WYŁĄCZONE (dedykowane przetworniki poza zakresem
// typowych głośników) — włączane parametrem, bez zmiany kodu.
module.exports = Object.freeze({
    PASMA: Object.freeze({
        sub: Object.freeze({ od_hz: 0.1, do_hz: 20, funkcja: 'rozszerzenie sprzętowe', domyslnie_wlaczone: false }),
        niskie: Object.freeze({ od_hz: 20, do_hz: 250, funkcja: 'fundament/stabilność (materia)', domyslnie_wlaczone: true }),
        srednie: Object.freeze({ od_hz: 250, do_hz: 2000, funkcja: 'relacje/przepływ informacji', domyslnie_wlaczone: true }),
        wysokie: Object.freeze({ od_hz: 2000, do_hz: 20_000, funkcja: 'wektor intencji (kierunek kreacji)', domyslnie_wlaczone: true }),
        ultra: Object.freeze({ od_hz: 20_000, do_hz: 100_000, funkcja: 'rozszerzenie sprzętowe', domyslnie_wlaczone: false }),
    }),
    WARSTWY_EMISJI: Object.freeze(['niskie', 'srednie', 'wysokie']),
    // amplitudy domyślne warstw (0..1) — fundament najsilniejszy, intencja subtelna
    AMPLITUDY_DOMYSLNE: Object.freeze({ niskie: 0.8, srednie: 0.5, wysokie: 0.3 }),
    FAZA_DOMYSLNA_RAD: 0,
});
