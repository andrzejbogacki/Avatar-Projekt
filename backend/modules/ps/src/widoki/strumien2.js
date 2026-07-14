'use strict';

// Widoki profilu (pozycja 3 — impuls): filtrowanie wg zatwierdzonej mapy
// Strumienia 2. Zwraca kopię — bez współdzielonych referencji z profilem.
const konfig = require('../../config');

const kopia = (w) => JSON.parse(JSON.stringify(w));

function widokProfilu(profil, poziom) {
    if (poziom === 'wlasciciel') {
        return { ...kopia(profil), poziom_obserwatora: 'wlasciciel' };
    }
    const zakres = konfig.dostep.STRUMIEN_2[poziom];
    if (!zakres) throw new Error(`Nieznany poziom Strumienia 2: ${poziom}`);

    const widok = {
        avatar_id: profil.avatar_id,
        poziom_obserwatora: poziom,
        dane_podstawowe: kopia(profil.dane_podstawowe),
    };
    if (zakres.modul_2) widok.modul_2_symulacje = kopia(profil.modul_2_symulacje);
    if (zakres.modul_3_okrojony) {
        widok.modul_3_tokeny = {
            rejestr: profil.modul_3_tokeny.rejestr.map((w) =>
                Object.fromEntries(konfig.dostep.POLA_TOKENU_UCZEN.map((pole) => [pole, w[pole]]))),
            // bez volt_token — szczegóły od poziomu adept (ADR-003)
        };
    }
    if (zakres.modul_3) widok.modul_3_tokeny = kopia(profil.modul_3_tokeny);
    if (zakres.modul_1) widok.modul_1_jakosci_kwantowe = kopia(profil.modul_1_jakosci_kwantowe);
    if (zakres.modul_4) {
        widok.modul_4_protokol_relacji = kopia(profil.modul_4_protokol_relacji);
        widok.certyfikacja_startowa = kopia(profil.certyfikacja_startowa);
    }
    return widok;
}

module.exports = { widokProfilu };
