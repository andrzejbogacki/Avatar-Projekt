'use strict';

// Usługa wymiany (pozycja 3 — impuls + 9a rozliczenie): transakcje bezpośrednie,
// oferty publiczne, rozliczenia (system / poza systemem / zewnętrzne).
// Zasada Gebo: avatar↔avatar sztywno 1:1 (zakodowane); zero długu systemowego.
const konfig = require('../../config');
const { iloscZgodna } = require('../salda/magazyn_sald');

class UslugaWymiany {
    constructor({ tokeny, salda, transakcje, oferty, walidacjaPS, adaptery, zegar = Date.now }) {
        this.tokeny = tokeny;
        this.salda = salda;
        this.transakcje = transakcje;
        this.oferty = oferty;
        this.walidacjaPS = walidacjaPS;
        this.adaptery = adaptery;
        this.zegar = zegar;
    }

    ts() {
        return new Date(this.zegar()).toISOString();
    }

    // Walidacja strukturalna pary świadczeń + kurs 1:1 dla avatar↔avatar.
    async sprawdzPare({ oddaje, oczekuje, tryb }) {
        if (!konfig.wymiana.TRYBY_ROZLICZENIA.includes(tryb)) {
            return { blad: `Tryb musi być: ${konfig.wymiana.TRYBY_ROZLICZENIA.join('|')}` };
        }
        const strony = [];
        for (const swiadczenie of [oddaje, oczekuje]) {
            let definicja = null;
            try {
                definicja = await this.tokeny.odczytaj(swiadczenie?.token_id);
            } catch {
                definicja = null;
            }
            if (!definicja || definicja.status !== 'aktywny') {
                return { blad: `Token ${swiadczenie?.token_id} nie istnieje lub jest wycofany` };
            }
            if (!iloscZgodna(swiadczenie.ilosc, definicja.podzielnosc)) {
                return { blad: `Ilość ${swiadczenie.token_id} musi być dodatnia i zgodna z podzielnością (${definicja.podzielnosc})` };
            }
            strony.push(definicja);
        }
        const [defOddaje, defOczekuje] = strony;
        if (defOddaje.klasa === 'avatar' && defOczekuje.klasa === 'avatar'
            && oddaje.ilosc !== oczekuje.ilosc) {
            return { blad: 'Kurs avatar↔avatar jest sztywno 1:1 — ilości muszą być równe (zasada Gebo)' };
        }
        if (tryb === 'zewnetrzny' && defOddaje.klasa !== 'zewnetrzny' && defOczekuje.klasa !== 'zewnetrzny') {
            return { blad: 'Tryb zewnętrzny wymaga tokenu klasy zewnętrznej' };
        }
        return { definicje: { oddaje: defOddaje, oczekuje: defOczekuje } };
    }

    async zaproponujTransakcje({ od, do: do_, oddaje, oczekuje, tryb }) {
        if (od === do_) return { status: 'odmowa', powod: 'Strony transakcji muszą być różne' };
        const para = await this.sprawdzPare({ oddaje, oczekuje, tryb });
        if (para.blad) return { status: 'odmowa', powod: para.blad };

        const transakcja = {
            id: this.transakcje.nowyId(),
            status: 'proponowana',
            od, do: do_,
            oddaje, oczekuje, tryb,
            potwierdzenia: {},
            anulowania: {},
            rejestracja: null,
            propozycja_ts: this.ts(),
            rozstrzygniecie_ts: null,
        };
        await this.transakcje.zapisz(transakcja);
        return { status: 'zapisano', transakcja };
    }

    async wycofajTransakcje(id, kto) {
        const t = await this.bezpiecznyOdczyt(this.transakcje, id);
        if (!t) return { status: 'odmowa', powod: 'Transakcja nie istnieje' };
        if (t.status !== 'proponowana') {
            return { status: 'odmowa', powod: `Wycofanie możliwe tylko przed akceptacją (stan: ${t.status})` };
        }
        if (t.od !== kto) return { status: 'odmowa', powod: 'Wycofać może wyłącznie proponujący' };
        t.status = 'wycofana';
        t.rozstrzygniecie_ts = this.ts();
        await this.transakcje.zapisz(t);
        return { status: 'wycofana' };
    }

