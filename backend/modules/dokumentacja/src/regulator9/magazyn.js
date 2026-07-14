'use strict';

// Magazyn dokumentów (pozycja 6 — forma + 9a spójność):
// manifest.json = rejestr artefaktów treściowych z hash-em źródła per dokument
// (wykrycie zmiany treści poza przebudową). Metadane wpisów utrzymuje Suweren
// (edycja repo), hash i rozmiar wylicza wyłącznie przebudowa manifestu.
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const konfig = require('../../config');
const { walidujWpis, bezpiecznaSciezka } = require('./walidacja');

function hashZrodla(zawartosc) {
    return createHash('sha256').update(zawartosc, 'utf8').digest('hex');
}

class MagazynDokumentow {
    constructor({
        sciezkaManifestu = konfig.SCIEZKA_MANIFESTU,
        katalogRepo = konfig.KATALOG_REPO,
        maksBajty = konfig.MAKS_BAJTY_DOKUMENTU,
        zegar = Date.now,
    } = {}) {
        this.sciezkaManifestu = sciezkaManifestu;
        this.katalogRepo = katalogRepo;
        this.maksBajty = maksBajty;
        this.zegar = zegar;
    }

    async manifest() {
        const manifest = JSON.parse(await fs.readFile(this.sciezkaManifestu, 'utf8'));
        for (const wpis of manifest.dokumenty) {
            walidujWpis(wpis, { katalogRepo: this.katalogRepo });
        }
        return manifest;
    }

    async odczytajTresc(wpis) {
        const pelna = bezpiecznaSciezka(this.katalogRepo, wpis.sciezka);
        const stan = await fs.stat(pelna);
        if (stan.size > this.maksBajty) {
            throw new Error(`Dokument ${wpis.id} przekracza limit ${this.maksBajty} bajtów`);
        }
        return fs.readFile(pelna, 'utf8');
    }

    // Lista metadanych + zgodność hash manifestu z treścią na dysku (9a).
    async lista() {
        const manifest = await this.manifest();
        const dokumenty = await Promise.all(manifest.dokumenty.map(async (wpis) => {
            let aktualny = false;
            let dostepny = true;
            try {
                aktualny = hashZrodla(await this.odczytajTresc(wpis)) === wpis.hash_zrodla;
            } catch {
                dostepny = false; // brak pliku lub przekroczony limit = jawny status, nie wyjątek listy
            }
            const { hash_zrodla, ...meta } = wpis;
            return { ...meta, hash_zrodla, aktualny, dostepny };
        }));
        return {
            wersja: manifest.wersja,
            zbudowano_ts: manifest.zbudowano_ts,
            aktualny: dokumenty.every((d) => d.aktualny),
            dokumenty,
        };
    }

    async dokument(id) {
        const manifest = await this.manifest();
        const wpis = manifest.dokumenty.find((d) => d.id === id);
        if (!wpis) return null;
        const tresc = await this.odczytajTresc(wpis);
        return {
            ...wpis,
            tresc,
            aktualny: hashZrodla(tresc) === wpis.hash_zrodla,
            // stemplowanie danych (KONWENCJE §6): treść czytana z dysku = live
            stempel: {
                zrodlo: wpis.sciezka,
                timestamp: new Date(this.zegar()).toISOString(),
                status: 'live',
            },
        };
    }

    // Przebudowa manifestu (bramka 9b): jedyna ścieżka zapisu pliku manifestu.
    // Metadane wpisów pozostają nietknięte; wyliczane są hash_zrodla i bajty.
    async przebudujManifest() {
        const manifest = await this.manifest();
        for (const wpis of manifest.dokumenty) {
            const tresc = await this.odczytajTresc(wpis);
            wpis.hash_zrodla = hashZrodla(tresc);
            wpis.bajty = Buffer.byteLength(tresc, 'utf8');
        }
        manifest.wersja = konfig.WERSJA_MANIFESTU;
        manifest.zbudowano_ts = new Date(this.zegar()).toISOString();
        await fs.mkdir(path.dirname(this.sciezkaManifestu), { recursive: true });
        await fs.writeFile(this.sciezkaManifestu, JSON.stringify(manifest, null, 2), 'utf8');
        return manifest;
    }
}

module.exports = { MagazynDokumentow, hashZrodla };
