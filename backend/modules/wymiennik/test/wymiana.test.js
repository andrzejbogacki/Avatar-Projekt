'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const psModul = require('../../ps');
const { MagazynTokenow } = require('../src/fabryka/magazyn_tokenow');
const { MagazynSald } = require('../src/salda/magazyn_sald');
const { MagazynRekordow } = require('../src/wymiana/magazyn_rekordow');
const { Fabryka } = require('../src/fabryka/fabryka');
const { utworzWalidacjePS } = require('../src/regulator9/walidacja_ps');
const { RejestrAdapterow, AdapterAtrapa } = require('../src/regulator9/adaptery');
const { UslugaWymiany } = require('../src/wymiana/wymiana');

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

async function srodowisko() {
    const ps = psModul.utworzPS({ katalogProfili: tmp('wym-ps-') });
    const tokeny = new MagazynTokenow({ katalog: tmp('wym-tok-') });
    const salda = new MagazynSald({ katalog: tmp('wym-sal-') });
    const fabryka = new Fabryka({ tokeny, salda, zegar: () => 1_000_000 });
    const adaptery = new RejestrAdapterow();
    adaptery.zarejestruj(new AdapterAtrapa());
    const wymiana = new UslugaWymiany({
        tokeny, salda,
        transakcje: new MagazynRekordow({ katalog: tmp('wym-trans-') }),
        oferty: new MagazynRekordow({ katalog: tmp('wym-ofe-') }),
        walidacjaPS: utworzWalidacjePS({ ps }),
        adaptery,
        zegar: () => 1_000_000,
    });

    // dwa avatary z profilami PS i voucherami
    for (const [kto, imie] of [['jan_kowalski', 'Jan'], ['anna_nowak', 'Anna']]) {
        await ps.magazyn_profili.utworzProfil({ avatar_id: kto, imie });
    }
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'voucher_jan', nazwa: 'Stolarka Jana', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    await fabryka.utworzToken('anna_nowak', {
        token_id: 'voucher_anna', nazwa: 'Ogród Anny', opis: '', klasa: 'avatar',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
    });
    await fabryka.emituj('jan_kowalski', 'voucher_jan', 10);
    await fabryka.emituj('anna_nowak', 'voucher_anna', 10);
    return { ps, salda, fabryka, wymiana };
}

async function zaakceptujWPS(ps, avatar_id, token_id, akceptacja = 'pelna') {
    await ps.magazyn_profili.zapiszToken(avatar_id, {
        token_id, token: token_id, akceptacja, warunek: null, mapowanie_369: null, opis: '',
    });
}

test('wymiana: bez akceptacji PS obu stron transakcja odrzucona z jawną przyczyną', async () => {
    const { ps, wymiana } = await srodowisko();
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 2 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 2 },
        tryb: 'system',
    });
    assert.equal(prop.status, 'zapisano');

    // tylko jan akceptuje oba tokeny; annie brakuje akceptacji voucher_jan
    await zaakceptujWPS(ps, 'jan_kowalski', 'voucher_jan');
    await zaakceptujWPS(ps, 'jan_kowalski', 'voucher_anna');
    await zaakceptujWPS(ps, 'anna_nowak', 'voucher_anna');

    const wynik = await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /anna_nowak/);
    assert.match(wynik.powod, /voucher_jan/);
});

test('wymiana: kurs avatar↔avatar sztywno 1:1 — nierówne ilości odrzucane na starcie', async () => {
    const { wymiana } = await srodowisko();
    const wynik = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 3 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 2 },
        tryb: 'system',
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /1:1/);
});

test('wymiana: pełny przepływ trybu systemowego — akceptacja → automatyczny transfer obu sald', async () => {
    const { ps, salda, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 4 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 4 },
        tryb: 'system',
    });
    const wynik = await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal(wynik.status, 'rozliczona');
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 6);
    assert.equal(await salda.stan('jan_kowalski', 'voucher_anna'), 4);
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 4);
    assert.equal(await salda.stan('anna_nowak', 'voucher_anna'), 6);
});

test('wymiana: brak pokrycia którejkolwiek strony = odmowa bez częściowego transferu', async () => {
    const { ps, salda, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 10 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 10 },
        tryb: 'system',
    });
    // anna wydaje 5 voucherów przed akceptacją — brak pełnego pokrycia
    await salda.transferuj('anna_nowak', 'obca_osoba', 'voucher_anna', 5);
    const wynik = await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal(wynik.status, 'odmowa');
    assert.equal(await salda.stan('jan_kowalski', 'voucher_jan'), 10); // nietknięte
    assert.equal(await salda.stan('anna_nowak', 'voucher_anna'), 5);
});