    async odpowiedzNaTransakcje(id, kto, decyzja) {
        const t = await this.bezpiecznyOdczyt(this.transakcje, id);
        if (!t) return { status: 'odmowa', powod: 'Transakcja nie istnieje' };
        if (t.status !== 'proponowana') {
            return { status: 'odmowa', powod: `Transakcja już rozstrzygnięta (${t.status})` };
        }
        if (t.do !== kto) return { status: 'odmowa', powod: 'Odpowiedzieć może wyłącznie druga strona' };
        if (decyzja === 'odrzuca') {
            t.status = 'odrzucona';
            t.rozstrzygniecie_ts = this.ts();
            await this.transakcje.zapisz(t);
            return { status: 'odrzucona' };
        }
        if (decyzja !== 'akceptuje') {
            return { status: 'odmowa', powod: 'Decyzja musi być: akceptuje albo odrzuca' };
        }
        return this.zawrzyj(t);
    }

    // Zawarcie transakcji: walidacja PS OBU stron dla OBU tokenów, potem rozliczenie.
    async zawrzyj(t) {
        const ps = await this.walidacjaPS.sprawdzTransakcje({
            strony: [t.od, t.do],
            tokeny: [t.oddaje.token_id, t.oczekuje.token_id],
        });
        if (!ps.akceptowany) return { status: 'odmowa', powod: ps.powod };

        if (t.tryb === 'poza_systemem') {
            t.status = 'oczekuje_potwierdzen';
            await this.transakcje.zapisz(t);
            return { status: 'oczekuje_potwierdzen', transakcja: t };
        }
        if (t.tryb === 'zewnetrzny') {
            return this.zarejestrujZewnetrzna(t);
        }
        return this.rozliczSalda(t);
    }

    // Transfer obu świadczeń — pełne pokrycie sprawdzane PRZED pierwszym ruchem.
    async rozliczSalda(t) {
        const defOddaje = await this.tokeny.odczytaj(t.oddaje.token_id);
        const defOczekuje = await this.tokeny.odczytaj(t.oczekuje.token_id);
        const saldoOd = await this.salda.stan(t.od, t.oddaje.token_id);
        const saldoDo = await this.salda.stan(t.do, t.oczekuje.token_id);
        if (saldoOd < t.oddaje.ilosc) {
            return { status: 'odmowa', powod: `Niewystarczające saldo ${t.od} (${t.oddaje.token_id}): ${saldoOd} < ${t.oddaje.ilosc}` };
        }
        if (saldoDo < t.oczekuje.ilosc) {
            return { status: 'odmowa', powod: `Niewystarczające saldo ${t.do} (${t.oczekuje.token_id}): ${saldoDo} < ${t.oczekuje.ilosc}` };
        }
        await this.salda.transferuj(t.od, t.do, t.oddaje.token_id, t.oddaje.ilosc,
            { podzielnosc: defOddaje.podzielnosc });
        await this.salda.transferuj(t.do, t.od, t.oczekuje.token_id, t.oczekuje.ilosc,
            { podzielnosc: defOczekuje.podzielnosc });
        t.status = 'rozliczona';
        t.rozstrzygniecie_ts = this.ts();
        await this.transakcje.zapisz(t);
        return { status: 'rozliczona', transakcja: t };
    }

    async zarejestrujZewnetrzna(t) {
        const defOddaje = await this.tokeny.odczytaj(t.oddaje.token_id);
        const defOczekuje = await this.tokeny.odczytaj(t.oczekuje.token_id);
        const zewnetrzny = [defOddaje, defOczekuje].find((d) => d.klasa === 'zewnetrzny');
        const adapter = this.adaptery.pobierz(zewnetrzny.adapter);
        if (!adapter) {
            return { status: 'odmowa', powod: `Brak adaptera "${zewnetrzny.adapter}" dla tokenu ${zewnetrzny.token_id} — jawna odmowa` };
        }
        let rejestracja;
        try {
            rejestracja = await adapter.zarejestrujUmowe({ id: t.id, oddaje: t.oddaje, oczekuje: t.oczekuje });
        } catch (blad) {
            return { status: 'odmowa', powod: `Adapter ${zewnetrzny.adapter}: ${blad.message}` };
        }
        t.status = 'umowa_zewnetrzna';
        t.rejestracja = rejestracja;
        t.rozstrzygniecie_ts = this.ts();
        await this.transakcje.zapisz(t);
        return { status: 'umowa_zewnetrzna', rejestracja, transakcja: t };
    }

