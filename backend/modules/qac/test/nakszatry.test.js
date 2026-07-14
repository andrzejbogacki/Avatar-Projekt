'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { nakszatra } = require('../src/calculator/nakszatry');

const SZER = 360 / 27; // szerokość nakszatry ≈ 13,333°
const PADA = SZER / 4;  // szerokość pady ≈ 3,333°

test('nakszatra: początek zodiaku → numer 0, pada 0', () => {
    assert.deepEqual(nakszatra(0), { numer: 0, pada: 0 });
});

test('nakszatra: Księżyc profilu (≈161,25° sideralnie) → numer 12, pada 0', () => {
    assert.deepEqual(nakszatra(161.25), { numer: 12, pada: 0 });
});

test('nakszatra: granice numeru i pady', () => {
    // koniec nakszatry 0 (ostatnia pada) / start nakszatry 1 (pierwsza pada)
    assert.deepEqual(nakszatra(SZER - 1e-9), { numer: 0, pada: 3 });
    assert.deepEqual(nakszatra(SZER), { numer: 1, pada: 0 });
    // granice pad w obrębie nakszatry 0
    assert.equal(nakszatra(PADA - 1e-9).pada, 0);
    assert.equal(nakszatra(PADA).pada, 1);
    assert.equal(nakszatra(3 * PADA).pada, 3);
    // ostatnia nakszatra, ostatnia pada
    assert.deepEqual(nakszatra(360 - 1e-9), { numer: 26, pada: 3 });
});

test('nakszatra: normalizacja wejścia do [0,360)', () => {
    assert.deepEqual(nakszatra(360), { numer: 0, pada: 0 });
    assert.deepEqual(nakszatra(-1e-9), { numer: 26, pada: 3 });
    assert.deepEqual(nakszatra(360 + 161.25), { numer: 12, pada: 0 });
    assert.deepEqual(nakszatra(-360 + 161.25), { numer: 12, pada: 0 });
});

test('nakszatra: pełny zakres — numer 0–26, pada 0–3', () => {
    for (let d = 0; d < 360; d += 0.37) {
        const { numer, pada } = nakszatra(d);
        assert.ok(Number.isInteger(numer) && numer >= 0 && numer <= 26, `numer=${numer} dla ${d}`);
        assert.ok(Number.isInteger(pada) && pada >= 0 && pada <= 3, `pada=${pada} dla ${d}`);
    }
});
