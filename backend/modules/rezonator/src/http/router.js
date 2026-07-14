'use strict';

// Warstwa HTTP Rezonatora — wszystkie ścieżki wymagają sesji Auth.
const konfig = require('../../config');
const { sygnaturaZrodla } = require('../sync/zegar');

const LIMIT_CIALA_BAJTY = 100_000;
const PREFIKS = '/api/rezonator';
const WZORZEC_ID = /^[0-9a-f]+$/;

const KODY_HTTP = Object.freeze({
    utworzono: 201,
    zapisano: 200,
    wygenerowano: 200,
    wystartowano: 201,
    zatrzymano: 200,
    odmowa: 403,
});

function wyslijJson(res, kod, obiekt) {
    res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obiekt));
}

function wyslijWynik(res, wynik) {
    wyslijJson(res, KODY_HTTP[wynik.status] ?? 400, wynik);
}

function odczytajCialoJson(req) {
    return new Promise((resolve, reject) => {
        let dane = '';
        let rozmiar = 0;
        req.on('data', (fragment) => {
            rozmiar += fragment.length;
            if (rozmiar > LIMIT_CIALA_BAJTY) {
                reject(new Error('Ciało zapytania przekracza limit'));
                req.destroy();
                return;
            }
            dane += fragment;
        });
        req.on('end', () => {
            if (!dane) { resolve({}); return; }
            try { resolve(JSON.parse(dane)); }
            catch (blad) { reject(new Error(`Nieprawidłowy JSON: ${blad.message}`)); }
        });
        req.on('error', reject);
    });
}

function konfiguracjaDlaPanelu() {
    const planetarne = {};
    for (const [id, wpis] of Object.entries(konfig.czestotliwosci.PLANETARNE)) {
        planetarne[id] = { nazwa: wpis.nazwa, hz: konfig.czestotliwosci.hzPlanetarne(id) };
    }
    return {
        solfeggio: konfig.czestotliwosci.SOLFEGGIO,
        solfeggio_baza: konfig.czestotliwosci.SOLFEGGIO_BAZA,
        planetarne,
        pasma: konfig.pasma.PASMA,
        warstwy_emisji: konfig.pasma.WARSTWY_EMISJI,
        amplitudy_domyslne: konfig.pasma.AMPLITUDY_DOMYSLNE,
        T_domyslne_s: konfig.sync.T_DOMYSLNE_S,
        rytm_bpm: {
            domyslny: konfig.sync.RYTM_BPM_DOMYSLNY,
            min: konfig.sync.RYTM_BPM_MIN,
            maks: konfig.sync.RYTM_BPM_MAKS,
        },
        typy_zrodel: konfig.TYPY_ZRODEL,
    };
}

function utworzRouterRezonatora({ zrodla, generator, sesje, tozsamosc, zegar = Date.now }) {
    return async function obsluzZadanie(req, res) {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith(`${PREFIKS}/`)) return false;
        const sciezka = url.pathname.slice(PREFIKS.length);

        let cialo = {};
        if (req.method === 'POST' || req.method === 'PUT') {
            try {
                cialo = await odczytajCialoJson(req);
            } catch (blad) {
                wyslijJson(res, 400, { status: 'bledne_zadanie', powod: blad.message });
                return true;
            }
        }
        const sesjaAuth = tozsamosc(req);
        if (sesjaAuth.status !== 'aktywna') {
            wyslijJson(res, 401, { status: 'wymagana_sesja' });
            return true;
        }
        const ja = sesjaAuth.avatar_id;

        try {
            if (req.method === 'GET' && sciezka === '/konfiguracja') {
                wyslijJson(res, 200, konfiguracjaDlaPanelu());
                return true;
            }
            if (req.method === 'GET' && sciezka === '/zrodla') {
                wyslijJson(res, 200, { zrodla: await zrodla.listaZrodel() });
                return true;
            }
            if (req.method === 'POST' && sciezka === '/zrodla') {
                wyslijWynik(res, await zrodla.utworzZrodlo(ja, cialo));
                return true;
            }
            let m = sciezka.match(/^\/zrodla\/([a-z][a-z0-9_]{1,63})$/);
            if (req.method === 'PUT' && m) {
                wyslijWynik(res, await zrodla.edytujZrodlo(ja, m[1], cialo));
                return true;
            }
            m = sciezka.match(/^\/zrodla\/([a-z][a-z0-9_]{1,63})\/sygnatura$/);
            if (req.method === 'GET' && m) {
                const zrodlo = await zrodla.odczytajZrodlo(m[1]);
                if (!zrodlo) { wyslijJson(res, 404, { status: 'brak_zrodla' }); return true; }
                wyslijJson(res, 200, sygnaturaZrodla(zrodlo, zegar()));
                return true;
            }
            m = sciezka.match(/^\/zrodla\/([a-z][a-z0-9_]{1,63})\/plan$/);
            if (req.method === 'POST' && m) {
                const zrodlo = await zrodla.odczytajZrodlo(m[1]);
                if (!zrodlo) { wyslijJson(res, 404, { status: 'brak_zrodla' }); return true; }
                wyslijWynik(res, await generator.generujPlan(zrodlo, cialo));
                return true;
            }
            if (req.method === 'POST' && sciezka === '/sesje') {
                const zrodlo = await zrodla.odczytajZrodlo(cialo.zrodlo_id);
                if (!zrodlo) { wyslijJson(res, 404, { status: 'brak_zrodla' }); return true; }
                const plan = await generator.generujPlan(zrodlo, cialo);
                if (plan.status !== 'wygenerowano') { wyslijWynik(res, plan); return true; }
                const sesja = sesje.startuj({ zrodlo, plan: plan.plan, kto: ja });
                wyslijWynik(res, { status: 'wystartowano', sesja });
                return true;
            }
            if (req.method === 'GET' && sciezka === '/sesje') {
                wyslijJson(res, 200, { sesje: sesje.listaAktywnych() });
                return true;
            }
            m = sciezka.match(/^\/sesje\/([0-9a-f]+)\/stop$/);
            if (req.method === 'POST' && m && WZORZEC_ID.test(m[1])) {
                wyslijWynik(res, sesje.zatrzymaj(m[1], ja));
                return true;
            }

            wyslijJson(res, 404, { status: 'nie_znaleziono' });
            return true;
        } catch (blad) {
            wyslijJson(res, 500, { status: 'blad_serwera', powod: blad.message });
            return true;
        }
    };
}

module.exports = { utworzRouterRezonatora, PREFIKS, konfiguracjaDlaPanelu };
