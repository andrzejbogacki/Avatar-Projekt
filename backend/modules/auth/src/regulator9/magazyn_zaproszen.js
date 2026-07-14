'use strict';

// Magazyn propozycji zaproszeń: JSON per propozycja (pozycja 6 — forma).
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'zaproszenia');
const DLUGOSC_ID_BAJTY = 16;
const WZORZEC_ID = /^[0-9a-f]+$/;

class MagazynZaproszen {
    constructor({ katalog = KATALOG_DOMYSLNY } = {}) {
        this.katalog = katalog;
    }

    sciezka(id) {
        if (!WZORZEC_ID.test(id)) throw new Error('Nieprawidłowy identyfikator propozycji');
        return path.join(this.katalog, `${id}.json`);
    }

    nowyId() {
        return randomBytes(DLUGOSC_ID_BAJTY).toString('hex');
    }

    async zapisz(propozycja) {
        await fs.mkdir(this.katalog, { recursive: true });
        await fs.writeFile(this.sciezka(propozycja.id), JSON.stringify(propozycja, null, 2), 'utf8');
        return propozycja;
    }

    async odczytaj(id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return null;
            throw blad;
        }
    }

    async lista() {
        let pliki;
        try {
            pliki = await fs.readdir(this.katalog);
        } catch (blad) {
            if (blad.code === 'ENOENT') return [];
            throw blad;
        }
        const propozycje = [];
        for (const plik of pliki.filter((p) => p.endsWith('.json')).sort()) {
            propozycje.push(JSON.parse(await fs.readFile(path.join(this.katalog, plik), 'utf8')));
        }
        return propozycje;
    }
}

module.exports = { MagazynZaproszen, KATALOG_DOMYSLNY };
