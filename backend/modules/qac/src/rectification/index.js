'use strict';

// Quantum Rectification Tool (QRT) — modul.qac.qrt (kandydat).
// TERMIN-KANDYDAT: Quantum Rectification Tool
// Wyznaczanie precyzyjnego czasu narodzenia przy braku dokładnej godziny:
// tranzyty wsteczne × kluczowe wydarzenia → aspekty ścisłe → czas + pewnosc.
const { KolejkaZadan } = require('./kolejka');
const { ocenKandydatow } = require('./dopasowanie');
const { wybierzNajlepszego } = require('./pewnosc');
const { rejestr } = require('../../config');

const kolejka = new KolejkaZadan();

/**
 * Kolejkuje zadanie rektyfikacji (asynchroniczne — nie blokuje interfejsu).
 * Zwraca natychmiast {id, wynik: Promise}; wynik ZAWSZE z polem `pewnosc`.
 */
function zlecRektyfikacje({ zakres, wydarzenia, obserwator, obliczPozycje }) {
    return kolejka.dodaj(async () => {
        const oceny = await ocenKandydatow({ zakres, wydarzenia, obserwator, obliczPozycje });
        const wynik = wybierzNajlepszego(oceny);
        return {
            adres_rejestru: rejestr.ADRES_QRT,
            status_adresu: rejestr.STATUS_ADRESU,
            ...wynik,
        };
    });
}

function statusZadania(id) {
    return kolejka.status(id);
}

module.exports = { zlecRektyfikacje, statusZadania, KolejkaZadan };
