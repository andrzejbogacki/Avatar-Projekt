'use strict';

// Dostęp (pozycja 9a — rezonator): wyznaczanie poziomu obserwatora (Strumień 2)
// i stanu osi (Strumień 1) — punkt mediacji między żądaniem a danymi profilu.
const konfig = require('../../config');

// obserwator: avatar_id z sesji Auth albo null (gość po bramce wstępnej).
function poziomObserwatora(profil, obserwator) {
    if (obserwator && obserwator === profil.avatar_id) {
        return { rola: 'wlasciciel', poziom: 'wlasciciel' };
    }
    const przypisany = obserwator
        ? profil.modul_4_protokol_relacji.strumien_2_dostep_do_wiedzy.poziomy_obserwatorow[obserwator]
        : null;
    return { rola: 'obserwator', poziom: przypisany ?? konfig.dostep.HIERARCHIA_POZIOMOW[0] };
}

function stanOsiS1(profil, obserwator, os) {
    const s1 = profil.modul_4_protokol_relacji.strumien_1_dostep_relacyjny;
    const nadpisanie = s1.nadpisania.find((n) => n.obserwator === obserwator && n.os === os);
    if (nadpisanie) return nadpisanie.stan;
    const { poziom } = poziomObserwatora(profil, obserwator);
    return s1.macierz_domyslna[os][poziom] ?? konfig.dostep.STANY_DOSTEPU[0];
}

module.exports = { poziomObserwatora, stanOsiS1 };
