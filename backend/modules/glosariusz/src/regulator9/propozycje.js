'use strict';

// Bramka zmian glosariusza (pozycja 9b — regulator): zasada dwufazowa
// propozycja → jawne zatwierdzenie Suwerena → zapis; zapis = wyzwalacz
// przebudowy indeksu form (ADR-006).
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const konfig = require('../../config');

const SUWEREN_AVATAR_ID = 'andrzej_bogacki';

function tekstOk(w, { pusteDozwolone = false } = {}) {
    return typeof w === 'string'
        && (pusteDozwolone || w.trim().length > 0)
        && w.length <= konfig.MAKS_DLUGOSC_POLA;
}

class UslugaPropozycji {
    constructor({ katalog, magazyn, zegar = Date.now }) {
        this.katalog = katalog;
        this.magazyn = magazyn;
        this.zegar = zegar;
    }

    sciezka(id) {
        if (!/^[0-9a-f]+$/.test(String(id))) throw new Error('Nieprawidłowy identyfikator propozycji');
        return path.join(this.katalog, `${id}.json`);
    }

    async zaproponuj({ od, nazwa, wprowadzenie, rozszerzenie }) {
        if (!tekstOk(nazwa) || !tekstOk(wprowadzenie)) {
            return { status: 'odmowa', powod: 'Wymagane: nazwa i wprowadzenie (w limitach długości)' };
        }
        if (rozszerzenie !== null && rozszerzenie !== undefined && !tekstOk(rozszerzenie)) {
            return { status: 'odmowa', powod: 'Rozszerzenie przekracza limit długości' };
        }
        const istniejacy = await this.magazyn.termin(nazwa.trim());
        const propozycja = {
            id: randomBytes(konfig.DLUGOSC_ID_PROPOZYCJI_BAJTY).toString('hex'),
            status: 'oczekujaca',
            typ: istniejacy ? 'edycja' : 'nowy',
            od,
            nazwa: nazwa.trim(),
            wprowadzenie,
            rozszerzenie: rozszerzenie ?? null,
            propozycja_ts: new Date(this.zegar()).toISOString(),
            decyzja_ts: null,
            zdecydowal: null,
        };
        await fs.mkdir(this.katalog, { recursive: true });
        await fs.writeFile(this.sciezka(propozycja.id), JSON.stringify(propozycja, null, 2), 'utf8');
        return { status: 'zapisano', propozycja };
    }

    async listaOczekujacych() {
        let pliki;
        try {
            pliki = await fs.readdir(this.katalog);
        } catch (blad) {
            if (blad.code === 'ENOENT') return [];
            throw blad;
        }
        const wynik = [];
        for (const plik of pliki.filter((p) => p.endsWith('.json')).sort()) {
            const p = JSON.parse(await fs.readFile(path.join(this.katalog, plik), 'utf8'));
            if (p.status === 'oczekujaca') wynik.push(p);
        }
        return wynik;
    }

    async zdecyduj({ id, decydujacy, decyzja }) {
        if (decydujacy !== SUWEREN_AVATAR_ID) {
            return { status: 'odmowa', powod: 'Zmiany glosariusza zatwierdza wyłącznie Suweren' };
        }
        if (!['zatwierdzona', 'odrzucona'].includes(decyzja)) {
            return { status: 'odmowa', powod: 'Decyzja musi być: zatwierdzona albo odrzucona' };
        }
        let propozycja = null;
        try {
            propozycja = JSON.parse(await fs.readFile(this.sciezka(id), 'utf8'));
        } catch {
            propozycja = null;
        }
        if (!propozycja) return { status: 'odmowa', powod: 'Propozycja nie istnieje' };
        if (propozycja.status !== 'oczekujaca') {
            return { status: 'odmowa', powod: `Propozycja już rozstrzygnięta (${propozycja.status})` };
        }

        propozycja.status = decyzja;
        propozycja.decyzja_ts = new Date(this.zegar()).toISOString();
        propozycja.zdecydowal = decydujacy;
        await fs.writeFile(this.sciezka(id), JSON.stringify(propozycja, null, 2), 'utf8');

        if (decyzja === 'odrzucona') return { status: 'odrzucono' };

        // zapis do glosariusza + obowiązkowa przebudowa indeksu (wyzwalacz)
        await this.magazyn.zapiszTermin(propozycja);
        await this.magazyn.przebudujIndeks();
        return { status: 'zatwierdzono', nazwa: propozycja.nazwa, indeks_przebudowany: true };
    }
}

module.exports = { UslugaPropozycji, SUWEREN_AVATAR_ID };
