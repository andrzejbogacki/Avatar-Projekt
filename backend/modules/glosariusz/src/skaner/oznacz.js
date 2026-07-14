'use strict';

// Skaner (pozycja 3 — impuls): detekcja terminów w dowolnym tekście przez
// prosty odczyt prekomputowanego indeksu — bez NLP w czasie działania.
// Reguła kolizji (ADR-006): najdłuższe dopasowanie wygrywa; remis → forma
// podstawowa; skan od lewej, bez zagnieżdżeń; tekst widoczny bez zmian.
const konfig = require('../../config');

// słowo = ciąg liter/cyfr (z polskimi znakami); reszta to separatory
const WZORZEC_SLOWA = /[0-9a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ-]+/gu;

function tokenizuj(tekst) {
    const slowa = [];
    for (const m of tekst.matchAll(WZORZEC_SLOWA)) {
        slowa.push({ tekst: m[0], od: m.index, do: m.index + m[0].length });
    }
    return slowa;
}

function wybierzTermin(wpisy) {
    // remis długości rozstrzyga forma podstawowa (ADR-006)
    const podstawowy = wpisy.find((w) => w.podstawowa);
    return (podstawowy ?? wpisy[0]).termin;
}

function oznaczTekst(tekst, indeks, { terminy } = {}) {
    if (typeof tekst !== 'string' || tekst.length === 0) return [];
    if (tekst.length > konfig.MAKS_DLUGOSC_TEKSTU_SKANU) {
        throw new Error(`Tekst przekracza limit skanowania (${konfig.MAKS_DLUGOSC_TEKSTU_SKANU} znaków)`);
    }
    const wprowadzenia = new Map((terminy ?? []).map((t) => [t.nazwa, t.wprowadzenie]));
    const slowa = tokenizuj(tekst);
    const segmenty = [];
    let pozycjaTekstu = 0;
    let i = 0;

    while (i < slowa.length) {
        let trafienie = null;
        // najdłuższe dopasowanie: od maksymalnej liczby słów w dół
        const maks = Math.min(indeks.maks_slow, slowa.length - i);
        for (let n = maks; n >= 1; n--) {
            const od = slowa[i].od;
            const do_ = slowa[i + n - 1].do;
            const fragment = tekst.slice(od, do_).toLowerCase();
            const wpisy = indeks.formy[fragment];
            if (wpisy && wpisy.length > 0) {
                trafienie = { od, do: do_, termin: wybierzTermin(wpisy), n };
                break;
            }
        }
        if (!trafienie) { i += 1; continue; }

        if (trafienie.od > pozycjaTekstu) {
            segmenty.push({ tekst: tekst.slice(pozycjaTekstu, trafienie.od) });
        }
        segmenty.push({
            tekst: tekst.slice(trafienie.od, trafienie.do), // pisownia oryginalna
            termin: trafienie.termin,
            ...(wprowadzenia.has(trafienie.termin)
                ? { wprowadzenie: wprowadzenia.get(trafienie.termin) } : {}),
        });
        pozycjaTekstu = trafienie.do;
        i += trafienie.n; // bez zagnieżdżeń — skok za koniec dopasowania
    }
    if (pozycjaTekstu < tekst.length) {
        segmenty.push({ tekst: tekst.slice(pozycjaTekstu) });
    }
    return segmenty;
}

module.exports = { oznaczTekst, tokenizuj };
