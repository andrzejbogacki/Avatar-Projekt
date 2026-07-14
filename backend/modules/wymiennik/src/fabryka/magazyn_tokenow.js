'use strict';

// Magazyn definicji tokenów (pozycja 6 — forma): JSON per token_id.
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'tokeny');

class MagazynTokenow {
    constructor({ katalog = KATALOG_DOMYSLNY } = {}) {
        this.katalog = katalog;
    }

    sciezka(token_id) {
        if (!konfig.tokeny.WZORZEC_TOKEN_ID.test(String(token_id))) {
            throw new Error(`Nieprawidłowy token_id: wymagany wzorzec ${konfig.tokeny.WZORZEC_TOKEN_ID}`);
        }
        return path.join(this.katalog, `${token_id}.json`);
    }

    async odczytaj(token_id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(token_id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return null;
            throw blad;
        }
    }

    async utworz(definicja) {
        await fs.mkdir(this.katalog, { recursive: true });
        try {
            await fs.writeFile(this.sciezka(definicja.token_id),
                JSON.stringify(definicja, null, 2), { encoding: 'utf8', flag: 'wx' });
        } catch (blad) {
            if (blad.code === 'EEXIST') throw new Error(`Token ${definicja.token_id} już istnieje`);
            throw blad;
        }
        return definicja;
    }

    async lista() {
        let pliki;
        try {
            pliki = await fs.readdir(this.katalog);
        } catch (blad) {
            if (blad.code === 'ENOENT') return [];
            throw blad;
        }
        const wynik = [];
        for (const plik of pliki.filter((p) => p.endsWith('.json')).sort()) {
            wynik.push(JSON.parse(await fs.readFile(path.join(this.katalog, plik), 'utf8')));
        }
        return wynik;
    }
}

module.exports = { MagazynTokenow, KATALOG_DOMYSLNY };
