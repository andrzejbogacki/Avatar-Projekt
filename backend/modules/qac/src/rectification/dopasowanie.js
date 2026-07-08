'use strict';

const { rektyfikacja, bramki } = require('../../config');
const { utcNaSkaleCzasowe } = require('../calculator/czas');
const { pozycjeTopocentryczne } = require('../calculator/pozycje');
const { oddajSterowanie } = require('./kolejka');

// Dopasowanie geometrycznych momentów aspektów ścisłych tranzytów
// do dat kluczowych wydarzeń życiowych awatara.

function roznicaKatowa(a, b) {
    const polkole = bramki.PELNE_KOLO_DEG / 2;
    let d = Math.abs(a - b) % bramki.PELNE_KOLO_DEG;
    return d > polkole ? bramki.PELNE_KOLO_DEG - d : d;
}

/**
 * Waga dopasowania pary tranzyt–natal: gaussowska funkcja odchylenia od
 * najbliższego aspektu ścisłego; poza orbem = 0.
 */
function wagaAspektu(katTranzytu, katNatalny) {
    const separacja = roznicaKatowa(katTranzytu, katNatalny);
    let najlepsza = 0;
    for (const aspekt of rektyfikacja.ASPEKTY_DEG) {
        const odchylenie = Math.abs(separacja - aspekt);
        if (odchylenie <= rektyfikacja.ORB_SCISLY_DEG) {
            const w = Math.exp(-((odchylenie / rektyfikacja.ORB_SCISLY_DEG) ** 2));
            if (w > najlepsza) najlepsza = w;
        }
    }
    return najlepsza;
}

/** Generuje tablicę kandydatów (JD_ET + czas UTC) z zakresu brzegowego. */
function generujKandydatow(zakres) {
    const { od, do: doCzasu, krok_minuty = rektyfikacja.KROK_KANDYDATA_MIN } = zakres;
    if (!od || !doCzasu) throw new Error('QRT: zakres brzegowy wymaga pól od/do (czas UTC)');
    if (!(krok_minuty > 0)) throw new Error(`QRT: nieprawidłowy krok kandydata: ${krok_minuty}`);
    const startJdUt = utcNaSkaleCzasowe(od);
    const koniecJdUt = utcNaSkaleCzasowe(doCzasu);
    if (koniecJdUt.jd_ut <= startJdUt.jd_ut) {
        throw new Error('QRT: koniec zakresu nie jest późniejszy niż początek');
    }
    const krokDnia = krok_minuty / rektyfikacja.MINUT_NA_DOBE;
    // tolerancja 0,1% kroku: dryf ΔT między krańcami zakresu (rzędu µs–ms)
    // nie może odciąć kandydata leżącego na pełnej wielokrotności kroku
    const liczba = Math.floor((koniecJdUt.jd_ut - startJdUt.jd_ut) / krokDnia + 1e-3) + 1;
    if (liczba > rektyfikacja.MAKS_KANDYDATOW) {
        throw new Error(
            `QRT: ${liczba} kandydatów przekracza limit ${rektyfikacja.MAKS_KANDYDATOW} — zawęź zakres lub zwiększ krok`
        );
    }
    return Array.from({ length: liczba }, (_, i) => ({
        jd_et: startJdUt.jd_et + i * krokDnia,
        jd_ut: startJdUt.jd_ut + i * krokDnia,
    }));
}

function dlugosci(pozycje) {
    return Object.fromEntries(
        Object.entries(pozycje).map(([c, p]) => [c, p.dlugosc_ekliptyczna_deg])
    );
}

/**
 * Ocena wszystkich kandydatów. Tranzyty wsteczne: pozycje planet w momentach
 * wydarzeń (stałe dla całego zadania) porównywane z pozycjami natalnymi
 * każdego kandydata. `obliczPozycje(jd_et)` — wstrzykiwalne dla testów;
 * domyślnie rzeczywisty silnik topocentryczny.
 */
async function ocenKandydatow({ zakres, wydarzenia, obserwator, obliczPozycje = null }) {
    if (!Array.isArray(wydarzenia) || wydarzenia.length === 0) {
        throw new Error('QRT: wymagana niepusta lista kluczowych wydarzeń życiowych');
    }
    const licz = obliczPozycje || ((jd) => dlugosci(pozycjeTopocentryczne(jd, obserwator)));

    const tranzyty = wydarzenia.map((w) => {
        if (!w.czas_utc) throw new Error(`QRT: wydarzenie bez czas_utc: ${JSON.stringify(w)}`);
        return { opis: w.opis || null, dlugosci: licz(utcNaSkaleCzasowe(w.czas_utc).jd_et) };
    });

    const kandydaci = generujKandydatow(zakres);
    const oceny = [];
    for (const kandydat of kandydaci) {
        const natalne = licz(kandydat.jd_et);
        let suma = 0;
        for (const tranzyt of tranzyty) {
            let najlepszaWydarzenia = 0;
            for (const katT of Object.values(tranzyt.dlugosci)) {
                for (const katN of Object.values(natalne)) {
                    const w = wagaAspektu(katT, katN);
                    if (w > najlepszaWydarzenia) najlepszaWydarzenia = w;
                }
            }
            suma += najlepszaWydarzenia;
        }
        // dopasowanie znormalizowane: średnia najlepszych wag per wydarzenie ∈ [0,1]
        oceny.push({ ...kandydat, dopasowanie: suma / tranzyty.length });
        await oddajSterowanie();
    }
    return oceny;
}

module.exports = { ocenKandydatow, generujKandydatow, wagaAspektu, roznicaKatowa };
