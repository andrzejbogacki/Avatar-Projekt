'use strict';

// Dokumentacja — kontrakt publiczny modułu (ADR-007).
// Artefakty treściowe projektu (strategie, źródła prawdy) w repozytorium,
// zarejestrowane w manifeście dokumentów z hash-em źródła.
// Wzorzec 3·6·9: odczyt/serwowanie (3) · dokumenty+manifest (6) ·
// spójność hash (9a) + walidacja wpisów i bramka przebudowy (9b).
// Rdzeń działa bez Auth i bez Glosariusza (zależności opcjonalne).

const konfigAuth = require('../auth').konfig;
const konfig = require('./config');
const { MagazynDokumentow } = require('./src/regulator9/magazyn');
const { utworzRouterDokumentacji } = require('./src/http/router');

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
}

function utworzDokumentacje({ sciezkaManifestu, katalogRepo, maksBajty, zegar = Date.now } = {}) {
    const magazyn = new MagazynDokumentow({
        ...(sciezkaManifestu ? { sciezkaManifestu } : {}),
        ...(katalogRepo ? { katalogRepo } : {}),
        ...(maksBajty ? { maksBajty } : {}),
        zegar,
    });

    let tozsamosc = () => ({ status: 'auth_niepodpiety' });
    function podepnijAuth(instancjaAuth) {
        tozsamosc = (req) => instancjaAuth.usluga_logowania.ktoZalogowany(
            odczytajCookie(req, konfigAuth.sesje.NAZWA_COOKIE)
        );
    }

    let oznaczanie = null;
    function podepnijGlosariusz(instancjaGlosariusza) {
        oznaczanie = (tekst) => instancjaGlosariusza.oznacz(tekst);
    }

    const obsluzZadanie = utworzRouterDokumentacji({
        magazyn,
        tozsamosc: (req) => tozsamosc(req),
        oznacz: () => oznaczanie,
    });

    return {
        obsluzZadanie,
        podepnijAuth,
        podepnijGlosariusz,
        przebudujManifest: () => magazyn.przebudujManifest(),
        magazyn_dokumentow: magazyn,
    };
}

module.exports = { utworzDokumentacje, konfig };
