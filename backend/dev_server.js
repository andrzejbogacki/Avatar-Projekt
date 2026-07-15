'use strict';

// Serwer podglądu QAC — narzędzie deweloperskie, NIE część kontraktu modułu.
// Udostępnia jeden endpoint (POST /api/qac/profil) wywołujący rzeczywisty
// przebieg qac.generujProfil oraz statyczną stronę podglądu (dev_public/).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const qac = require('./modules/qac');
const { BuforSrodowiskowy } = require('./modules/qac/cache');
const { utworzAuth } = require('./modules/auth');
const { utworzPS } = require('./modules/ps');
const { utworzWymiennik } = require('./modules/wymiennik');
const { utworzRezonator } = require('./modules/rezonator');
const { utworzGlosariusz } = require('./modules/glosariusz');
const { utworzDokumentacje } = require('./modules/dokumentacja');

const PORT = Number(process.env.QAC_DEV_PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'dev_public');
const LIMIT_CIALA_BAJTY = 1_000_000;

// Identyfikacja wymagana przez politykę użycia Nominatim (OSM).
const USER_AGENT_GEO = 'AvatarQAC-DevTool/0.1 (narzedzie deweloperskie, lokalne uzycie)';
const MIN_ODSTEP_NOMINATIM_MS = 1_000; // limit polityki Nominatim: maks. 1 zapytanie/s
let ostatnieZapytanieNominatim = 0;

let bufor = null;
const ps = utworzPS();
const auth = utworzAuth({ hookPS: ps.przyjmijAktCertyfikacji });
ps.podepnijAuth(auth);
const wymiennik = utworzWymiennik();
wymiennik.podepnijAuth(auth);
wymiennik.podepnijPS(ps);
const rezonator = utworzRezonator();
rezonator.podepnijAuth(auth);
const glosariusz = utworzGlosariusz();
glosariusz.podepnijAuth(auth);
const dokumentacja = utworzDokumentacje();
dokumentacja.podepnijAuth(auth);
dokumentacja.podepnijGlosariusz(glosariusz);

async function poczekajNaLimitNominatim() {
    const odstep = Date.now() - ostatnieZapytanieNominatim;
    if (odstep < MIN_ODSTEP_NOMINATIM_MS) {
        await new Promise((r) => setTimeout(r, MIN_ODSTEP_NOMINATIM_MS - odstep));
    }
    ostatnieZapytanieNominatim = Date.now();
}

function odczytajParametry(url) {
    return Object.fromEntries(new URL(url, 'http://localhost').searchParams);
}

function odczytajCialoJson(req) {
    return new Promise((resolve, reject) => {
        let dane = '';
        let rozmiar = 0;
        req.on('data', (chunk) => {
            rozmiar += chunk.length;
            if (rozmiar > LIMIT_CIALA_BAJTY) {
                reject(new Error('Ciało zapytania przekracza limit'));
                req.destroy();
                return;
            }
            dane += chunk;
        });
        req.on('end', () => {
            if (!dane) { resolve({}); return; }
            try { resolve(JSON.parse(dane)); }
            catch (blad) { reject(new Error(`Nieprawidłowy JSON: ${blad.message}`)); }
        });
        req.on('error', reject);
    });
}

function wyslijJson(res, status, obiekt) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obiekt, null, 2));
}

function wyslijStatyczny(res, sciezka, typ) {
    fs.readFile(sciezka, (blad, zawartosc) => {
        if (blad) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Nie znaleziono');
            return;
        }
        res.writeHead(200, { 'Content-Type': typ });
        res.end(zawartosc);
    });
}

