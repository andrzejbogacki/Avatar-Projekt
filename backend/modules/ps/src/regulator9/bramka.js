'use strict';

// Bramka wstępna (pozycja 9b — regulator): działa PRZED rejestracją, dla osób
// niezalogowanych. Dwa elementy zatwierdzenia — oba obowiązkowe. Zatwierdzenie
// = zapis zobowiązania w rejestrze dostępu profilu właściciela; odblokowuje
// podgląd na poziomie „niesklasyfikowany" (Strumień 2).
const { randomBytes } = require('node:crypto');

const konfig = require('../../config');

class UslugaBramki {
    constructor({ magazyn, zegar = Date.now }) {
        this.magazyn = magazyn;
        this.zegar = zegar;
    }

    async zatwierdzBramke(avatar_id_wlasciciela, { uznanie_statusu, klauzula_nieuzycia } = {}) {
        if (uznanie_statusu !== true || klauzula_nieuzycia !== true) {
            return {
                status: 'odmowa',
                powod: 'Wymagane oba elementy: uznanie statusu Profilu Suwerena i klauzula nieużycia danych',
            };
        }
        const id_goscia = randomBytes(konfig.dostep.DLUGOSC_ID_GOSCIA_BAJTY).toString('hex');
        const wynik = await this.magazyn.edytuj(avatar_id_wlasciciela, (profil) => {
            profil.modul_4_protokol_relacji.rejestr_dostepu.push({
                id_goscia,
                uznanie_statusu: true,
                klauzula_nieuzycia: true,
                ts: new Date(this.zegar()).toISOString(),
            });
            return null;
        });
        if (wynik.status !== 'zapisano') return wynik;
        return { status: 'zapisano', id_goscia };
    }

    goscMaDostep(profil, id_goscia) {
        if (!id_goscia) return false;
        return profil.modul_4_protokol_relacji.rejestr_dostepu
            .some((w) => w.id_goscia === id_goscia);
    }
}

module.exports = { UslugaBramki };
