'use strict';

// Warstwa HTTP Glosariusza. Odczyt i skanowanie: PUBLICZNE (moduł bez
// zależności od Auth w tej fazie). Propozycje/decyzje: sesja Auth
// (tożsamość proponującego; decyzja wyłącznie Suwerena).
const konfig = require('../../config');
const { oznaczTekst } = require('../skaner/oznacz');

const LIMIT_CIALA_BAJTY = 2_000_000;
const PREFIKS = '/api/glosariusz';

const KODY_HTTP = Object.freeze({
    zapisano: 201,
    zatwierdzono: 200,
    odrzucono: 200,
    przebudowano: 200,
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

function utworzRouterGlosariusza({ magazyn, propozycje, tozsamosc }) {
    return async function obsluzZadanie(req, res) {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith(`${PREFIKS}/`)) return false;
        const sciezka = decodeURIComponent(url.pathname.slice(PREFIKS.length));

        let cialo = {};
        if (req.method === 'POST') {
            try {
                cialo = await odczytajCialoJson(req);
            } catch (blad) {
                wyslijJson(res, 400, { status: 'bledne_zadanie', powod: blad.message });
                return true;
            }
        }
        const sesja = tozsamosc(req);
        const zalogowany = sesja.status === 'aktywna' ? sesja.avatar_id : null;

        try {
            // ── publiczne: odczyt i skanowanie ──
            if (req.method === 'GET' && sciezka === '/terminy') {
                const terminy = await magazyn.terminy();
                wyslijJson(res, 200, {
                    terminy: terminy.map(({ nazwa, status, wprowadzenie }) => ({ nazwa, status, wprowadzenie })),
                });
                return true;
            }
            let m = sciezka.match(/^\/terminy\/(.{1,200})$/);
            if (req.method === 'GET' && m) {
                const termin = await magazyn.termin(m[1]);
                if (!termin) { wyslijJson(res, 404, { status: 'brak_terminu' }); return true; }
                wyslijJson(res, 200, termin);
                return true;
            }
            if (req.method === 'POST' && sciezka === '/oznacz') {
                if (typeof cialo.tekst !== 'string') {
                    wyslijJson(res, 400, { status: 'bledne_zadanie', powod: 'Wymagane pole tekst' });
                    return true;
                }
                const [indeks, terminy, statusIndeksu] = await Promise.all([
                    magazyn.indeks(), magazyn.terminy(), magazyn.statusIndeksu(),
                ]);
                wyslijJson(res, 200, {
                    segmenty: oznaczTekst(cialo.tekst, indeks, { terminy }),
                    indeks: statusIndeksu,
                });
                return true;
            }
            if (req.method === 'GET' && sciezka === '/indeks') {
                wyslijJson(res, 200, await magazyn.statusIndeksu());
                return true;
            }

            // ── chronione: propozycje i decyzje (zasada dwufazowa) ──
            if (req.method === 'POST' && sciezka === '/indeks/przebuduj') {
                if (!zalogowany) { wyslijJson(res, 401, { status: 'wymagana_sesja' }); return true; }
                await magazyn.przebudujIndeks();
                wyslijWynik(res, { status: 'przebudowano', ...(await magazyn.statusIndeksu()) });
                return true;
            }
            if (req.method === 'POST' && sciezka === '/propozycje') {
                if (!zalogowany) { wyslijJson(res, 401, { status: 'wymagana_sesja' }); return true; }
                wyslijWynik(res, await propozycje.zaproponuj({ od: zalogowany, ...cialo }));
                return true;
            }
            if (req.method === 'GET' && sciezka === '/propozycje') {
                if (!zalogowany) { wyslijJson(res, 401, { status: 'wymagana_sesja' }); return true; }
                wyslijJson(res, 200, { propozycje: await propozycje.listaOczekujacych() });
                return true;
            }
            m = sciezka.match(/^\/propozycje\/([0-9a-f]+)\/decyzja$/);
            if (req.method === 'POST' && m) {
                if (!zalogowany) { wyslijJson(res, 401, { status: 'wymagana_sesja' }); return true; }
                wyslijWynik(res, await propozycje.zdecyduj({
                    id: m[1], decydujacy: zalogowany, decyzja: cialo.decyzja,
                }));
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

module.exports = { utworzRouterGlosariusza, PREFIKS };
