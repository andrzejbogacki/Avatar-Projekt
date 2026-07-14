'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { MagazynZrodel } = require('../src/zrodla/magazyn');
const { sync, sygnaturaZrodla } = require('../src/sync/zegar');

function magazyn() {
    return new MagazynZrodel({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'rez-zrodla-')),
        zegar: () => 1_000_000,
    });
}

test('cousto: każda wartość Hz wyliczona z okresu zgadza się z publikowaną (spójność tabeli)', () => {
    for (const [id, wpis] of Object.entries(konfig.czestotliwosci.PLANETARNE)) {
        const hz = konfig.czestotliwosci.hzPlanetarne(id);
        assert.ok(
            Math.abs(hz - wpis.hz_publikowane) < konfig.czestotliwosci.TOLERANCJA_ZGODNOSCI_HZ,
            `${id}: wyliczone ${hz} vs publikowane ${wpis.hz_publikowane}`
        );
    }
    assert.equal(konfig.czestotliwosci.hzPlanetarne('nieistniejaca'), null);
});

test('zrodla: rekord Rezonatora samodzielny i eksportowalny — pełny zestaw parametrów', async () => {
    const m = magazyn();
    const wynik = await m.utworzZrodlo('andrzej_bogacki', {
        zrodlo_id: 'misja_ogrod', typ: 'misja',
        wibracja_f: 136.10, rytm_bpm: 72, misja: 'Ogród społeczności',
    });
    assert.equal(wynik.status, 'utworzono');
    const rekord = wynik.zrodlo;
    // samodzielny rekord: wszystkie parametry + T + właściciel + wersja
    assert.equal(rekord.zrodlo_id, 'misja_ogrod');
    assert.equal(rekord.typ, 'misja');
    assert.equal(rekord.wibracja_f, 136.10);
    assert.equal(rekord.rytm_bpm, 72);
    assert.equal(rekord.misja, 'Ogród społeczności');
    assert.equal(rekord.T_s, konfig.sync.T_DOMYSLNE_S); // domyślne 360 s (ADR-005)
    assert.equal(rekord.wlasciciel, 'andrzej_bogacki');
    assert.ok(rekord.utworzono_ts);

    const odczyt = await m.odczytajZrodlo('misja_ogrod');
    assert.deepEqual(odczyt, rekord);
});

test('zrodla: walidacje — zły typ, ujemna częstotliwość, BPM poza zakresem, duplikat', async () => {
    const m = magazyn();
    const poprawne = {
        zrodlo_id: 'zrodlo_a', typ: 'avatar',
        wibracja_f: 432, rytm_bpm: 60, misja: 'x',
    };
    assert.equal((await m.utworzZrodlo('andrzej_bogacki', poprawne)).status, 'utworzono');
    assert.equal((await m.utworzZrodlo('andrzej_bogacki', poprawne)).status, 'odmowa'); // duplikat
    for (const zepsucie of [
        { typ: 'planeta' },
        { wibracja_f: -5 },
        { wibracja_f: 'wysoka' },
        { rytm_bpm: konfig.sync.RYTM_BPM_MAKS + 1 },
        { rytm_bpm: konfig.sync.RYTM_BPM_MIN - 1 },
        { zrodlo_id: 'Złe ID' },
    ]) {
        const wynik = await m.utworzZrodlo('andrzej_bogacki',
            { ...poprawne, zrodlo_id: 'inne_zrodlo', ...zepsucie });
        assert.equal(wynik.status, 'odmowa', JSON.stringify(zepsucie));
    }
});

test('zrodla: edycja parametrów wyłącznie przez właściciela', async () => {
    const m = magazyn();
    await m.utworzZrodlo('andrzej_bogacki', {
        zrodlo_id: 'zrodlo_a', typ: 'avatar', wibracja_f: 432, rytm_bpm: 60, misja: 'x',
    });
    assert.equal((await m.edytujZrodlo('obcy_avatar', 'zrodlo_a', { rytm_bpm: 90 })).status, 'odmowa');
    const wynik = await m.edytujZrodlo('andrzej_bogacki', 'zrodlo_a', { rytm_bpm: 90, T_s: 60 });
    assert.equal(wynik.status, 'zapisano');
    const rekord = await m.odczytajZrodlo('zrodlo_a');
    assert.equal(rekord.rytm_bpm, 90);
    assert.equal(rekord.T_s, 60);
    assert.equal(rekord.wibracja_f, 432); // nietknięte pola bez zmian
});

test('sync: Sync(t) = mod(t, T) — faza cyklu i sygnatura Źródła', () => {
    assert.equal(sync(1000, 360), 1000 % 360);
    assert.equal(sync(360, 360), 0);
    assert.equal(sync(0, 360), 0);

    const zrodlo = {
        zrodlo_id: 'misja_ogrod', wibracja_f: 136.10, rytm_bpm: 72, T_s: 360,
        misja: 'Ogród', typ: 'misja', wlasciciel: 'andrzej_bogacki',
    };
    // t = 1_000_000 s → mod 360 = 280 s w cyklu
    const s = sygnaturaZrodla(zrodlo, 1_000_000_000); // ms
    assert.equal(s.zrodlo_id, 'misja_ogrod');
    assert.equal(s.sync_s, 1_000_000 % 360);
    assert.equal(s.faza_cyklu, (1_000_000 % 360) / 360);
    assert.equal(s.wibracja_f, 136.10);
    assert.equal(s.rytm_bpm, 72);
    assert.ok(s.timestamp);
});
