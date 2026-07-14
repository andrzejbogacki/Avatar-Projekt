'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const konfig = require('../config');
const { MagazynProfili, nowyProfil } = require('../src/profil/magazyn');

function magazyn() {
    return new MagazynProfili({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'ps-profile-')),
        zegar: () => 1_000_000,
    });
}

test('profil: nowy profil zgodny ze schematem ps_v1 — 4 osie, poziomy 3/6, pola przygotowane bez logiki', () => {
    const p = nowyProfil({ avatar_id: 'jan_kowalski', imie: 'Jan Kowalski', teraz: 1_000_000 });
    assert.equal(p.wersja_schematu, konfig.WERSJA_SCHEMATU);
    assert.deepEqual(p.dane_podstawowe, { imie: 'Jan Kowalski', status_suwerenny: true });
    assert.deepEqual(Object.keys(p.modul_1_jakosci_kwantowe.osie), [...konfig.osie.OSIE]);
    for (const os_ of konfig.osie.OSIE) {
        for (const poziom of konfig.osie.POZIOMY_OSI) {
            const rekord = p.modul_1_jakosci_kwantowe.osie[os_][poziom];
            assert.equal(rekord.autocertyfikat.sygnatura_prawdy, null); // pole obecne, bez logiki
            assert.deepEqual(rekord.certyfikaty_zewnetrzne, []);        // puste miejsce w strukturze
        }
    }
    assert.deepEqual(p.modul_3_tokeny.volt_token, { alokacja: [] });
    assert.deepEqual(
        p.modul_4_protokol_relacji.strumien_1_dostep_relacyjny.macierz_domyslna,
        konfig.dostep.MACIERZ_DOMYSLNA
    );
    assert.equal(p.certyfikacja_startowa.typ, null);   // NIEROZSTRZYGNIĘTE — decyzja odroczona
    assert.equal(p.certyfikacja_startowa.poziom, null);
});

test('profil: zapis i odczyt per avatar_id; nieistniejący = null', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' });
    const p = await m.odczytajProfil('jan_kowalski');
    assert.equal(p.avatar_id, 'jan_kowalski');
    assert.equal(await m.odczytajProfil('nie_ma_takiego'), null);
    await assert.rejects(() => m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' }), /istnieje/);
});

test('autocertyfikacja: właściciel edytuje własny poziom; zła oś/poziom odrzucane jawnie', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' });
    const wynik = await m.ustawAutocertyfikat('jan_kowalski', {
        os: 'madrosc_piekno', poziom: 'poziom_3', oswiadczenie: 'Deklaruję mądrość w działaniu',
    });
    assert.equal(wynik.status, 'zapisano');
    const p = await m.odczytajProfil('jan_kowalski');
    const rekord = p.modul_1_jakosci_kwantowe.osie.madrosc_piekno.poziom_3.autocertyfikat;
    assert.equal(rekord.status, 'zadeklarowany');
    assert.equal(rekord.oswiadczenie, 'Deklaruję mądrość w działaniu');
    assert.ok(rekord.data_ts);
    assert.equal(rekord.sygnatura_prawdy, null); // logiki wypełniania NIE ma

    assert.equal((await m.ustawAutocertyfikat('jan_kowalski', {
        os: 'zla_os', poziom: 'poziom_3', oswiadczenie: 'x',
    })).status, 'odmowa');
    assert.equal((await m.ustawAutocertyfikat('jan_kowalski', {
        os: 'madrosc_piekno', poziom: 'poziom_9', oswiadczenie: 'x',
    })).status, 'odmowa');
});

test('symulacje: upsert wpisu rejestru + walidacja akceptacji', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' });
    await m.zapiszSymulacje('jan_kowalski', {
        symulacja: 'gra_gieldowa', akceptacja: 'warunkowa', warunek: 'bez dźwigni', opis: 'test',
    });
    await m.zapiszSymulacje('jan_kowalski', {
        symulacja: 'gra_gieldowa', akceptacja: 'brak', warunek: null, opis: 'zmiana zdania',
    });
    const p = await m.odczytajProfil('jan_kowalski');
    assert.equal(p.modul_2_symulacje.rejestr.length, 1); // upsert po nazwie
    assert.equal(p.modul_2_symulacje.rejestr[0].akceptacja, 'brak');
    assert.equal((await m.zapiszSymulacje('jan_kowalski', {
        symulacja: 'x', akceptacja: 'moze', warunek: null, opis: '',
    })).status, 'odmowa');
});

