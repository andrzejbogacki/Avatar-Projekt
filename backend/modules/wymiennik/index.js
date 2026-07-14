'use strict';

// Wymiennik (Gebo) — kontrakt publiczny modułu (ADR-004).
// Wymiana tokenów między Avatarami z walidacją akceptacji przez PS (Moduł 3).
// Wzorzec 3·6·9: wymiana (3) · tokeny+salda+rekordy (6) · rozliczenie (9a)
// + regulator9: walidacja PS, kurs 1:1, adaptery (9b).
const konfigAuth = require('../auth').konfig;
const konfig = require('./config');
const { MagazynTokenow } = require('./src/fabryka/magazyn_tokenow');
const { MagazynSald } = require('./src/salda/magazyn_sald');
const { MagazynRekordow } = require('./src/wymiana/magazyn_rekordow');
const { Fabryka } = require('./src/fabryka/fabryka');
const { UslugaWymiany } = require('./src/wymiana/wymiana');
const { utworzWalidacjePS } = require('./src/regulator9/walidacja_ps');
const { RejestrAdapterow, AdapterAtrapa } = require('./src/regulator9/adaptery');
const { utworzRouterWymiennika } = require('./src/http/router');

const path = require('node:path');
const KATALOG_TRANSAKCJI = path.join(__dirname, 'transakcje');
const KATALOG_OFERT = path.join(__dirname, 'oferty');

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
}

function utworzWymiennik({
    katalogTokenow, katalogSald, katalogTransakcji, katalogOfert, zegar = Date.now,
} = {}) {
    const tokeny = new MagazynTokenow(katalogTokenow ? { katalog: katalogTokenow } : {});
    const salda = new MagazynSald(katalogSald ? { katalog: katalogSald } : {});
    const transakcje = new MagazynRekordow({ katalog: katalogTransakcji ?? KATALOG_TRANSAKCJI });
    const oferty = new MagazynRekordow({ katalog: katalogOfert ?? KATALOG_OFERT });
    const fabryka = new Fabryka({ tokeny, salda, zegar });
    const adaptery = new RejestrAdapterow();
    adaptery.zarejestruj(new AdapterAtrapa({ zegar }));

    // Zależność twarda od PS — bez podpięcia każda transakcja odmawia jawnie.
    let walidacjaPS = {
        sprawdzTransakcje: async () => ({
            akceptowany: false, powod: 'Moduł PS niepodpięty — walidacja akceptacji niemożliwa',
        }),
    };
    let tozsamosc = () => ({ status: 'auth_niepodpiety' });

    const wymiana = new UslugaWymiany({
        tokeny, salda, transakcje, oferty,
        walidacjaPS: {
            sprawdzTransakcje: (...a) => walidacjaPS.sprawdzTransakcje(...a),
        },
        adaptery, zegar,
    });

    function podepnijPS(ps) {
        walidacjaPS = utworzWalidacjePS({ ps });
    }

    function podepnijAuth(instancjaAuth) {
        tozsamosc = (req) => instancjaAuth.usluga_logowania.ktoZalogowany(
            odczytajCookie(req, konfigAuth.sesje.NAZWA_COOKIE)
        );
    }

    const obsluzZadanie = utworzRouterWymiennika({
        fabryka, wymiana, salda, tokeny,
        tozsamosc: (req) => tozsamosc(req),
    });

    return {
        obsluzZadanie,
        podepnijAuth,
        podepnijPS,
        fabryka,
        wymiana,
        rejestr_adapterow: adaptery,
        magazyn_tokenow: tokeny,
        magazyn_sald: salda,
    };
}

module.exports = { utworzWymiennik, konfig };
