'use strict';

// Fallback in-memory — brak Redisa ani sieci nie blokuje kalkulatora.
class AdapterMemory {
    constructor() {
        this.typ = 'memory';
        this._dane = new Map();
    }

    async zapisz(klucz, rekord) {
        this._dane.set(klucz, rekord);
    }

    async odczytaj(klucz) {
        return this._dane.has(klucz) ? this._dane.get(klucz) : null;
    }

    async klucze() {
        return [...this._dane.keys()];
    }

    async zamknij() {
        this._dane.clear();
    }
}

module.exports = { AdapterMemory };
