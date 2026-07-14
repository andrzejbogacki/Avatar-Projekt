'use strict';

const { astronomia } = require('../../config');

const PELNE_KOLO = 360;

function norm(deg) {
    const k = deg % PELNE_KOLO;
    return k < 0 ? k + PELNE_KOLO : k;
}

/**
 * Detekcja urodzenia dziennego/nocnego wg pozycji Słońca względem horyzontu.
 * Słońce NAD horyzontem (dzień) = w łuku od Descendentu przez MC (górę) do
 * Ascendentu. Numerycznie: kąt Słońca liczony od Descendentu (Asc+180) mieści
 * się w (0,180) — pierwsza połowa łuku od Dsc prowadzi przez MC do Asc.
 *
 * Weryfikacja fizyczna: urodzenie popołudniowe (Słońce po górowaniu, między
 * MC a Dsc) → dzień; ranne wschodzące Słońce tuż nad Asc od dołu → noc.
 */
function czyDzien(dlugoscSlonca, ascendent) {
    const descendent = norm(ascendent + astronomia.POL_KOLO_DEG);
    const odDsc = norm(dlugoscSlonca - descendent);
    return odDsc > 0 && odDsc < astronomia.POL_KOLO_DEG;
}

/**
 * Pars Fortunae (Punkt Szczęścia).
 * Dzień:  Asc + Księżyc − Słońce
 * Noc:    Asc + Słońce − Księżyc
 * Wszystkie wejścia = długości ekliptyczne [°] formy świadomej + Ascendent.
 */
function parsFortunae({ dlugoscSlonca, dlugoscKsiezyca, ascendent }) {
    for (const [n, v] of Object.entries({ dlugoscSlonca, dlugoscKsiezyca, ascendent })) {
        if (!Number.isFinite(v)) {
            throw new Error(`Nieprawidłowa długość dla Pars Fortunae: ${n}=${v}`);
        }
    }
    const dzien = czyDzien(dlugoscSlonca, ascendent);
    const dlugosc = dzien
        ? norm(ascendent + dlugoscKsiezyca - dlugoscSlonca)
        : norm(ascendent + dlugoscSlonca - dlugoscKsiezyca);

    return {
        dlugosc_ekliptyczna_deg: dlugosc,
        sekta: dzien ? 'dzienna' : 'nocna',
        wzor: dzien ? 'Asc + Ksiezyc - Slonce' : 'Asc + Slonce - Ksiezyc',
    };
}

module.exports = { parsFortunae, czyDzien };
