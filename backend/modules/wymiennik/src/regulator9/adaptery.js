'use strict';

// Adaptery tokenów zewnętrznych (ADR-004, faza 1: interfejs + atrapa).
// Kontrakt adaptera: { id_systemu, sprawdzDostepnosc(), zarejestrujUmowe(umowa),
// potwierdzWykonanie(ref) }. Wyniki stemplowane {zrodlo, timestamp, status}.

class RejestrAdapterow {
    constructor() {
        this.adaptery = new Map();
    }

    zarejestruj(adapter) {
        this.adaptery.set(adapter.id_systemu, adapter);
    }

    pobierz(id_systemu) {
        return this.adaptery.get(id_systemu) ?? null;
    }
}

// Adapter testowy — jedyna implementacja fazy 1 (konkretne integracje poza zakresem).
class AdapterAtrapa {
    constructor({ zegar = Date.now } = {}) {
        this.id_systemu = 'atrapa';
        this.zegar = zegar;
        this.licznik = 0;
    }

    stempel(dane) {
        return { zrodlo: this.id_systemu, timestamp: new Date(this.zegar()).toISOString(), ...dane };
    }

    async sprawdzDostepnosc() {
        return this.stempel({ status: 'live' });
    }

    async zarejestrujUmowe(umowa) {
        this.licznik += 1;
        return this.stempel({ status: 'zarejestrowano', ref_zewnetrzny: `atrapa-${this.licznik}`, umowa_id: umowa.id });
    }

    async potwierdzWykonanie(ref) {
        return this.stempel({ status: 'potwierdzono', ref_zewnetrzny: ref });
    }
}

module.exports = { RejestrAdapterow, AdapterAtrapa };
