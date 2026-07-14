'use strict';

// Jednorazowe utworzenie konta Suwerena (jedyna ścieżka poza bramką zaproszeń).
// Uruchomienie: node narzedzia/bootstrap_suwerena.js
// Odmawia działania, jeśli w magazynie istnieje jakiekolwiek konto.
const { utworzAuth } = require('../modules/auth');

async function main() {
    const auth = utworzAuth();
    const wynik = await auth.bootstrapSuwerena();
    if (wynik.status === 'odmowa') {
        console.error(`[bootstrap] ODMOWA: ${wynik.powod}`);
        process.exit(1);
    }
    console.log(`[bootstrap] Utworzono konto Suwerena: ${wynik.avatar_id}`);
    console.log(`[bootstrap] Token aktywacyjny (jednorazowy, wyświetlany tylko teraz):`);
    console.log(wynik.token_aktywacji);
    console.log('[bootstrap] Aktywacja: POST /api/auth/aktywacja {avatar_id, token, nowe_haslo}');
}

main().catch((blad) => {
    console.error(`[bootstrap] Błąd: ${blad.message}`);
    process.exit(1);
});
