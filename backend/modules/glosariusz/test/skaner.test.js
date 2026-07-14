'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { zbudujIndeks } = require('../src/indeks/budowa');
const { oznaczTekst } = require('../src/skaner/oznacz');

const TERMINY = [
    { nazwa: 'Avatar', status: 'piaskownica', wprowadzenie: 'Istota suwerenna.', rozszerzenie: 'Pełny opis…' },
    { nazwa: 'Avatar Token', status: 'piaskownica', wprowadzenie: 'Voucher osobisty.', rozszerzenie: null },
    { nazwa: 'Rezonator Kwantowy', status: 'piaskownica', wprowadzenie: 'Stabilizator Źródła.', rozszerzenie: '…' },
];
const INDEKS = zbudujIndeks(TERMINY, JSON.stringify(TERMINY), () => 0);

function zlozony(segmenty) {
    return segmenty.map((s) => s.tekst).join('');
}

test('skaner: wykrywa formę podstawową i odmienioną; tekst widoczny bez żadnej zmiany', () => {
    const tekst = 'Każdy Avatar tworzy tokeny. Rozmawialiśmy o Avatarze wczoraj.';
    const segmenty = oznaczTekst(tekst, INDEKS);
    assert.equal(zlozony(segmenty), tekst); // sklejone segmenty = oryginał, co do znaku

    const trafienia = segmenty.filter((s) => s.termin);
    assert.equal(trafienia.length, 2);
    assert.equal(trafienia[0].tekst, 'Avatar');
    assert.equal(trafienia[0].termin, 'Avatar');
    assert.equal(trafienia[1].tekst, 'Avatarze'); // forma odmieniona, oryginalna pisownia
    assert.equal(trafienia[1].termin, 'Avatar');
});

test('skaner: kolizja podłańcucha — najdłuższe dopasowanie wygrywa (Avatar Token > Avatar)', () => {
    const segmenty = oznaczTekst('Wymień swój Avatar Token na usługę.', INDEKS);
    const trafienia = segmenty.filter((s) => s.termin);
    assert.equal(trafienia.length, 1);
    assert.equal(trafienia[0].termin, 'Avatar Token');
    assert.equal(trafienia[0].tekst, 'Avatar Token');
});

test('skaner: dopasowania nie zagnieżdżają się — po trafieniu skok za jego koniec', () => {
    const segmenty = oznaczTekst('Avatar Token Avatara', INDEKS);
    const trafienia = segmenty.filter((s) => s.termin);
    assert.deepEqual(trafienia.map((t) => t.termin), ['Avatar Token', 'Avatar']);
});

test('skaner: wielkość liter bez znaczenia dla dopasowania, pisownia oryginalna zachowana', () => {
    const segmenty = oznaczTekst('rezonatora kwantowego oraz AVATAR', INDEKS);
    const trafienia = segmenty.filter((s) => s.termin);
    assert.equal(trafienia[0].termin, 'Rezonator Kwantowy');
    assert.equal(trafienia[0].tekst, 'rezonatora kwantowego');
    assert.equal(trafienia[1].termin, 'Avatar');
    assert.equal(trafienia[1].tekst, 'AVATAR');
});

test('skaner: dopasowanie wyłącznie na granicach słów — "avatarowy" to nie "avatar"', () => {
    const segmenty = oznaczTekst('Styl avatarowy nie jest terminem.', INDEKS);
    assert.equal(segmenty.filter((s) => s.termin).length, 0);
});

test('skaner: segmenty niosą wprowadzenie (hover) — pełna definicja na żądanie przez API', () => {
    const segmenty = oznaczTekst('Avatar działa.', INDEKS, { terminy: TERMINY });
    const trafienie = segmenty.find((s) => s.termin);
    assert.equal(trafienie.wprowadzenie, 'Istota suwerenna.');
});

test('skaner: tekst bez terminów = jeden segment; pusty = pusta lista', () => {
    assert.equal(oznaczTekst('Zwykłe zdanie bez pojęć.', INDEKS).length, 1);
    assert.deepEqual(oznaczTekst('', INDEKS), []);
});
