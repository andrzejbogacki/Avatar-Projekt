'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const qac = require('../../qac');
const konfig = require('../config');
const { utworzKlientaQAC } = require('../src/regulator9/klient_qac');
const { utworzGeneratorPlanu, oktawujDoPasma } = require('../src/emisja/plan');

const TERAZ = 1_000_000_000; // ms

function katalogProfili() {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'rez-qac-'));
    fs.writeFileSync(path.join(katalog, 'andrzej_bogacki.json'), JSON.stringify({
        naglowek: { avatar_id: 'andrzej_bogacki' },
        mapa_369: {
            czestotliwosc_odniesienia_hz: 420,
            czynnik_modulacji: 1.05,
            pozycja_3: 2.25,
            pozycja_6: 9.10,
            pozycja_9_rezonans: 10.37,
        },
    }), 'utf8');
    return katalog;
}

function srodowisko() {
    const klientQAC = utworzKlientaQAC({
        qac, katalogProfili: katalogProfili(), zegar: () => TERAZ,
    });
    const generator = utworzGeneratorPlanu({ klientQAC, zegar: () => TERAZ });
    const zrodlo = {
        zrodlo_id: 'misja_ogrod', typ: 'misja', wibracja_f: 136.10, rytm_bpm: 72,
        misja: 'Ogród', T_s: 360, wlasciciel: 'andrzej_bogacki',
    };
    return { klientQAC, generator, zrodlo };
}

test('klient qac: profil istnieje — częstotliwość spersonalizowana, stempel live, pole pewnosc obecne', async () => {
    const { klientQAC } = srodowisko();
    const wynik = await klientQAC.czestotliwoscAvatara('andrzej_bogacki');
    assert.equal(wynik.status, 'live');
    assert.equal(wynik.hz, 420 * 1.05); // czestotliwosc_odniesienia × czynnik_modulacji (ADR-005)
    assert.equal(wynik.stempel.zrodlo, 'modul.qac');
    assert.equal(wynik.stempel.status, 'live');
    assert.ok(wynik.stempel.timestamp);
    assert.ok('pewnosc' in wynik); // konwencja QAC — pole obowiązkowe (null = jawny brak metryki)
    assert.equal(wynik.mapa_369.pozycja_6, 9.10);
});

test('klient qac: brak profilu = jawny status brak_danych, nigdy cichy default', async () => {
    const { klientQAC } = srodowisko();
    const wynik = await klientQAC.czestotliwoscAvatara('nie_ma_takiego');
    assert.equal(wynik.status, 'brak_danych');
    assert.equal(wynik.hz, null);
    assert.equal(wynik.stempel.status, 'stale');
    assert.ok('pewnosc' in wynik);
});

test('oktawowanie: częstotliwość trafia w pasmo przez podwajanie/połowienie', () => {
    const { od_hz, do_hz } = konfig.pasma.PASMA.niskie;
    for (const hz of [432, 528, 136.10, 7.83, 12000]) {
        const wynik = oktawujDoPasma(hz, od_hz, do_hz);
        assert.ok(wynik >= od_hz && wynik < do_hz, `${hz} → ${wynik} poza pasmem`);
        // zachowana tożsamość oktawowa: wynik = hz · 2^k
        const k = Math.log2(wynik / hz);
        assert.ok(Math.abs(k - Math.round(k)) < 1e-9, `${hz} → ${wynik} nie jest oktawą`);
    }
});

