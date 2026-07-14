'use strict';

// Walidacja przez PS (pozycja 9b — regulator): warunek każdej transakcji.
// Token dopuszczony do wymiany z Avatarem WYŁĄCZNIE przy akceptacji
// pełnej lub warunkowej w jego PS Module 3. Zależność przez kontrakt PS.
const konfig = require('../../config');

function utworzWalidacjePS({ ps }) {
    async function akceptacjaTokenu(avatar_id, token_id) {
        const profil = await ps.magazyn_profili.odczytajProfil(avatar_id);
        if (!profil) {
            return { akceptowany: false, powod: `${avatar_id}: brak profilu PS` };
        }
        const wpis = profil.modul_3_tokeny.rejestr.find((w) => w.token === token_id);
        if (!wpis || !konfig.wymiana.STATUSY_AKCEPTACJI_PS.includes(wpis.akceptacja)) {
            return {
                akceptowany: false,
                powod: `${avatar_id}: token ${token_id} bez akceptacji w PS Module 3 (wymagana: ${konfig.wymiana.STATUSY_AKCEPTACJI_PS.join(' lub ')})`,
            };
        }
        return { akceptowany: true };
    }

    // Obie strony muszą akceptować OBA tokeny transakcji.
    async function sprawdzTransakcje({ strony, tokeny }) {
        for (const avatar_id of strony) {
            for (const token_id of tokeny) {
                const wynik = await akceptacjaTokenu(avatar_id, token_id);
                if (!wynik.akceptowany) return wynik;
            }
        }
        return { akceptowany: true };
    }

    return { akceptacjaTokenu, sprawdzTransakcje };
}

module.exports = { utworzWalidacjePS };
