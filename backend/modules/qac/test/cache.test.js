'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const konfig = require('../config');
const { AdapterMemory } = require('../cache/adapter_memory');
const { stemplujLive, stempelBrakuDanych, zWyprowadzonymStatusem } = require('../cache/stempel');
const { BuforSrodowiskowy } = require('../cache/index');
const { schumann } = require('../cache/zrodla/schumann');

test('stempel: rekord live ma pełny stempel pochodzenia', () => {
    const teraz = Date.now();
    const r = stemplujLive('NOAA SWPC', { flux_w_m2: 1e-6 }, teraz);
    assert.equal(r.zrodlo, 'NOAA SWPC');
    assert.equal(r.status, 'live');
    assert.equal(r.timestamp, new Date(teraz).toISOString());
    assert.deepEqual(r.wartosc, { flux_w_m2: 1e-6 });
});

test('stempel: wyprowadzanie statusu z wieku (live → cache → stale)', () => {
    const teraz = Date.now();
    const r = stemplujLive('x', 1, teraz);
    assert.equal(zWyprowadzonymStatusem(r, teraz).status, 'live');
    assert.equal(
        zWyprowadzonymStatusem(r, teraz + konfig.cache.CYKL_ODPYTYWANIA_MS + 1).status,
        'cache'
    );
    assert.equal(
        zWyprowadzonymStatusem(r, teraz + konfig.cache.PROG_SWIEZOSCI_MS + 1).status,
        'stale'
    );
});

test('stempel: brak danych = jawny rekord, nigdy wartość domyślna', () => {
    const r = stempelBrakuDanych('schumann', 'endpoint niezdefiniowany');
    assert.equal(r.wartosc, null);
    assert.equal(r.status, 'stale');
    assert.equal(r.timestamp, null);
    assert.match(r.blad, /endpoint/);
    assert.equal(zWyprowadzonymStatusem(r).status, 'stale');
});

test('adapter memory: zapis/odczyt/klucze', async () => {
    const a = new AdapterMemory();
    assert.equal(await a.odczytaj('brak'), null);
    await a.zapisz('k1', { wartosc: 42 });
    assert.deepEqual(await a.odczytaj('k1'), { wartosc: 42 });
    assert.deepEqual(await a.klucze(), ['k1']);
});

test('bufor: fallback in-memory przy niedostępnym Redisie', async () => {
    const bufor = await new BuforSrodowiskowy({ zrodla: [] }).inicjalizuj();
    assert.equal(bufor.typ_bufora, 'memory');
    assert.ok(bufor.powod_fallbacku.length > 0);
    await bufor.zamknij();
});

test('bufor: cykl odświeżenia — sukces stemplowany live, awaria zachowuje ostatni stan', async () => {
    let licznik = 0;
    const zrodloZmienne = {
        klucz: 'testowe',
        async pobierz() {
            licznik += 1;
            if (licznik > 1) throw new Error('awaria sieci');
            return { zrodlo: 'test', wartosc: { v: 1 } };
        },
    };
    const bufor = await new BuforSrodowiskowy({ zrodla: [zrodloZmienne] }).inicjalizuj();

    const raport1 = await bufor.odswiez();
    assert.equal(raport1.testowe, 'live');
    const r1 = await bufor.odczytaj('testowe');
    assert.equal(r1.status, 'live');
    assert.deepEqual(r1.wartosc, { v: 1 });

    const raport2 = await bufor.odswiez();
    assert.match(raport2.testowe, /awaria sieci/);
    const r2 = await bufor.odczytaj('testowe');
    assert.deepEqual(r2.wartosc, { v: 1 }, 'ostatni stabilny stan nie może zostać nadpisany');
    await bufor.zamknij();
});

test('bufor: awaria bez wcześniejszego stanu = jawny rekord braku danych', async () => {
    const zrodloMartwe = {
        klucz: 'martwe',
        async pobierz() { throw new Error('brak połączenia'); },
    };
    const bufor = await new BuforSrodowiskowy({ zrodla: [zrodloMartwe] }).inicjalizuj();
    await bufor.odswiez();
    const r = await bufor.odczytaj('martwe');
    assert.equal(r.wartosc, null);
    assert.equal(r.status, 'stale');
    assert.match(r.blad, /brak połączenia/);
    await bufor.zamknij();
});

test('schumann: jawny błąd O5 do czasu wskazania endpointu', async () => {
    await assert.rejects(() => schumann.pobierz(), /O5/);
});

test('bufor: migawka zawiera wszystkie klucze źródeł', async () => {
    const zrodlo = {
        klucz: 'a',
        async pobierz() { return { zrodlo: 'a', wartosc: 1 }; },
    };
    const bufor = await new BuforSrodowiskowy({ zrodla: [zrodlo, schumann] }).inicjalizuj();
    await bufor.odswiez();
    const migawka = await bufor.migawka();
    assert.deepEqual(Object.keys(migawka).sort(), ['a', 'schumann']);
    assert.equal(migawka.a.status, 'live');
    assert.equal(migawka.schumann.status, 'stale');
    await bufor.zamknij();
});
