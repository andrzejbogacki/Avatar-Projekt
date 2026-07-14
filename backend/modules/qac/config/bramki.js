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

// Punkt zerowy koła: kanoniczny start koła rave, brama 41 na 2° Wodnika,
// zweryfikowane dwoma źródłami. 2°00' Wodnika = 302° długości tropikalnej.
const START_KOLA_DEG = 302;

// Kanoniczne koło rave (Human Design): 64 bramy w kolejności rosnącej od
// START_KOLA_DEG (indeks sektora → numer bramki). Wymiana układu = podmiana tablicy.
const KOLEJNOSC_BRAMEK = Object.freeze([
    41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
    27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
    31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
    28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
]);

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
