'use strict';

// Kwantyzacja kątowa koła 360° — 64 Bramki. // TERMIN-KANDYDAT: 64 Bramki
const PELNE_KOLO_DEG = 360;
const LICZBA_BRAMEK = 64;
const SZEROKOSC_BRAMKI_DEG = PELNE_KOLO_DEG / LICZBA_BRAMEK; // 5,625°

const LINII_NA_BRAMKE = 6;
const SZEROKOSC_LINII_DEG = SZEROKOSC_BRAMKI_DEG / LINII_NA_BRAMKE; // 0,9375°

// Dalsze podpodziały linii: kolor → ton → base.
// Wniosek logiczny (spec wymienia "kolory, tony i podstawy (base)" bez liczności;
// przyjęto standardową strukturę podpodziału 6/6/5 — do zatwierdzenia, punkt otwarty O6b).
const KOLOROW_NA_LINIE = 6;
const TONOW_NA_KOLOR = 6;
const BASE_NA_TON = 5;

// Punkt zerowy koła: 0° Barana (długość ekliptyczna 0°) — wniosek logiczny.
const START_KOLA_DEG = 0;

// Kolejność bramek na kole: domyślnie sekwencyjna 1..64 od punktu zerowego.
// Spec nie definiuje niesekwencyjnego układu koła — punkt otwarty O6a.
// Wymiana układu = podmiana tej tablicy (indeks sektora → numer bramki).
const KOLEJNOSC_BRAMEK = Object.freeze(
    Array.from({ length: LICZBA_BRAMEK }, (_, i) => i + 1)
);

module.exports = Object.freeze({
    PELNE_KOLO_DEG,
    LICZBA_BRAMEK,
    SZEROKOSC_BRAMKI_DEG,
    LINII_NA_BRAMKE,
    SZEROKOSC_LINII_DEG,
    KOLOROW_NA_LINIE,
    TONOW_NA_KOLOR,
    BASE_NA_TON,
    START_KOLA_DEG,
    KOLEJNOSC_BRAMEK,
});
