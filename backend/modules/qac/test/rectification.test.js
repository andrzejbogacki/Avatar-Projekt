'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const konfig = require('../config');
const { KolejkaZadan } = require('../src/rectification/kolejka');
const { wagaAspektu, roznicaKatowa, generujKandydatow, ocenKandydatow } = require('../src/rectification/dopasowanie');
const { wybierzNajlepszego } = require('../src/rectification/pewnosc');
const { zlecRektyfikacje, statusZadania } = require('../src/rectification');

test('kolejka: zadania sekwencyjne, statusy, błąd nie przerywa łańcucha', async () => {
    const k = new KolejkaZadan();
    const przebieg = [];
    const z1 = k.dodaj(async () => { przebieg.push(1); return 'a'; });
    const z2 = k.dodaj(async () => { throw new Error('celowy'); });
    const z3 = k.dodaj(async () => { przebieg.push(3); return 'c'; });

    assert.equal(await z1.wynik, 'a');
    await assert.rejects(() => z2.wynik, /celowy/);
    assert.equal(await z3.wynik, 'c');
    assert.deepEqual(przebieg, [1, 3]);
    assert.equal(k.status(z2.id).status, 'blad');
    assert.equal(k.status(z3.id).status, 'zakonczone');
    assert.equal(k.status('nieistniejace'), null);
});

test('aspekty: waga 1 przy aspekcie ścisłym, 0 poza orbem', () => {
    assert.equal(roznicaKatowa(350, 10), 20);
    assert.equal(wagaAspektu(100, 220), 1); // trygon 120°
    assert.equal(wagaAspektu(100, 220.5), Math.exp(-0.25)); // odchylenie 0,5° przy orbie 1°
    assert.equal(wagaAspektu(100, 222), 0); // 2° poza orbem
    assert.equal(wagaAspektu(15, 15), 1); // koniunkcja
});

test('kandydaci: generacja z zakresu, limit ochronny, walidacja zakresu', () => {
    const zakres = {
        od: { rok: 1990, miesiac: 6, dzien: 15, godzina: 6, minuta: 0, sekunda: 0 },
        do: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 0, sekunda: 0 },
        krok_minuty: 30,
    };
    const kandydaci = generujKandydatow(zakres);
    assert.equal(kandydaci.length, 5);
    // tolerancja 1e-8 dnia (~1 ms): rozdzielczość Float64 przy JD ~2,45e6 to ~5e-10 dnia
    assert.ok(Math.abs(kandydaci[1].jd_ut - kandydaci[0].jd_ut - 30 / konfig.rektyfikacja.MINUT_NA_DOBE) < 1e-8);

    assert.throws(() => generujKandydatow({ ...zakres, krok_minuty: 0.0001 }), /limit/);
    assert.throws(() => generujKandydatow({ od: zakres.do, do: zakres.od }), /późniejszy/);
});

test('QRT: syntetyczna efemeryda — odnajduje zakopany czas, wynik zawsze z pewnoscia', async () => {
    // Efemeryda liniowa: jedno ciało 1°/dobę; wydarzenie w trygonie (120°)
    // do pozycji natalnej ukrytego czasu.
    const jdUkryty = 2448057.75; // ~1990-06-15 06:00 UT
    const syntetyczna = (jd_et) => ({ cialo: (jd_et - 2448000) * 1.0 % 360 });

    const zadanie = zlecRektyfikacje({
        zakres: {
            od: { rok: 1990, miesiac: 6, dzien: 15, godzina: 0, minuta: 0, sekunda: 0 },
            do: { rok: 1990, miesiac: 6, dzien: 15, godzina: 12, minuta: 0, sekunda: 0 },
            krok_minuty: 60,
        },
        wydarzenia: [
            // 120 dób później: ciało przesunięte o 120° = trygon ścisły do natalnego
            { czas_utc: { rok: 1990, miesiac: 10, dzien: 13, godzina: 6, minuta: 0, sekunda: 0 }, opis: 'wydarzenie' },
        ],
        obserwator: { dlugosc_geo: 21, szerokosc_geo: 52.2, wysokosc_npm_m: 100 },
        obliczPozycje: syntetyczna,
    });

    assert.ok(zadanie.id, 'zlecenie zwraca uchwyt natychmiast');
    const wynik = await zadanie.wynik;

    assert.ok(Number.isFinite(wynik.pewnosc), 'pewnosc obowiązkowa');
    assert.ok(wynik.pewnosc > 0 && wynik.pewnosc <= 1);
    assert.equal(wynik.adres_rejestru, 'modul.qac.qrt');
    assert.ok(Math.abs(wynik.jd_ut - jdUkryty) < 60 / konfig.rektyfikacja.MINUT_NA_DOBE, `jd_ut=${wynik.jd_ut}`);
    assert.equal(statusZadania(zadanie.id).status, 'zakonczone');
});

test('QRT: odrzucenie zadania bez wydarzeń', async () => {
    const zadanie = zlecRektyfikacje({
        zakres: {
            od: { rok: 1990, miesiac: 1, dzien: 1, godzina: 0, minuta: 0, sekunda: 0 },
            do: { rok: 1990, miesiac: 1, dzien: 1, godzina: 1, minuta: 0, sekunda: 0 },
        },
        wydarzenia: [],
        obserwator: { dlugosc_geo: 0, szerokosc_geo: 0, wysokosc_npm_m: 0 },
        obliczPozycje: () => ({}),
    });
    await assert.rejects(() => zadanie.wynik, /niepusta lista/);
});

test('pewnosc: brak ocen = jawny błąd, margines rośnie przy wyraźnym liderze', () => {
    assert.throws(() => wybierzNajlepszego([]), /niewyznaczalna/);

    const wyrazny = wybierzNajlepszego([
        { jd_et: 1, jd_ut: 1, dopasowanie: 0.9 },
        { jd_et: 2, jd_ut: 2, dopasowanie: 0.1 },
    ]);
    const remis = wybierzNajlepszego([
        { jd_et: 1, jd_ut: 1, dopasowanie: 0.9 },
        { jd_et: 2, jd_ut: 2, dopasowanie: 0.9 },
    ]);
    assert.ok(wyrazny.pewnosc > remis.pewnosc);
    assert.equal(remis.skladowe_pewnosci.margines_nad_drugim, 0);
});
