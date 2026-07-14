'use strict';

// Warstwa HTTP Dokumentacji (pozycja 3 — odczyt/serwowanie).
// Odczyt: PUBLICZNY (rdzeń bez zależności od Auth). Przebudowa manifestu:
// sesja Auth. Oznaczanie terminów: przez podpięty moduł Glosariusz (opcjonalny
// — jego brak daje jawny status, nie błąd rdzenia).

const PREFIKS = '/api/dokumentacja';

function wyslijJson(res, kod, obiekt) {
    res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obiekt));
}

function utworzRouterDokumentacji({ magazyn, tozsamosc, oznacz }) {
    return async function obsluzZadanie(req, res) {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith(`${PREFIKS}/`)) return false;
        const sciezka = decodeURIComponent(url.pathname.slice(PREFIKS.length));

        const sesja = tozsamosc(req);
        const zalogowany = sesja.status === 'aktywna' ? sesja.avatar_id : null;

        try {
            if (req.method === 'GET' && sciezka === '/manifest') {
                wyslijJson(res, 200, await magazyn.lista());
                return true;
            }

            let m = sciezka.match(/^\/dokumenty\/([a-z0-9_]{1,64})$/);
            if (req.method === 'GET' && m) {
                const dokument = await magazyn.dokument(m[1]);
                if (!dokument) { wyslijJson(res, 404, { status: 'brak_dokumentu' }); return true; }
                wyslijJson(res, 200, dokument);
                return true;
            }

            m = sciezka.match(/^\/dokumenty\/([a-z0-9_]{1,64})\/oznaczony$/);
            if (req.method === 'GET' && m) {
                const oznaczanie = oznacz();
                if (!oznaczanie) {
                    wyslijJson(res, 503, { status: 'glosariusz_niepodpiety' });
                    return true;
                }
                const dokument = await magazyn.dokument(m[1]);
                if (!dokument) { wyslijJson(res, 404, { status: 'brak_dokumentu' }); return true; }
                const { tresc, ...meta } = dokument;
                wyslijJson(res, 200, { ...meta, segmenty: await oznaczanie(tresc) });
                return true;
            }

            if (req.method === 'POST' && sciezka === '/manifest/przebuduj') {
                if (!zalogowany) { wyslijJson(res, 401, { status: 'wymagana_sesja' }); return true; }
                await magazyn.przebudujManifest();
                wyslijJson(res, 200, { status: 'przebudowano', ...(await magazyn.lista()) });
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

module.exports = { utworzRouterDokumentacji, PREFIKS };
