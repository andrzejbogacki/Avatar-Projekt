'use strict';

const { normalizacja, bramki } = require('../../config');

// 3 — Potencjał elektryczny / Intencja: Astrologia Ewolucyjna. // TERMIN-KANDYDAT: Astrologia Ewolucyjna
// Pluton, oś Węzłów Księżycowych, progresje jako wektory pędu.

function wektor(cialo, kat_deg, predkosc_deg_d, waga) {
    return {
        cialo,
        kat_deg,
        // pęd bezwymiarowy: prędkość odniesiona do średniego ruchu Słońca
        pend: predkosc_deg_d / normalizacja.SREDNI_RUCH_SLONCA_DEG_D,
        waga,
    };
}

/**
 * Buduje zbiór wektorów pędu składowej 3 z pozycji natalnych formy świadomej.
 * `progresje` (pozycje progresywne) są opcjonalnym wejściem z kalkulatora —
 * ich brak jest odnotowany jawnym statusem, nigdy dorozumiany.
 */
function skladowa3(pozycjeNatalne, progresje = null) {
    const w = normalizacja.WAGI_SKLADOWEJ_3;
    const pluton = pozycjeNatalne.pluton;
    const wezel = pozycjeNatalne.wezel_polnocny;
    const chiron = pozycjeNatalne.chiron;
    if (!pluton || !wezel || !chiron) {
        throw new Error('Składowa 3 wymaga pozycji Plutona, Węzła Północnego i Chirona');
    }

    const wektory = [
        wektor('pluton', pluton.dlugosc_ekliptyczna_deg, pluton.predkosc_dlugosci_deg_d, w.pluton),
        wektor('wezel_polnocny', wezel.dlugosc_ekliptyczna_deg, wezel.predkosc_dlugosci_deg_d, w.wezel_polnocny),
        wektor(
            'wezel_poludniowy',
            (wezel.dlugosc_ekliptyczna_deg + bramki.PELNE_KOLO_DEG / 2) % bramki.PELNE_KOLO_DEG,
            wezel.predkosc_dlugosci_deg_d,
            w.wezel_poludniowy
        ),
        wektor('chiron', chiron.dlugosc_ekliptyczna_deg, chiron.predkosc_dlugosci_deg_d, w.chiron),
    ];

    let statusProgresji = 'brak — nie przekazano pozycji progresywnych';
    if (progresje) {
        for (const [cialo, p] of Object.entries(progresje)) {
            wektory.push(
                wektor(`progresja_${cialo}`, p.dlugosc_ekliptyczna_deg, p.predkosc_dlugosci_deg_d, w.progresja)
            );
        }
        statusProgresji = 'uwzglednione';
    }

    return { typ: 'potencjal_elektryczny', wektory, status_progresji: statusProgresji };
}

module.exports = { skladowa3 };
