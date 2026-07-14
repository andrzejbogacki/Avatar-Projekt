'use strict';

// Warstwa HTTP modułu Auth — tłumaczy żądania na wywołania usług.
// Jawne statusy usług → kody HTTP; treść zawsze JSON UTF-8.
const konfig = require('../../config');

const LIMIT_CIALA_BAJTY = 100_000;
const PREFIKS = '/api/auth';

const KODY_HTTP = Object.freeze({
    zalogowano: 200,
    wylogowano: 200,
    aktywowano: 200,
    zapisano: 201,
    zatwierdzono: 200,
    odrzucono: 200,
    bledne_dane: 401,
    konto_nieaktywne: 401,
    konto_zablokowane: 403,
    token_nieprawidlowy: 403,
    token_wygasl: 403,
    haslo_odrzucone: 422,
    odmowa: 403,
});

function wyslijJson(res, kod, obiekt, naglowki = {}) {
    res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8', ...naglowki });
    res.end(JSON.stringify(obiekt));
}

function wyslijWynik(res, wynik, naglowki = {}) {
    wyslijJson(res, KODY_HTTP[wynik.status] ?? 400, wynik, naglowki);
}

function odczytajCookieSesji(req) {
    const naglowek = req.headers.cookie || '';
    for (const czesc of naglowek.split(';')) {
        const [nazwa, ...reszta] = czesc.trim().split('=');
        if (nazwa === konfig.sesje.NAZWA_COOKIE) return reszta.join('=');
    }
    return null;
}

function cookieSesji(id) {
    return `${konfig.sesje.NAZWA_COOKIE}=${id}; HttpOnly; Path=/; SameSite=Strict`;
}

function cookieWygaszajace() {
    return `${konfig.sesje.NAZWA_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`;
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

function utworzRouterAuth({ usluga_logowania, usluga_zaproszen }) {
    // Zwraca true, gdy żądanie zostało obsłużone (ścieżka w prefiksie modułu).
    return async function obsluzZadanie(req, res) {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith(`${PREFIKS}/`)) return false;
        const sciezka = url.pathname.slice(PREFIKS.length);

        let cialo = {};
        if (req.method === 'POST') {
            try {
                cialo = await odczytajCialoJson(req);
            } catch (blad) {
                wyslijJson(res, 400, { status: 'bledne_zadanie', powod: blad.message });
                return true;
            }
        }
        const sesja = usluga_logowania.ktoZalogowany(odczytajCookieSesji(req));

        try {
            if (req.method === 'POST' && sciezka === '/logowanie') {
                const wynik = await usluga_logowania.zaloguj({
                    avatar_id: cialo.avatar_id, haslo: cialo.haslo,
                });
                if (wynik.status === 'zalogowano') {
                    wyslijWynik(res, { status: 'zalogowano', avatar_id: wynik.sesja.avatar_id },
                        { 'Set-Cookie': cookieSesji(wynik.sesja.id) });
                } else {
                    wyslijWynik(res, wynik);
                }
                return true;
            }
            if (req.method === 'POST' && sciezka === '/wylogowanie') {
                usluga_logowania.wyloguj(odczytajCookieSesji(req));
                wyslijWynik(res, { status: 'wylogowano' }, { 'Set-Cookie': cookieWygaszajace() });
                return true;
            }
            if (req.method === 'GET' && sciezka === '/sesja') {
                wyslijJson(res, 200, sesja);
                return true;
            }
            if (req.method === 'POST' && sciezka === '/aktywacja') {
                wyslijWynik(res, await usluga_logowania.aktywujKonto({
                    avatar_id: cialo.avatar_id, token: cialo.token, nowe_haslo: cialo.nowe_haslo,
                }));
                return true;
            }
            if (req.method === 'POST' && sciezka === '/zaproszenia') {
                if (sesja.status !== 'aktywna') {
                    wyslijJson(res, 401, { status: 'wymagana_sesja' });
                    return true;
                }
                wyslijWynik(res, await usluga_zaproszen.zaproponuj({
                    zapraszajacy: sesja.avatar_id,
                    kandydat_avatar_id: cialo.kandydat_avatar_id,
                    uzasadnienie: cialo.uzasadnienie,
                }));
                return true;
            }
            if (req.method === 'GET' && sciezka === '/zaproszenia') {
                if (sesja.status !== 'aktywna') {
                    wyslijJson(res, 401, { status: 'wymagana_sesja' });
                    return true;
                }
                if (sesja.avatar_id !== konfig.konta.SUWEREN_AVATAR_ID) {
                    wyslijJson(res, 403, { status: 'odmowa', powod: 'Listę zaproszeń przegląda wyłącznie Suweren' });
                    return true;
                }
                wyslijJson(res, 200, { propozycje: await usluga_zaproszen.listaOczekujacych() });
                return true;
            }
            const decyzja = sciezka.match(/^\/zaproszenia\/([0-9a-f]+)\/decyzja$/);
            if (req.method === 'POST' && decyzja) {
                if (sesja.status !== 'aktywna') {
                    wyslijJson(res, 401, { status: 'wymagana_sesja' });
                    return true;
                }
                wyslijWynik(res, await usluga_zaproszen.zdecyduj({
                    id: decyzja[1], decydujacy: sesja.avatar_id, decyzja: cialo.decyzja,
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

module.exports = { utworzRouterAuth, PREFIKS };
