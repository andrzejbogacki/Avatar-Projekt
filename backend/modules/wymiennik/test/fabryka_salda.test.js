'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { MagazynTokenow } = require('../src/fabryka/magazyn_tokenow');
const { MagazynSald } = require('../src/salda/magazyn_sald');
const { Fabryka } = require('../src/fabryka/fabryka');

function srodowisko() {
    const tokeny = new MagazynTokenow({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'wym-tokeny-')),
    });
    const salda = new MagazynSald({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'wym-salda-')),
    });
    const fabryka = new Fabryka({ tokeny, salda, zegar: () => 1_000_000 });
    return { tokeny, salda, fabryka };
}

test('fabryka: avatar token (voucher) — saldo startowe 0, emisja dopisuje do salda emitenta', async () => {
    const { fabryka, salda } = srodowisko();
    const wynik = await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan', nazwa: 'Godzina stolarki Jana', opis: 'usługa',
        klasa: 'avatar', podaz: { typ: 'nieograniczona', wielkosc: null },
        podzielnosc: 0, mapowanie_369: 3,
    });
    assert.equal(wynik.status, 'utworzono');
    assert.equal(wynik.token.emitent, 'jan_kowalski');

    // saldo startowe: 0 (ADR-004 — nic nie jest kreowane z powietrza)
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 0);

    // emisja = wytworzenie produktu/usługi → vouchery na saldo emitenta
    const emisja = await fabryka.emituj('jan_kowalski', 'voucher_jan', 5);
    assert.equal(emisja.status, 'wyemitowano');
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 5);

    // emitować może wyłącznie emitent
    assert.equal((await fabryka.emituj('inny_avatar', 'voucher_jan', 5)).status, 'odmowa');
});

test('fabryka: jeden token klasy avatar per Avatar', async () => {
    const { fabryka } = srodowisko();
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan', nazwa: 'v1', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    const drugi = await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan_2', nazwa: 'v2', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    assert.equal(drugi.status, 'odmowa');
    assert.match(drugi.powod, /avatar/);
});

test('fabryka: podaż stała — całość na saldo emitenta przy utworzeniu, dodruk odmawiany', async () => {
    const { fabryka, salda } = srodowisko();
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'zloto_jana', nazwa: 'Złoto', opis: '', klasa: 'wewnetrzny',
        podaz: { typ: 'stala', wielkosc: 1000 }, podzielnosc: 2, mapowanie_369: 6,
    });
    assert.equal(await salda.stan('jan_kowalski', 'zloto_jana'), 1000);
    assert.equal((await fabryka.emituj('jan_kowalski', 'zloto_jana', 1)).status, 'odmowa');
});

test('fabryka: walidacje — duplikat id, zła klasa, zła podaż, podzielność poza zakresem', async () => {
    const { fabryka } = srodowisko();
    const poprawny = {
        token_id: 'moj_token', nazwa: 'x', opis: '', klasa: 'wewnetrzny',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    };
    assert.equal((await fabryka.utworzToken('jan_kowalski', poprawny)).status, 'utworzono');
    assert.equal((await fabryka.utworzToken('inny_avatar', poprawny)).status, 'odmowa'); // duplikat id
    for (const zepsucie of [
        { token_id: 'Złe-ID' },
        { klasa: 'kosmiczny' },
        { podaz: { typ: 'stala', wielkosc: -5 } },
        { podaz: { typ: 'dziwna', wielkosc: null } },
        { podzielnosc: 99 },
    ]) {
        const wynik = await fabryka.utworzToken('jan_kowalski',
            { ...poprawny, token_id: 'inny_id', ...zepsucie });
        assert.equal(wynik.status, 'odmowa', JSON.stringify(zepsucie));
    }
});

test('salda: transfer atomowy — brak pokrycia = odmowa bez zmiany sald (zero długu)', async () => {
    const { fabryka, salda } = srodowisko();
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan', nazwa: 'v', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    await fabryka.emituj('jan_kowalski', 'voucher_jan', 3);

    const ok = await salda.transferuj('jan_kowalski', 'anna_nowak', 'voucher_jan', 2);
    assert.equal(ok.status, 'wykonano');
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 1);
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 2);

    const brak = await salda.transferuj('jan_kowalski', 'anna_nowak', 'voucher_jan', 5);
    assert.equal(brak.status, 'odmowa');
    assert.match(brak.powod, /saldo/i);
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 1); // bez zmian
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 2);
});

test('salda: podzielność respektowana — ułamek niepodzielnego tokenu odmawiany', async () => {
    const { fabryka, salda } = srodowisko();
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan', nazwa: 'v', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    assert.equal((await fabryka.emituj('jan_kowalski', 'voucher_jan', 1.5)).status, 'odmowa');
    await fabryka.emituj('jan_kowalski', 'voucher_jan', 2);
    const ulamek = await salda.transferuj('jan_kowalski', 'anna_nowak', 'voucher_jan', 0.5,
        { podzielnosc: 0 });
    assert.equal(ulamek.status, 'odmowa');
});
