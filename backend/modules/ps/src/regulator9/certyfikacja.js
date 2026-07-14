'use strict';

// Przyjęcie pierwszego aktu certyfikacji z Auth (pozycja 9b) — punkt wejścia
// hooka przy zatwierdzonym zaproszeniu. Wartość typu/poziomu certyfikatu:
// NIEROZSTRZYGNIĘTA (decyzja Suwerena odroczona) — zapis wyłącznie stanu
// jawnego `certyfikacja_oczekujaca`, nigdy wartości domyślnej.
function utworzPrzyjecieCertyfikacji({ magazyn, zegar = Date.now }) {
    return async function przyjmijAktCertyfikacji({ avatar_id, zapraszajacy, imie }) {
        let profil = await magazyn.odczytajProfil(avatar_id);
        if (!profil) {
            profil = await magazyn.utworzProfil({ avatar_id, imie: imie ?? avatar_id });
        }
        if (profil.certyfikacja_startowa.zapraszajacy !== null) {
            return { status: 'odmowa', powod: 'Akt certyfikacji startowej już zapisany' };
        }
        const wynik = await magazyn.edytuj(avatar_id, (p) => {
            p.certyfikacja_startowa = {
                status: 'certyfikacja_oczekujaca',
                zapraszajacy,
                typ: null,
                poziom: null,
                ts: new Date(zegar()).toISOString(),
            };
            return null;
        });
        if (wynik.status !== 'zapisano') return wynik;
        return { status: 'zapisano_oczekujaca', avatar_id };
    };
}

module.exports = { utworzPrzyjecieCertyfikacji };
