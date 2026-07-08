'use strict';

const { rejestr } = require('../../config');

// 9b — REGULATOR: walidacja kompletności danych wejściowych.
// Regulator stoi nad obiegiem — nie uczestniczy w obliczeniu, kontroluje je.

const SKLADOWE_CZASU = ['rok', 'miesiac', 'dzien', 'godzina', 'minuta', 'sekunda'];
const SKLADOWE_OBSERWATORA = ['dlugosc_geo', 'szerokosc_geo', 'wysokosc_npm_m'];

/**
 * Waliduje dane wejściowe profilu. Zwraca listę WSZYSTKICH braków naraz;
 * niekompletne dane = odrzucenie (wyjątek z pełną listą).
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

    if (!dane.czas_utc || typeof dane.czas_utc !== 'object') {
        bledy.push('brak czas_utc');
    } else {
        for (const s of SKLADOWE_CZASU) {
            if (!Number.isFinite(dane.czas_utc[s])) bledy.push(`czas_utc.${s}: brak lub nieliczbowe`);
        }
    }

    if (!dane.obserwator || typeof dane.obserwator !== 'object') {
        bledy.push('brak obserwatora (współrzędne geograficzne + wysokość n.p.m.)');
    } else {
        for (const s of SKLADOWE_OBSERWATORA) {
            if (!Number.isFinite(dane.obserwator[s])) bledy.push(`obserwator.${s}: brak lub nieliczbowe`);
        }
    }

    if (bledy.length > 0) {
        throw new Error(`Regulator 9b odrzucił dane wejściowe: ${bledy.join('; ')}`);
    }
    return { poprawne: true };
}

module.exports = { walidujDaneWejsciowe };
