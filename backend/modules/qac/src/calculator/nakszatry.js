'use strict';

// 27 nakszatr — podział ekliptyki SIDERALNEJ na 27 równych odcinków po 4 pady.
// Czysta matematyka podziału koła, zero efemeryd. Same liczby (numer, pada) —
// nazwy i władcy nakszatr należą do warstwy znaczeń, nie tutaj.

const PELNE_KOLO_DEG = 360;
const LICZBA_NAKSZATR = 27;
const PAD_NA_NAKSZATRE = 4;

const SZEROKOSC_NAKSZATRY_DEG = PELNE_KOLO_DEG / LICZBA_NAKSZATR;        // 13,333…°
const SZEROKOSC_PADY_DEG = SZEROKOSC_NAKSZATRY_DEG / PAD_NA_NAKSZATRE;   // 3,333…°

function normalizuj(deg) {
    const k = deg % PELNE_KOLO_DEG;
    return k < 0 ? k + PELNE_KOLO_DEG : k;
}

/**
 * Nakszatra i pada dla długości SIDERALNEJ [°].
 * @returns {{ numer: number, pada: number }} numer 0–26, pada 0–3.
 */
function nakszatra(dlugoscSideralnaDeg) {
    const dl = normalizuj(dlugoscSideralnaDeg);
    // clamp chroni przed skrajem zmiennoprzecinkowym przy dł. bliskiej 360°.
    const numer = Math.min(LICZBA_NAKSZATR - 1, Math.floor(dl / SZEROKOSC_NAKSZATRY_DEG));
    const resztaWNakszatrze = dl - numer * SZEROKOSC_NAKSZATRY_DEG;
    const pada = Math.min(PAD_NA_NAKSZATRE - 1, Math.floor(resztaWNakszatrze / SZEROKOSC_PADY_DEG));
    return { numer, pada };
}

module.exports = { nakszatra, SZEROKOSC_NAKSZATRY_DEG, SZEROKOSC_PADY_DEG };
