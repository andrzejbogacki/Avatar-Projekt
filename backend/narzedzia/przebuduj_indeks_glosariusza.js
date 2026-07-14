'use strict';

// Przebudowa indeksu form fleksyjnych glosariusza (ADR-006).
// Uruchomienie: node narzedzia/przebuduj_indeks_glosariusza.js
// Silnik bieżący: regułowy (formy `przyblizone`); po dołączeniu Morfeusz2
// podmiana silnika w module — to narzędzie pozostaje bez zmian.
const { utworzGlosariusz } = require('../modules/glosariusz');

async function main() {
    const glosariusz = utworzGlosariusz();
    const indeks = await glosariusz.przebudujIndeks();
    console.log(`[indeks] silnik: ${indeks.silnik}`);
    console.log(`[indeks] terminów: ${Object.keys(indeks.statusy_form).length}, form: ${Object.keys(indeks.formy).length}`);
    console.log(`[indeks] hash źródła: ${indeks.hash_zrodla.slice(0, 16)}…`);
    console.log(`[indeks] zapisano: ${new Date(Date.parse(indeks.zbudowano_ts)).toISOString()}`);
}

main().catch((blad) => {
    console.error(`[indeks] Błąd: ${blad.message}`);
    process.exit(1);
});
