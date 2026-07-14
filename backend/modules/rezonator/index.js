'use strict';

// Rezonator Kwantowy — kontrakt publiczny modułu (ADR-005, Faza A).
// Warstwa logiczna: rozproszone rezonatory per Źródło + plan emisji 3-etapowy.
// Warstwa wykonawcza (HA): Fazy B/C — osobne zatwierdzenia.
// Wzorzec 3·6·9: emisja (3) · zrodla (6) · sync (9a) + regulator9/klient QAC (9b).
const konfigAuth = require('../auth').konfig;
const qac = require('../qac');
const konfig = require('./config');
const { MagazynZrodel } = require('./src/zrodla/magazyn');
const { utworzKlientaQAC } = require('./src/regulator9/klient_qac');
const { utworzGeneratorPlanu } = require('./src/emisja/plan');
const { RejestrSesjiEmisji } = require('./src/sesje/rejestr');
const { sygnaturaZrodla, sync } = require('./src/sync/zegar');
const { utworzRouterRezonatora } = require('./src/http/router');

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
}

function utworzRezonator({
    katalogZrodel, katalogProfiliQAC, rozszerzenia_wlaczone, zegar = Date.now,
} = {}) {
    const zrodla = new MagazynZrodel({
        ...(katalogZrodel ? { katalog: katalogZrodel } : {}),
        zegar,
    });
    // Klient QAC: request-response na żądanie, bez cache (ADR-005).
    const klientQAC = utworzKlientaQAC({ qac, katalogProfili: katalogProfiliQAC, zegar });
    const generator = utworzGeneratorPlanu({
        klientQAC, zegar,
        ...(rozszerzenia_wlaczone ? { rozszerzenia_wlaczone } : {}),
    });
    const sesje = new RejestrSesjiEmisji({ zegar });

    let tozsamosc = () => ({ status: 'auth_niepodpiety' });
    function podepnijAuth(instancjaAuth) {
        tozsamosc = (req) => instancjaAuth.usluga_logowania.ktoZalogowany(
            odczytajCookie(req, konfigAuth.sesje.NAZWA_COOKIE)
        );
    }

    const obsluzZadanie = utworzRouterRezonatora({
        zrodla, generator, sesje,
        tozsamosc: (req) => tozsamosc(req),
        zegar,
    });

    return {
        obsluzZadanie,
        podepnijAuth,
        magazyn_zrodel: zrodla,
        generator_planu: generator,
        rejestr_sesji: sesje,
        klient_qac: klientQAC,
        sygnaturaZrodla,
        sync,
    };
}

module.exports = { utworzRezonator, konfig };
