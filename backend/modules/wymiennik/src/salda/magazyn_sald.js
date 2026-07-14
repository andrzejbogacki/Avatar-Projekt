'use strict';

// Magazyn sald (pozycja 6 — forma): JSON per avatar_id. Zero długu systemowego:
// salda nieujemne z konstrukcji, transfer wyłącznie przy pełnym pokryciu.
const fs = require('node:fs/promises');
const path = require('node:path');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'salda');
const WZORZEC_AVATAR_ID = /^[a-z][a-z0-9_]{2,63}$/;
const TOLERANCJA_ULAMKA = 1e-9;

function iloscZgodna(ilosc, podzielnosc) {
    if (!Number.isFinite(ilosc) || ilosc <= 0) return false;
    if (podzielnosc === undefined || podzielnosc === null) return true;
    const przeskalowana = ilosc * 10 ** podzielnosc;
    return Math.abs(przeskalowana - Math.round(przeskalowana)) < TOLERANCJA_ULAMKA;
}

class MagazynSald {
    constructor({ katalog = KATALOG_DOMYSLNY } = {}) {
        this.katalog = katalog;
    }

    sciezka(avatar_id) {
        if (!WZORZEC_AVATAR_ID.test(String(avatar_id))) {
            throw new Error(`Nieprawidłowy avatar_id: wymagany wzorzec ${WZORZEC_AVATAR_ID}`);
        }
        return path.join(this.katalog, `${avatar_id}.json`);
    }

    async odczytaj(avatar_id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(avatar_id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return { avatar_id, salda: {} };
            throw blad;
        }
    }

    async zapisz(rekord) {
        await fs.mkdir(this.katalog, { recursive: true });
        await fs.writeFile(this.sciezka(rekord.avatar_id),
            JSON.stringify(rekord, null, 2), 'utf8');
    }

    async stan(avatar_id, token_id) {
        return (await this.odczytaj(avatar_id)).salda[token_id] ?? 0;
    }

    async dopisz(avatar_id, token_id, ilosc, { podzielnosc } = {}) {
        if (!iloscZgodna(ilosc, podzielnosc)) {
            return { status: 'odmowa', powod: 'Ilość musi być dodatnia i zgodna z podzielnością tokenu' };
        }
        const rekord = await this.odczytaj(avatar_id);
        rekord.salda[token_id] = (rekord.salda[token_id] ?? 0) + ilosc;
        await this.zapisz(rekord);
        return { status: 'wykonano', saldo: rekord.salda[token_id] };
    }

    async transferuj(od, do_, token_id, ilosc, { podzielnosc } = {}) {
        if (!iloscZgodna(ilosc, podzielnosc)) {
            return { status: 'odmowa', powod: 'Ilość musi być dodatnia i zgodna z podzielnością tokenu' };
        }
        const rekordOd = await this.odczytaj(od);
        const saldoOd = rekordOd.salda[token_id] ?? 0;
        if (saldoOd < ilosc) {
            return { status: 'odmowa', powod: `Niewystarczające saldo ${token_id}: ${saldoOd} < ${ilosc} (zero długu)` };
        }
        const rekordDo = await this.odczytaj(do_);
        rekordOd.salda[token_id] = saldoOd - ilosc;
        rekordDo.salda[token_id] = (rekordDo.salda[token_id] ?? 0) + ilosc;
        await this.zapisz(rekordOd);
        await this.zapisz(rekordDo);
        return { status: 'wykonano' };
    }
}

module.exports = { MagazynSald, KATALOG_DOMYSLNY, iloscZgodna };
