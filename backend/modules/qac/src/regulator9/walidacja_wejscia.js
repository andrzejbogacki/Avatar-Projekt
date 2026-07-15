'use strict';

const { rejestr } = require('../../config');
const { znanaStrefa } = require('../calculator/czas');

// 9b — REGULATOR: walidacja kompletności danych wejściowych.
// Regulator stoi nad obiegiem — nie uczestniczy w obliczeniu, kontroluje je.

const SKLADOWE_CZASU = ['rok', 'miesiac', 'dzien', 'godzina', 'minuta', 'sekunda'];
const SKLADOWE_OBSERWATORA = ['dlugosc_geo', 'szerokosc_geo', 'wysokosc_npm_m'];

/**
 * Waliduje dane wejściowe profilu. Zwraca listę WSZYSTKICH braków naraz;
 * niekompletne dane = odrzucenie (wyjątek z pełną listą).
 *
 * Źródłem prawdy jest czas lokalny miejsca urodzenia wraz ze strefą — UTC
 * wylicza kalkulator (ADR-009).
 */
function walidujDaneWejsciowe(dane) {
    const bledy = [];
    if (!dane || typeof dane !== 'object') {
        throw new Error('Dane wejściowe: brak obiektu danych');
    }

    if (typeof dane.avatar_id !== 'string' || !rejestr.WZORZEC_AVATAR_ID.test(dane.avatar_id)) {
        bledy.push(
            `avatar_id niezgodny z wzorcem Protokołu Suwerenności (${rejestr.WZORZEC_AVATAR_ID}): ${dane.avatar_id}`
        );
    }

    if (!dane.czas_lokalny || typeof dane.czas_lokalny !== 'object') {
        bledy.push('brak czas_lokalny (czas ścienny miejsca urodzenia)');
    } else {
        for (const s of SKLADOWE_CZASU) {
            if (!Number.isFinite(dane.czas_lokalny[s])) {
                bledy.push(`czas_lokalny.${s}: brak lub nieliczbowe`);
            }
        }
    }

    if (typeof dane.strefa !== 'string' || !znanaStrefa(dane.strefa)) {
        bledy.push(`strefa: nieznany identyfikator strefy czasowej (IANA): ${dane.strefa}`);
    }

    if (!dane.obserwator || typeof dane.obserwator !== 'object') {
        bledy.push('brak obserwatora (współrzędne geograficzne + wysokość n.p.m.)');
    } else {
        for (const s of SKLADOWE_OBSERWATORA) {
            if (!Number.isFinite(dane.obserwator[s])) bledy.push(`obserwator.${s}: brak lub nieliczbowe`);
        }
    }

    if (dane.miejsce !== undefined && dane.miejsce !== null) {
        if (typeof dane.miejsce !== 'string' || dane.miejsce.trim() === '') {
            bledy.push('miejsce: jeśli podane, musi być niepustym tekstem');
        }
    }

    if (bledy.length > 0) {
        throw new Error(`Regulator 9b odrzucił dane wejściowe: ${bledy.join('; ')}`);
    }
    return { poprawne: true };
}

module.exports = { walidujDaneWejsciowe };
