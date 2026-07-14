'use strict';

// Quantum Avatar Core — punkt wejścia modułu (interfejs wewnętrzny backendu).
// TERMIN-KANDYDAT: Quantum Avatar Core
// Wzorzec Brahmandy: komunikacja wyłącznie przez poniższe kontrakty —
// sięganie do wnętrza modułu przez inne moduły jest niezgodne z kanonem.

const konfiguracja = require('./config');
const kalkulator = require('./src/calculator');
const { normalizuj } = require('./src/normalizer');
const regulator9 = require('./src/regulator9');
const qrt = require('./src/rectification');
const { BuforSrodowiskowy } = require('./cache');

/** Inicjalizuje bufor środowiskowy (Redis lub jawny fallback in-memory). */
async function inicjalizujBufor(opcje = {}) {
    return new BuforSrodowiskowy(opcje).inicjalizuj();
}

/**
 * Pełny przebieg generacji profilu Awatara:
 * 9b walidacja wejścia → 3 kalkulator → 9b kontrola świeżości cache →
 * 9a rezonator (normalizacja) → 9b bramka zapisu → profiles/<avatar_id>.json.
 *
 * `zaleznosci` (opcjonalne): {bufor, silnik, katalogProfili, zapisz} —
 * wstrzykiwalne dla testów; domyślnie rzeczywisty silnik i zapis przez bramkę.
 */
async function generujProfil(daneWejsciowe, zaleznosci = {}) {
    const {
        bufor = null,
        silnik = kalkulator,
        katalogProfili = undefined,
        zapisz = true,
        progresje = null,
    } = zaleznosci;

    regulator9.walidujDaneWejsciowe(daneWejsciowe);

    const daneSurowe = silnik.obliczDaneSurowe({
        czas_utc: daneWejsciowe.czas_utc,
        obserwator: daneWejsciowe.obserwator,
    });

    const migawka = bufor ? await bufor.migawka() : {};
    const { przyjete, odrzucone } = regulator9.kontrolujSwiezosc(migawka);
    const mapa369 = normalizuj(daneSurowe, przyjete, progresje);

    // Parametry odrzucone przez regulator 9b pozostają w stemplach — jawnie.
    for (const [klucz, rekord] of Object.entries(odrzucone)) {
        mapa369.stemple_srodowiskowe[klucz] = {
            zrodlo: rekord.zrodlo ?? klucz,
            timestamp: rekord.timestamp ?? null,
            status: 'stale',
            ...(rekord.blad ? { blad: rekord.blad } : {}),
            odrzucony_przez: 'regulator9 (kontrola świeżości)',
        };
    }

    const profil = {
        naglowek: {
            avatar_id: daneWejsciowe.avatar_id,
            adres_rejestru: konfiguracja.rejestr.ADRES_MODULU,
            status_adresu: konfiguracja.rejestr.STATUS_ADRESU,
            wersja_schematu: konfiguracja.rejestr.WERSJA_SCHEMATU_PROFILU,
            status: konfiguracja.rejestr.STATUS_ARTEFAKTU,
            wygenerowano: new Date().toISOString(),
        },
        dane_surowe: {
            czas: daneSurowe.czas,
            obserwator: daneSurowe.obserwator,
            forma_swiadoma: {
                jd_et: daneSurowe.forma_swiadoma.jd_et,
                pozycje: daneSurowe.forma_swiadoma.pozycje,
            },
            forma_nieswiadoma: {
                jd_et: daneSurowe.forma_nieswiadoma.jd_et,
                pozycje: daneSurowe.forma_nieswiadoma.pozycje,
            },
        },
        aktywacje: {
            forma_swiadoma: daneSurowe.forma_swiadoma.aktywacje,
            forma_nieswiadoma: daneSurowe.forma_nieswiadoma.aktywacje,
        },
        mapa_369: mapa369,
        macierz_relacyjna: {
            // Przygotowanie pod kompozyty kwantowe i synchronizację fazową
            // (Phase-Locking) między awatarami — pełny schemat: punkt otwarty O4.
            // TERMIN-KANDYDAT: Kompozyt Kwantowy, Phase-Locking
            status: 'przygotowana',
            avatar_id: daneWejsciowe.avatar_id,
            wektor_12d: mapa369.wektor_czestotliwosci_12d,
            kompozyty: [],
        },
    };

    const sciezka = zapisz ? regulator9.autoryzujIZapisz(profil, katalogProfili) : null;
    return { profil, sciezka };
}

// Kontraktowy odczyt zapisanego profilu (dla klientów QAC, np. Rezonatora) —
// bez sięgania do wnętrza modułu. Brak profilu = null (jawny brak).
async function wczytajProfil(avatar_id, katalog = regulator9.KATALOG_PROFILI) {
    const fs = require('node:fs/promises');
    const path = require('node:path');
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(String(avatar_id))) {
        throw new Error('Nieprawidłowy avatar_id');
    }
    try {
        return JSON.parse(await fs.readFile(path.join(katalog, `${avatar_id}.json`), 'utf8'));
    } catch (blad) {
        if (blad.code === 'ENOENT') return null;
        throw blad;
    }
}

module.exports = {
    konfiguracja,
    inicjalizujBufor,
    generujProfil,
    wczytajProfil,
    kalkulator,
    regulator9,
    qrt: {
        zlecRektyfikacje: qrt.zlecRektyfikacje,
        statusZadania: qrt.statusZadania,
    },
};
