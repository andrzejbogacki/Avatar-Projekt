'use strict';

// Magazyn kont (pozycja 6 — forma): JSON per avatar_id (ADR-002).
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'accounts');

function nowyRekordKonta({ avatar_id, zaproszenie, token_aktywacji, teraz }) {
    return {
        avatar_id,
        status: 'oczekuje_aktywacji',
        haslo: null,
        aktywacja: {
            token: token_aktywacji,
            wygasa_ts: new Date(teraz + konfig.zaproszenia.TTL_TOKENU_AKTYWACJI_MS).toISOString(),
        },
        zaproszenie,
        certyfikacja_ps: {
            status: konfig.konta.STATUS_CERTYFIKACJI_STARTOWY,
            typ: null,
            poziom: null,
        },
        utworzono_ts: new Date(teraz).toISOString(),
    };
}

class MagazynKont {
    constructor({ katalog = KATALOG_DOMYSLNY } = {}) {
        this.katalog = katalog;
    }

    sciezka(avatar_id) {
        if (!konfig.konta.WZORZEC_AVATAR_ID.test(avatar_id)) {
            throw new Error(`Nieprawidłowy avatar_id: wymagany wzorzec ${konfig.konta.WZORZEC_AVATAR_ID}`);
        }
        return path.join(this.katalog, `${avatar_id}.json`);
    }

    async odczytajKonto(avatar_id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(avatar_id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return null;
            throw blad;
        }
    }

    async utworzKonto(rekord) {
        const plik = this.sciezka(rekord.avatar_id);
        await fs.mkdir(this.katalog, { recursive: true });
        try {
            // flaga 'wx' — atomowa odmowa nadpisania: żadne konto nie powstaje dwa razy
            await fs.writeFile(plik, JSON.stringify(rekord, null, 2), { encoding: 'utf8', flag: 'wx' });
        } catch (blad) {
            if (blad.code === 'EEXIST') throw new Error(`Konto ${rekord.avatar_id} już istnieje`);
            throw blad;
        }
        return rekord;
    }

    async zapiszKonto(rekord) {
        const plik = this.sciezka(rekord.avatar_id);
        const istnieje = await this.odczytajKonto(rekord.avatar_id);
        if (!istnieje) throw new Error(`Konto ${rekord.avatar_id} nie istnieje`);
        await fs.writeFile(plik, JSON.stringify(rekord, null, 2), 'utf8');
        return rekord;
    }

    async listaKont() {
        try {
            const pliki = await fs.readdir(this.katalog);
            return pliki
                .filter((p) => p.endsWith('.json'))
                .map((p) => p.slice(0, -'.json'.length));
        } catch (blad) {
            if (blad.code === 'ENOENT') return [];
            throw blad;
        }
    }

    async istniejaKonta() {
        return (await this.listaKont()).length > 0;
    }
}

module.exports = { MagazynKont, nowyRekordKonta, KATALOG_DOMYSLNY };
