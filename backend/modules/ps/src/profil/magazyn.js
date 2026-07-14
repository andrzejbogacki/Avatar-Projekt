'use strict';

// Magazyn profili PS (pozycja 6 — forma): jeden plik JSON per Avatar (ADR-003).
// Edycje właściciela dla Modułów 1–3 i ustawień Modułu 4; wyniki jako jawne statusy.
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'profile');
const WZORZEC_AVATAR_ID = /^[a-z][a-z0-9_]{2,63}$/;

function pustyPoziomOsi() {
    return {
        autocertyfikat: { status: 'brak', oswiadczenie: null, data_ts: null, sygnatura_prawdy: null },
        certyfikaty_zewnetrzne: [],
    };
}

function nowyProfil({ avatar_id, imie, teraz }) {
    return {
        avatar_id,
        wersja_schematu: konfig.WERSJA_SCHEMATU,
        dane_podstawowe: { imie, status_suwerenny: true },
        modul_1_jakosci_kwantowe: {
            osie: Object.fromEntries(konfig.osie.OSIE.map((os) => [os,
                Object.fromEntries(konfig.osie.POZIOMY_OSI.map((p) => [p, pustyPoziomOsi()])),
            ])),
        },
        modul_2_symulacje: { rejestr: [] },
        modul_3_tokeny: { rejestr: [], volt_token: { alokacja: [] } },
        modul_4_protokol_relacji: {
            strumien_1_dostep_relacyjny: {
                macierz_domyslna: strukturaZwykla(konfig.dostep.MACIERZ_DOMYSLNA),
                nadpisania: [],
            },
            strumien_2_dostep_do_wiedzy: { poziomy_obserwatorow: {} },
            rejestr_dostepu: [],
            zgody_na_kontakt: [],
        },
        certyfikacja_startowa: {
            status: 'certyfikacja_oczekujaca', zapraszajacy: null, typ: null, poziom: null, ts: null,
        },
        utworzono_ts: new Date(teraz).toISOString(),
    };
}

// Kopia bez zamrożenia (config jest Object.freeze; dokument profilu ma być mutowalny).
function strukturaZwykla(obiekt) {
    return JSON.parse(JSON.stringify(obiekt));
}

function tekstOk(w, { pusteDozwolone = false } = {}) {
    return typeof w === 'string'
        && (pusteDozwolone || w.trim().length > 0)
        && w.length <= konfig.dostep.MAKS_DLUGOSC_TEKSTU;
}

class MagazynProfili {
    constructor({ katalog = KATALOG_DOMYSLNY, zegar = Date.now } = {}) {
        this.katalog = katalog;
        this.zegar = zegar;
    }

    sciezka(avatar_id) {
        if (!WZORZEC_AVATAR_ID.test(String(avatar_id))) {
            throw new Error(`Nieprawidłowy avatar_id: wymagany wzorzec ${WZORZEC_AVATAR_ID}`);
        }
        return path.join(this.katalog, `${avatar_id}.json`);
    }

    async odczytajProfil(avatar_id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(avatar_id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return null;
            throw blad;
        }
    }

    async utworzProfil({ avatar_id, imie }) {
        const profil = nowyProfil({ avatar_id, imie, teraz: this.zegar() });
        await fs.mkdir(this.katalog, { recursive: true });
        try {
            await fs.writeFile(this.sciezka(avatar_id), JSON.stringify(profil, null, 2),
                { encoding: 'utf8', flag: 'wx' });
        } catch (blad) {
            if (blad.code === 'EEXIST') throw new Error(`Profil ${avatar_id} już istnieje`);
            throw blad;
        }
        return profil;
    }

    async zapiszProfil(profil) {
        const istnieje = await this.odczytajProfil(profil.avatar_id);
        if (!istnieje) throw new Error(`Profil ${profil.avatar_id} nie istnieje`);
        await fs.writeFile(this.sciezka(profil.avatar_id), JSON.stringify(profil, null, 2), 'utf8');
        return profil;
    }

    // Wspólny przebieg edycji: odczyt → mutacja → zapis; mutacja zwraca odmowę albo null.
    async edytuj(avatar_id, mutacja) {
        const profil = await this.odczytajProfil(avatar_id);
        if (!profil) return { status: 'odmowa', powod: `Profil ${avatar_id} nie istnieje` };
        const odmowa = mutacja(profil);
        if (odmowa) return odmowa;
        await this.zapiszProfil(profil);
        return { status: 'zapisano' };
    }

    async ustawAutocertyfikat(avatar_id, { os, poziom, oswiadczenie }) {
        return this.edytuj(avatar_id, (profil) => {
            if (!konfig.osie.OSIE.includes(os)) {
                return { status: 'odmowa', powod: `Nieznana oś: ${os}` };
            }
            if (!konfig.osie.POZIOMY_OSI.includes(poziom)) {
                return { status: 'odmowa', powod: `Nieznany poziom: ${poziom}` };
            }
            if (!tekstOk(oswiadczenie)) {
                return { status: 'odmowa', powod: 'Oświadczenie wymagane (niepuste, w limicie długości)' };
            }
            profil.modul_1_jakosci_kwantowe.osie[os][poziom].autocertyfikat = {
                status: 'zadeklarowany',
                oswiadczenie,
                data_ts: new Date(this.zegar()).toISOString(),
                sygnatura_prawdy: null, // pole przygotowane — logika wypełniania POZA tą fazą
            };
            return null;
        });
    }

