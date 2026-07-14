'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const qac = require('../index');
const { BuforSrodowiskowy } = require('../cache');

// Syntetyczny silnik o kształcie kontraktu kalkulatora — pełny przebieg
// bez plików efemeryd (rzeczywisty silnik testowany w calculator.test.js).
function pozycja(dlugosc, predkosc = 0.1) {
    return {
        dlugosc_ekliptyczna_deg: dlugosc,
        szerokosc_ekliptyczna_deg: 0.5,
        odleglosc_au: 1.2,
        predkosc_dlugosci_deg_d: predkosc,
    };
}

const silnikSyntetyczny = {
    obliczDaneSurowe({ czas_utc, obserwator }) {
        const pozycje = {
            slonce: pozycja(84.1),
            pluton: pozycja(223.4, 0.01),
            wezel_polnocny: pozycja(310.2, -0.05),
            chiron: pozycja(8.4, 0.03),
        };
        const pozycjeNieswiadome = {
            slonce: pozycja(356.1),
            pluton: pozycja(222.9, 0.01),
            wezel_polnocny: pozycja(314.8, -0.05),
            chiron: pozycja(7.9, 0.03),
        };
        const aktywuj = (zbior) =>
            Object.fromEntries(
                Object.entries(zbior).map(([c, p]) => [c, qac.kalkulator.kwantyzuj(p.dlugosc_ekliptyczna_deg)])
            );
        return {
            czas: { jd_et: 2448057.855, jd_ut: 2448057.854, delta_t_s: 57.3, skala: 'TT (test)' },
            obserwator,
            forma_swiadoma: { jd_et: 2448057.855, pozycje, aktywacje: aktywuj(pozycje) },
            forma_nieswiadoma: { jd_et: 2447967.1, pozycje: pozycjeNieswiadome, aktywacje: aktywuj(pozycjeNieswiadome) },
        };
    },
};

const daneWejsciowe = {
    avatar_id: 'andrzej_bogacki',
    czas_utc: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
    obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
};

test('profil: pełny przebieg z buforem — schemat, stemple, zapis przez bramkę 9b', async () => {
    const zrodloZywe = {
        klucz: 'kp',
        async pobierz() { return { zrodlo: 'NOAA Kp', wartosc: { kp: 3 } }; },
    };
    const zrodloMartwe = {
        klucz: 'schumann',
        async pobierz() { throw new Error('endpoint niezdefiniowany (O5)'); },
    };
    const bufor = await new BuforSrodowiskowy({ zrodla: [zrodloZywe, zrodloMartwe] }).inicjalizuj();
    await bufor.odswiez();

    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-pipeline-'));
    const { profil, sciezka } = await qac.generujProfil(daneWejsciowe, {
        bufor,
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });

    // nagłówek rozszerzony
    assert.equal(profil.naglowek.avatar_id, 'andrzej_bogacki');
    assert.equal(profil.naglowek.adres_rejestru, 'modul.qac');
    assert.equal(profil.naglowek.wersja_schematu, '1.0.0');
    assert.equal(profil.naglowek.status, 'piaskownica');
    assert.ok(profil.naglowek.wygenerowano);

    // dane surowe: czas TDB/TT + ΔT + pozycje topocentryczne obu form
    assert.equal(profil.dane_surowe.czas.delta_t_s, 57.3);
    assert.ok(profil.dane_surowe.forma_swiadoma.pozycje.slonce);
    assert.ok(profil.dane_surowe.forma_nieswiadoma.jd_et < profil.dane_surowe.forma_swiadoma.jd_et);

    // aktywacje obu form
    assert.ok(profil.aktywacje.forma_swiadoma.slonce.bramka >= 1);
    assert.ok(profil.aktywacje.forma_nieswiadoma.slonce.bramka >= 1);

    // mapa 369: wektor 12D + stemple per parametr (żywy i odrzucony)
    assert.equal(profil.mapa_369.wektor_czestotliwosci_12d.length, 12);
    assert.equal(profil.mapa_369.stemple_srodowiskowe.kp.status, 'live');
    assert.equal(profil.mapa_369.stemple_srodowiskowe.schumann.status, 'stale');
    assert.match(profil.mapa_369.stemple_srodowiskowe.schumann.odrzucony_przez, /regulator9/);

    // macierz relacyjna przygotowana pod kompozyty i phase-locking
    assert.equal(profil.macierz_relacyjna.status, 'przygotowana');
    assert.deepEqual(profil.macierz_relacyjna.wektor_12d, profil.mapa_369.wektor_czestotliwosci_12d);

    // zapis przez bramkę: czysty JSON UTF-8 pod kluczem avatar_id
    assert.equal(path.basename(sciezka), 'andrzej_bogacki.json');
    const zapisany = JSON.parse(fs.readFileSync(sciezka, 'utf8'));
    assert.deepEqual(zapisany.naglowek.avatar_id, profil.naglowek.avatar_id);

    await bufor.zamknij();
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil: regulator 9b zatrzymuje przebieg przy złym avatar_id', async () => {
    await assert.rejects(
        () => qac.generujProfil({ ...daneWejsciowe, avatar_id: 'Zły-Format' }, { silnik: silnikSyntetyczny, zapisz: false }),
        /Regulator 9b odrzucił/
    );
});

test('profil: brak bufora = pusta migawka, stemple bez konfabulacji', async () => {
    const { profil } = await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny,
        zapisz: false,
    });
    assert.deepEqual(profil.mapa_369.stemple_srodowiskowe, {});
    assert.equal(profil.mapa_369.czynnik_modulacji, 1);
});

test('kontrakt modułu: eksportowane wyłącznie jawne kanały', () => {
    assert.deepEqual(
        Object.keys(qac).sort(),
        ['generujProfil', 'inicjalizujBufor', 'kalkulator', 'konfiguracja', 'qrt', 'regulator9'].sort()
    );
    assert.equal(typeof qac.qrt.zlecRektyfikacje, 'function');
});
