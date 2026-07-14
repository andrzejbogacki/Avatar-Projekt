'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sweph = require('sweph');
const { astronomia } = require('../../config');

let sciezkaZainicjalizowana = false;

/**
 * Twarda walidacja źródła efemeryd. Brak plików = jawny błąd — kategoryczny
 * zakaz cichej degradacji do efemerydy analitycznej Moshiera (algorytm przybliżony).
 */
function walidujPlikiEfemeryd() {
    const katalog = astronomia.SCIEZKA_EFEMERYD;
    const pliki = fs.existsSync(katalog) ? fs.readdirSync(katalog) : [];
    if (astronomia.ZRODLO_EFEMERYD === 'jpleph') {
        if (!pliki.includes(astronomia.PLIK_JPL)) {
            throw new Error(
                `Brak pliku JPL ${astronomia.PLIK_JPL} w ${katalog} — zależność do dostarczenia, patrz ephemeris/README.md`
            );
        }
        return;
    }
    if (!pliki.some((p) => p.endsWith('.se1'))) {
        throw new Error(
            `Brak plików efemeryd .se1 w ${katalog} — zależność do dostarczenia, patrz ephemeris/README.md`
        );
    }
}

function inicjalizuj() {
    if (sciezkaZainicjalizowana) return;
    walidujPlikiEfemeryd();
    sweph.set_ephe_path(astronomia.SCIEZKA_EFEMERYD);
    // Ayanamsa Lahiri — jednorazowe ustawienie trybu sideralnego dla wywołań
    // z flagą SEFLG_SIDEREAL (długości mierzone od gwiazdowego punktu odniesienia).
    sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
    if (astronomia.ZRODLO_EFEMERYD === 'jpleph') {
        sweph.set_jpl_file(astronomia.PLIK_JPL);
    }
    sciezkaZainicjalizowana = true;
}

function flagaZrodla() {
    return astronomia.ZRODLO_EFEMERYD === 'jpleph'
        ? sweph.constants.SEFLG_JPLEPH
        : sweph.constants.SEFLG_SWIEPH;
}

function flagiObliczen() {
    return flagaZrodla()
        | sweph.constants.SEFLG_SPEED
        | sweph.constants.SEFLG_TOPOCTR;
}

// Flagi wariantu sideralnego: te same co tropikalne + SEFLG_SIDEREAL.
// Ayanamsa wg trybu ustawionego w inicjalizuj() (Lahiri).
function flagiSideralne() {
    return flagiObliczen() | sweph.constants.SEFLG_SIDEREAL;
}

function walidujObserwatora({ dlugosc_geo, szerokosc_geo, wysokosc_npm_m }) {
    if (!Number.isFinite(dlugosc_geo) || dlugosc_geo < -180 || dlugosc_geo > 180) {
        throw new Error(`Nieprawidłowa długość geograficzna: ${dlugosc_geo}`);
    }
    if (!Number.isFinite(szerokosc_geo) || szerokosc_geo < -90 || szerokosc_geo > 90) {
        throw new Error(`Nieprawidłowa szerokość geograficzna: ${szerokosc_geo}`);
    }
    if (!Number.isFinite(wysokosc_npm_m)) {
        throw new Error(`Nieprawidłowa wysokość n.p.m.: ${wysokosc_npm_m}`);
    }
}

/**
 * Pozycje topocentryczne wszystkich ciał z config/astronomia.js dla momentu jd_et.
 * Obserwator: dokładne współrzędne geograficzne + wysokość n.p.m. (nie środek Ziemi).
 * Pozorne pozycje: libswe uwzględnia czas propagacji światła, aberrację,
 * precesję i nutację; paralaksa topocentryczna przez SEFLG_TOPOCTR.
 */
function pozycjeTopocentryczne(jd_et, obserwator) {
    inicjalizuj();
    walidujObserwatora(obserwator);
    sweph.set_topo(obserwator.dlugosc_geo, obserwator.szerokosc_geo, obserwator.wysokosc_npm_m);

    const flagi = flagiObliczen();
    const pozycje = {};
    for (const [nazwa, stala] of Object.entries(astronomia.CIALA)) {
        const wynik = sweph.calc(jd_et, sweph.constants[stala], flagi);
        if (wynik.flag === sweph.constants.ERR) {
            throw new Error(`Obliczenie pozycji ${nazwa} nieudane: ${wynik.error}`);
        }
        if (!(wynik.flag & flagaZrodla())) {
            throw new Error(
                `Źródło efemeryd zdegradowane dla ${nazwa} (flaga ${wynik.flag}): ${wynik.error} — zakaz algorytmów przybliżonych`
            );
        }
        const [dlugosc, szerokosc, odleglosc, predkosc_dlugosci] = wynik.data;

        // Wariant sideralny (ayanamsa Lahiri) — osobne wywołanie z SEFLG_SIDEREAL,
        // ta sama twarda walidacja źródła co tropikalne. Struktura tropikalna nietknięta.
        const wynikSid = sweph.calc(jd_et, sweph.constants[stala], flagiSideralne());
        if (wynikSid.flag === sweph.constants.ERR) {
            throw new Error(`Obliczenie pozycji sideralnej ${nazwa} nieudane: ${wynikSid.error}`);
        }
        if (!(wynikSid.flag & flagaZrodla())) {
            throw new Error(
                `Źródło efemeryd zdegradowane dla ${nazwa} (sideralna, flaga ${wynikSid.flag}): ${wynikSid.error} — zakaz algorytmów przybliżonych`
            );
        }

        pozycje[nazwa] = {
            dlugosc_ekliptyczna_deg: dlugosc,
            szerokosc_ekliptyczna_deg: szerokosc,
            odleglosc_au: odleglosc,
            predkosc_dlugosci_deg_d: predkosc_dlugosci,
            sideralna: {
                dlugosc_ekliptyczna_deg: wynikSid.data[0],
            },
        };
    }
    return pozycje;
}

module.exports = {
    pozycjeTopocentryczne,
    flagiObliczen,
    flagaZrodla,
    walidujPlikiEfemeryd,
    inicjalizuj,
};
