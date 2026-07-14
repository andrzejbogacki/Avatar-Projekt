'use strict';

// Budowa prekomputowanego indeksu form (ADR-006): raz per zmianę glosariusza.
// Odczyt przy skanowaniu = proste sprawdzenie w mapie — bez NLP w czasie działania.
const { createHash } = require('node:crypto');

const konfig = require('../../config');
const { formyTerminu } = require('../fleksja/regulowy');

function hashZrodla(zawartosc) {
    return createHash('sha256').update(zawartosc, 'utf8').digest('hex');
}

function zbudujIndeks(terminy, zawartoscZrodla, zegar = Date.now) {
    const formy = {};
    const statusy_form = {};
    let maks_slow = 1;

    for (const termin of terminy) {
        const wszystkie = formyTerminu(termin.nazwa);
        statusy_form[termin.nazwa] = wszystkie.length > 1 ? 'przyblizone' : 'podstawowa';
        wszystkie.forEach((forma, i) => {
            maks_slow = Math.max(maks_slow, forma.split(' ').length);
            if (!formy[forma]) formy[forma] = [];
            if (!formy[forma].some((w) => w.termin === termin.nazwa)) {
                formy[forma].push({ termin: termin.nazwa, podstawowa: i === 0 });
            }
        });
    }

    return {
        wersja: konfig.WERSJA_INDEKSU,
        silnik: konfig.SILNIK_BIEZACY,
        zbudowano_ts: new Date(zegar()).toISOString(),
        hash_zrodla: hashZrodla(zawartoscZrodla),
        maks_slow,
        statusy_form,
        formy,
    };
}

module.exports = { zbudujIndeks, hashZrodla };