test('tokeny: upsert wpisu rejestru z mapowanie_369', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' });
    await m.zapiszToken('jan_kowalski', {
        token: 'volt', akceptacja: 'pelna', warunek: null, mapowanie_369: 3, opis: 'token natywny',
    });
    const p = await m.odczytajProfil('jan_kowalski');
    assert.deepEqual(p.modul_3_tokeny.rejestr[0], {
        token: 'volt', akceptacja: 'pelna', warunek: null, mapowanie_369: 3, opis: 'token natywny',
    });
});

test('volt: redystrybucja alokacji w dowolnym momencie; suma >100% odrzucana jawnie', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'jan_kowalski', imie: 'Jan' });
    const ok = await m.ustawAlokacjeVolt('jan_kowalski', [
        { cel: 'misja_ogrod', procent: 60 },
        { cel: 'misja_szkola', procent: 40 },
    ]);
    assert.equal(ok.status, 'zapisano');

    // redystrybucja = podmiana całości
    await m.ustawAlokacjeVolt('jan_kowalski', [{ cel: 'misja_ogrod', procent: 100 }]);
    const p = await m.odczytajProfil('jan_kowalski');
    assert.deepEqual(p.modul_3_tokeny.volt_token.alokacja, [{ cel: 'misja_ogrod', procent: 100 }]);

    const zaDuzo = await m.ustawAlokacjeVolt('jan_kowalski', [
        { cel: 'a', procent: 70 }, { cel: 'b', procent: 40 },
    ]);
    assert.equal(zaDuzo.status, 'odmowa');
    assert.match(zaDuzo.powod, /100/);
    const zeroIstnieje = await m.ustawAlokacjeVolt('jan_kowalski', [{ cel: 'a', procent: 0 }]);
    assert.equal(zeroIstnieje.status, 'odmowa');
});

test('strumień 2: właściciel nadaje poziom obserwatorowi; zły poziom odrzucany', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'andrzej_bogacki', imie: 'Andrzej' });
    assert.equal((await m.ustawPoziomObserwatora('andrzej_bogacki', 'jan_kowalski', 'uczen')).status, 'zapisano');
    assert.equal((await m.ustawPoziomObserwatora('andrzej_bogacki', 'jan_kowalski', 'guru')).status, 'odmowa');
    const p = await m.odczytajProfil('andrzej_bogacki');
    assert.equal(p.modul_4_protokol_relacji.strumien_2_dostep_do_wiedzy.poziomy_obserwatorow.jan_kowalski, 'uczen');
});

test('strumień 1: nadpisanie stanu per para obserwator–oś', async () => {
    const m = magazyn();
    await m.utworzProfil({ avatar_id: 'andrzej_bogacki', imie: 'Andrzej' });
    assert.equal((await m.ustawNadpisanieS1('andrzej_bogacki', {
        obserwator: 'jan_kowalski', os: 'wolnosc_akceptacja', stan: 'akceptacja',
    })).status, 'zapisano');
    // aktualizacja tej samej pary nie dubluje wpisu
    await m.ustawNadpisanieS1('andrzej_bogacki', {
        obserwator: 'jan_kowalski', os: 'wolnosc_akceptacja', stan: 'dozwolony',
    });
    const p = await m.odczytajProfil('andrzej_bogacki');
    const nadpisania = p.modul_4_protokol_relacji.strumien_1_dostep_relacyjny.nadpisania;
    assert.equal(nadpisania.length, 1);
    assert.equal(nadpisania[0].stan, 'dozwolony');
    assert.equal((await m.ustawNadpisanieS1('andrzej_bogacki', {
        obserwator: 'jan_kowalski', os: 'wolnosc_akceptacja', stan: 'super',
    })).status, 'odmowa');
});
