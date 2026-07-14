'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { MagazynKont, nowyRekordKonta } = require('../src/konta/magazyn');
const { RejestrSesji } = require('../src/sesje/rejestr');
const { UslugaLogowania } = require('../src/logowanie/usluga');

const HASLO = 'poprawne-haslo-123';

function srodowisko({ teraz = 1_000_000 } = {}) {
    const stanZegara = { teraz };
    const zegar = () => stanZegara.teraz;
    const magazyn = new MagazynKont({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-logowanie-')),
    });
    const sesje = new RejestrSesji({ zegar });
    const usluga = new UslugaLogowania({ magazyn, sesje, zegar });
    return { usluga, magazyn, sesje, stanZegara };
}

async function utworzKontoOczekujace(magazyn, teraz, token = 'token-testowy') {
    return magazyn.utworzKonto(nowyRekordKonta({
        avatar_id: 'jan_kowalski',
        zaproszenie: { zapraszajacy: 'andrzej_bogacki', uzasadnienie: 'test' },
        token_aktywacji: token,
        teraz,
    }));
}

test('logowanie: pełna ścieżka — aktywacja tokenem, ustawienie hasła, logowanie, sesja', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);

    const aktywacja = await usluga.aktywujKonto({
        avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: HASLO,
    });
    assert.equal(aktywacja.status, 'aktywowano');
    const konto = await magazyn.odczytajKonto('jan_kowalski');
    assert.equal(konto.status, 'aktywne');
    assert.equal(konto.aktywacja, null); // token jednorazowy — zużyty
    assert.ok(konto.haslo.hash);

    const logowanie = await usluga.zaloguj({ avatar_id: 'jan_kowalski', haslo: HASLO });
    assert.equal(logowanie.status, 'zalogowano');
    assert.deepEqual(usluga.ktoZalogowany(logowanie.sesja.id), {
        status: 'aktywna', avatar_id: 'jan_kowalski',
    });
});

test('logowanie: złe hasło i nieistniejące konto dają tę samą odpowiedź (bez enumeracji kont)', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    await usluga.aktywujKonto({ avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: HASLO });

    const zleHaslo = await usluga.zaloguj({ avatar_id: 'jan_kowalski', haslo: 'zle-haslo-1234' });
    const brakKonta = await usluga.zaloguj({ avatar_id: 'nie_ma_takiego', haslo: HASLO });
    assert.equal(zleHaslo.status, 'bledne_dane');
    assert.deepEqual(zleHaslo, brakKonta);
});

test('logowanie: konto nieaktywowane nie może się zalogować — jawny status', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    const wynik = await usluga.zaloguj({ avatar_id: 'jan_kowalski', haslo: HASLO });
    assert.equal(wynik.status, 'konto_nieaktywne');
});

test('aktywacja: zły token odrzucany, konto pozostaje nieaktywne', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    const wynik = await usluga.aktywujKonto({
        avatar_id: 'jan_kowalski', token: 'zly-token', nowe_haslo: HASLO,
    });
    assert.equal(wynik.status, 'token_nieprawidlowy');
    assert.equal((await magazyn.odczytajKonto('jan_kowalski')).status, 'oczekuje_aktywacji');
});

test('aktywacja: token po TTL = jawny status token_wygasl', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    stanZegara.teraz += konfig.zaproszenia.TTL_TOKENU_AKTYWACJI_MS + 1;
    const wynik = await usluga.aktywujKonto({
        avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: HASLO,
    });
    assert.equal(wynik.status, 'token_wygasl');
});

test('aktywacja: konto już aktywne nie może być aktywowane ponownie', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    await usluga.aktywujKonto({ avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: HASLO });
    const ponownie = await usluga.aktywujKonto({
        avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: 'inne-haslo-1234',
    });
    assert.equal(ponownie.status, 'token_nieprawidlowy');
});

test('wylogowanie: unieważnia sesję', async () => {
    const { usluga, magazyn, stanZegara } = srodowisko();
    await utworzKontoOczekujace(magazyn, stanZegara.teraz);
    await usluga.aktywujKonto({ avatar_id: 'jan_kowalski', token: 'token-testowy', nowe_haslo: HASLO });
    const { sesja } = await usluga.zaloguj({ avatar_id: 'jan_kowalski', haslo: HASLO });
    usluga.wyloguj(sesja.id);
    assert.deepEqual(usluga.ktoZalogowany(sesja.id), { status: 'brak_sesji' });
});