    async potwierdzWykonanie(id, kto) {
        const t = await this.bezpiecznyOdczyt(this.transakcje, id);
        if (!t) return { status: 'odmowa', powod: 'Transakcja nie istnieje' };
        if (t.status !== 'oczekuje_potwierdzen') {
            return { status: 'odmowa', powod: `Potwierdzenie dotyczy stanu oczekuje_potwierdzen (stan: ${t.status})` };
        }
        if (![t.od, t.do].includes(kto)) {
            return { status: 'odmowa', powod: 'Potwierdzić może wyłącznie strona transakcji' };
        }
        t.potwierdzenia[kto] = this.ts();
        if (t.potwierdzenia[t.od] && t.potwierdzenia[t.do]) {
            const wynik = await this.rozliczSalda(t);
            if (wynik.status !== 'rozliczona') return wynik; // jawna odmowa, transakcja dalej wisi
            return wynik;
        }
        await this.transakcje.zapisz(t);
        return { status: 'oczekuje_potwierdzen', transakcja: t };
    }

    async anuluj(id, kto) {
        const t = await this.bezpiecznyOdczyt(this.transakcje, id);
        if (!t) return { status: 'odmowa', powod: 'Transakcja nie istnieje' };
        if (t.status !== 'oczekuje_potwierdzen') {
            return { status: 'odmowa', powod: `Anulowanie dotyczy stanu oczekuje_potwierdzen (stan: ${t.status})` };
        }
        if (![t.od, t.do].includes(kto)) {
            return { status: 'odmowa', powod: 'Anulować może wyłącznie strona transakcji' };
        }
        t.anulowania[kto] = this.ts();
        if (t.anulowania[t.od] && t.anulowania[t.do]) {
            t.status = 'anulowana';
            t.rozstrzygniecie_ts = this.ts();
            await this.transakcje.zapisz(t);
            return { status: 'anulowana' };
        }
        await this.transakcje.zapisz(t);
        return { status: 'oczekuje_potwierdzen', transakcja: t };
    }

    async mojeTransakcje(kto) {
        return (await this.transakcje.lista()).filter((t) => t.od === kto || t.do === kto);
    }

    // ── oferty publiczne ──
    async wystawOferte({ wystawca, oddaje, oczekuje, opis, tryb }) {
        const para = await this.sprawdzPare({ oddaje, oczekuje, tryb });
        if (para.blad) return { status: 'odmowa', powod: para.blad };
        const oferta = {
            id: this.oferty.nowyId(),
            status: 'aktywna',
            wystawca, oddaje, oczekuje,
            opis: opis ?? '',
            tryb,
            wystawiono_ts: this.ts(),
        };
        await this.oferty.zapisz(oferta);
        return { status: 'zapisano', oferta };
    }

    async listaOfert() {
        return (await this.oferty.lista()).filter((o) => o.status === 'aktywna');
    }

    async wycofajOferte(id, kto) {
        const o = await this.bezpiecznyOdczyt(this.oferty, id);
        if (!o) return { status: 'odmowa', powod: 'Oferta nie istnieje' };
        if (o.status !== 'aktywna') return { status: 'odmowa', powod: `Oferta nieaktywna (${o.status})` };
        if (o.wystawca !== kto) return { status: 'odmowa', powod: 'Wycofać może wyłącznie wystawca' };
        o.status = 'wycofana';
        await this.oferty.zapisz(o);
        return { status: 'wycofana' };
    }

    async przyjmijOferte(id, kto) {
        const o = await this.bezpiecznyOdczyt(this.oferty, id);
        if (!o) return { status: 'odmowa', powod: 'Oferta nie istnieje' };
        if (o.status !== 'aktywna') return { status: 'odmowa', powod: `Oferta nieaktywna (${o.status})` };
        if (o.wystawca === kto) return { status: 'odmowa', powod: 'Nie można przyjąć własnej oferty' };

        const propozycja = await this.zaproponujTransakcje({
            od: o.wystawca, do: kto,
            oddaje: o.oddaje, oczekuje: o.oczekuje, tryb: o.tryb,
        });
        if (propozycja.status !== 'zapisano') return propozycja;
        const wynik = await this.zawrzyj(propozycja.transakcja);
        if (['rozliczona', 'oczekuje_potwierdzen', 'umowa_zewnetrzna'].includes(wynik.status)) {
            o.status = 'przyjeta';
            o.transakcja_id = propozycja.transakcja.id;
            await this.oferty.zapisz(o);
        }
        return wynik;
    }

    async bezpiecznyOdczyt(magazyn, id) {
        try {
            return await magazyn.odczytaj(id);
        } catch {
            return null;
        }
    }
}

module.exports = { UslugaWymiany };