    async zapiszSymulacje(avatar_id, { symulacja, akceptacja, warunek, opis }) {
        return this.edytuj(avatar_id, (profil) => {
            if (!tekstOk(symulacja)) return { status: 'odmowa', powod: 'Nazwa symulacji wymagana' };
            if (!konfig.dostep.STATUSY_AKCEPTACJI.includes(akceptacja)) {
                return { status: 'odmowa', powod: `Akceptacja musi być: ${konfig.dostep.STATUSY_AKCEPTACJI.join('|')}` };
            }
            const wpis = { symulacja, akceptacja, warunek: warunek ?? null, opis: opis ?? '' };
            const rejestr = profil.modul_2_symulacje.rejestr;
            const i = rejestr.findIndex((w) => w.symulacja === symulacja);
            if (i >= 0) rejestr[i] = wpis; else rejestr.push(wpis);
            return null;
        });
    }

    async zapiszToken(avatar_id, { token, akceptacja, warunek, mapowanie_369, opis }) {
        return this.edytuj(avatar_id, (profil) => {
            if (!tekstOk(token)) return { status: 'odmowa', powod: 'Nazwa tokenu wymagana' };
            if (!konfig.dostep.STATUSY_AKCEPTACJI.includes(akceptacja)) {
                return { status: 'odmowa', powod: `Akceptacja musi być: ${konfig.dostep.STATUSY_AKCEPTACJI.join('|')}` };
            }
            const wpis = {
                token, akceptacja,
                warunek: warunek ?? null,
                mapowanie_369: mapowanie_369 ?? null,
                opis: opis ?? '',
            };
            const rejestr = profil.modul_3_tokeny.rejestr;
            const i = rejestr.findIndex((w) => w.token === token);
            if (i >= 0) rejestr[i] = wpis; else rejestr.push(wpis);
            return null;
        });
    }

    async ustawAlokacjeVolt(avatar_id, alokacja) {
        return this.edytuj(avatar_id, (profil) => {
            if (!Array.isArray(alokacja)) return { status: 'odmowa', powod: 'Alokacja musi być tablicą' };
            let suma = 0;
            for (const pozycja of alokacja) {
                if (!tekstOk(pozycja?.cel)) return { status: 'odmowa', powod: 'Każda pozycja wymaga celu' };
                const procent = Number(pozycja.procent);
                if (!Number.isFinite(procent) || procent <= konfig.volt.MIN_PROCENT) {
                    return { status: 'odmowa', powod: 'Procent musi być liczbą dodatnią' };
                }
                suma += procent;
            }
            if (suma > konfig.volt.SUMA_ALOKACJI_MAKS_PROCENT) {
                return {
                    status: 'odmowa',
                    powod: `Suma alokacji (${suma}) przekracza ${konfig.volt.SUMA_ALOKACJI_MAKS_PROCENT}%`,
                };
            }
            // redystrybucja w dowolnym momencie = podmiana całej alokacji
            profil.modul_3_tokeny.volt_token.alokacja =
                alokacja.map((p) => ({ cel: p.cel, procent: Number(p.procent) }));
            return null;
        });
    }

    async ustawPoziomObserwatora(avatar_id, obserwator, poziom) {
        return this.edytuj(avatar_id, (profil) => {
            if (!WZORZEC_AVATAR_ID.test(String(obserwator))) {
                return { status: 'odmowa', powod: 'Nieprawidłowy avatar_id obserwatora' };
            }
            if (!konfig.dostep.HIERARCHIA_POZIOMOW.includes(poziom)) {
                return { status: 'odmowa', powod: `Poziom musi być: ${konfig.dostep.HIERARCHIA_POZIOMOW.join('|')}` };
            }
            profil.modul_4_protokol_relacji.strumien_2_dostep_do_wiedzy
                .poziomy_obserwatorow[obserwator] = poziom;
            return null;
        });
    }

    async ustawNadpisanieS1(avatar_id, { obserwator, os, stan }) {
        return this.edytuj(avatar_id, (profil) => {
            if (!WZORZEC_AVATAR_ID.test(String(obserwator))) {
                return { status: 'odmowa', powod: 'Nieprawidłowy avatar_id obserwatora' };
            }
            if (!konfig.osie.OSIE.includes(os)) return { status: 'odmowa', powod: `Nieznana oś: ${os}` };
            if (!konfig.dostep.STANY_DOSTEPU.includes(stan)) {
                return { status: 'odmowa', powod: `Stan musi być: ${konfig.dostep.STANY_DOSTEPU.join('|')}` };
            }
            const nadpisania = profil.modul_4_protokol_relacji.strumien_1_dostep_relacyjny.nadpisania;
            const i = nadpisania.findIndex((n) => n.obserwator === obserwator && n.os === os);
            const wpis = { obserwator, os, stan };
            if (i >= 0) nadpisania[i] = wpis; else nadpisania.push(wpis);
            return null;
        });
    }
}

module.exports = { MagazynProfili, nowyProfil, KATALOG_DOMYSLNY, WZORZEC_AVATAR_ID };