test('plan emisji: 3 etapy — wzornik (składniki łączone), rytm sprzężony z Sync, 3 warstwy per składnik', async () => {
    const { generator, zrodlo } = srodowisko();
    const wynik = await generator.generujPlan(zrodlo, {
        skladniki: [
            { klasa: 'solfeggio', hz: konfig.czestotliwosci.SOLFEGGIO.HZ_432 },
            { klasa: 'planetarna', cialo: 'ziemia_rok' },
            { klasa: 'qac', avatar_id: 'andrzej_bogacki' },
        ],
    });
    assert.equal(wynik.status, 'wygenerowano');
    const plan = wynik.plan;

    // etap 1 — wzornik: trzy klasy źródeł, łączone
    assert.equal(plan.wzornik.skladniki.length, 3);
    const [solf, planet, qac_] = plan.wzornik.skladniki;
    assert.equal(solf.hz, 432);
    assert.ok(Math.abs(planet.hz - 136.10) < 0.01);
    assert.equal(qac_.hz, 441); // 420 × 1.05
    assert.equal(qac_.stempel.status, 'live');

    // etap 2 — rytm: BPM Źródła sprzężony z Sync(t)
    assert.equal(plan.rytm.bpm, 72);
    assert.equal(plan.rytm.okres_bitu_s, 60 / 72);
    assert.equal(plan.rytm.T_s, 360);
    assert.equal(plan.rytm.sync_s, Math.floor(TERAZ / 1000) % 360);

    // etap 3 — warstwy: każdy składnik zoktawowany do 3 pasm, niezależne f/amplituda/faza
    assert.equal(plan.warstwy.length, 9); // 3 składniki × 3 warstwy
    for (const g of plan.warstwy) {
        const pasmo = konfig.pasma.PASMA[g.warstwa];
        assert.ok(g.hz >= pasmo.od_hz && g.hz < pasmo.do_hz,
            `${g.hz} Hz poza pasmem ${g.warstwa}`);
        assert.equal(g.amplituda, konfig.pasma.AMPLITUDY_DOMYSLNE[g.warstwa]);
        assert.equal(g.faza_rad, konfig.pasma.FAZA_DOMYSLNA_RAD);
    }
    assert.ok(plan.wygenerowano_ts);
});

test('plan emisji: składnik QAC bez profilu oznaczony jawnie, plan powstaje z pozostałych', async () => {
    const { generator, zrodlo } = srodowisko();
    const wynik = await generator.generujPlan(zrodlo, {
        skladniki: [
            { klasa: 'solfeggio', hz: 528 },
            { klasa: 'qac', avatar_id: 'nie_ma_takiego' },
        ],
    });
    assert.equal(wynik.status, 'wygenerowano');
    const qac_ = wynik.plan.wzornik.skladniki.find((s) => s.klasa === 'qac');
    assert.equal(qac_.status, 'brak_danych');
    assert.equal(qac_.hz, null);
    assert.equal(wynik.plan.warstwy.length, 3); // tylko solfeggio × 3 pasma
});

test('plan emisji: wszystkie składniki bez danych = odmowa, nie pusty plan', async () => {
    const { generator, zrodlo } = srodowisko();
    const wynik = await generator.generujPlan(zrodlo, {
        skladniki: [{ klasa: 'qac', avatar_id: 'nie_ma_takiego' }],
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /składnik/i);
});

test('plan emisji: pasma sub/ultra domyślnie wyłączone — żądanie = jawna odmowa', async () => {
    const { generator, zrodlo } = srodowisko();
    const wynik = await generator.generujPlan(zrodlo, {
        skladniki: [{ klasa: 'solfeggio', hz: 432 }],
        warstwy: ['sub', 'niskie'],
    });
    assert.equal(wynik.status, 'odmowa');
    assert.match(wynik.powod, /sub/);
});

test('plan emisji: walidacja składników — nieznana klasa, ciało, hz spoza skali Solfeggio', async () => {
    const { generator, zrodlo } = srodowisko();
    for (const skladnik of [
        { klasa: 'kosmiczna', hz: 100 },
        { klasa: 'planetarna', cialo: 'nibiru' },
        { klasa: 'solfeggio', hz: 440 },
    ]) {
        const wynik = await generator.generujPlan(zrodlo, { skladniki: [skladnik] });
        assert.equal(wynik.status, 'odmowa', JSON.stringify(skladnik));
    }
});
