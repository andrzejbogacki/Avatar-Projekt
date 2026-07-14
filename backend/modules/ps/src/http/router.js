'use strict';

// Warstwa HTTP modułu PS — tłumaczy żądania na wywołania usług.
// Tożsamość obserwatora: sesja Auth (kontrakt modułu Auth) albo gość po
// bramce wstępnej (cookie ps_gosc). Jawne statusy usług → kody HTTP.
const konfig = require('../../config');
const { poziomObserwatora, stanOsiS1 } = require('../dostep/poziomy');
const { widokProfilu } = require('../widoki/strumien2');

const LIMIT_CIALA_BAJTY = 100_000;
const PREFIKS = '/api/ps';
const WZORZEC_ID_ZASOBU = /^[0-9a-f]+$/;

const KODY_HTTP = Object.freeze({
    zapisano: 200,
    zapisano_oczekujaca: 200,
    utworzono: 201,
    odmowa: 403,
    brak_profilu: 404,
});

function wyslijJson(res, kod, obiekt, naglowki = {}) {
    res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8', ...naglowki });
    res.end(JSON.stringify(obiekt));
}

function wyslijWynik(res, wynik, naglowki = {}) {
    wyslijJson(res, KODY_HTTP[wynik.status] ?? 400, wynik, naglowki);
}

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
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

