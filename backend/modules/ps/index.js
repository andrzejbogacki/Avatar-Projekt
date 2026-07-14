'use strict';

// PS — Protokół Suwerenności: kontrakt publiczny modułu (ADR-003).
// Cztery moduły PS na jednym pliku JSON per Avatar; dostęp wg Strumieni 1/2.
// Wzorzec 3·6·9: widoki (3) · profile (6) · dostęp (9a) + regulator9 (9b).
// PS CZYTA tożsamość z Auth wyłącznie przez kontrakt (podepnijAuth).
const konfigAuth = require('../auth').konfig;
const konfig = require('./config');
const { MagazynProfili } = require('./src/profil/magazyn');
const { UslugaBramki } = require('./src/regulator9/bramka');
const { UslugaKontaktu } = require('./src/regulator9/kontakt');
const { utworzPrzyjecieCertyfikacji } = require('./src/regulator9/certyfikacja');
const { utworzRouterPS } = require('./src/http/router');

function odczytajCookie(req, nazwa) {
    for (const czesc of (req.headers.cookie || '').split(';')) {
        const [n, ...reszta] = czesc.trim().split('=');
        if (n === nazwa) return reszta.join('=');
    }
    return null;
}

function utworzPS({ katalogProfili, zegar = Date.now } = {}) {
    const magazyn = new MagazynProfili({
        ...(katalogProfili ? { katalog: katalogProfili } : {}),
        zegar,
    });
    const bramka = new UslugaBramki({ magazyn, zegar });
    const kontakt = new UslugaKontaktu({ magazyn, zegar });
    const przyjmijAktCertyfikacji = utworzPrzyjecieCertyfikacji({ magazyn, zegar });

    // Tożsamość obserwatora — do podpięcia kontraktem Auth; bez Auth zwraca
    // jawny status (moduł działa, ścieżki właściciela odmawiają).
    let tozsamosc = () => ({ status: 'auth_niepodpiety' });

    function podepnijAuth(instancjaAuth) {
        tozsamosc = (req) => instancjaAuth.usluga_logowania.ktoZalogowany(
            odczytajCookie(req, konfigAuth.sesje.NAZWA_COOKIE)
        );
    }

    const obsluzZadanie = utworzRouterPS({
        magazyn, bramka, kontakt,
        tozsamosc: (req) => tozsamosc(req),
    });

    return {
        obsluzZadanie,
        podepnijAuth,
        przyjmijAktCertyfikacji, // hook dla Auth przy zatwierdzonym zaproszeniu
        magazyn_profili: magazyn,
        usluga_bramki: bramka,
        usluga_kontaktu: kontakt,
    };
}

module.exports = { utworzPS, konfig };
