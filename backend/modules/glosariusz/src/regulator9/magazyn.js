'use strict';

// Magazyn glosariusza i indeksu (pozycja 6 — forma + 9a spójność indeksu):
// glosariusz.json = źródło prawdy (zapis WYŁĄCZNIE przez bramkę dwufazową),
// indeks form = artefakt pochodny z hash-em źródła (wykrycie nieaktualności).
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');
const { zbudujIndeks, hashZrodla } = require('../indeks/budowa');

class MagazynGlosariusza {
    constructor({
        sciezkaGlosariusza = konfig.SCIEZKA_GLOSARIUSZA,
        sciezkaIndeksu = konfig.SCIEZKA_INDEKSU,
        zegar = Date.now,
    } = {}) {
        this.sciezkaGlosariusza = sciezkaGlosariusza;
        this.sciezkaIndeksu = sciezkaIndeksu;
        this.zegar = zegar;
        this.indeksWPamieci = null;
    }

    async odczytajZawartosc() {
        return fs.readFile(this.sciezkaGlosariusza, 'utf8');
    }

    async terminy() {
        return JSON.parse(await this.odczytajZawartosc());
    }

    async termin(nazwa) {
        return (await this.terminy()).find((t) => t.nazwa === nazwa) ?? null;
    }

    // Zapis terminu (upsert) — wywoływany WYŁĄCZNIE po zatwierdzeniu Suwerena.
    async zapiszTermin({ nazwa, wprowadzenie, rozszerzenie }) {
        const terminy = await this.terminy();
        const wpis = {
            nazwa,
            status: 'piaskownica',
            wprowadzenie,
            rozszerzenie: rozszerzenie ?? null,
        };
        const i = terminy.findIndex((t) => t.nazwa === nazwa);
        if (i >= 0) terminy[i] = { ...terminy[i], ...wpis };
        else terminy.push(wpis);
        await fs.writeFile(this.sciezkaGlosariusza, JSON.stringify(terminy, null, 2), 'utf8');
        return wpis;
    }

    async przebudujIndeks() {
        const zawartosc = await this.odczytajZawartosc();
        const indeks = zbudujIndeks(JSON.parse(zawartosc), zawartosc, this.zegar);
        await fs.mkdir(path.dirname(this.sciezkaIndeksu), { recursive: true });
        await fs.writeFile(this.sciezkaIndeksu, JSON.stringify(indeks, null, 2), 'utf8');
        this.indeksWPamieci = indeks;
        return indeks;
    }

    async indeks() {
        if (!this.indeksWPamieci) {
            try {
                this.indeksWPamieci = JSON.parse(await fs.readFile(this.sciezkaIndeksu, 'utf8'));
            } catch (blad) {
                if (blad.code !== 'ENOENT') throw blad;
                return this.przebudujIndeks();
            }
        }
        return this.indeksWPamieci;
    }

    async statusIndeksu() {
        const indeks = await this.indeks();
        const zawartosc = await this.odczytajZawartosc();
        return {
            silnik: indeks.silnik,
            zbudowano_ts: indeks.zbudowano_ts,
            liczba_form: Object.keys(indeks.formy).length,
            aktualny: indeks.hash_zrodla === hashZrodla(zawartosc),
        };
    }
}

module.exports = { MagazynGlosariusza };
