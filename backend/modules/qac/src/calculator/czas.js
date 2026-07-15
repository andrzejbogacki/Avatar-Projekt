'use strict';

const sweph = require('sweph');
const { astronomia } = require('../../config');

/**
 * Konwersja czasu UTC na skale czasowe efemerydalne.
 * jd_et to TT (Terrestrial Time); różnica TDB−TT (człony okresowe ≤ 1,7 ms)
 * jest uwzględniana wewnętrznie przez libswe przy odczycie efemeryd JPL.
 */
function utcNaSkaleCzasowe({ rok, miesiac, dzien, godzina, minuta, sekunda }) {
    for (const [nazwa, wartosc] of Object.entries({ rok, miesiac, dzien, godzina, minuta, sekunda })) {
        if (!Number.isFinite(wartosc)) {
            throw new Error(`Nieprawidłowa składowa czasu UTC: ${nazwa}=${wartosc}`);
        }
    }
    const wynik = sweph.utc_to_jd(
        rok, miesiac, dzien, godzina, minuta, sekunda,
        sweph.constants.SE_GREG_CAL
    );
    if (wynik.flag !== sweph.constants.OK) {
        throw new Error(`Konwersja UTC→JD nieudana: ${wynik.error}`);
    }
    const [jd_et, jd_ut] = wynik.data;
    const delta_t_dni = sweph.deltat(jd_ut);
    return {
        jd_et,
        jd_ut,
        delta_t_s: delta_t_dni * astronomia.SEKUND_NA_DOBE,
        skala: 'TT (≈TDB; różnica okresowa obsługiwana przez libswe)',
    };
}

const DOBA_MS = 86_400_000;
const SKLADOWE_CZASU = ['rok', 'miesiac', 'dzien', 'godzina', 'minuta', 'sekunda'];

/** Dopuszczalne zakresy [min, max] składowych czasu ściennego; 'rok' bez ograniczenia. */
const ZAKRES_SKLADOWEJ = {
    miesiac: [1, 12],
    dzien: [1, 31],
    godzina: [0, 23],
    minuta: [0, 59],
    sekunda: [0, 59],
};

/**
 * Czy identyfikator strefy jest znany silnikowi Intl (akceptuje też UTC i aliasy).
 * `Intl.DateTimeFormat` z `timeZone: undefined` po cichu używa strefy systemowej hosta
 * zamiast rzucić — dlatego wartość niebędącą niepustym stringiem odrzucamy jawnie,
 * zanim w ogóle trafi do Intl.
 */
function znanaStrefa(strefa) {
    if (typeof strefa !== 'string' || strefa === '') {
        return false;
    }
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: strefa });
        return true;
    } catch {
        return false;
    }
}

/** Przesunięcie strefy [min] w danym momencie, odczytane z formatu longOffset (np. "GMT+02:00", "GMT+00:00"). */
function offsetMinut(strefa, ms) {
    const czesc = new Intl.DateTimeFormat('en-US', { timeZone: strefa, timeZoneName: 'longOffset' })
        .formatToParts(new Date(ms))
        .find((p) => p.type === 'timeZoneName').value;
    const m = czesc.match(/^GMT([+-])(\d{2}):(\d{2})$/);
    if (!m) {
        throw new Error(`Nierozpoznany format przesunięcia strefy zwrócony przez Intl: ${czesc}`);
    }
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Rozbicie momentu na składowe czasu ściennego w danej strefie. */
function skladoweWStrefie(strefa, ms) {
    const cz = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: strefa,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        })
            .formatToParts(new Date(ms))
            .filter((p) => p.type !== 'literal')
            .map((p) => [p.type, Number(p.value)])
    );
    return {
        rok: cz.year,
        miesiac: cz.month,
        dzien: cz.day,
        godzina: cz.hour === 24 ? 0 : cz.hour,
        minuta: cz.minute,
        sekunda: cz.second,
    };
}

/**
 * Konwersja czasu lokalnego (strefa IANA) na UTC.
 *
 * Przesunięcie strefy zależy od momentu, a moment od przesunięcia — kandydatów
 * wyznaczamy z przesunięć obowiązujących po obu stronach doby, po czym każdego
 * weryfikujemy zwrotnie. Liczba kandydatów przechodzących weryfikację rozstrzyga:
 * 0 = godzina nieistniejąca (przeskok wiosenny), 2 = dwuznaczna (powrót jesienny).
 * Oba przypadki odrzucamy jawnie — zakaz cichych wartości domyślnych.
 */
function lokalnyNaUtc(czas_lokalny, strefa) {
    for (const s of SKLADOWE_CZASU) {
        const wartosc = czas_lokalny?.[s];
        if (!Number.isFinite(wartosc)) {
            throw new Error(`Nieprawidłowa składowa czasu lokalnego: ${s}=${wartosc}`);
        }
        if (!Number.isInteger(wartosc)) {
            throw new Error(`Składowa czasu lokalnego musi być liczbą całkowitą: ${s}=${wartosc}`);
        }
        const zakres = ZAKRES_SKLADOWEJ[s];
        if (zakres && (wartosc < zakres[0] || wartosc > zakres[1])) {
            throw new Error(
                `Składowa czasu lokalnego poza zakresem: ${s}=${wartosc} (dozwolone ${zakres[0]}-${zakres[1]})`
            );
        }
    }
    if (!znanaStrefa(strefa)) {
        throw new Error(`Nieznana strefa czasowa (identyfikator IANA): ${strefa}`);
    }

    const { rok, miesiac, dzien, godzina, minuta, sekunda } = czas_lokalny;
    const t0 = Date.UTC(rok, miesiac - 1, dzien, godzina, minuta, sekunda);
    const kandydaci = new Set([
        t0 - offsetMinut(strefa, t0 - DOBA_MS) * 60_000,
        t0 - offsetMinut(strefa, t0 + DOBA_MS) * 60_000,
    ]);
    const poprawne = [...kandydaci].filter((ms) => {
        const sc = skladoweWStrefie(strefa, ms);
        return SKLADOWE_CZASU.every((s) => sc[s] === czas_lokalny[s]);
    });

    const opis = `${rok}-${miesiac}-${dzien} ${godzina}:${String(minuta).padStart(2, '0')}`;
    if (poprawne.length === 0) {
        throw new Error(
            `Czas lokalny ${opis} nie istnieje w strefie ${strefa} — przeskok na czas letni.`
        );
    }
    if (poprawne.length > 1) {
        const offsety = poprawne.map((ms) => offsetMinut(strefa, ms)).sort((a, b) => a - b);
        throw new Error(
            `Czas lokalny ${opis} jest dwuznaczny w strefie ${strefa} — powrót na czas zimowy; ` +
            `możliwe przesunięcia [min]: ${offsety.join(', ')}. Wymagane rozstrzygnięcie.`
        );
    }

    const ms = poprawne[0];
    const d = new Date(ms);
    return {
        czas_utc: {
            rok: d.getUTCFullYear(),
            miesiac: d.getUTCMonth() + 1,
            dzien: d.getUTCDate(),
            godzina: d.getUTCHours(),
            minuta: d.getUTCMinutes(),
            sekunda: d.getUTCSeconds(),
        },
        offset_minuty: offsetMinut(strefa, ms),
    };
}

module.exports = { utcNaSkaleCzasowe, lokalnyNaUtc, znanaStrefa };
