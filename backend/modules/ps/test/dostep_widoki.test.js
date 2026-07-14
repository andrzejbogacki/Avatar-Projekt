'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const konfig = require('../config');
const { nowyProfil } = require('../src/profil/magazyn');
const { poziomObserwatora, stanOsiS1 } = require('../src/dostep/poziomy');
const { widokProfilu } = require('../src/widoki/strumien2');

function profilTestowy() {
    const p = nowyProfil({ avatar_id: 'andrzej_bogacki', imie: 'Andrzej', teraz: 1_000_000 });
    p.modul_1_jakosci_kwantowe.osie.madrosc_piekno.poziom_3.autocertyfikat = {
        status: 'zadeklarowany', oswiadczenie: 'tajna deklaracja', data_ts: 'x', sygnatura_prawdy: null,
    };
    p.modul_2_symulacje.rejestr.push({ symulacja: 'gra', akceptacja: 'pelna', warunek: null, opis: 'o' });
    p.modul_3_tokeny.rejestr.push({
        token: 'volt', akceptacja: 'warunkowa', warunek: 'tajny warunek', mapowanie_369: 6, opis: 'natywny',
    });
    p.modul_3_tokeny.volt_token.alokacja = [{ cel: 'misja', procent: 100 }];
    p.modul_4_protokol_relacji.strumien_2_dostep_do_wiedzy.poziomy_obserwatorow = {
        uczen_avatar: 'uczen', adept_avatar: 'adept', mistrz_avatar: 'mistrz',
    };
    p.modul_4_protokol_relacji.strumien_1_dostep_relacyjny.nadpisania.push({
        obserwator: 'uczen_avatar', os: 'wolnosc_akceptacja', stan: 'akceptacja',
    });
    return p;
}

test('dostęp 9a: poziom obserwatora — właściciel, przypisany, nieprzypisany, gość', () => {
    const p = profilTestowy();
    assert.equal(poziomObserwatora(p, 'andrzej_bogacki').rola, 'wlasciciel');
    assert.equal(poziomObserwatora(p, 'adept_avatar').poziom, 'adept');
    assert.equal(poziomObserwatora(p, 'obcy_avatar').poziom, 'niesklasyfikowany');
    assert.equal(poziomObserwatora(p, null).poziom, 'niesklasyfikowany'); // gość po bramce
});

test('dostęp 9a: stan osi S1 = macierz domyślna (wszystko brak, ADR-003) + nadpisania per para', () => {
    const p = profilTestowy();
    // macierz domyślna: brak dla każdego poziomu (decyzja Suwerena 2026-07-12)
    assert.equal(stanOsiS1(p, 'mistrz_avatar', 'wolnosc_akceptacja'), 'brak');
    assert.equal(stanOsiS1(p, 'obcy_avatar', 'madrosc_piekno'), 'brak');
    // nadpisanie ręczne wygrywa
    assert.equal(stanOsiS1(p, 'uczen_avatar', 'wolnosc_akceptacja'), 'akceptacja');
    assert.equal(stanOsiS1(p, 'uczen_avatar', 'madrosc_piekno'), 'brak');
});

test('widok S2: niesklasyfikowany — wyłącznie dane podstawowe', () => {
    const w = widokProfilu(profilTestowy(), 'niesklasyfikowany');
    assert.deepEqual(Object.keys(w).sort(),
        ['avatar_id', 'dane_podstawowe', 'poziom_obserwatora'].sort());
    assert.equal(w.dane_podstawowe.imie, 'Andrzej');
    assert.equal(w.dane_podstawowe.status_suwerenny, true);
});

test('widok S2: uczeń — + Moduł 2 pełny + Moduł 3 okrojony (bez warunku, mapowania i Volt)', () => {
    const w = widokProfilu(profilTestowy(), 'uczen');
    assert.ok(w.modul_2_symulacje);
    assert.equal(w.modul_2_symulacje.rejestr[0].symulacja, 'gra');
    assert.deepEqual(w.modul_3_tokeny.rejestr[0], {
        token: 'volt', akceptacja: 'warunkowa', opis: 'natywny',
    }); // bez warunek/mapowanie_369 — ADR-003
    assert.equal(w.modul_3_tokeny.volt_token, undefined);
    assert.equal(w.modul_1_jakosci_kwantowe, undefined);
    assert.equal(w.modul_4_protokol_relacji, undefined);
});

test('widok S2: adept — + Moduł 1 pełny + Moduł 3 pełny; nadal bez Modułu 4', () => {
    const w = widokProfilu(profilTestowy(), 'adept');
    assert.equal(w.modul_1_jakosci_kwantowe.osie.madrosc_piekno.poziom_3.autocertyfikat.oswiadczenie,
        'tajna deklaracja');
    assert.equal(w.modul_3_tokeny.rejestr[0].warunek, 'tajny warunek');
    assert.equal(w.modul_3_tokeny.rejestr[0].mapowanie_369, 6);
    assert.deepEqual(w.modul_3_tokeny.volt_token.alokacja, [{ cel: 'misja', procent: 100 }]);
    assert.equal(w.modul_4_protokol_relacji, undefined);
});

test('widok S2: mistrz — wszystko, łącznie z Modułem 4; właściciel — pełny dokument', () => {
    const p = profilTestowy();
    const mistrz = widokProfilu(p, 'mistrz');
    assert.ok(mistrz.modul_4_protokol_relacji.strumien_1_dostep_relacyjny);
    const wlasciciel = widokProfilu(p, 'wlasciciel');
    assert.deepEqual(wlasciciel, { ...p, poziom_obserwatora: 'wlasciciel' });
});

test('widok S2: widok nie przecieka przez referencje — mutacja widoku nie zmienia profilu', () => {
    const p = profilTestowy();
    const w = widokProfilu(p, 'uczen');
    w.modul_2_symulacje.rejestr[0].symulacja = 'ZMIENIONE';
    assert.equal(p.modul_2_symulacje.rejestr[0].symulacja, 'gra');
});
