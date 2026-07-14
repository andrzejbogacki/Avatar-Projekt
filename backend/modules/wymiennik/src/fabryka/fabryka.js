'use strict';

// Fabryka tokenów (narzędzia stwarzania): tworzenie SWOBODNE — bez zatwierdzania
// przez Suwerena; kontrola obiegu przez akceptację w PS, nie przez emisję (ADR-004).
const konfig = require('../../config');
const { iloscZgodna } = require('../salda/magazyn_sald');

function tekstOk(w, { pusteDozwolone = false } = {}) {
    return typeof w === 'string'
        && (pusteDozwolone || w.trim().length > 0)
        && w.length <= konfig.tokeny.MAKS_DLUGOSC_TEKSTU;
}

class Fabryka {
    constructor({ tokeny, salda, zegar = Date.now }) {
        this.tokeny = tokeny;
        this.salda = salda;
        this.zegar = zegar;
    }

    async utworzToken(emitent, { token_id, nazwa, opis, klasa, podaz, podzielnosc, mapowanie_369, adapter }) {
        if (!konfig.tokeny.WZORZEC_TOKEN_ID.test(String(token_id))) {
            return { status: 'odmowa', powod: `Nieprawidłowy token_id: wymagany wzorzec ${konfig.tokeny.WZORZEC_TOKEN_ID}` };
        }
        if (!tekstOk(nazwa) || !tekstOk(opis ?? '', { pusteDozwolone: true })) {
            return { status: 'odmowa', powod: 'Nazwa wymagana; teksty w limicie długości' };
        }
        if (!konfig.tokeny.KLASY_TOKENOW.includes(klasa)) {
            return { status: 'odmowa', powod: `Klasa musi być: ${konfig.tokeny.KLASY_TOKENOW.join('|')}` };
        }
        if (!podaz || !konfig.tokeny.TYPY_PODAZY.includes(podaz.typ)) {
            return { status: 'odmowa', powod: `Podaż musi być: ${konfig.tokeny.TYPY_PODAZY.join('|')}` };
        }
        if (!Number.isInteger(podzielnosc) || podzielnosc < 0
            || podzielnosc > konfig.tokeny.MAKS_PODZIELNOSC) {
            return { status: 'odmowa', powod: `Podzielność 0..${konfig.tokeny.MAKS_PODZIELNOSC}` };
        }
        if (podaz.typ === 'stala'
            && !iloscZgodna(podaz.wielkosc, podzielnosc)) {
            return { status: 'odmowa', powod: 'Podaż stała wymaga dodatniej wielkości zgodnej z podzielnością' };
        }
        // klasa zewnetrzna: obowiązkowy identyfikator adaptera (architektura adapterowa)
        if (klasa === 'zewnetrzny' && !tekstOk(adapter)) {
            return { status: 'odmowa', powod: 'Token klasy zewnętrznej wymaga pola adapter (id systemu)' };
        }
        // klasa avatar: voucher osobisty — jeden na Avatara, podaż nieograniczona
        if (klasa === 'avatar') {
            if (podaz.typ !== 'nieograniczona') {
                return { status: 'odmowa', powod: 'Token klasy avatar ma podaż nieograniczoną (emisja = wytworzenie produktu/usługi)' };
            }
            if (konfig.tokeny.JEDEN_TOKEN_AVATAR_NA_EMITENTA) {
                const istniejacy = (await this.tokeny.lista())
                    .find((t) => t.klasa === 'avatar' && t.emitent === emitent);
                if (istniejacy) {
                    return { status: 'odmowa', powod: `Avatar ${emitent} ma już token klasy avatar: ${istniejacy.token_id}` };
                }
            }
        }

        const definicja = {
            token_id,
            nazwa,
            opis: opis ?? '',
            emitent,
            klasa,
            podaz: { typ: podaz.typ, wielkosc: podaz.typ === 'stala' ? podaz.wielkosc : null },
            podzielnosc,
            mapowanie_369: mapowanie_369 ?? null,
            adapter: klasa === 'zewnetrzny' ? adapter : null,
            status: 'aktywny',
            utworzono_ts: new Date(this.zegar()).toISOString(),
        };
        try {
            await this.tokeny.utworz(definicja);
        } catch (blad) {
            return { status: 'odmowa', powod: blad.message };
        }
        // podaż stała: jednorazowa emisja całości na saldo emitenta
        if (podaz.typ === 'stala') {
            await this.salda.dopisz(emitent, token_id, podaz.wielkosc, { podzielnosc });
        }
        return { status: 'utworzono', token: definicja };
    }

    async emituj(kto, token_id, ilosc) {
        let definicja = null;
        try {
            definicja = await this.tokeny.odczytaj(token_id);
        } catch {
            definicja = null;
        }
        if (!definicja || definicja.status !== 'aktywny') {
            return { status: 'odmowa', powod: `Token ${token_id} nie istnieje lub jest wycofany` };
        }
        if (definicja.emitent !== kto) {
            return { status: 'odmowa', powod: 'Emitować może wyłącznie emitent tokenu' };
        }
        if (definicja.podaz.typ === 'stala') {
            return { status: 'odmowa', powod: 'Podaż stała — cała emisja nastąpiła przy utworzeniu' };
        }
        const wynik = await this.salda.dopisz(kto, token_id, ilosc,
            { podzielnosc: definicja.podzielnosc });
        if (wynik.status !== 'wykonano') return { status: 'odmowa', powod: wynik.powod };
        return { status: 'wyemitowano', saldo: wynik.saldo };
    }
}

module.exports = { Fabryka };
