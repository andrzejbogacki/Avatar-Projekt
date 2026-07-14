'use strict';

// Warstwa HTTP Wymiennika — wszystkie ścieżki wymagają sesji Auth
// (tożsamość stron transakcji). Jawne statusy usług → kody HTTP.
const LIMIT_CIALA_BAJTY = 100_000;
const PREFIKS = '/api/wymiennik';
const WZORZEC_ID = /^[0-9a-f]+$/;
const WZORZEC_TOKEN = /^[a-z][a-z0-9_]{1,63}$/;

const KODY_HTTP = Object.freeze({
    utworzono: 201,
    zapisano: 201,
    wyemitowano: 200,
    rozliczona: 200,
    oczekuje_potwierdzen: 200,
    umowa_zewnetrzna: 200,
    odrzucona: 200,
    wycofana: 200,
    anulowana: 200,
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

function utworzRouterWymiennika({ fabryka, wymiana, salda, tokeny, tozsamosc }) {
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
        if (sesja.status !== 'aktywna') {
            wyslijJson(res, 401, { status: 'wymagana_sesja' });
            return true;
        }
        const ja = sesja.avatar_id;

        try {
            if (req.method === 'GET' && sciezka === '/tokeny') {
                wyslijJson(res, 200, { tokeny: await tokeny.lista() });
                return true;
            }
            if (req.method === 'POST' && sciezka === '/tokeny') {
                wyslijWynik(res, await fabryka.utworzToken(ja, cialo));
                return true;
            }
            let m = sciezka.match(/^\/tokeny\/([a-z][a-z0-9_]{1,63})\/emisja$/);
            if (req.method === 'POST' && m && WZORZEC_TOKEN.test(m[1])) {
                wyslijWynik(res, await fabryka.emituj(ja, m[1], Number(cialo.ilosc)));
                return true;
            }
            if (req.method === 'GET' && sciezka === '/moje/salda') {
                wyslijJson(res, 200, await salda.odczytaj(ja));
                return true;
            }
            if (req.method === 'GET' && sciezka === '/moje/transakcje') {
                wyslijJson(res, 200, { transakcje: await wymiana.mojeTransakcje(ja) });
                return true;
            }
            if (req.method === 'POST' && sciezka === '/transakcje') {
                wyslijWynik(res, await wymiana.zaproponujTransakcje({
                    od: ja, do: cialo.do,
                    oddaje: cialo.oddaje, oczekuje: cialo.oczekuje, tryb: cialo.tryb,
                }));
                return true;
            }
            m = sciezka.match(/^\/transakcje\/([0-9a-f]+)\/(wycofaj|odpowiedz|potwierdz|anuluj)$/);
            if (req.method === 'POST' && m && WZORZEC_ID.test(m[1])) {
                const [, id, akcja] = m;
                const wynik = akcja === 'wycofaj' ? await wymiana.wycofajTransakcje(id, ja)
                    : akcja === 'odpowiedz' ? await wymiana.odpowiedzNaTransakcje(id, ja, cialo.decyzja)
                    : akcja === 'potwierdz' ? await wymiana.potwierdzWykonanie(id, ja)
                    : await wymiana.anuluj(id, ja);
                wyslijWynik(res, wynik);
                return true;
            }
            if (req.method === 'GET' && sciezka === '/oferty') {
                wyslijJson(res, 200, { oferty: await wymiana.listaOfert() });
                return true;
            }
            if (req.method === 'POST' && sciezka === '/oferty') {
                wyslijWynik(res, await wymiana.wystawOferte({
                    wystawca: ja,
                    oddaje: cialo.oddaje, oczekuje: cialo.oczekuje,
                    opis: cialo.opis, tryb: cialo.tryb,
                }));
                return true;
            }
            m = sciezka.match(/^\/oferty\/([0-9a-f]+)\/(wycofaj|przyjmij)$/);
            if (req.method === 'POST' && m && WZORZEC_ID.test(m[1])) {
                const wynik = m[2] === 'wycofaj'
                    ? await wymiana.wycofajOferte(m[1], ja)
                    : await wymiana.przyjmijOferte(m[1], ja);
                wyslijWynik(res, wynik);
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

module.exports = { utworzRouterWymiennika, PREFIKS };
