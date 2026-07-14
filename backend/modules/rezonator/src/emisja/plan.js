'use strict';

// Plan emisji (pozycja 3 — impuls): mechanika kreacji dźwiękiem w 3 etapach.
// 1. FOKUS CZĘSTOTLIWOŚCI (wzornik) — składniki Solfeggio / planetarne / QAC, łączone.
// 2. SYNCHRONIZACJA RYTMU — BPM Źródła sprzężony z Sync(t).
// 3. WIELOWARSTWOWA MODULACJA — każdy składnik zoktawowany do pasm,
//    równoległe generatory z niezależną kontrolą f/amplitudy/fazy.
const konfig = require('../../config');
const { sync } = require('../sync/zegar');

const MS_W_SEKUNDZIE = 1000;
const SEKUND_W_MINUCIE = 60;

// Przenosi częstotliwość w pasmo przez podwajanie/połowienie (tożsamość oktawowa).
function oktawujDoPasma(hz, od_hz, do_hz) {
    let f = hz;
    while (f < od_hz) f *= 2;
    while (f >= do_hz) f /= 2;
    return f >= od_hz ? f : null; // pasmo węższe niż oktawa — nieosiągalne
}

function utworzGeneratorPlanu({ klientQAC, zegar = Date.now, rozszerzenia_wlaczone = [] } = {}) {
    const SKALA_SOLFEGGIO = Object.values(konfig.czestotliwosci.SOLFEGGIO);

    function pasmoWlaczone(nazwa) {
        const pasmo = konfig.pasma.PASMA[nazwa];
        if (!pasmo) return false;
        return pasmo.domyslnie_wlaczone || rozszerzenia_wlaczone.includes(nazwa);
    }

    async function rozwiazSkladnik(skladnik) {
        if (skladnik.klasa === 'solfeggio') {
            if (!SKALA_SOLFEGGIO.includes(skladnik.hz)) {
                return { blad: `Częstotliwość ${skladnik.hz} Hz spoza skali Solfeggio (${SKALA_SOLFEGGIO.join(', ')})` };
            }
            return { klasa: 'solfeggio', hz: skladnik.hz, status: 'live' };
        }
        if (skladnik.klasa === 'planetarna') {
            const hz = konfig.czestotliwosci.hzPlanetarne(skladnik.cialo);
            if (hz === null) {
                return { blad: `Nieznane ciało: ${skladnik.cialo} (dostępne: ${Object.keys(konfig.czestotliwosci.PLANETARNE).join(', ')})` };
            }
            return { klasa: 'planetarna', cialo: skladnik.cialo, hz, status: 'live' };
        }
        if (skladnik.klasa === 'qac') {
            const wynik = await klientQAC.czestotliwoscAvatara(skladnik.avatar_id);
            return {
                klasa: 'qac',
                avatar_id: skladnik.avatar_id,
                hz: wynik.hz,
                status: wynik.status,
                pewnosc: wynik.pewnosc,
                stempel: wynik.stempel,
                mapa_369: wynik.mapa_369,
                ...(wynik.powod ? { powod: wynik.powod } : {}),
            };
        }
        return { blad: `Nieznana klasa składnika: ${skladnik.klasa} (dostępne: ${konfig.KLASY_CZESTOTLIWOSCI.join('|')})` };
    }

    async function generujPlan(zrodlo, { skladniki, warstwy, amplitudy, fazy } = {}) {
        if (!Array.isArray(skladniki) || skladniki.length === 0) {
            return { status: 'odmowa', powod: 'Wymagany co najmniej jeden składnik wzornika' };
        }
        const warstwyPlanu = warstwy ?? [...konfig.pasma.WARSTWY_EMISJI];
        for (const nazwa of warstwyPlanu) {
            if (!pasmoWlaczone(nazwa)) {
                return {
                    status: 'odmowa',
                    powod: `Pasmo ${nazwa} jest wyłączone (uwaga sprzętowa ADR-005) — włączane parametrem rozszerzenia_wlaczone`,
                };
            }
        }

        // etap 1 — wzornik
        const rozwiazane = [];
        for (const skladnik of skladniki) {
            const wynik = await rozwiazSkladnik(skladnik);
            if (wynik.blad) return { status: 'odmowa', powod: wynik.blad };
            rozwiazane.push(wynik);
        }
        const aktywne = rozwiazane.filter((s) => s.hz !== null);
        if (aktywne.length === 0) {
            return { status: 'odmowa', powod: 'Żaden składnik wzornika nie dostarczył częstotliwości (jawne braki danych)' };
        }

        const teraz_ms = zegar();

        // etap 3 — warstwy: równoległe generatory f/amplituda/faza
        const generatory = [];
        for (const skladnik of aktywne) {
            for (const nazwa of warstwyPlanu) {
                const pasmo = konfig.pasma.PASMA[nazwa];
                const hz = oktawujDoPasma(skladnik.hz, pasmo.od_hz, pasmo.do_hz);
                if (hz === null) {
                    return { status: 'odmowa', powod: `Częstotliwość ${skladnik.hz} Hz nieosiągalna oktawowo w pasmie ${nazwa}` };
                }
                generatory.push({
                    warstwa: nazwa,
                    funkcja: pasmo.funkcja,
                    hz,
                    amplituda: amplitudy?.[nazwa] ?? konfig.pasma.AMPLITUDY_DOMYSLNE[nazwa],
                    faza_rad: fazy?.[nazwa] ?? konfig.pasma.FAZA_DOMYSLNA_RAD,
                    skladnik: skladnik.klasa + (skladnik.cialo ? `:${skladnik.cialo}` : '')
                        + (skladnik.avatar_id ? `:${skladnik.avatar_id}` : ''),
                });
            }
        }

        return {
            status: 'wygenerowano',
            plan: {
                zrodlo_id: zrodlo.zrodlo_id,
                wygenerowano_ts: new Date(teraz_ms).toISOString(),
                wzornik: { skladniki: rozwiazane },
                rytm: {
                    bpm: zrodlo.rytm_bpm,
                    okres_bitu_s: SEKUND_W_MINUCIE / zrodlo.rytm_bpm,
                    T_s: zrodlo.T_s,
                    sync_s: sync(Math.floor(teraz_ms / MS_W_SEKUNDZIE), zrodlo.T_s),
                },
                warstwy: generatory,
            },
        };
    }

    return { generujPlan };
}

module.exports = { utworzGeneratorPlanu, oktawujDoPasma };
