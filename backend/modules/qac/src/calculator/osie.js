'use strict';

const sweph = require('sweph');
const { astronomia } = require('../../config');
const { inicjalizuj, flagaZrodla } = require('./pozycje');

/**
 * Osie kątowe kosmogramu: Ascendent, MC oraz ich opozycje Descendent, IC.
 *
 * UWAGA — skala czasu: houses_ex2 wymaga jd_ut (czas uniwersalny, zależny od
 * obrotu Ziemi), a NIE jd_et używanego dla pozycji planetarnych. Wywołanie z
 * jd_et dałoby błąd rzędu ΔT w położeniu osi — kategoryczny zakaz.
 *
 * Osie są niezależne od zodiaku sideralnego dopóki nie ustawimy trybu
 * SEFLG_SIDEREAL; obecnie zwracane tropikalnie, spójnie z resztą kalkulatora.
 */
function osieKatowe(jd_ut, obserwator) {
    inicjalizuj();

    if (!Number.isFinite(jd_ut)) {
        throw new Error(`Nieprawidłowy jd_ut dla osi: ${jd_ut}`);
    }
    if (!Number.isFinite(obserwator.dlugosc_geo) ||
        obserwator.dlugosc_geo < -180 || obserwator.dlugosc_geo > 180) {
        throw new Error(`Nieprawidłowa długość geograficzna: ${obserwator.dlugosc_geo}`);
    }
    if (!Number.isFinite(obserwator.szerokosc_geo) ||
        obserwator.szerokosc_geo < -90 || obserwator.szerokosc_geo > 90) {
        throw new Error(`Nieprawidłowa szerokość geograficzna: ${obserwator.szerokosc_geo}`);
    }

    const wynik = sweph.houses_ex2(
        jd_ut,
        flagaZrodla(),
        obserwator.szerokosc_geo,
        obserwator.dlugosc_geo,
        astronomia.SYSTEM_DOMOW
    );

    if (wynik.flag !== sweph.constants.OK) {
        throw new Error(`Obliczenie osi (houses_ex2) nieudane: ${wynik.error}`);
    }

    const asc = wynik.data.points[0];
    const mc = wynik.data.points[1];
    const asc_speed = wynik.data.pointsSpeed[0];
    const mc_speed = wynik.data.pointsSpeed[1];

    const opozycja = (deg) => (deg + astronomia.POL_KOLO_DEG) % 360;

    return {
        ascendent: { dlugosc_ekliptyczna_deg: asc, predkosc_dlugosci_deg_d: asc_speed },
        mc: { dlugosc_ekliptyczna_deg: mc, predkosc_dlugosci_deg_d: mc_speed },
        // Descendent i IC — opozycje, wyprowadzane (nie osobne wywołania).
        descendent: { dlugosc_ekliptyczna_deg: opozycja(asc), predkosc_dlugosci_deg_d: asc_speed, wyprowadzony_z: 'ascendent+180' },
        ic: { dlugosc_ekliptyczna_deg: opozycja(mc), predkosc_dlugosci_deg_d: mc_speed, wyprowadzony_z: 'mc+180' },
        system_domow: astronomia.SYSTEM_DOMOW,
    };
}

module.exports = { osieKatowe };