const serwer = http.createServer(async (req, res) => {
    // Moduły Auth i PS obsługują własne prefiksy /api/* przez kontrakty modułów.
    if (await auth.obsluzZadanie(req, res)) return;
    if (await ps.obsluzZadanie(req, res)) return;
    if (await wymiennik.obsluzZadanie(req, res)) return;
    if (await rezonator.obsluzZadanie(req, res)) return;
    if (await glosariusz.obsluzZadanie(req, res)) return;
    if (await dokumentacja.obsluzZadanie(req, res)) return;

    if (req.method === 'GET' && (req.url === '/' || req.url === '/podglad.html')) {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'podglad.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/auth.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'auth.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/ps.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'ps.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/wymiennik.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'wymiennik.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/rezonator.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'rezonator.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/glosariusz.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'glosariusz.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/dokumenty.html') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'dokumenty.html'), 'text/html; charset=utf-8');
        return;
    }

    if (req.method === 'GET' && req.url === '/menu.js') {
        wyslijStatyczny(res, path.join(PUBLIC_DIR, 'menu.js'), 'application/javascript; charset=utf-8');
        return;
    }

    if (req.method === 'POST' && req.url === '/api/qac/profil') {
        try {
            const dane = await odczytajCialoJson(req);
            const { profil, sciezka } = await qac.generujProfil(dane, { bufor });
            wyslijJson(res, 200, { profil, zapisano: sciezka });
        } catch (blad) {
            wyslijJson(res, 400, { blad: blad.message });
        }
        return;
    }

    // Podgląd wyliczonego UTC dla formularza. Konwersja żyje wyłącznie w module —
    // przeglądarka nie powiela algorytmu reguł DST (ADR-009).
    if (req.method === 'GET' && req.url.startsWith('/api/qac/czas/utc')) {
        try {
            const { czas, strefa } = odczytajParametry(req.url);
            if (!czas || !strefa) throw new Error('Wymagane parametry: czas, strefa');
            const [data, godz] = String(czas).split('T');
            if (!data || !godz) throw new Error('Parametr czas: oczekiwano RRRR-MM-DDTGG:MM:SS');
            const [rok, miesiac, dzien] = data.split('-').map(Number);
            const [godzina, minuta, sekunda = '0'] = godz.split(':');
            const wynik = qac.kalkulator.lokalnyNaUtc(
                { rok, miesiac, dzien, godzina: Number(godzina), minuta: Number(minuta), sekunda: Number(sekunda) },
                strefa
            );
            wyslijJson(res, 200, wynik);
        } catch (blad) {
            // Komunikat pochodzi z modułu — użytkownik widzi to samo zdanie,
            // które zobaczyłby przy odrzuceniu zapisu.
            wyslijJson(res, 400, { blad: blad.message });
        }
        return;
    }

    // --- Narzędzia deweloperskie (QAC_DEV_TOOLS=1) ---
    // Wystawiają daty i miejsca urodzenia realnych osób. Bez flagi trasy nie
    // istnieją — w wersji publicznej nie ma czego usuwać (ADR-008, ADR-009).
    if (process.env.QAC_DEV_TOOLS === '1') {
        if (req.method === 'GET' && req.url === '/api/qac/dev/profile') {
            try {
                const identyfikatory = await qac.listujAvatary();
                const profile = [];
                for (const avatar_id of identyfikatory) {
                    const profil = await qac.wczytajProfil(avatar_id);
                    // Profile 1.0.0 nie mają danych wejściowych — pomijamy zamiast
                    // zgadywać; wpis, z którego nie da się wypełnić formularza,
                    // byłby pułapką.
                    if (!profil?.dane_wejsciowe) continue;
                    profile.push({ avatar_id, dane_wejsciowe: profil.dane_wejsciowe });
                }
                wyslijJson(res, 200, { profile });
            } catch (blad) {
                wyslijJson(res, 500, { blad: blad.message });
            }
            return;
        }

        if (req.method === 'DELETE' && req.url.startsWith('/api/qac/dev/profil/')) {
            try {
                const avatar_id = decodeURIComponent(
                    req.url.slice('/api/qac/dev/profil/'.length).split('?')[0]
                );
                // Walidacja avatar_id żyje w bramce 9b — tu tylko rozróżniamy
                // odmowę autoryzacji (400) od braku profilu (404).
                const kosz = await qac.usunProfil(avatar_id);
                if (!kosz) {
                    wyslijJson(res, 404, { blad: `Brak profilu: ${avatar_id}` });
                    return;
                }
                wyslijJson(res, 200, { usuniety: avatar_id, kosz });
            } catch (blad) {
                wyslijJson(res, 400, { blad: blad.message });
            }
            return;
        }
    }

    if (req.method === 'GET' && req.url.startsWith('/api/geokodowanie/odwrotne')) {
        try {
            const { dlugosc, szerokosc } = odczytajParametry(req.url);
            if (!dlugosc || !szerokosc) throw new Error('Wymagane parametry: dlugosc, szerokosc');
            await poczekajNaLimitNominatim();
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(szerokosc)}&lon=${encodeURIComponent(dlugosc)}&format=json&zoom=10`;
            const odp = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT_GEO },
                signal: AbortSignal.timeout(8000),
            });
            if (!odp.ok) throw new Error(`Nominatim (odwrotne): HTTP ${odp.status}`);
            const dane = await odp.json();
            wyslijJson(res, 200, { nazwa: dane.display_name || null });
        } catch (blad) {
            wyslijJson(res, 502, { blad: blad.message });
        }
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/geokodowanie')) {
        try {
            const { miasto } = odczytajParametry(req.url);
            if (!miasto || !miasto.trim()) throw new Error('Wymagany parametr: miasto');
            await poczekajNaLimitNominatim();
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(miasto)}&format=json&limit=5&addressdetails=1`;
            const odp = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT_GEO },
                signal: AbortSignal.timeout(8000),
            });
            if (!odp.ok) throw new Error(`Nominatim: HTTP ${odp.status}`);
            const wyniki = await odp.json();
            wyslijJson(res, 200, {
                wyniki: wyniki.map((w) => ({
                    nazwa: w.display_name,
                    dlugosc_geo: Number(w.lon),
                    szerokosc_geo: Number(w.lat),
                })),
            });
        } catch (blad) {
            wyslijJson(res, 502, { blad: blad.message });
        }
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/wysokosc')) {
        try {
            const { dlugosc, szerokosc } = odczytajParametry(req.url);
            if (!dlugosc || !szerokosc) throw new Error('Wymagane parametry: dlugosc, szerokosc');
            const url = `https://api.open-elevation.com/api/v1/lookup?locations=${encodeURIComponent(szerokosc)},${encodeURIComponent(dlugosc)}`;
            const odp = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!odp.ok) throw new Error(`Open-Elevation: HTTP ${odp.status}`);
            const dane = await odp.json();
            const wynik = dane.results?.[0];
            if (!wynik || !Number.isFinite(wynik.elevation)) throw new Error('Brak danych wysokości dla tego punktu');
            wyslijJson(res, 200, { wysokosc_npm_m: wynik.elevation });
        } catch (blad) {
            wyslijJson(res, 502, { blad: blad.message });
        }
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/pobierz/')) {
        const PAKIETY_DIR = path.join(PUBLIC_DIR, 'pobierz');
        const zadanaNazwa = decodeURIComponent(req.url.slice('/pobierz/'.length).split('?')[0]);
        const sciezka = path.join(PAKIETY_DIR, zadanaNazwa);
        // ochrona przed path traversal — rozwiązana ścieżka musi pozostać w PAKIETY_DIR
        if (!sciezka.startsWith(PAKIETY_DIR + path.sep)) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Nieprawidłowa ścieżka');
            return;
        }
        fs.readFile(sciezka, (blad, zawartosc) => {
            if (blad) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Nie znaleziono');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${path.basename(sciezka)}"`,
            });
            res.end(zawartosc);
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nie znaleziono');
});

async function start() {
    bufor = await new BuforSrodowiskowy().inicjalizuj();
    const powod = bufor.powod_fallbacku ? ` (${bufor.powod_fallbacku})` : '';
    console.log(`[QAC dev] bufor środowiskowy: ${bufor.typ_bufora}${powod}`);
    await bufor.odswiez();
    bufor.start();

    serwer.listen(PORT, () => {
        console.log(`[QAC dev] serwer podglądu: http://localhost:${PORT}`);
    });
}

start();

process.on('SIGINT', async () => {
    if (bufor) await bufor.zamknij();
    serwer.close(() => process.exit(0));
});
