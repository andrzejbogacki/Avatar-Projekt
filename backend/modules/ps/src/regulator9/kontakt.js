'use strict';

// Zgoda na kontakt (pozycja 9b): stan „warunkowy" — prośba o kontakt trafia
// do właściciela osi, który akceptuje lub odmawia. Brak automatycznego
// przyznania dostępu bez tej akcji.
const { randomBytes } = require('node:crypto');

const konfig = require('../../config');

const DLUGOSC_ID_PROSBY_BAJTY = 16;

class UslugaKontaktu {
    constructor({ magazyn, zegar = Date.now }) {
        this.magazyn = magazyn;
        this.zegar = zegar;
    }

    async prosOKontakt(avatar_id_wlasciciela, { od }) {
        if (typeof od !== 'string' || !od.trim()
            || od.length > konfig.dostep.MAKS_DLUGOSC_TEKSTU) {
            return { status: 'odmowa', powod: 'Wymagany identyfikator proszącego' };
        }
        const id = randomBytes(DLUGOSC_ID_PROSBY_BAJTY).toString('hex');
        const wynik = await this.magazyn.edytuj(avatar_id_wlasciciela, (profil) => {
            profil.modul_4_protokol_relacji.zgody_na_kontakt.push({
                id, od, status: 'oczekujaca',
                ts: new Date(this.zegar()).toISOString(),
                decyzja_ts: null,
            });
            return null;
        });
        if (wynik.status !== 'zapisano') return wynik;
        return { status: 'zapisano', id };
    }

    async listaProsb(avatar_id) {
        const profil = await this.magazyn.odczytajProfil(avatar_id);
        return profil ? profil.modul_4_protokol_relacji.zgody_na_kontakt : [];
    }

    async zdecyduj(avatar_id, id, decyzja) {
        if (!['zaakceptowana', 'odrzucona'].includes(decyzja)) {
            return { status: 'odmowa', powod: 'Decyzja musi być: zaakceptowana albo odrzucona' };
        }
        return this.magazyn.edytuj(avatar_id, (profil) => {
            const zgoda = profil.modul_4_protokol_relacji.zgody_na_kontakt.find((z) => z.id === id);
            if (!zgoda) return { status: 'odmowa', powod: 'Prośba nie istnieje' };
            if (zgoda.status !== 'oczekujaca') {
                return { status: 'odmowa', powod: `Prośba już rozstrzygnięta (${zgoda.status})` };
            }
            zgoda.status = decyzja;
            zgoda.decyzja_ts = new Date(this.zegar()).toISOString();
            return null;
        });
    }
}

module.exports = { UslugaKontaktu };
