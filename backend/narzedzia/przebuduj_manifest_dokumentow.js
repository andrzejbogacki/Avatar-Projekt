'use strict';

// Przebudowa manifestu dokumentów (ADR-007).
// Uruchomienie: node narzedzia/przebuduj_manifest_dokumentow.js
// Metadane wpisów (id, tytuł, typ, status, ścieżka) utrzymuje Suweren edycją
// docs/dokumenty/manifest.json; to narzędzie wylicza wyłącznie hash i rozmiar.
const { utworzDokumentacje } = require('../modules/dokumentacja');

async function main() {
    const dokumentacja = utworzDokumentacje();
    const manifest = await dokumentacja.przebudujManifest();
    console.log(`[manifest] dokumentów: ${manifest.dokumenty.length}`);
    for (const wpis of manifest.dokumenty) {
        console.log(`[manifest] ${wpis.id} (${wpis.typ}, ${wpis.status}): `
            + `${wpis.bajty} B, hash ${wpis.hash_zrodla.slice(0, 16)}…`);
    }
    console.log(`[manifest] zapisano: ${manifest.zbudowano_ts}`);
}

main().catch((blad) => {
    console.error(`[manifest] Błąd: ${blad.message}`);
    process.exit(1);
});
