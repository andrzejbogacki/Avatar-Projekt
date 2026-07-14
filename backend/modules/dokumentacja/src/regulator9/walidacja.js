'use strict';

// Regulator 9b — walidacja wpisów manifestu i bramka ścieżek.
// Dokument wchodzi do obiegu WYŁĄCZNIE przez poprawny wpis manifestu;
// ścieżka spoza korzenia repozytorium jest odrzucana (ochrona path traversal).
const path = require('node:path');

const konfig = require('../../config');

function bezpiecznaSciezka(katalogRepo, sciezkaWzgledna) {
    if (typeof sciezkaWzgledna !== 'string' || !sciezkaWzgledna.trim()) {
        throw new Error('Wpis manifestu: wymagana ścieżka względna dokumentu');
    }
    if (path.isAbsolute(sciezkaWzgledna)) {
        throw new Error(`Wpis manifestu: ścieżka musi być względna wobec korzenia repo (${sciezkaWzgledna})`);
    }
    const pelna = path.resolve(katalogRepo, sciezkaWzgledna);
    if (pelna !== katalogRepo && !pelna.startsWith(katalogRepo + path.sep)) {
        throw new Error(`Wpis manifestu: ścieżka wychodzi poza korzeń repozytorium (${sciezkaWzgledna})`);
    }
    return pelna;
}

function walidujWpis(wpis, { katalogRepo = konfig.KATALOG_REPO } = {}) {
    if (!wpis || typeof wpis !== 'object') throw new Error('Wpis manifestu: wymagany obiekt');
    if (!konfig.WZORZEC_ID.test(wpis.id ?? '')) {
        throw new Error(`Wpis manifestu: nieprawidłowy id (${wpis.id})`);
    }
    if (typeof wpis.tytul !== 'string' || !wpis.tytul.trim()
        || wpis.tytul.length > konfig.MAKS_DLUGOSC_TYTULU) {
        throw new Error(`Wpis manifestu ${wpis.id}: nieprawidłowy tytuł`);
    }
    if (!konfig.TYPY_DOKUMENTU.includes(wpis.typ)) {
        throw new Error(`Wpis manifestu ${wpis.id}: nieznany typ (${wpis.typ})`);
    }
    if (!konfig.WZORZEC_STATUSU.test(wpis.status ?? '')) {
        throw new Error(`Wpis manifestu ${wpis.id}: nieznany status (${wpis.status})`);
    }
    if (!Object.hasOwn(konfig.FORMATY, wpis.format)) {
        throw new Error(`Wpis manifestu ${wpis.id}: nieznany format (${wpis.format})`);
    }
    bezpiecznaSciezka(katalogRepo, wpis.sciezka);
    return wpis;
}

module.exports = { walidujWpis, bezpiecznaSciezka };
