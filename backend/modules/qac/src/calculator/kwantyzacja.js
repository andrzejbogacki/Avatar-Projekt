'use strict';

const { bramki } = require('../../config');

function normalizujKat(deg) {
    const k = deg % bramki.PELNE_KOLO_DEG;
    return k < 0 ? k + bramki.PELNE_KOLO_DEG : k;
}

// Indeks podziału z domknięciem górnej granicy — chroni przed przekroczeniem
// zakresu przez artefakty Float64 na granicy sektora.
function indeksPodzialu(wartosc, szerokosc, licznosc) {
    return Math.min(Math.floor(wartosc / szerokosc), licznosc - 1);
}

/**
 * Kwantyzacja długości ekliptycznej: 64 bramki → 6 linii → kolory → tony → base.
 * // TERMIN-KANDYDAT: 64 Bramki
 */
function kwantyzuj(dlugoscEkliptycznaDeg) {
    if (!Number.isFinite(dlugoscEkliptycznaDeg)) {
        throw new Error(`Nieprawidłowa długość ekliptyczna: ${dlugoscEkliptycznaDeg}`);
    }
    const kat = normalizujKat(dlugoscEkliptycznaDeg - bramki.START_KOLA_DEG);

    const iSektor = indeksPodzialu(kat, bramki.SZEROKOSC_BRAMKI_DEG, bramki.LICZBA_BRAMEK);
    const wBramce = kat - iSektor * bramki.SZEROKOSC_BRAMKI_DEG;

    const szerokoscLinii = bramki.SZEROKOSC_LINII_DEG;
    const iLinia = indeksPodzialu(wBramce, szerokoscLinii, bramki.LINII_NA_BRAMKE);
    const wLinii = wBramce - iLinia * szerokoscLinii;

    const szerokoscKoloru = szerokoscLinii / bramki.KOLOROW_NA_LINIE;
    const iKolor = indeksPodzialu(wLinii, szerokoscKoloru, bramki.KOLOROW_NA_LINIE);
    const wKolorze = wLinii - iKolor * szerokoscKoloru;

    const szerokoscTonu = szerokoscKoloru / bramki.TONOW_NA_KOLOR;
    const iTon = indeksPodzialu(wKolorze, szerokoscTonu, bramki.TONOW_NA_KOLOR);
    const wTonie = wKolorze - iTon * szerokoscTonu;

    const szerokoscBase = szerokoscTonu / bramki.BASE_NA_TON;
    const iBase = indeksPodzialu(wTonie, szerokoscBase, bramki.BASE_NA_TON);

    return {
        bramka: bramki.KOLEJNOSC_BRAMEK[iSektor],
        linia: iLinia + 1,
        kolor: iKolor + 1,
        ton: iTon + 1,
        base: iBase + 1,
        pozycja_w_bramce_deg: wBramce,
    };
}

module.exports = { kwantyzuj, normalizujKat };
