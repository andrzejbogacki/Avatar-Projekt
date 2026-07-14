'use strict';

// Rejestr sesji (pozycja 9a — rezonator): punkt mediacji między impulsem
// żądania (3) a stanem kont (6). W pamięci — restart = ponowne logowanie (ADR-002).
const { randomBytes } = require('node:crypto');

const konfig = require('../../config');

class RejestrSesji {
    constructor({ zegar = Date.now } = {}) {
        this.zegar = zegar;
        this.sesje = new Map();
    }

    utworzSesje(avatar_id) {
        const id = randomBytes(konfig.sesje.DLUGOSC_ID_SESJI_BAJTY).toString('hex');
        const wygasa_ms = this.zegar() + konfig.sesje.TTL_SESJI_MS;
        const sesja = { id, avatar_id, wygasa_ts: new Date(wygasa_ms).toISOString() };
        this.sesje.set(id, { avatar_id, wygasa_ms });
        return sesja;
    }

    weryfikujSesje(id) {
        if (!id || !this.sesje.has(id)) return { status: 'brak_sesji' };
        const { avatar_id, wygasa_ms } = this.sesje.get(id);
        if (this.zegar() > wygasa_ms) {
            this.sesje.delete(id);
            return { status: 'wygasla' };
        }
        return { status: 'aktywna', avatar_id };
    }

    uniewaznijSesje(id) {
        this.sesje.delete(id);
    }
}

module.exports = { RejestrSesji };
