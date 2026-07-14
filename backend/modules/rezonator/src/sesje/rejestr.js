'use strict';

// Sesje emisji (Faza A: tryb ręczny — start/stop przez użytkownika).
// Rejestr w pamięci: restart procesu kończy sesje (konsekwencja jawna).
// Tryb automatyczny (harmonogram/warunki) = Faza B/C w ramach HA (ADR-005).
const { randomBytes } = require('node:crypto');

const DLUGOSC_ID_BAJTY = 16;

class RejestrSesjiEmisji {
    constructor({ zegar = Date.now } = {}) {
        this.zegar = zegar;
        this.sesje = new Map();
    }

    startuj({ zrodlo, plan, kto }) {
        const id = randomBytes(DLUGOSC_ID_BAJTY).toString('hex');
        const sesja = {
            id,
            zrodlo_id: zrodlo.zrodlo_id,
            wlasciciel: zrodlo.wlasciciel,
            uruchomil: kto,
            tryb: 'reczny',
            plan,
            start_ts: new Date(this.zegar()).toISOString(),
        };
        this.sesje.set(id, sesja);
        return sesja;
    }

    zatrzymaj(id, kto) {
        const sesja = this.sesje.get(id);
        if (!sesja) return { status: 'odmowa', powod: 'Sesja nie istnieje' };
        if (sesja.wlasciciel !== kto && sesja.uruchomil !== kto) {
            return { status: 'odmowa', powod: 'Sesję zatrzymuje właściciel Źródła lub uruchamiający' };
        }
        this.sesje.delete(id);
        return { status: 'zatrzymano', id };
    }

    listaAktywnych() {
        return [...this.sesje.values()];
    }
}

module.exports = { RejestrSesjiEmisji };
