'use strict';

// Auth — kontrakt publiczny modułu (jedyne wejście dla innych modułów i serwera).
// Tożsamość, sesja i rejestracja przez zaproszenie (ADR-002).
// Wzorzec 3·6·9: logowanie (3) · konta+zaproszenia (6) · sesje (9a) + regulator9 (9b).
const konfig = require('./config');
const { MagazynKont, nowyRekordKonta } = require('./src/konta/magazyn');
const { RejestrSesji } = require('./src/sesje/rejestr');
const { UslugaLogowania } = require('./src/logowanie/usluga');
const { generujTokenAktywacji } = require('./src/logowanie/krypto');
const { MagazynZaproszen } = require('./src/regulator9/magazyn_zaproszen');
const { UslugaZaproszen } = require('./src/regulator9/zaproszenia');
const { kontoDemoDozwolone } = require('./src/regulator9/srodowisko');
const { utworzRouterAuth } = require('./src/http/router');

function utworzAuth({ katalogKont, katalogZaproszen, hookPS, zegar = Date.now } = {}) {
    const magazyn_kont = new MagazynKont(katalogKont ? { katalog: katalogKont } : {});
    const magazyn_zaproszen = new MagazynZaproszen(
        katalogZaproszen ? { katalog: katalogZaproszen } : {}
    );
    const sesje = new RejestrSesji({ zegar });
    const usluga_logowania = new UslugaLogowania({ magazyn: magazyn_kont, sesje, zegar });
    const usluga_zaproszen = new UslugaZaproszen({
        konta: magazyn_kont,
        zaproszenia: magazyn_zaproszen,
        ...(hookPS ? { hookPS } : {}),
        zegar,
    });
    const obsluzZadanie = utworzRouterAuth({ usluga_logowania, usluga_zaproszen });

    // Jednorazowe utworzenie konta Suwerena — jedyna ścieżka poza bramką zaproszeń.
    async function bootstrapSuwerena() {
        if (await magazyn_kont.istniejaKonta()) {
            return { status: 'odmowa', powod: 'Bootstrap możliwy wyłącznie na pustym magazynie kont' };
        }
        const token_aktywacji = generujTokenAktywacji();
        await magazyn_kont.utworzKonto(nowyRekordKonta({
            avatar_id: konfig.konta.SUWEREN_AVATAR_ID,
            zaproszenie: { zapraszajacy: null, uzasadnienie: 'bootstrap Suwerena' },
            token_aktywacji,
            teraz: zegar(),
        }));
        return { status: 'utworzono', avatar_id: konfig.konta.SUWEREN_AVATAR_ID, token_aktywacji };
    }

    return {
        obsluzZadanie,
        bootstrapSuwerena,
        usluga_logowania,
        usluga_zaproszen,
        sesje,
        magazyn_kont,
    };
}

module.exports = { utworzAuth, kontoDemoDozwolone, konfig };