test('wymiana: poza systemem — bezterminowo wisząca, transfer po OBU potwierdzeniach', async () => {
    const { ps, salda, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 1 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 1 },
        tryb: 'poza_systemem',
    });
    const akceptacja = await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal(akceptacja.status, 'oczekuje_potwierdzen');
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 0); // bez transferu

    // jedno potwierdzenie nie wystarcza (zasada Gebo)
    const jedno = await wymiana.potwierdzWykonanie(prop.transakcja.id, 'jan_kowalski');
    assert.equal(jedno.status, 'oczekuje_potwierdzen');
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 0);
    // ponowne potwierdzenie tej samej strony nic nie zmienia
    assert.equal((await wymiana.potwierdzWykonanie(prop.transakcja.id, 'jan_kowalski')).status,
        'oczekuje_potwierdzen');

    const oba = await wymiana.potwierdzWykonanie(prop.transakcja.id, 'anna_nowak');
    assert.equal(oba.status, 'rozliczona');
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 1);
    assert.equal(await salda.stan('jan_kowalski', 'voucher_anna'), 1);
});

test('wymiana: poza systemem — anulowanie wymaga OBU stron', async () => {
    const { ps, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 1 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 1 },
        tryb: 'poza_systemem',
    });
    await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal((await wymiana.anuluj(prop.transakcja.id, 'jan_kowalski')).status, 'oczekuje_potwierdzen');
    assert.equal((await wymiana.anuluj(prop.transakcja.id, 'anna_nowak')).status, 'anulowana');
});

test('wymiana: oferta publiczna — wystawienie, lista, przyjęcie tworzy rozliczoną transakcję', async () => {
    const { ps, salda, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const oferta = await wymiana.wystawOferte({
        wystawca: 'jan_kowalski',
        oddaje: { token_id: 'voucher_jan', ilosc: 2 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 2 },
        opis: 'stolarka za ogród', tryb: 'system',
    });
    assert.equal(oferta.status, 'zapisano');
    assert.equal((await wymiana.listaOfert()).length, 1);

    const przyjecie = await wymiana.przyjmijOferte(oferta.oferta.id, 'anna_nowak');
    assert.equal(przyjecie.status, 'rozliczona');
    assert.equal(await salda.stan('anna_nowak', 'voucher_jan'), 2);
    assert.equal((await wymiana.listaOfert()).length, 0); // przyjęta znika z listy

    // wystawca nie może przyjąć własnej oferty
    const wlasna = await wymiana.wystawOferte({
        wystawca: 'jan_kowalski',
        oddaje: { token_id: 'voucher_jan', ilosc: 1 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 1 },
        opis: '', tryb: 'system',
    });
    assert.equal((await wymiana.przyjmijOferte(wlasna.oferta.id, 'jan_kowalski')).status, 'odmowa');
});

test('wymiana: token zewnętrzny — rejestracja umowy przez adapter (atrapa), wynik stemplowany', async () => {
    const { ps, fabryka, wymiana } = await srodowisko();
    await fabryka.utworzToken('jan_kowalski', {
        token_id: 'obcy_punkt', nazwa: 'Punkty zewnętrzne', opis: '', klasa: 'zewnetrzny',
        podaz: { typ: 'nieograniczona', wielkosc: null }, podzielnosc: 0, mapowanie_369: null,
        adapter: 'atrapa',
    });
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'obcy_punkt');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'obcy_punkt', ilosc: 5 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 5 },
        tryb: 'zewnetrzny',
    });
    const wynik = await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje');
    assert.equal(wynik.status, 'umowa_zewnetrzna');
    assert.ok(wynik.rejestracja.ref_zewnetrzny);
    assert.equal(wynik.rejestracja.zrodlo, 'atrapa');
    assert.ok(wynik.rejestracja.timestamp);
});

test('wymiana: wycofanie propozycji jednostronne tylko przed akceptacją i tylko przez proponującego', async () => {
    const { ps, wymiana } = await srodowisko();
    for (const kto of ['jan_kowalski', 'anna_nowak']) {
        await zaakceptujWPS(ps, kto, 'voucher_jan');
        await zaakceptujWPS(ps, kto, 'voucher_anna');
    }
    const prop = await wymiana.zaproponujTransakcje({
        od: 'jan_kowalski', do: 'anna_nowak',
        oddaje: { token_id: 'voucher_jan', ilosc: 1 },
        oczekuje: { token_id: 'voucher_anna', ilosc: 1 },
        tryb: 'system',
    });
    assert.equal((await wymiana.wycofajTransakcje(prop.transakcja.id, 'anna_nowak')).status, 'odmowa');
    assert.equal((await wymiana.wycofajTransakcje(prop.transakcja.id, 'jan_kowalski')).status, 'wycofana');
    assert.equal((await wymiana.odpowiedzNaTransakcje(prop.transakcja.id, 'anna_nowak', 'akceptuje')).status,
        'odmowa');
});
