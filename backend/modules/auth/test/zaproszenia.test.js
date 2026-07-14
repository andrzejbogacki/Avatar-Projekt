'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { MagazynKont, nowyRekordKonta } = require('../src/konta/magazyn');
const { MagazynZaproszen } = require('../src/regulator9/magazyn_zaproszen');
const { UslugaZaproszen } = require('../src/regulator9/zaproszenia');
const { kontoDemoDozwolone } = require('../src/regulator9/srodowisko');

const SUWEREN = konfig.konta.SUWEREN_AVATAR_ID;

async function srodowisko() {
    const teraz = { ms: 1_000_000 };
    const konta = new MagazynKont({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-zapr-konta-')),
    });
    const zaproszenia = new MagazynZaproszen({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'auth-zapr-prop-')),
    });
    // zapraszający musi być zarejestrowanym, aktywnym Avatarem
    const suweren = nowyRekordKonta({
        avatar_id: SUWEREN,
        zaproszenie: { zapraszajacy: null, uzasadnienie: 'bootstrap' },
        token_aktywacji: 'x',
        teraz: teraz.ms,
    });
    await konta.utworzKonto({ ...suweren, status: 'aktywne' });
    const usluga = new UslugaZaproszen({ konta, zaproszenia, zegar: () => teraz.ms });
    return { usluga, konta, zaproszenia, teraz };
}

test('zaproszenia: propozycja od aktywnego Avatara zapisywana ze statusem oczekujaca', async () => {
    const { usluga } = await srodowisko();
    const wynik = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'znam osobiście',
    });
    assert.equal(wynik.status, 'zapisano');
    assert.equal(wynik.propozycja.status, 'oczekujaca');
    assert.equal(wynik.propozycja.kandydat_avatar_id, 'jan_kowalski');
    assert.ok(wynik.propozycja.id);
});

test('zaproszenia: propozycja od niezarejestrowanego zapraszającego odrzucana', async () => {
    const { usluga } = await srodowisko();
    const wynik = await usluga.zaproponuj({
        zapraszajacy: 'obcy_avatar', kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /zapraszający/i);
});

test('zaproszenia: kandydat z istniejącym kontem odrzucany', async () => {
    const { usluga } = await srodowisko();
    const wynik = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: SUWEREN, uzasadnienie: 'x',
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /istnieje/);
});

test('zaproszenia: decyzję podejmuje wyłącznie Suweren — inny Avatar dostaje odmowę, konto nie powstaje', async () => {
    const { usluga, konta } = await srodowisko();
    const { propozycja } = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    const wynik = await usluga.zdecyduj({
        id: propozycja.id, decydujacy: 'inny_avatar', decyzja: 'zatwierdzona',
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /Suweren/);
    assert.equal(await konta.odczytajKonto('jan_kowalski'), null);
});

test('zaproszenia: zatwierdzenie przez Suwerena tworzy konto oczekujące + token + jawny stan certyfikacji PS', async () => {
    const { usluga, konta, zaproszenia } = await srodowisko();
    const { propozycja } = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    const wynik = await usluga.zdecyduj({
        id: propozycja.id, decydujacy: SUWEREN, decyzja: 'zatwierdzona',
    });
    assert.equal(wynik.status, 'zatwierdzono');
    assert.match(wynik.token_aktywacji, /^[0-9a-f]+$/);

    const konto = await konta.odczytajKonto('jan_kowalski');
    assert.equal(konto.status, 'oczekuje_aktywacji');
    assert.equal(konto.certyfikacja_ps.status, konfig.konta.STATUS_CERTYFIKACJI_STARTOWY);
    assert.equal(konto.certyfikacja_ps.typ, null); // wartość NIEROZSTRZYGNIĘTA — decyzja Suwerena odroczona

    const zapis = await zaproszenia.odczytaj(propozycja.id);
    assert.equal(zapis.status, 'zatwierdzona');
    assert.equal(zapis.hook_ps.status, 'odroczono'); // moduł PS jeszcze nie istnieje
});

test('zaproszenia: odrzucenie przez Suwerena — brak konta, propozycja odrzucona', async () => {
    const { usluga, konta, zaproszenia } = await srodowisko();
    const { propozycja } = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    const wynik = await usluga.zdecyduj({
        id: propozycja.id, decydujacy: SUWEREN, decyzja: 'odrzucona',
    });
    assert.equal(wynik.status, 'odrzucono');
    assert.equal(await konta.odczytajKonto('jan_kowalski'), null);
    assert.equal((await zaproszenia.odczytaj(propozycja.id)).status, 'odrzucona');
});

test('zaproszenia: propozycja już rozstrzygnięta nie może być rozstrzygnięta ponownie', async () => {
    const { usluga } = await srodowisko();
    const { propozycja } = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    await usluga.zdecyduj({ id: propozycja.id, decydujacy: SUWEREN, decyzja: 'zatwierdzona' });
    const ponownie = await usluga.zdecyduj({
        id: propozycja.id, decydujacy: SUWEREN, decyzja: 'odrzucona',
    });
    assert.equal(ponownie.status, 'odmowa');
    assert.match(ponownie.powod, /rozstrzygnięta/);
});

test('zaproszenia: lista oczekujących zawiera tylko nierozstrzygnięte propozycje', async () => {
    const { usluga } = await srodowisko();
    const a = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'jan_kowalski', uzasadnienie: 'x',
    });
    const b = await usluga.zaproponuj({
        zapraszajacy: SUWEREN, kandydat_avatar_id: 'anna_nowak', uzasadnienie: 'x',
    });
    await usluga.zdecyduj({ id: a.propozycja.id, decydujacy: SUWEREN, decyzja: 'odrzucona' });
    const lista = await usluga.listaOczekujacych();
    assert.deepEqual(lista.map((p) => p.id), [b.propozycja.id]);
});

test('regulator9: konto demo dozwolone wyłącznie poza produkcją', () => {
    assert.equal(kontoDemoDozwolone('development'), true);
    assert.equal(kontoDemoDozwolone('test'), true);
    assert.equal(kontoDemoDozwolone(undefined), true);
    assert.equal(kontoDemoDozwolone('production'), false);
});
