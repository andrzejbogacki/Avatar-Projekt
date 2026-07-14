'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { formyWyrazu, formyTerminu } = require('../src/fleksja/regulowy');
const { zbudujIndeks, hashZrodla } = require('../src/indeks/budowa');

test('fleksja: wyraz zakończony spółgłoską dostaje polskie końcówki przypadków', () => {
    const formy = formyWyrazu('avatar');
    for (const oczekiwana of ['avatar', 'avatara', 'avatarowi', 'avatarem', 'avatarze', 'avatary', 'avatarów', 'avatarom', 'avatarami', 'avatarach']) {
        assert.ok(formy.includes(oczekiwana), `brak formy: ${oczekiwana}`);
    }
});

test('fleksja: wyraz na -a (żeński) i przymiotnik na -y odmieniane wg paradygmatów', () => {
    const zeński = formyWyrazu('bramka');
    for (const oczekiwana of ['bramka', 'bramki', 'bramce', 'bramkę', 'bramką', 'bramkom', 'bramkach']) {
        assert.ok(zeński.includes(oczekiwana), `brak formy: ${oczekiwana}`);
    }
    const przymiotnik = formyWyrazu('kwantowy');
    for (const oczekiwana of ['kwantowy', 'kwantowego', 'kwantowemu', 'kwantowym', 'kwantowa', 'kwantowej', 'kwantową', 'kwantowe', 'kwantowych', 'kwantowymi']) {
        assert.ok(przymiotnik.includes(oczekiwana), `brak formy: ${oczekiwana}`);
    }
});

test('fleksja: termin wielowyrazowy — kombinacje form członów, forma podstawowa zawsze pierwsza', () => {
    const formy = formyTerminu('Rezonator Kwantowy');
    assert.equal(formy[0], 'rezonator kwantowy'); // podstawowa (lowercase) na czele
    assert.ok(formy.includes('rezonatora kwantowego'));
    assert.ok(formy.includes('rezonatorze kwantowym'));
    assert.ok(formy.length <= konfig.MAKS_FORM_NA_TERMIN);
});

test('fleksja: przymiotnik na -e (liczba mnoga) — dopełniacz i narzędnik mnogi generowane', () => {
    const formy = formyTerminu('Jakości Kwantowe');
    assert.ok(formy.includes('jakości kwantowych'), 'brak: jakości kwantowych');
    assert.ok(formy.includes('jakościami kwantowymi') || formy.includes('jakości kwantowymi'),
        'brak narzędnika mnogiego');
});

test('fleksja: termin nieodmienny (cyfry, obce znaki) — co najmniej forma podstawowa', () => {
    const formy = formyTerminu('3 6 9');
    assert.equal(formy[0], '3 6 9');
    assert.ok(formy.length >= 1);
});

test('indeks: budowa z glosariusza — mapa forma→terminy, hash źródła, metadane', () => {
    const terminy = [
        { nazwa: 'Avatar', status: 'piaskownica', wprowadzenie: 'Istota…', rozszerzenie: '…' },
        { nazwa: 'Avatar Token', status: 'piaskownica', wprowadzenie: 'Voucher…', rozszerzenie: null },
    ];
    const zawartosc = JSON.stringify(terminy);
    const indeks = zbudujIndeks(terminy, zawartosc, () => 1_000_000);

    assert.equal(indeks.wersja, konfig.WERSJA_INDEKSU);
    assert.equal(indeks.silnik, 'regulowy');
    assert.equal(indeks.hash_zrodla, hashZrodla(zawartosc));
    assert.equal(indeks.zbudowano_ts, new Date(1_000_000).toISOString());
    assert.equal(indeks.statusy_form.Avatar, 'przyblizone'); // jawny status silnika regułowego

    // forma podstawowa wskazuje termin i jest oznaczona
    const podstawowa = indeks.formy['avatar'].find((w) => w.termin === 'Avatar');
    assert.equal(podstawowa.podstawowa, true);
    // forma odmieniona
    assert.ok(indeks.formy['avatarem'].some((w) => w.termin === 'Avatar'));
    // termin wielowyrazowy
    assert.ok(indeks.formy['avatar token'].some((w) => w.termin === 'Avatar Token'));
    assert.ok(indeks.maks_slow >= 2);
});

test('indeks: jedna forma wskazująca dwa terminy — oba obecne (kolizję rozstrzyga skaner)', () => {
    const terminy = [
        { nazwa: 'Token', status: 'piaskownica', wprowadzenie: 'a', rozszerzenie: null },
        { nazwa: 'token', status: 'piaskownica', wprowadzenie: 'b', rozszerzenie: null },
    ];
    const indeks = zbudujIndeks(terminy, JSON.stringify(terminy), () => 0);
    assert.equal(indeks.formy['token'].length, 2);
});
