'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const konfig = require('../config');
const { hashujHaslo, weryfikujHaslo, generujTokenAktywacji } = require('../src/logowanie/krypto');

test('krypto: hash hasła zawiera sól, hash i parametry scrypt z config', async () => {
    const rekord = await hashujHaslo('poprawne-haslo-123');
    assert.equal(typeof rekord.hash, 'string');
    assert.equal(typeof rekord.sol, 'string');
    assert.equal(rekord.hash.length, konfig.krypto.SCRYPT.DLUGOSC_KLUCZA_BAJTY * 2); // hex
    assert.equal(rekord.sol.length, konfig.krypto.DLUGOSC_SOLI_BAJTY * 2); // hex
    assert.deepEqual(rekord.parametry_scrypt, {
        KOSZT_N: konfig.krypto.SCRYPT.KOSZT_N,
        ROZMIAR_BLOKU_R: konfig.krypto.SCRYPT.ROZMIAR_BLOKU_R,
        ROWNOLEGLOSC_P: konfig.krypto.SCRYPT.ROWNOLEGLOSC_P,
    });
});

test('krypto: to samo hasło z różnymi solami daje różne hashe', async () => {
    const a = await hashujHaslo('poprawne-haslo-123');
    const b = await hashujHaslo('poprawne-haslo-123');
    assert.notEqual(a.sol, b.sol);
    assert.notEqual(a.hash, b.hash);
});

test('krypto: weryfikacja akceptuje poprawne hasło i odrzuca błędne', async () => {
    const rekord = await hashujHaslo('poprawne-haslo-123');
    assert.equal(await weryfikujHaslo('poprawne-haslo-123', rekord), true);
    assert.equal(await weryfikujHaslo('bledne-haslo-456', rekord), false);
});

test('krypto: hasło krótsze niż minimum odrzucane jawnym błędem', async () => {
    await assert.rejects(
        () => hashujHaslo('krotkie'),
        (blad) => blad.message.includes(String(konfig.krypto.MIN_DLUGOSC_HASLA))
    );
});

test('krypto: token aktywacji — hex o zadanej długości, unikalny', () => {
    const t1 = generujTokenAktywacji();
    const t2 = generujTokenAktywacji();
    assert.match(t1, /^[0-9a-f]+$/);
    assert.equal(t1.length, konfig.krypto.DLUGOSC_TOKENU_AKTYWACJI_BAJTY * 2);
    assert.notEqual(t1, t2);
});
