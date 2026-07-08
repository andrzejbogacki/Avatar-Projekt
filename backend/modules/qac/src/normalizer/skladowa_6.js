'use strict';

const { normalizacja, bramki } = require('../../config');

// 6 — Matryca magnetyczna / Forma: aktywacje świadome i nieświadome z sekcji
// 64 bramek oraz siatka pól Kathara (MCEO).
// TERMIN-KANDYDAT: 64 Bramki, Kathara (MCEO)

// Kąt środka bramki na kole (do wyznaczenia fazy aktywacji).
function katSrodkaBramki(numerBramki) {
    const indeks = bramki.KOLEJNOSC_BRAMEK.indexOf(numerBramki);
    if (indeks === -1) throw new Error(`Nieznana bramka: ${numerBramki}`);
    return (indeks + 0.5) * bramki.SZEROKOSC_BRAMKI_DEG;
}

/**
 * Buduje zbiór aktywacji składowej 6 z kwantyzacji obu form.
 * Każda aktywacja niesie fazę (kąt środka bramki) i wagę formy.
 */
function skladowa6(aktywacjeSwiadome, aktywacjeNieswiadome) {
    if (!aktywacjeSwiadome || !aktywacjeNieswiadome) {
        throw new Error('Składowa 6 wymaga aktywacji obu form (świadomej i nieświadomej)');
    }
    const w = normalizacja.WAGI_SKLADOWEJ_6;
    const aktywacje = [];
    for (const [forma, zbior, waga] of [
        ['swiadoma', aktywacjeSwiadome, w.swiadoma],
        ['nieswiadoma', aktywacjeNieswiadome, w.nieswiadoma],
    ]) {
        for (const [cialo, a] of Object.entries(zbior)) {
            aktywacje.push({
                forma,
                cialo,
                bramka: a.bramka,
                linia: a.linia,
                kat_deg: katSrodkaBramki(a.bramka),
                waga,
            });
        }
    }
    return { typ: 'matryca_magnetyczna', aktywacje };
}

module.exports = { skladowa6, katSrodkaBramki };
