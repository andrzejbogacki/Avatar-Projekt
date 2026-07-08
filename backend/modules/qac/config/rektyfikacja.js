'use strict';

// Parametry Quantum Rectification Tool. // TERMIN-KANDYDAT: Quantum Rectification Tool

// Aspekty ścisłe uwzględniane w dopasowaniu tranzytów [°].
const ASPEKTY_DEG = Object.freeze([0, 60, 90, 120, 180]);

// Maksymalne odchylenie od aspektu ścisłego (orb) [°].
const ORB_SCISLY_DEG = 1.0;

// Domyślny krok generowania kandydatów w zakresie brzegowym [min].
const KROK_KANDYDATA_MIN = 4;

// Górny limit liczby kandydatów jednego zadania (ochrona pętli obliczeniowej).
const MAKS_KANDYDATOW = 5000;

// Składowe metryki `pewnosc` — formuła robocza (wniosek logiczny, punkt otwarty O8):
// pewnosc = WAGA_DOPASOWANIA · dopasowanie_znorm + WAGA_MARGINESU · margines_nad_drugim.
const PEWNOSC = Object.freeze({
    WAGA_DOPASOWANIA: 0.7,
    WAGA_MARGINESU: 0.3,
});

const MINUT_NA_DOBE = 1440;

module.exports = Object.freeze({
    ASPEKTY_DEG,
    ORB_SCISLY_DEG,
    KROK_KANDYDATA_MIN,
    MAKS_KANDYDATOW,
    PEWNOSC,
    MINUT_NA_DOBE,
});
