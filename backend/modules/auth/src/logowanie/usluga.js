'use strict';

// Usługa logowania i aktywacji kont (pozycja 3 — impuls).
// Wyniki przepływu jako jawne statusy, nie wyjątki (zakaz cichych defaultów).
const { timingSafeEqual } = require('node:crypto');

const { hashujHaslo, weryfikujHaslo } = require('./krypto');

function tokenyZgodne(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

class UslugaLogowania {
    constructor({ magazyn, sesje, zegar = Date.now }) {
        this.magazyn = magazyn;
        this.sesje = sesje;
        this.zegar = zegar;
    }

    async zaloguj({ avatar_id, haslo }) {
        let konto = null;
        try {
            konto = await this.magazyn.odczytajKonto(avatar_id);
        } catch {
            konto = null; // nieprawidłowy avatar_id — odpowiedź jak dla braku konta
        }
        if (konto && konto.status === 'oczekuje_aktywacji') {
            return { status: 'konto_nieaktywne' };
        }
        if (konto && konto.status === 'zablokowane') {
            return { status: 'konto_zablokowane' };
        }
        if (!konto || !konto.haslo || !(await weryfikujHaslo(haslo, konto.haslo))) {
            return { status: 'bledne_dane' };
        }
        return { status: 'zalogowano', sesja: this.sesje.utworzSesje(konto.avatar_id) };
    }

    wyloguj(id_sesji) {
        this.sesje.uniewaznijSesje(id_sesji);
    }

    ktoZalogowany(id_sesji) {
        return this.sesje.weryfikujSesje(id_sesji);
    }

    async aktywujKonto({ avatar_id, token, nowe_haslo }) {
        let konto = null;
        try {
            konto = await this.magazyn.odczytajKonto(avatar_id);
        } catch {
            konto = null;
        }
        if (!konto || konto.status !== 'oczekuje_aktywacji' || !konto.aktywacja
            || !tokenyZgodne(token, konto.aktywacja.token)) {
            return { status: 'token_nieprawidlowy' };
        }
        if (this.zegar() > Date.parse(konto.aktywacja.wygasa_ts)) {
            return { status: 'token_wygasl' };
        }
        let haslo;
        try {
            haslo = await hashujHaslo(nowe_haslo);
        } catch (blad) {
            return { status: 'haslo_odrzucone', powod: blad.message };
        }
        await this.magazyn.zapiszKonto({
            ...konto,
            status: 'aktywne',
            haslo,
            aktywacja: null, // token jednorazowy — zużyty
        });
        return { status: 'aktywowano', avatar_id: konto.avatar_id };
    }
}

module.exports = { UslugaLogowania };
