'use strict';

// Częstotliwości Rezonatora (ADR-005) — jedyne źródło wartości Hz w module.
// Planetarne wg Kosmicznej Oktawy (Hans Cousto, 1978): f = (1/okres_s) · 2^oktawy.
// Hz wyliczane z okresów — spójność gwarantowana testem (zero magic numbers).

const SEKUND_W_DOBIE = 86_400;

// okres_dni = null → wartość publikowana bezpośrednio (hz_publikowane), bez wyprowadzenia.
const PLANETARNE = Object.freeze({
    ziemia_doba: Object.freeze({ nazwa: 'Ziemia — doba', okres_dni: 1, oktawy: 24, hz_publikowane: 194.18 }),
    ziemia_rok: Object.freeze({ nazwa: 'Ziemia — rok (Om)', okres_dni: 365.242, oktawy: 32, hz_publikowane: 136.10 }),
    rok_platonski: Object.freeze({ nazwa: 'Ziemia — rok platoński', okres_dni: 25_920 * 365.242, oktawy: 47, hz_publikowane: 172.06 }),
    ksiezyc_synodyczny: Object.freeze({ nazwa: 'Księżyc — miesiąc synodyczny', okres_dni: 29.53059, oktawy: 29, hz_publikowane: 210.42 }),
    slonce: Object.freeze({ nazwa: 'Słońce (ton Cousto)', okres_dni: null, oktawy: null, hz_publikowane: 126.22 }),
    merkury: Object.freeze({ nazwa: 'Merkury', okres_dni: 87.969, oktawy: 30, hz_publikowane: 141.27 }),
    wenus: Object.freeze({ nazwa: 'Wenus', okres_dni: 224.701, oktawy: 32, hz_publikowane: 221.23 }),
    mars: Object.freeze({ nazwa: 'Mars', okres_dni: 686.98, oktawy: 33, hz_publikowane: 144.72 }),
    jowisz: Object.freeze({ nazwa: 'Jowisz', okres_dni: 4332.59, oktawy: 36, hz_publikowane: 183.58 }),
    saturn: Object.freeze({ nazwa: 'Saturn', okres_dni: 10_759.22, oktawy: 37, hz_publikowane: 147.85 }),
    uran: Object.freeze({ nazwa: 'Uran', okres_dni: 30_685.4, oktawy: 39, hz_publikowane: 207.36 }), // okres wg podstawy obliczeń Cousto
    neptun: Object.freeze({ nazwa: 'Neptun', okres_dni: 60_182, oktawy: 40, hz_publikowane: 211.45 }),
    pluton: Object.freeze({ nazwa: 'Pluton', okres_dni: 90_737, oktawy: 40, hz_publikowane: 140.25 }),
});

function hzPlanetarne(id) {
    const wpis = PLANETARNE[id];
    if (!wpis) return null;
    if (wpis.okres_dni === null) return wpis.hz_publikowane;
    return (1 / (wpis.okres_dni * SEKUND_W_DOBIE)) * 2 ** wpis.oktawy;
}

// Solfeggio — pełna skala (spec: baza 432/528, skala do konfiguracji).
const SOLFEGGIO = Object.freeze({
    HZ_174: 174, HZ_285: 285, HZ_396: 396, HZ_417: 417,
    HZ_432: 432, HZ_528: 528, HZ_639: 639, HZ_741: 741, HZ_852: 852, HZ_963: 963,
});
const SOLFEGGIO_BAZA = Object.freeze([SOLFEGGIO.HZ_432, SOLFEGGIO.HZ_528]);

const TOLERANCJA_ZGODNOSCI_HZ = 0.01; // dopuszczalna różnica wyliczenia vs publikacja

module.exports = Object.freeze({
    SEKUND_W_DOBIE,
    PLANETARNE,
    hzPlanetarne,
    SOLFEGGIO,
    SOLFEGGIO_BAZA,
    TOLERANCJA_ZGODNOSCI_HZ,
});