function utworzRouterPS({ magazyn, bramka, kontakt, tozsamosc }) {
    // tozsamosc(req) → { status, avatar_id? } — dostarczana przez kontrakt Auth.

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
        const sesja = tozsamosc(req);
        const zalogowany = sesja.status === 'aktywna' ? sesja.avatar_id : null;
        const idGoscia = odczytajCookie(req, konfig.dostep.NAZWA_COOKIE_GOSCIA);

        // Wymaganie sesji dla ścieżek właściciela.
        const wymagaSesji = () => {
            if (!zalogowany) {
                wyslijJson(res, 401, { status: 'wymagana_sesja' });
                return true;
            }
            return false;
        };

        try {
            // ── bramka wstępna (osoby niezalogowane, PRZED rejestracją) ──
            let m = sciezka.match(/^\/bramka\/([a-z][a-z0-9_]{2,63})$/);
            if (req.method === 'POST' && m) {
                const wynik = await bramka.zatwierdzBramke(m[1], cialo);
                if (wynik.status === 'zapisano') {
                    wyslijWynik(res, wynik, {
                        'Set-Cookie': `${konfig.dostep.NAZWA_COOKIE_GOSCIA}=${wynik.id_goscia}; HttpOnly; Path=/; SameSite=Strict`,
                    });
                } else {
                    wyslijWynik(res, wynik);
                }
                return true;
            }

            // ── odczyt profilu wg poziomu obserwatora (Strumień 2) ──
            m = sciezka.match(/^\/profil\/([a-z][a-z0-9_]{2,63})$/);
            if (req.method === 'GET' && m) {
                const profil = await magazyn.odczytajProfil(m[1]);
                // Anonim bez zobowiązania: identyczna odpowiedź niezależnie od istnienia
                // profilu — brak enumeracji avatar_id przed bramką wstępną.
                if (!zalogowany && !(profil && bramka.goscMaDostep(profil, idGoscia))) {
                    wyslijJson(res, 403, {
                        status: 'wymagana_bramka',
                        elementy: ['uznanie_statusu', 'klauzula_nieuzycia'],
                    });
                    return true;
                }
                if (!profil) { wyslijWynik(res, { status: 'brak_profilu' }); return true; }
                const { poziom } = poziomObserwatora(profil, zalogowany);
                wyslijJson(res, 200, widokProfilu(profil, poziom));
                return true;
            }

            // ── stan osi S1 dla obserwatora ──
            m = sciezka.match(/^\/profil\/([a-z][a-z0-9_]{2,63})\/os\/([a-z_]+)$/);
            if (req.method === 'GET' && m) {
                const profil = await magazyn.odczytajProfil(m[1]);
                if (!profil) { wyslijWynik(res, { status: 'brak_profilu' }); return true; }
                if (!zalogowany && !bramka.goscMaDostep(profil, idGoscia)) {
                    wyslijJson(res, 403, { status: 'wymagana_bramka' });
                    return true;
                }
                if (!konfig.osie.OSIE.includes(m[2])) {
                    wyslijJson(res, 400, { status: 'bledne_zadanie', powod: `Nieznana oś: ${m[2]}` });
                    return true;
                }
                wyslijJson(res, 200, { os: m[2], stan: stanOsiS1(profil, zalogowany, m[2]) });
                return true;
            }

            // ── prośba o kontakt (zalogowany albo gość po bramce) ──
            m = sciezka.match(/^\/kontakt\/([a-z][a-z0-9_]{2,63})$/);
            if (req.method === 'POST' && m) {
                const profil = await magazyn.odczytajProfil(m[1]);
                if (!profil) { wyslijWynik(res, { status: 'brak_profilu' }); return true; }
                const od = zalogowany
                    ?? (bramka.goscMaDostep(profil, idGoscia) ? `gosc:${idGoscia}` : null);
                if (!od) { wyslijJson(res, 403, { status: 'wymagana_bramka' }); return true; }
                wyslijWynik(res, await kontakt.prosOKontakt(m[1], { od }));
                return true;
            }

            // ── ścieżki właściciela (sesja Auth obowiązkowa) ──
            if (sciezka === '/moj' && req.method === 'GET') {
                if (wymagaSesji()) return true;
                const profil = await magazyn.odczytajProfil(zalogowany);
                if (!profil) { wyslijWynik(res, { status: 'brak_profilu' }); return true; }
                wyslijJson(res, 200, widokProfilu(profil, 'wlasciciel'));
                return true;
            }
            if (sciezka === '/moj' && req.method === 'POST') {
                if (wymagaSesji()) return true;
                try {
                    await magazyn.utworzProfil({ avatar_id: zalogowany, imie: cialo.imie ?? zalogowany });
                    wyslijWynik(res, { status: 'utworzono', avatar_id: zalogowany });
                } catch (blad) {
                    wyslijJson(res, 409, { status: 'odmowa', powod: blad.message });
                }
                return true;
            }
            if (sciezka === '/moj/jakosci' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.ustawAutocertyfikat(zalogowany, cialo));
                return true;
            }
            if (sciezka === '/moj/symulacje' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.zapiszSymulacje(zalogowany, cialo));
                return true;
            }
            if (sciezka === '/moj/tokeny' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.zapiszToken(zalogowany, cialo));
                return true;
            }
            if (sciezka === '/moj/tokeny/volt' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.ustawAlokacjeVolt(zalogowany, cialo.alokacja));
                return true;
            }
            if (sciezka === '/moj/strumien2' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.ustawPoziomObserwatora(
                    zalogowany, cialo.obserwator, cialo.poziom));
                return true;
            }
            if (sciezka === '/moj/strumien1' && req.method === 'PUT') {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await magazyn.ustawNadpisanieS1(zalogowany, cialo));
                return true;
            }
            if (sciezka === '/moj/kontakty' && req.method === 'GET') {
                if (wymagaSesji()) return true;
                wyslijJson(res, 200, { prosby: await kontakt.listaProsb(zalogowany) });
                return true;
            }
            m = sciezka.match(/^\/moj\/kontakty\/([0-9a-f]+)\/decyzja$/);
            if (req.method === 'POST' && m && WZORZEC_ID_ZASOBU.test(m[1])) {
                if (wymagaSesji()) return true;
                wyslijWynik(res, await kontakt.zdecyduj(zalogowany, m[1], cialo.decyzja));
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

module.exports = { utworzRouterPS, PREFIKS };
