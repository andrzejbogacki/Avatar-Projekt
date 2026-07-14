'use strict';

// Bramka zaproszeń (pozycja 9b — regulator): dwufazowy przepływ
// propozycja → jawne zatwierdzenie Suwerena → utworzenie konta.
// Żadne konto nie powstaje poza tą bramką (poza jednorazowym bootstrapem Suwerena).
const konfig = require('../../config');
const { nowyRekordKonta } = require('../konta/magazyn');
const { generujTokenAktywacji } = require('../logowanie/krypto');

// Hook certyfikacji PS: moduł PS jeszcze nie istnieje, a wartość certyfikatu
// startowego jest NIEROZSTRZYGNIĘTA (ADR-002) — stan jawny, nie cichy default.
async function domyslnyHookPS() {
    return {
        status: 'odroczono',
        powod: `Moduł PS niedostępny — stan konta: ${konfig.konta.STATUS_CERTYFIKACJI_STARTOWY}`,
    };
}

class UslugaZaproszen {
    constructor({ konta, zaproszenia, hookPS = domyslnyHookPS, zegar = Date.now }) {
        this.konta = konta;
        this.zaproszenia = zaproszenia;
        this.hookPS = hookPS;
        this.zegar = zegar;
    }

    async zaproponuj({ zapraszajacy, kandydat_avatar_id, uzasadnienie }) {
        const kontoZapraszajacego = konfig.konta.WZORZEC_AVATAR_ID.test(String(zapraszajacy))
            ? await this.konta.odczytajKonto(zapraszajacy)
            : null;
        if (!kontoZapraszajacego || kontoZapraszajacego.status !== 'aktywne') {
            return { status: 'odmowa', powod: 'Zapraszający nie jest zarejestrowanym, aktywnym Avatarem' };
        }
        if (!konfig.konta.WZORZEC_AVATAR_ID.test(String(kandydat_avatar_id))) {
            return { status: 'odmowa', powod: `Nieprawidłowy avatar_id kandydata: wymagany wzorzec ${konfig.konta.WZORZEC_AVATAR_ID}` };
        }
        if (await this.konta.odczytajKonto(kandydat_avatar_id)) {
            return { status: 'odmowa', powod: `Konto ${kandydat_avatar_id} już istnieje` };
        }
        if (typeof uzasadnienie !== 'string' || !uzasadnienie.trim()
            || uzasadnienie.length > konfig.zaproszenia.MAKS_DLUGOSC_UZASADNIENIA) {
            return { status: 'odmowa', powod: 'Uzasadnienie wymagane (niepuste, w limicie długości)' };
        }
        const propozycja = {
            id: this.zaproszenia.nowyId(),
            status: 'oczekujaca',
            zapraszajacy,
            kandydat_avatar_id,
            uzasadnienie,
            propozycja_ts: new Date(this.zegar()).toISOString(),
            decyzja_ts: null,
            zdecydowal: null,
            hook_ps: null,
        };
        await this.zaproszenia.zapisz(propozycja);
        return { status: 'zapisano', propozycja };
    }

    async listaOczekujacych() {
        return (await this.zaproszenia.lista()).filter((p) => p.status === 'oczekujaca');
    }

    async zdecyduj({ id, decydujacy, decyzja }) {
        if (decydujacy !== konfig.konta.SUWEREN_AVATAR_ID) {
            return { status: 'odmowa', powod: 'Decyzję o zaproszeniu podejmuje wyłącznie Suweren' };
        }
        if (!konfig.zaproszenia.STATUSY_ZAPROSZENIA.includes(decyzja) || decyzja === 'oczekujaca') {
            return { status: 'odmowa', powod: 'Decyzja musi być: zatwierdzona albo odrzucona' };
        }
        let propozycja = null;
        try {
            propozycja = await this.zaproszenia.odczytaj(id);
        } catch {
            propozycja = null;
        }
        if (!propozycja) {
            return { status: 'odmowa', powod: 'Propozycja nie istnieje' };
        }
        if (propozycja.status !== 'oczekujaca') {
            return { status: 'odmowa', powod: `Propozycja już rozstrzygnięta (${propozycja.status})` };
        }

        const teraz = this.zegar();
        if (decyzja === 'odrzucona') {
            await this.zaproszenia.zapisz({
                ...propozycja,
                status: 'odrzucona',
                decyzja_ts: new Date(teraz).toISOString(),
                zdecydowal: decydujacy,
            });
            return { status: 'odrzucono' };
        }

        const token_aktywacji = generujTokenAktywacji();
        await this.konta.utworzKonto(nowyRekordKonta({
            avatar_id: propozycja.kandydat_avatar_id,
            zaproszenie: {
                zapraszajacy: propozycja.zapraszajacy,
                uzasadnienie: propozycja.uzasadnienie,
                propozycja_ts: propozycja.propozycja_ts,
                decyzja: 'zatwierdzona',
                decyzja_ts: new Date(teraz).toISOString(),
                zatwierdzil: decydujacy,
            },
            token_aktywacji,
            teraz,
        }));

        let hook_ps;
        try {
            hook_ps = await this.hookPS({
                avatar_id: propozycja.kandydat_avatar_id,
                zapraszajacy: propozycja.zapraszajacy,
            });
        } catch (blad) {
            hook_ps = { status: 'blad', powod: blad.message };
        }

        await this.zaproszenia.zapisz({
            ...propozycja,
            status: 'zatwierdzona',
            decyzja_ts: new Date(teraz).toISOString(),
            zdecydowal: decydujacy,
            hook_ps,
        });
        return { status: 'zatwierdzono', avatar_id: propozycja.kandydat_avatar_id, token_aktywacji };
    }
}

module.exports = { UslugaZaproszen };
