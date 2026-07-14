'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { MagazynKont, nowyRekordKonta } = require('../src/konta/magazyn');

function tymczasowyMagazyn() {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-konta-'));
    return new MagazynKont({ katalog });
}

function przykladoweZaproszenie() {
    return {
        zapraszajacy: 'andrzej_bogacki',
        uzasadnienie: 'test',
        propozycja_ts: new Date().toISOString(),
        decyzja: 'zatwierdzona',
        decyzja_ts: new Date().toISOString(),
        zatwierdzil: konfig.konta.SUWEREN_AVATAR_ID,
    };
}

test('konta: nowy rekord — status oczekuje_aktywacji, brak hasła, jawny stan certyfikacji PS', () => {
    const teraz = Date.now();
    const rekord = nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: przykladoweZaproszenie(),
        token_aktywacji: 'abc123',
        teraz,
    });
    assert.equal(rekord.avatar_id, 'jan_kowalski');
    assert.equal(rekord.status, 'oczekuje_aktywacji');
    assert.equal(rekord.haslo, null);
    assert.equal(rekord.aktywacja.token, 'abc123');
    assert.equal(
        rekord.aktywacja.wygasa_ts,
        new Date(teraz + konfig.zaproszenia.TTL_TOKENU_AKTYWACJI_MS).toISOString()
    );
    assert.deepEqual(rekord.certyfikacja_ps, {
        status: konfig.konta.STATUS_CERTYFIKACJI_STARTOWY,
        typ: null,
        poziom: null,
    });
    assert.equal(rekord.utworzono_ts, new Date(teraz).toISOString());
});

test('konta: utworzenie i odczyt konta (JSON per avatar_id)', async () => {
    const magazyn = tymczasowyMagazyn();
    const rekord = nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: przykladoweZaproszenie(),
        token_aktywacji: 'abc',
        teraz: Date.now(),
    });
    await magazyn.utworzKonto(rekord);
    const odczytany = await magazyn.odczytajKonto('jan_kowalski');
    assert.deepEqual(odczytany, rekord);
});

test('konta: odczyt nieistniejącego konta = null (jawny brak, nie wyjątek)', async () => {
    const magazyn = tymczasowyMagazyn();
    assert.equal(await magazyn.odczytajKonto('nie_ma_takiego'), null);
});

test('konta: duplikat avatar_id odrzucany', async () => {
    const magazyn = tymczasowyMagazyn();
    const rekord = nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: przykladoweZaproszenie(),
        token_aktywacji: 'abc',
        teraz: Date.now(),
    });
    await magazyn.utworzKonto(rekord);
    await assert.rejects(() => magazyn.utworzKonto(rekord), /istnieje/);
});

test('konta: avatar_id niezgodny ze wzorcem odrzucany (diakrytyki, wielkie litery)', async () => {
    const magazyn = tymczasowyMagazyn();
    for (const zly of ['Jan_Kowalski', 'jan-kowalski', 'żaneta', 'ab', '../../etc/passwd']) {
        await assert.rejects(
            () => magazyn.utworzKonto({ ...nowyRekordKonta({
                avatar_id: 'poprawny_id',
                zaproszenie: przykladoweZaproszenie(),
                token_aktywacji: 'x',
                teraz: Date.now(),
            }), avatar_id: zly }),
            /avatar_id/
        );
    }
});

test('konta: aktualizacja istniejącego konta; aktualizacja nieistniejącego odrzucana', async () => {
    const magazyn = tymczasowyMagazyn();
    const rekord = nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: przykladoweZaproszenie(),
        token_aktywacji: 'abc',
        teraz: Date.now(),
    });
    await magazyn.utworzKonto(rekord);
    await magazyn.zapiszKonto({ ...rekord, status: 'aktywne' });
    assert.equal((await magazyn.odczytajKonto('jan_kowalski')).status, 'aktywne');
    await assert.rejects(
        () => magazyn.zapiszKonto({ ...rekord, avatar_id: 'nie_ma_takiego' }),
        /nie istnieje/
    );
});

test('konta: istnieniaKont — false na pustym magazynie, true po utworzeniu', async () => {
    const magazyn = tymczasowyMagazyn();
    assert.equal(await magazyn.istniejaKonta(), false);
    await magazyn.utworzKonto(nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: przykladoweZaproszenie(),
        token_aktywacji: 'abc',
        teraz: Date.now(),
    }));
    assert.equal(await magazyn.istniejaKonta(), true);
});
