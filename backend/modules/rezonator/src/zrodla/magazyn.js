'use strict';

// Magazyn Źródeł (pozycja 6 — forma): każde Źródło (Avatar, obiekt, misja)
// = samodzielny, eksportowalny rekord Rezonatora z pełnym zestawem parametrów.
// Rezonator jest zintegrowanym modułem Źródła, nie zewnętrznym sterownikiem.
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');

const KATALOG_DOMYSLNY = path.join(__dirname, '..', '..', 'zrodla');

function walidujParametry({ typ, wibracja_f, rytm_bpm, misja }, { czesciowa = false } = {}) {
    if ((!czesciowa || typ !== undefined) && !konfig.TYPY_ZRODEL.includes(typ)) {
        return `Typ Źródła musi być: ${konfig.TYPY_ZRODEL.join('|')}`;
    }
    if ((!czesciowa || wibracja_f !== undefined)
        && (!Number.isFinite(wibracja_f) || wibracja_f <= 0)) {
        return 'wibracja_f musi być dodatnią liczbą (Hz)';
    }
    if ((!czesciowa || rytm_bpm !== undefined)
        && (!Number.isFinite(rytm_bpm)
            || rytm_bpm < konfig.sync.RYTM_BPM_MIN
            || rytm_bpm > konfig.sync.RYTM_BPM_MAKS)) {
        return `rytm_bpm w zakresie ${konfig.sync.RYTM_BPM_MIN}–${konfig.sync.RYTM_BPM_MAKS}`;
    }
    if ((!czesciowa || misja !== undefined)
        && (typeof misja !== 'string' || !misja.trim()
            || misja.length > konfig.MAKS_DLUGOSC_TEKSTU)) {
        return 'misja wymagana (niepusta, w limicie długości)';
    }
    return null;
}

class MagazynZrodel {
    constructor({ katalog = KATALOG_DOMYSLNY, zegar = Date.now } = {}) {
        this.katalog = katalog;
        this.zegar = zegar;
    }

    sciezka(zrodlo_id) {
        if (!konfig.WZORZEC_ZRODLO_ID.test(String(zrodlo_id))) {
            throw new Error(`Nieprawidłowy zrodlo_id: wymagany wzorzec ${konfig.WZORZEC_ZRODLO_ID}`);
        }
        return path.join(this.katalog, `${zrodlo_id}.json`);
    }

    async odczytajZrodlo(zrodlo_id) {
        try {
            return JSON.parse(await fs.readFile(this.sciezka(zrodlo_id), 'utf8'));
        } catch (blad) {
            if (blad.code === 'ENOENT') return null;
            throw blad;
        }
    }

    async utworzZrodlo(wlasciciel, { zrodlo_id, typ, wibracja_f, rytm_bpm, misja, T_s }) {
        if (!konfig.WZORZEC_ZRODLO_ID.test(String(zrodlo_id))) {
            return { status: 'odmowa', powod: `Nieprawidłowy zrodlo_id: wymagany wzorzec ${konfig.WZORZEC_ZRODLO_ID}` };
        }
        const blad = walidujParametry({ typ, wibracja_f, rytm_bpm, misja });
        if (blad) return { status: 'odmowa', powod: blad };
        if (T_s !== undefined && (!Number.isFinite(T_s) || T_s <= 0)) {
            return { status: 'odmowa', powod: 'T_s musi być dodatnią liczbą sekund' };
        }
        const zrodlo = {
            zrodlo_id,
            typ,
            wibracja_f,
            rytm_bpm,
            misja,
            T_s: T_s ?? konfig.sync.T_DOMYSLNE_S,
            wlasciciel,
            utworzono_ts: new Date(this.zegar()).toISOString(),
        };
        await fs.mkdir(this.katalog, { recursive: true });
        try {
            await fs.writeFile(this.sciezka(zrodlo_id), JSON.stringify(zrodlo, null, 2),
                { encoding: 'utf8', flag: 'wx' });
        } catch (bladZapisu) {
            if (bladZapisu.code === 'EEXIST') {
                return { status: 'odmowa', powod: `Źródło ${zrodlo_id} już istnieje` };
            }
            throw bladZapisu;
        }
        return { status: 'utworzono', zrodlo };
    }

    async edytujZrodlo(kto, zrodlo_id, zmiany) {
        const zrodlo = await this.odczytajZrodlo(zrodlo_id);
        if (!zrodlo) return { status: 'odmowa', powod: `Źródło ${zrodlo_id} nie istnieje` };
        if (zrodlo.wlasciciel !== kto) {
            return { status: 'odmowa', powod: 'Parametry Źródła edytuje wyłącznie właściciel' };
        }
        const blad = walidujParametry(zmiany, { czesciowa: true });
        if (blad) return { status: 'odmowa', powod: blad };
        if (zmiany.T_s !== undefined && (!Number.isFinite(zmiany.T_s) || zmiany.T_s <= 0)) {
            return { status: 'odmowa', powod: 'T_s musi być dodatnią liczbą sekund' };
        }
        for (const pole of ['typ', 'wibracja_f', 'rytm_bpm', 'misja', 'T_s']) {
            if (zmiany[pole] !== undefined) zrodlo[pole] = zmiany[pole];
        }
        await fs.writeFile(this.sciezka(zrodlo_id), JSON.stringify(zrodlo, null, 2), 'utf8');
        return { status: 'zapisano', zrodlo };
    }

    async listaZrodel() {
        let pliki;
        try {
            pliki = await fs.readdir(this.katalog);
        } catch (blad) {
            if (blad.code === 'ENOENT') return [];
            throw blad;
        }
        const wynik = [];
        for (const plik of pliki.filter((p) => p.endsWith('.json')).sort()) {
            wynik.push(JSON.parse(await fs.readFile(path.join(this.katalog, plik), 'utf8')));
        }
        return wynik;
    }
}

module.exports = { MagazynZrodel, KATALOG_DOMYSLNY };
