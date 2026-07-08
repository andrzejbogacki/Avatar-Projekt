'use strict';

const { normalizacja, siatka12d, czestotliwosci, bramki } = require('../../config');

// 9a — REZONATOR: matematyczny punkt przecięcia (interferencja falowa)
// składowych 3 i 6, modyfikowany parametrami środowiskowymi z cache/.
// Formuła robocza (wniosek logiczny) — kanoniczna formuła: punkt otwarty O7.

const STOPNIE_NA_RADIAN = 180 / Math.PI;
const SZEROKOSC_WYMIARU_DEG = bramki.PELNE_KOLO_DEG / siatka12d.LICZBA_WYMIAROW;

function wymiarZKata(kat_deg) {
    return Math.min(
        Math.floor(kat_deg / SZEROKOSC_WYMIARU_DEG),
        siatka12d.LICZBA_WYMIAROW - 1
    );
}

// Superpozycja zespolona elementów {kat_deg, amplituda} w binach siatki 12D.
function superpozycja12d(elementy) {
    const biny = Array.from({ length: siatka12d.LICZBA_WYMIAROW }, () => ({ re: 0, im: 0 }));
    for (const el of elementy) {
        const faza = el.kat_deg / STOPNIE_NA_RADIAN;
        const bin = biny[wymiarZKata(el.kat_deg)];
        bin.re += el.amplituda * Math.cos(faza);
        bin.im += el.amplituda * Math.sin(faza);
    }
    return biny;
}

function amplitudy(biny) {
    return biny.map((b) => Math.hypot(b.re, b.im));
}

/**
 * Czynnik modulacji środowiskowej z migawki cache. Parametry o statusie
 * 'stale' lub bez wartości nie modulują (czynnik neutralny 1) — ich wykluczenie
 * jest jawnie odnotowane w stemplach.
 */
function czynnikModulacji(migawka) {
    const m = normalizacja.MODULACJA;
    let czynnik = 1;
    const stemple = {};
    for (const [klucz, rekord] of Object.entries(migawka || {})) {
        stemple[klucz] = rekord
            ? {
                  zrodlo: rekord.zrodlo,
                  timestamp: rekord.timestamp,
                  status: rekord.status,
                  ...(rekord.blad ? { blad: rekord.blad } : {}),
              }
            : { zrodlo: klucz, timestamp: null, status: 'stale', blad: 'brak rekordu w buforze' };
        if (!rekord || rekord.status === 'stale' || rekord.wartosc === null) continue;

        if (klucz === 'schumann' && Number.isFinite(rekord.wartosc.czestotliwosc_hz)) {
            const odchylenie =
                rekord.wartosc.czestotliwosc_hz / czestotliwosci.SCHUMANN_PIK_BAZOWY_HZ - 1;
            czynnik += m.WAGA_SCHUMANN * odchylenie;
        }
        if (klucz === 'kp' && Number.isFinite(rekord.wartosc.kp)) {
            czynnik += m.WAGA_KP * (rekord.wartosc.kp / m.KP_MAX);
        }
    }
    return { czynnik, stemple };
}

/**
 * Interferencja 3×6 → znormalizowany wektor częstotliwości siatki 12D.
 * Zwraca mapę 3·6·9 z normami składowych i stemplami pochodzenia
 * per parametr środowiskowy.
 */
function interferencja(skl3, skl6, migawkaCache) {
    const biny3 = superpozycja12d(
        skl3.wektory.map((w) => ({ kat_deg: w.kat_deg, amplituda: w.waga * (1 + Math.abs(w.pend)) }))
    );
    const biny6 = superpozycja12d(
        skl6.aktywacje.map((a) => ({ kat_deg: a.kat_deg, amplituda: a.waga }))
    );

    const { czynnik, stemple } = czynnikModulacji(migawkaCache);

    // Interferencja: suma zespolona pól 3 i 6 w każdym wymiarze, skalowana modulacją.
    const binyInterferencji = biny3.map((b3, i) => ({
        re: (b3.re + biny6[i].re) * czynnik,
        im: (b3.im + biny6[i].im) * czynnik,
    }));
    const amplitudyInterferencji = amplitudy(binyInterferencji);
    const suma = amplitudyInterferencji.reduce((a, b) => a + b, 0);
    const wektorZnormalizowany =
        suma > 0 ? amplitudyInterferencji.map((a) => a / suma) : amplitudyInterferencji;

    const norma = (xs) => Math.hypot(...xs);
    return {
        wektor_czestotliwosci_12d: wektorZnormalizowany,
        czestotliwosc_odniesienia_hz: czestotliwosci.POZYCJA_6_HZ,
        pozycja_3: norma(amplitudy(biny3)),
        pozycja_6: norma(amplitudy(biny6)),
        pozycja_9_rezonans: norma(amplitudyInterferencji),
        czynnik_modulacji: czynnik,
        formula: 'robocza (O7) — superpozycja zespolona 3+6 w binach 12D, modulacja środowiskowa',
        stemple_srodowiskowe: stemple,
    };
}

module.exports = { interferencja, superpozycja12d, czynnikModulacji, wymiarZKata };
