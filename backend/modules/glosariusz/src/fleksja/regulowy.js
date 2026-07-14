'use strict';

// Zapasowy generator form fleksyjnych (ADR-006): paradygmaty regułowe
// polszczyzny. Formy mają status `przyblizone` — nadgeneracja jest niegroźna
// w indeksie dopasowań (błędna forma nie wystąpi w tekście), a silnik
// kanoniczny (Morfeusz2) podmienia ten generator bez zmiany kontraktów.
const konfig = require('../../config');

const TYLKO_LITERY = /^[a-ząćęłńóśźż-]+$/;

function formyWyrazu(wyraz) {
    const w = wyraz.toLowerCase();
    if (!TYLKO_LITERY.test(w) || w.length < 3) return [w];

    const formy = new Set([w]);

    if (w.endsWith('ość')) {
        const rdzen = w.slice(0, -3);
        for (const k of ['ości', 'ością', 'ościom', 'ościami', 'ościach']) formy.add(rdzen + k);
    } else if (w.endsWith('ści')) {
        // rzeczownik żeński miękkotematowy — forma mnoga/dopełniaczowa (jakości, wartości)
        formy.add(w.slice(0, -1) + 'ć'); // jakość
        for (const k of ['ą', 'om', 'ami', 'ach']) formy.add(w + k); // jakościami…
    } else if (w.endsWith('y') || w.endsWith('i')) {
        // paradygmat przymiotnikowy (kwantowy, błędny, suwerenny)
        const rdzen = w.slice(0, -1);
        const miekki = w.endsWith('i');
        for (const k of ['ego', 'emu', 'a', 'ej', 'ą', 'e']) formy.add(rdzen + k);
        for (const k of miekki ? ['im', 'ich', 'imi'] : ['ym', 'ych', 'ymi']) formy.add(rdzen + k);
    } else if (w.endsWith('a')) {
        // paradygmat żeński (bramka, certyfikacja)
        const rdzen = w.slice(0, -1);
        for (const k of ['y', 'i', 'ie', 'ę', 'ą', 'o', 'om', 'ami', 'ach']) formy.add(rdzen + k);
        if (rdzen.endsWith('k')) {
            formy.add(rdzen.slice(0, -1) + 'ce'); // bramka → bramce
        }
        if (rdzen.endsWith('j')) {
            formy.add(rdzen.slice(0, -1) + 'i'); // certyfikacja → certyfikacji
        }
    } else if (w.endsWith('o') || w.endsWith('e')) {
        // paradygmat nijaki (źródło, pole)
        const rdzen = w.slice(0, -1);
        for (const k of ['a', 'u', 'em', 'om', 'ami', 'ach']) formy.add(rdzen + k);
        if (w.endsWith('we') || w.endsWith('ne')) {
            // przymiotnik w liczbie mnogiej (kwantowe, suwerenne) — pełna odmiana
            for (const k of ['y', 'ego', 'emu', 'ym', 'ej', 'ą', 'ych', 'ymi']) formy.add(rdzen + k);
        }
    } else {
        // paradygmat męski spółgłoskowy (avatar, token, protokół)
        for (const k of ['a', 'owi', 'em', 'u', 'y', 'e', 'i', 'ów', 'om', 'ami', 'ach', 'ie']) {
            formy.add(w + k);
        }
        // miejscownik z wymianą spółgłoski
        if (w.endsWith('r')) formy.add(w.slice(0, -1) + 'rze');    // avatar → avatarze
        if (w.endsWith('t')) formy.add(w.slice(0, -1) + 'cie');    // student → studencie
        if (w.endsWith('d')) formy.add(w.slice(0, -1) + 'dzie');
        if (w.endsWith('ł')) formy.add(w.slice(0, -1) + 'le');     // protokół → protokole (aprox.)
    }
    return [...formy];
}

function formyTerminu(nazwa) {
    const slowa = nazwa.trim().split(/\s+/);
    const formySlow = slowa.map((s) => formyWyrazu(s));

    // limit kombinacji: K^n ≤ MAKS_FORM_NA_TERMIN (nadmiar ucinany deterministycznie)
    const K = Math.max(1, Math.floor(konfig.MAKS_FORM_NA_TERMIN ** (1 / slowa.length)));
    const ograniczone = formySlow.map((f) => f.slice(0, K));

    let kombinacje = [''];
    for (const formy of ograniczone) {
        const nowe = [];
        for (const dotychczas of kombinacje) {
            for (const forma of formy) {
                nowe.push(dotychczas ? `${dotychczas} ${forma}` : forma);
            }
        }
        kombinacje = nowe;
    }
    const podstawowa = slowa.map((s) => s.toLowerCase()).join(' ');
    // forma podstawowa zawsze pierwsza (rozstrzyganie remisów w skanerze)
    return [podstawowa, ...kombinacje.filter((k) => k !== podstawowa)]
        .slice(0, konfig.MAKS_FORM_NA_TERMIN);
}

module.exports = { formyWyrazu, formyTerminu };
