'use strict';

// Generyczny magazyn rekordów (pozycja 6 — forma): JSON per id (transakcje, oferty).
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const konfig = require('../../config');

const WZORZEC_ID = /^[0-9a-f]+$/;

class MagazynRekordow {
    constructor({ katalog }) {
        this.katalog = katalog;
    }

    sciezka(id) {
        if (!WZORZEC_ID.test(String(id))) throw new Error('Nieprawidłowy identyfikator rekordu');
        return path.join(this.katalog, `${id}.json`);
    }

    nowyId() {
        return randomBytes(konfig.wymiana.DLUGOSC_ID_BAJTY).toString('hex');
    }

    async zapisz(rekord) {
        await fs.mkdir(this.katalog, { recursive: true });
        await fs.writeFile(this.sciezka(rekord.id), JSON.stringify(rekord, null, 2), 'utf8');
        return rekord;
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
        const wynik = [];
        for (const plik of pliki.filter((p) => p.endsWith('.json')).sort()) {
            wynik.push(JSON.parse(await fs.readFile(path.join(this.katalog, plik), 'utf8')));
        }
        return wynik;
    }
}

module.exports = { MagazynRekordow };
