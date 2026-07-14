'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const konfig = require('../config');
const { RejestrSesji } = require('../src/sesje/rejestr');

test('sesje: utworzenie sesji — id o zadanej długości, wygaśnięcie wg TTL z config', () => {
    let teraz = 1_000_000;
    const rejestr = new RejestrSesji({ zegar: () => teraz });
    const sesja = rejestr.utworzSesje('jan_kowalski');
    assert.match(sesja.id, /^[0-9a-f]+$/);
    assert.equal(sesja.id.length, konfig.sesje.DLUGOSC_ID_SESJI_BAJTY * 2);
    assert.equal(sesja.avatar_id, 'jan_kowalski');
    assert.equal(sesja.wygasa_ts, new Date(teraz + konfig.sesje.TTL_SESJI_MS).toISOString());
});

test('sesje: weryfikacja aktywnej sesji zwraca avatar_id i status aktywna', () => {
    const rejestr = new RejestrSesji({ zegar: () => 1_000_000 });
    const { id } = rejestr.utworzSesje('jan_kowalski');
    assert.deepEqual(rejestr.weryfikujSesje(id), { status: 'aktywna', avatar_id: 'jan_kowalski' });
});

test('sesje: brak sesji = jawny status brak_sesji, nigdy cichy null', () => {
    const rejestr = new RejestrSesji({ zegar: () => 1_000_000 });
    assert.deepEqual(rejestr.weryfikujSesje('nieistniejacy'), { status: 'brak_sesji' });
    assert.deepEqual(rejestr.weryfikujSesje(undefined), { status: 'brak_sesji' });
});

test('sesje: sesja po TTL = jawny status wygasla i usunięcie z rejestru', () => {
    let teraz = 1_000_000;
    const rejestr = new RejestrSesji({ zegar: () => teraz });
    const { id } = rejestr.utworzSesje('jan_kowalski');
    teraz += konfig.sesje.TTL_SESJI_MS + 1;
    assert.deepEqual(rejestr.weryfikujSesje(id), { status: 'wygasla' });
    // ponowna weryfikacja: sesja już usunięta → brak_sesji
    assert.deepEqual(rejestr.weryfikujSesje(id), { status: 'brak_sesji' });
});

test('sesje: unieważnienie (wylogowanie) usuwa sesję', () => {
    const rejestr = new RejestrSesji({ zegar: () => 1_000_000 });
    const { id } = rejestr.utworzSesje('jan_kowalski');
    rejestr.uniewaznijSesje(id);
    assert.deepEqual(rejestr.weryfikujSesje(id), { status: 'brak_sesji' });
});
