'use strict';

// Glosariusz — kontrakt publiczny modułu (ADR-006).
// Inteligentny System Uspójniania Zrozumienia: detekcja terminów w dowolnej
// treści przez prekomputowany indeks form, inline-linking, dwufazowe zmiany.
// Wzorzec 3·6·9: skaner (3) · glosariusz+indeks (6) · spójność indeksu (9a)
// + bramka propozycji (9b). Rdzeń działa bez Auth (spec).
const path = require('node:path');

const konfigAuth = require('../auth').konfig;
const konfig = require('./config');
const { MagazynGlosariusza } = require('./src/regulator9/magazyn');
const { UslugaPropozycji } = require('./src/regulator9/propozycje');
const { oznaczTekst } = require('./src/skaner/oznacz');
const { utworzRouterGlosariusza } = require('./src/http/router');

const KATALOG_PROPOZYCJI = path.join(__dirname, 'propozycje');

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
}

function utworzGlosariusz({
    sciezkaGlosariusza, sciezkaIndeksu, katalogPropozycji, zegar = Date.now,
} = {}) {
    const magazyn = new MagazynGlosariusza({
        ...(sciezkaGlosariusza ? { sciezkaGlosariusza } : {}),
        ...(sciezkaIndeksu ? { sciezkaIndeksu } : {}),
        zegar,
    });
    const propozycje = new UslugaPropozycji({
        katalog: katalogPropozycji ?? KATALOG_PROPOZYCJI,
        magazyn,
        zegar,
    });

    let tozsamosc = () => ({ status: 'auth_niepodpiety' });
    function podepnijAuth(instancjaAuth) {
        tozsamosc = (req) => instancjaAuth.usluga_logowania.ktoZalogowany(
            odczytajCookie(req, konfigAuth.sesje.NAZWA_COOKIE)
        );
    }

    const obsluzZadanie = utworzRouterGlosariusza({
        magazyn, propozycje,
        tozsamosc: (req) => tozsamosc(req),
    });

    return {
        obsluzZadanie,
        podepnijAuth,
        przebudujIndeks: () => magazyn.przebudujIndeks(),
        oznacz: async (tekst) => oznaczTekst(tekst, await magazyn.indeks(),
            { terminy: await magazyn.terminy() }),
        magazyn_glosariusza: magazyn,
        usluga_propozycji: propozycje,
    };
}

module.exports = { utworzGlosariusz, konfig };
