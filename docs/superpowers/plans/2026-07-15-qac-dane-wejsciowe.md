# QAC — dane wejściowe w profilu, czas lokalny jako źródło prawdy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil QAC przechowuje dane wejściowe (czas lokalny, strefa, obserwator, miejsce), a czas lokalny staje się źródłem prawdy — UTC wylicza moduł. Dodatkowo narzędzia deweloperskie: lista profili i usuwanie przez kosz.

**Architecture:** Czas lokalny + strefa IANA wchodzą przez `generujProfil`, konwersja `lokalnyNaUtc` (bez nowych zależności — `Intl` zna pełną historię reguł DST) daje `czas_utc` i `offset_minuty`, kalkulator dalej liczy z UTC (jego kontrakt bez zmian). Profil zyskuje sekcję `dane_wejsciowe` (co wprowadzono) obok `dane_surowe` (co wyliczono). Narzędzia deweloperskie żyją za flagą `QAC_DEV_TOOLS` i sięgają do profili wyłącznie przez kontrakty modułu.

**Tech Stack:** Node.js ≥20 (CommonJS), `node:test` + `node:assert/strict`, `sweph`, `Intl` (wbudowane).

**Spec:** `docs/superpowers/specs/2026-07-15-qac-dane-wejsciowe-design.md`

## Global Constraints

- **Język:** kod, komentarze, komunikaty błędów i nazwy — po polsku, jak reszta modułu. Identyfikatory bez znaków diakrytycznych.
- **Styl:** CommonJS, `'use strict';` na początku każdego pliku, wcięcie 4 spacje, średniki.
- **Testy:** `node:test` + `node:assert/strict`; uruchamianie `npm test` z katalogu `backend/`.
- **Zakaz cichych wartości domyślnych:** brak/niejednoznaczność danych = jawne odrzucenie z komunikatem, nigdy zgadywanie.
- **Wzorzec Brahmandy:** `dev_server.js` komunikuje się z modułem QAC wyłącznie przez `modules/qac/index.js`; nie sięga do `src/`, nie czyta plików profili sam.
- **Kanon pozycji 9:** każda modyfikacja katalogu `profiles/` (zapis i usunięcie) przechodzi przez bramkę w `src/regulator9/bramka_zapisu.js`.
- **Wersja schematu profilu:** `1.1.0` (z `1.0.0`).
- **Brak zgodności wstecznej:** `czas_utc` znika z wejścia `generujProfil`. Profile 1.0.0 nie są migrowane.
- **Bez nowych zależności** — `package.json` pozostaje przy `redis` i `sweph`.
- **Katalog roboczy** dla wszystkich komend: `backend/`.

---

### Task 1: Konwersja czasu lokalnego na UTC

**Files:**
- Modify: `backend/modules/qac/src/calculator/czas.js`
- Modify: `backend/modules/qac/src/calculator/index.js:76-82` (eksport)
- Test: `backend/modules/qac/test/calculator.test.js` (dopisanie testów na końcu)

**Interfaces:**
- Consumes: nic (pierwszy task)
- Produces:
  - `lokalnyNaUtc(czas_lokalny, strefa)` → `{ czas_utc: {rok, miesiac, dzien, godzina, minuta, sekunda}, offset_minuty: number }`; rzuca `Error` dla czasu nieistniejącego, dwuznacznego, nieznanej strefy i niepełnych składowych.
  - `znanaStrefa(strefa)` → `boolean`
  - oba eksportowane z `src/calculator/czas.js`; `lokalnyNaUtc` re-eksportowany z `src/calculator/index.js`.

- [ ] **Step 1: Write the failing tests**

Dopisz na końcu `backend/modules/qac/test/calculator.test.js`:

```js
// --- Konwersja czasu lokalnego na UTC (strefy IANA, reguły DST) ---

const { lokalnyNaUtc, znanaStrefa } = require('../src/calculator/czas');

test('czas lokalny→UTC: czas zimowy w Warszawie (CET, +1 h)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 1, minuta: 10, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 10, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 60);
});

test('czas lokalny→UTC: czas letni w Warszawie (CEST, +2 h)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1990, miesiac: 6, dzien: 15, godzina: 6, minuta: 30, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 120);
});

test('czas lokalny→UTC: historyczna reguła sprzed reformy (1977)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1977, miesiac: 1, dzien: 11, godzina: 14, minuta: 12, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1977, miesiac: 1, dzien: 11, godzina: 13, minuta: 12, sekunda: 0,
    });
    assert.equal(wynik.offset_minuty, 60);
});

test('czas lokalny→UTC: przejście przez północ cofa datę', () => {
    const wynik = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 30, sekunda: 0 },
        'Europe/Warsaw'
    );
    assert.deepEqual(wynik.czas_utc, {
        rok: 1982, miesiac: 11, dzien: 14, godzina: 23, minuta: 30, sekunda: 0,
    });
});

test('czas lokalny→UTC: godzina nieistniejąca (przeskok na czas letni) odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 2026, miesiac: 3, dzien: 29, godzina: 2, minuta: 30, sekunda: 0 },
            'Europe/Warsaw'
        ),
        /nie istnieje/
    );
});

test('czas lokalny→UTC: godzina dwuznaczna (powrót na czas zimowy) odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 2026, miesiac: 10, dzien: 25, godzina: 2, minuta: 30, sekunda: 0 },
            'Europe/Warsaw'
        ),
        /dwuznaczny/
    );
});

test('czas lokalny→UTC: nieznana strefa odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc(
            { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
            'Europe/Gdansk'
        ),
        /Nieznana strefa/
    );
});

test('czas lokalny→UTC: brakująca składowa odrzucona', () => {
    assert.throws(
        () => lokalnyNaUtc({ rok: 1990, miesiac: 6, dzien: 15, godzina: 8 }, 'Europe/Warsaw'),
        /składowa czasu lokalnego/
    );
});

test('czas lokalny→UTC: strefa UTC jest akceptowana (brak w supportedValuesOf)', () => {
    const wynik = lokalnyNaUtc(
        { rok: 2000, miesiac: 1, dzien: 1, godzina: 12, minuta: 0, sekunda: 0 },
        'UTC'
    );
    assert.equal(wynik.offset_minuty, 0);
    assert.deepEqual(wynik.czas_utc, {
        rok: 2000, miesiac: 1, dzien: 1, godzina: 12, minuta: 0, sekunda: 0,
    });
});

test('czas: round-trip lokalny→UTC→skale czasowe zgodny z bezpośrednim UTC', () => {
    const { czas_utc } = lokalnyNaUtc(
        { rok: 1982, miesiac: 11, dzien: 15, godzina: 1, minuta: 10, sekunda: 0 },
        'Europe/Warsaw'
    );
    const przez = utcNaSkaleCzasowe(czas_utc);
    const wprost = utcNaSkaleCzasowe({
        rok: 1982, miesiac: 11, dzien: 15, godzina: 0, minuta: 10, sekunda: 0,
    });
    assert.equal(przez.jd_ut, wprost.jd_ut);
});

test('znanaStrefa: rozpoznaje poprawne i odrzuca błędne identyfikatory', () => {
    assert.equal(znanaStrefa('Europe/Warsaw'), true);
    assert.equal(znanaStrefa('UTC'), true);
    assert.equal(znanaStrefa('Europe/Gdansk'), false);
    assert.equal(znanaStrefa(''), false);
});
```

**Uwaga:** `utcNaSkaleCzasowe` jest już importowane w tym pliku testowym. Sprawdź górę pliku — jeśli nie, dopisz do istniejącego `require`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx node --test modules/qac/test/calculator.test.js`
Expected: FAIL — `lokalnyNaUtc is not a function` (funkcja nie istnieje).

- [ ] **Step 3: Implement the conversion**

W `backend/modules/qac/src/calculator/czas.js` — dopisz **przed** `module.exports`:

```js
const DOBA_MS = 86_400_000;
const SKLADOWE_CZASU = ['rok', 'miesiac', 'dzien', 'godzina', 'minuta', 'sekunda'];

/** Czy identyfikator strefy jest znany silnikowi Intl (akceptuje też UTC i aliasy). */
function znanaStrefa(strefa) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: strefa });
        return true;
    } catch {
        return false;
    }
}

/** Przesunięcie strefy [min] w danym momencie; 'GMT' bez cyfr = strefa zerowa. */
function offsetMinut(strefa, ms) {
    const czesc = new Intl.DateTimeFormat('en-US', { timeZone: strefa, timeZoneName: 'longOffset' })
        .formatToParts(new Date(ms))
        .find((p) => p.type === 'timeZoneName').value;
    const m = czesc.match(/^GMT([+-])(\d{2}):(\d{2})$/);
    if (!m) return 0;
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
        if (!Number.isFinite(czas_lokalny?.[s])) {
            throw new Error(`Nieprawidłowa składowa czasu lokalnego: ${s}=${czas_lokalny?.[s]}`);
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
```

Zmień `module.exports` w tym pliku na:

```js
module.exports = { utcNaSkaleCzasowe, lokalnyNaUtc, znanaStrefa };
```

W `backend/modules/qac/src/calculator/index.js` dopisz import i eksport. Górny `require` czasu zmień na:

```js
const { utcNaSkaleCzasowe, lokalnyNaUtc } = require('./czas');
```

a `module.exports` (linie 76-82) na:

```js
module.exports = {
    obliczDaneSurowe,
    utcNaSkaleCzasowe,
    lokalnyNaUtc,
    pozycjeTopocentryczne,
    kwantyzuj,
    momentFormyNieswiadomej,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx node --test modules/qac/test/calculator.test.js`
Expected: PASS — wszystkie testy zielone, w tym istniejące.

- [ ] **Step 5: Commit**

```bash
git add backend/modules/qac/src/calculator/czas.js backend/modules/qac/src/calculator/index.js backend/modules/qac/test/calculator.test.js
git commit -m "feat(qac): konwersja czasu lokalnego (strefa IANA) na UTC z odrzuceniem godzin nieistniejących i dwuznacznych"
```

---

### Task 2: Regulator 9b — walidacja czasu lokalnego, strefy i miejsca

**Files:**
- Modify: `backend/modules/qac/src/regulator9/walidacja_wejscia.js`
- Test: `backend/modules/qac/test/profil.test.js` (dopisanie testów walidacji)

**Interfaces:**
- Consumes: `znanaStrefa(strefa)` z `src/calculator/czas.js` (Task 1)
- Produces: `walidujDaneWejsciowe(dane)` przyjmuje `{avatar_id, czas_lokalny, strefa, obserwator, miejsce?}`; rzuca `Error` z listą **wszystkich** braków naraz.

- [ ] **Step 1: Write the failing tests**

Dopisz na końcu `backend/modules/qac/test/profil.test.js`:

```js
// --- Regulator 9b: walidacja wejścia po przejściu na czas lokalny ---

const wejscieMinimalne = () => ({
    avatar_id: 'jan_kowalski',
    czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
    strefa: 'Europe/Warsaw',
    obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
});

test('regulator 9b: poprawne wejście z czasem lokalnym przechodzi', () => {
    assert.deepEqual(qac.regulator9.walidujDaneWejsciowe(wejscieMinimalne()), { poprawne: true });
});

test('regulator 9b: miejsce jest opcjonalne', () => {
    const dane = { ...wejscieMinimalne(), miejsce: 'Warszawa, Polska' };
    assert.deepEqual(qac.regulator9.walidujDaneWejsciowe(dane), { poprawne: true });
});

test('regulator 9b: brak strefy odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.strefa;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /strefa/);
});

test('regulator 9b: nieznana strefa odrzucona — bez cichego Europe/Warsaw', () => {
    const dane = { ...wejscieMinimalne(), strefa: 'Europe/Gdansk' };
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /Europe\/Gdansk/);
});

test('regulator 9b: brak czas_lokalny odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.czas_lokalny;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /czas_lokalny/);
});

test('regulator 9b: niepełny czas_lokalny odrzucony', () => {
    const dane = wejscieMinimalne();
    delete dane.czas_lokalny.minuta;
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /czas_lokalny\.minuta/);
});

test('regulator 9b: puste miejsce odrzucone', () => {
    const dane = { ...wejscieMinimalne(), miejsce: '   ' };
    assert.throws(() => qac.regulator9.walidujDaneWejsciowe(dane), /miejsce/);
});

test('regulator 9b: zwraca wszystkie braki naraz', () => {
    assert.throws(
        () => qac.regulator9.walidujDaneWejsciowe({ avatar_id: 'zle id!' }),
        (blad) =>
            /avatar_id/.test(blad.message) &&
            /czas_lokalny/.test(blad.message) &&
            /strefa/.test(blad.message) &&
            /obserwator/.test(blad.message)
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx node --test modules/qac/test/profil.test.js`
Expected: FAIL — walidacja wymaga `czas_utc`, więc poprawne wejście z `czas_lokalny` jest odrzucane.

- [ ] **Step 3: Implement the validation**

Zastąp zawartość `backend/modules/qac/src/regulator9/walidacja_wejscia.js`:

```js
'use strict';

const { rejestr } = require('../../config');
const { znanaStrefa } = require('../calculator/czas');

// 9b — REGULATOR: walidacja kompletności danych wejściowych.
// Regulator stoi nad obiegiem — nie uczestniczy w obliczeniu, kontroluje je.

const SKLADOWE_CZASU = ['rok', 'miesiac', 'dzien', 'godzina', 'minuta', 'sekunda'];
const SKLADOWE_OBSERWATORA = ['dlugosc_geo', 'szerokosc_geo', 'wysokosc_npm_m'];

/**
 * Waliduje dane wejściowe profilu. Zwraca listę WSZYSTKICH braków naraz;
 * niekompletne dane = odrzucenie (wyjątek z pełną listą).
 *
 * Źródłem prawdy jest czas lokalny miejsca urodzenia wraz ze strefą — UTC
 * wylicza kalkulator (ADR-009).
 */
function walidujDaneWejsciowe(dane) {
    const bledy = [];
    if (!dane || typeof dane !== 'object') {
        throw new Error('Dane wejściowe: brak obiektu danych');
    }

    if (typeof dane.avatar_id !== 'string' || !rejestr.WZORZEC_AVATAR_ID.test(dane.avatar_id)) {
        bledy.push(
            `avatar_id niezgodny z wzorcem Protokołu Suwerenności (${rejestr.WZORZEC_AVATAR_ID}): ${dane.avatar_id}`
        );
    }

    if (!dane.czas_lokalny || typeof dane.czas_lokalny !== 'object') {
        bledy.push('brak czas_lokalny (czas ścienny miejsca urodzenia)');
    } else {
        for (const s of SKLADOWE_CZASU) {
            if (!Number.isFinite(dane.czas_lokalny[s])) {
                bledy.push(`czas_lokalny.${s}: brak lub nieliczbowe`);
            }
        }
    }

    if (typeof dane.strefa !== 'string' || !znanaStrefa(dane.strefa)) {
        bledy.push(`strefa: nieznany identyfikator strefy czasowej (IANA): ${dane.strefa}`);
    }

    if (!dane.obserwator || typeof dane.obserwator !== 'object') {
        bledy.push('brak obserwatora (współrzędne geograficzne + wysokość n.p.m.)');
    } else {
        for (const s of SKLADOWE_OBSERWATORA) {
            if (!Number.isFinite(dane.obserwator[s])) bledy.push(`obserwator.${s}: brak lub nieliczbowe`);
        }
    }

    if (dane.miejsce !== undefined && dane.miejsce !== null) {
        if (typeof dane.miejsce !== 'string' || dane.miejsce.trim() === '') {
            bledy.push('miejsce: jeśli podane, musi być niepustym tekstem');
        }
    }

    if (bledy.length > 0) {
        throw new Error(`Regulator 9b odrzucił dane wejściowe: ${bledy.join('; ')}`);
    }
    return { poprawne: true };
}

module.exports = { walidujDaneWejsciowe };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx node --test modules/qac/test/profil.test.js`
Expected: nowe testy walidacji PASS. Testy pełnego przebiegu (`generujProfil`) nadal FAIL — naprawia je Task 3. To oczekiwane.

- [ ] **Step 5: Commit**

```bash
git add backend/modules/qac/src/regulator9/walidacja_wejscia.js backend/modules/qac/test/profil.test.js
git commit -m "feat(qac): regulator 9b waliduje czas lokalny i strefę IANA zamiast czasu UTC"
```

---

### Task 3: Profil 1.1.0 — sekcja dane_wejsciowe

**Files:**
- Modify: `backend/modules/qac/index.js:28-100` (`generujProfil`)
- Modify: `backend/modules/qac/config/rejestr.js:9` (wersja schematu)
- Modify: `backend/modules/qac/src/regulator9/bramka_zapisu.js:11` (wymagane sekcje)
- Modify: `backend/modules/qac/profiles/schema/avatar_profile.schema.json`
- Create: `pakiet_startowy_claude_code/docs/adr/ADR-009-dane-wejsciowe-czas-lokalny.md`
- Test: `backend/modules/qac/test/profil.test.js` (aktualizacja + reprodukowalność)

**Interfaces:**
- Consumes: `lokalnyNaUtc` (Task 1), `walidujDaneWejsciowe` (Task 2)
- Produces: profil z sekcją `dane_wejsciowe` = `{avatar_id, czas_lokalny, strefa, obserwator, miejsce}` (`miejsce` = `null` gdy nie podano) oraz `dane_surowe.czas` wzbogacone o `czas_utc` i `offset_minuty`.

- [ ] **Step 1: Update existing tests and add reproducibility test**

W `backend/modules/qac/test/profil.test.js` zastąp stałą `daneWejsciowe` (linie ~51-55):

```js
const daneWejsciowe = {
    avatar_id: 'andrzej_bogacki',
    czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
    strefa: 'Europe/Warsaw',
    obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
    miejsce: 'Warszawa, Polska',
};
```

Zmień asercję wersji schematu (linia ~78) z `'1.0.0'` na `'1.1.0'`.

Dopisz na końcu pliku:

```js
test('profil 1.1.0: sekcja dane_wejsciowe odwzorowuje wejście, UTC wyliczony ze strefy', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const { profil } = await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });

    assert.deepEqual(profil.dane_wejsciowe, {
        avatar_id: 'andrzej_bogacki',
        czas_lokalny: { rok: 1990, miesiac: 6, dzien: 15, godzina: 8, minuta: 30, sekunda: 0 },
        strefa: 'Europe/Warsaw',
        obserwator: { dlugosc_geo: 21.0122, szerokosc_geo: 52.2297, wysokosc_npm_m: 113 },
        miejsce: 'Warszawa, Polska',
    });
    // 15 czerwca = czas letni (CEST, +2 h)
    assert.equal(profil.dane_surowe.czas.offset_minuty, 120);
    assert.deepEqual(profil.dane_surowe.czas.czas_utc, {
        rok: 1990, miesiac: 6, dzien: 15, godzina: 6, minuta: 30, sekunda: 0,
    });
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: brak miejsca zapisany jako null, nie pominięty', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const dane = { ...daneWejsciowe };
    delete dane.miejsce;
    const { profil } = await qac.generujProfil(dane, {
        silnik: silnikSyntetyczny,
        katalogProfili: katalog,
    });
    assert.equal(profil.dane_wejsciowe.miejsce, null);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: reprodukowalność — dane_wejsciowe dają identyczny profil', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-we-'));
    const pierwszy = (await qac.generujProfil(daneWejsciowe, {
        silnik: silnikSyntetyczny, katalogProfili: katalog,
    })).profil;

    const drugi = (await qac.generujProfil(pierwszy.dane_wejsciowe, {
        silnik: silnikSyntetyczny, katalogProfili: katalog,
    })).profil;

    // Pomijamy znacznik generacji — zmienia się z definicji.
    const bezZnacznika = (p) => {
        const kopia = JSON.parse(JSON.stringify(p));
        delete kopia.naglowek.wygenerowano;
        return kopia;
    };
    assert.deepEqual(bezZnacznika(drugi), bezZnacznika(pierwszy));
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('profil 1.1.0: bramka 9b odrzuca profil bez sekcji dane_wejsciowe', () => {
    const profil = {
        naglowek: {
            avatar_id: 'jan_kowalski', adres_rejestru: 'modul.qac',
            wersja_schematu: '1.1.0', status: 'piaskownica', wygenerowano: '2026-07-15T00:00:00.000Z',
        },
        dane_surowe: {}, aktywacje: {},
        mapa_369: { stemple_srodowiskowe: {} }, macierz_relacyjna: {},
    };
    assert.throws(() => qac.regulator9.walidujProfil(profil), /dane_wejsciowe/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx node --test modules/qac/test/profil.test.js`
Expected: FAIL — `profil.dane_wejsciowe` jest `undefined`, wersja schematu `1.0.0`.

- [ ] **Step 3: Implement**

W `backend/modules/qac/config/rejestr.js` linia 9:

```js
const WERSJA_SCHEMATU_PROFILU = '1.1.0';
```

W `backend/modules/qac/src/regulator9/bramka_zapisu.js` linia 11:

```js
const WYMAGANE_SEKCJE = ['naglowek', 'dane_wejsciowe', 'dane_surowe', 'aktywacje', 'mapa_369', 'macierz_relacyjna'];
```

W `backend/modules/qac/index.js` dopisz import pod istniejącymi (~linia 13):

```js
const { lokalnyNaUtc } = require('./src/calculator/czas');
```

Konwersja czasu nie zależy od efemeryd, więc — inaczej niż `silnik` — nie jest wstrzykiwana.

W `generujProfil` zastąp fragment od `regulator9.walidujDaneWejsciowe` do `obliczDaneSurowe`:

```js
    regulator9.walidujDaneWejsciowe(daneWejsciowe);

    // Źródłem prawdy jest czas lokalny ze strefą; UTC to wynik (ADR-009).
    const { czas_utc, offset_minuty } = lokalnyNaUtc(daneWejsciowe.czas_lokalny, daneWejsciowe.strefa);

    const daneSurowe = silnik.obliczDaneSurowe({
        czas_utc,
        obserwator: daneWejsciowe.obserwator,
    });
```

W obiekcie `profil` dodaj sekcję `dane_wejsciowe` **między** `naglowek` a `dane_surowe`, i wzbogać `czas`:

```js
        dane_wejsciowe: {
            avatar_id: daneWejsciowe.avatar_id,
            czas_lokalny: daneWejsciowe.czas_lokalny,
            strefa: daneWejsciowe.strefa,
            obserwator: daneWejsciowe.obserwator,
            miejsce: daneWejsciowe.miejsce ?? null,
        },
        dane_surowe: {
            czas: { czas_utc, offset_minuty, ...daneSurowe.czas },
            obserwator: daneSurowe.obserwator,
            // reszta bez zmian
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — cały pakiet zielony (`calculator`, `profil`, `normalizer`, `rectification`, `cache`, `nakszatry`).

- [ ] **Step 5: Update the JSON schema document**

W `backend/modules/qac/profiles/schema/avatar_profile.schema.json`:
- dodaj `"dane_wejsciowe"` do tablicy `required` (najwyższy poziom),
- dodaj do `properties` (najwyższy poziom):

```json
"dane_wejsciowe": {
  "type": "object",
  "description": "Dane wprowadzone przez człowieka — źródło prawdy. Podane ponownie do generujProfil dają identyczny profil.",
  "required": ["avatar_id", "czas_lokalny", "strefa", "obserwator", "miejsce"],
  "properties": {
    "avatar_id": { "type": "string" },
    "czas_lokalny": {
      "type": "object",
      "description": "Czas ścienny miejsca urodzenia — to, co widnieje w akcie urodzenia.",
      "required": ["rok", "miesiac", "dzien", "godzina", "minuta", "sekunda"],
      "properties": {
        "rok": { "type": "integer" },
        "miesiac": { "type": "integer", "minimum": 1, "maximum": 12 },
        "dzien": { "type": "integer", "minimum": 1, "maximum": 31 },
        "godzina": { "type": "integer", "minimum": 0, "maximum": 23 },
        "minuta": { "type": "integer", "minimum": 0, "maximum": 59 },
        "sekunda": { "type": "integer", "minimum": 0, "maximum": 59 }
      }
    },
    "strefa": { "type": "string", "description": "Identyfikator strefy IANA, np. Europe/Warsaw." },
    "obserwator": {
      "type": "object",
      "required": ["dlugosc_geo", "szerokosc_geo", "wysokosc_npm_m"],
      "properties": {
        "dlugosc_geo": { "type": "number" },
        "szerokosc_geo": { "type": "number" },
        "wysokosc_npm_m": { "type": "number" }
      }
    },
    "miejsce": { "type": ["string", "null"], "description": "Nazwa miejsca z geokodera; null gdy nieustalona." }
  }
}
```

W `properties.dane_surowe.properties.czas.properties` dodaj:

```json
"czas_utc": {
  "type": "object",
  "description": "Wynik konwersji czas_lokalny + strefa. Nie jest daną wejściową.",
  "required": ["rok", "miesiac", "dzien", "godzina", "minuta", "sekunda"],
  "properties": {
    "rok": { "type": "integer" },
    "miesiac": { "type": "integer" },
    "dzien": { "type": "integer" },
    "godzina": { "type": "integer" },
    "minuta": { "type": "integer" },
    "sekunda": { "type": "integer" }
  }
},
"offset_minuty": {
  "type": "integer",
  "description": "Przesunięcie strefy względem UTC w momencie urodzenia [min]."
}
```

Dodaj `"czas_utc"` i `"offset_minuty"` do `required` obiektu `czas`.

Sprawdź poprawność składni: `python3 -c "import json; json.load(open('backend/modules/qac/profiles/schema/avatar_profile.schema.json')); print('JSON OK')"`

- [ ] **Step 6: Write ADR-009**

Utwórz `pakiet_startowy_claude_code/docs/adr/ADR-009-dane-wejsciowe-czas-lokalny.md`. Zajrzyj najpierw do `ADR-000-szablon.md` i `ADR-008-wystawienie-publiczne.md` — zachowaj ich strukturę i ton.

Treść musi zawierać:
- **Kontekst:** profil zapisywał wyłącznie pochodne (`jd_et`/`jd_ut`), bez danych wejściowych. Formularz przyjmował UTC mimo etykiety w trzech miejscach; użytkownik wpisywał czas lokalny. Wszystkie cztery istniejące profile mają błędny czas: +1 h dla urodzeń w czasie zimowym (`andrzej_bogacki`, `emilia_wojcik`, `rafal_piechota`), +2 h dla letniego (`test_test`). Godzina błędu przesuwa osie kątowe o ~15°, zmieniając aktywacje. Błąd był niewykrywalny, bo wejście nie było przechowywane.
- **Decyzja:** (1) sekcja `dane_wejsciowe` w profilu — granica między wprowadzonym a wyliczonym; (2) czas lokalny + strefa IANA źródłem prawdy, UTC wyliczany przez `lokalnyNaUtc`; (3) wersja schematu 1.1.0; (4) godziny nieistniejące i dwuznaczne (DST) odrzucane przez regulator 9b, nigdy zgadywane; (5) brak zgodności wstecznej i brak migracji profili 1.0.0 — artefakt w piaskownicy, adres ze statusem kandydata, jedyny klient to `dev_server`.
- **Konsekwencje:** profile 1.0.0 wymagają ponownego wygenerowania (backfill niemożliwy — czasu lokalnego, strefy i miejsca nie ma skąd odtworzyć); kontrakt kalkulatora bez zmian (dalej przyjmuje UTC); `czas_utc` w module rektyfikacji dotyczy wydarzeń życiowych i pozostaje nietknięty; bez nowych zależności — `Intl` zna historię reguł DST.
- **Alternatywy odrzucone:** rekonstrukcja czasu z `jd_ut` przy wypełnianiu formularza (działa z błędem < 20 µs, ale nie odtwarza czasu lokalnego, strefy ani miejsca — te nie istnieją w danych); ręcznie wpisywany offset (przenosi na człowieka dokładnie ten błąd, który decyzja eliminuje).

- [ ] **Step 7: Commit**

```bash
git add backend/modules/qac/index.js backend/modules/qac/config/rejestr.js \
        backend/modules/qac/src/regulator9/bramka_zapisu.js \
        backend/modules/qac/profiles/schema/avatar_profile.schema.json \
        backend/modules/qac/test/profil.test.js \
        pakiet_startowy_claude_code/docs/adr/ADR-009-dane-wejsciowe-czas-lokalny.md
git commit -m "feat(qac)!: profil 1.1.0 — sekcja dane_wejsciowe, czas lokalny źródłem prawdy (ADR-009)"
```

---

### Task 4: Kontrakty listowania i usuwania przez kosz

**Files:**
- Modify: `backend/modules/qac/src/regulator9/bramka_zapisu.js`
- Modify: `backend/modules/qac/src/regulator9/index.js`
- Modify: `backend/modules/qac/index.js` (kontrakty + eksport)
- Modify: `.gitignore:55-56`
- Test: `backend/modules/qac/test/profil.test.js`

**Interfaces:**
- Consumes: `regulator9.KATALOG_PROFILI`, `rejestr.WZORZEC_AVATAR_ID`
- Produces:
  - `autoryzujIUsun(avatar_id, katalog?)` → ścieżka pliku w koszu lub `null`; rzuca dla `avatar_id` niezgodnego z wzorcem.
  - `qac.listujAvatary(katalog?)` → `Promise<string[]>` (posortowane)
  - `qac.usunProfil(avatar_id, katalog?)` → ścieżka w koszu lub `null`

- [ ] **Step 1: Write the failing tests**

Dopisz na końcu `backend/modules/qac/test/profil.test.js`:

```js
// --- Listowanie i usuwanie profili (kontrakty modułu) ---

function zapiszProfilProbny(katalog, avatar_id) {
    fs.mkdirSync(katalog, { recursive: true });
    fs.writeFileSync(
        path.join(katalog, `${avatar_id}.json`),
        JSON.stringify({ naglowek: { avatar_id } }),
        'utf8'
    );
}

test('listujAvatary: zwraca posortowane identyfikatory z plików json', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-lista-'));
    zapiszProfilProbny(katalog, 'zofia_nowak');
    zapiszProfilProbny(katalog, 'jan_kowalski');
    assert.deepEqual(await qac.listujAvatary(katalog), ['jan_kowalski', 'zofia_nowak']);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('listujAvatary: pomija kosz i pliki spoza wzorca', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-lista-'));
    zapiszProfilProbny(katalog, 'jan_kowalski');
    fs.mkdirSync(path.join(katalog, '.kosz'), { recursive: true });
    fs.writeFileSync(path.join(katalog, '.kosz', 'stary_profil-20260101-000000.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(katalog, 'notatka.txt'), 'x', 'utf8');
    fs.writeFileSync(path.join(katalog, 'ZleID.json'), '{}', 'utf8');
    assert.deepEqual(await qac.listujAvatary(katalog), ['jan_kowalski']);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('listujAvatary: nieistniejący katalog daje pustą listę', async () => {
    assert.deepEqual(await qac.listujAvatary(path.join(os.tmpdir(), 'qac-brak-' + Date.now())), []);
});

test('usunProfil: przenosi plik do kosza ze znacznikiem czasu', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    zapiszProfilProbny(katalog, 'jan_kowalski');
    const cel = await qac.usunProfil('jan_kowalski', katalog);

    assert.equal(fs.existsSync(path.join(katalog, 'jan_kowalski.json')), false);
    assert.equal(fs.existsSync(cel), true);
    assert.match(path.basename(cel), /^jan_kowalski-\d{8}-\d{6}\.json$/);
    assert.equal(path.basename(path.dirname(cel)), '.kosz');
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('usunProfil: nieistniejący profil daje null, nie wyjątek', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    assert.equal(await qac.usunProfil('jan_kowalski', katalog), null);
    fs.rmSync(katalog, { recursive: true, force: true });
});

test('usunProfil: odrzuca avatar_id z próbą wyjścia poza katalog profili', async () => {
    const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'qac-kosz-'));
    for (const zleId of ['../../etc/passwd', 'jan/../../x', '.', 'ZleID', 'jan kowalski']) {
        await assert.rejects(
            async () => qac.usunProfil(zleId, katalog),
            /wzorcem/,
            `powinno odrzucić: ${zleId}`
        );
    }
    fs.rmSync(katalog, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx node --test modules/qac/test/profil.test.js`
Expected: FAIL — `qac.listujAvatary is not a function`.

- [ ] **Step 3: Implement the write gate**

W `backend/modules/qac/src/regulator9/bramka_zapisu.js` dopisz przed `module.exports`:

```js
const KATALOG_KOSZA = '.kosz';

/** Znacznik RRRRMMDD-GGMMSS (UTC) — bez dwukropków, te są kłopotliwe w nazwach plików. */
function znacznikCzasu(teraz = new Date()) {
    const iso = teraz.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    return `${iso.slice(0, 8)}-${iso.slice(9, 15)}`;
}

/**
 * Autoryzuje i usuwa profil — przeniesienie do profiles/.kosz/ zamiast kasowania.
 * Katalog profili jest poza gitem, więc trwałe usunięcie byłoby nieodwracalne.
 * Walidacja avatar_id PRZED złożeniem ścieżki jest zabezpieczeniem przed
 * wyjściem poza katalog profili — wzorzec PS odrzuca kropki i ukośniki.
 * Zwraca ścieżkę w koszu albo null, gdy profilu nie było.
 */
function autoryzujIUsun(avatar_id, katalog = KATALOG_PROFILI) {
    if (typeof avatar_id !== 'string' || !rejestr.WZORZEC_AVATAR_ID.test(avatar_id)) {
        throw new Error(
            `Bramka 9b odmówiła usunięcia: avatar_id niezgodny z wzorcem PS: ${avatar_id}`
        );
    }
    const zrodlo = path.join(katalog, `${avatar_id}.json`);
    if (!fs.existsSync(zrodlo)) return null;

    const kosz = path.join(katalog, KATALOG_KOSZA);
    fs.mkdirSync(kosz, { recursive: true });
    const cel = path.join(kosz, `${avatar_id}-${znacznikCzasu()}.json`);
    fs.renameSync(zrodlo, cel);
    return cel;
}
```

Zmień `module.exports` w tym pliku na:

```js
module.exports = { autoryzujIZapisz, autoryzujIUsun, walidujProfil, KATALOG_PROFILI, KATALOG_KOSZA };
```

W `backend/modules/qac/src/regulator9/index.js` — zaktualizuj import i eksport:

```js
const { autoryzujIZapisz, autoryzujIUsun, walidujProfil, KATALOG_PROFILI, KATALOG_KOSZA } = require('./bramka_zapisu');

module.exports = {
    walidujDaneWejsciowe,
    kontrolujSwiezosc,
    autoryzujIZapisz,
    autoryzujIUsun,
    walidujProfil,
    KATALOG_PROFILI,
    KATALOG_KOSZA,
};
```

- [ ] **Step 4: Implement the module contracts**

W `backend/modules/qac/index.js` dopisz po `wczytajProfil` (~linia 114):

```js
/**
 * Lista identyfikatorów awatarów w katalogu profili. Podkatalog kosza odpada
 * naturalnie — nie kończy się na .json.
 */
async function listujAvatary(katalog = regulator9.KATALOG_PROFILI) {
    const fs = require('node:fs/promises');
    try {
        const wpisy = await fs.readdir(katalog);
        return wpisy
            .filter((nazwa) => nazwa.endsWith('.json'))
            .map((nazwa) => nazwa.slice(0, -'.json'.length))
            .filter((id) => konfiguracja.rejestr.WZORZEC_AVATAR_ID.test(id))
            .sort();
    } catch (blad) {
        if (blad.code === 'ENOENT') return [];
        throw blad;
    }
}

/** Usunięcie profilu — wyłącznie przez bramkę 9b (kanon pozycji 9). */
function usunProfil(avatar_id, katalog = regulator9.KATALOG_PROFILI) {
    return regulator9.autoryzujIUsun(avatar_id, katalog);
}
```

Dodaj oba do `module.exports`:

```js
module.exports = {
    konfiguracja,
    inicjalizujBufor,
    generujProfil,
    wczytajProfil,
    listujAvatary,
    usunProfil,
    kalkulator,
    regulator9,
    qrt: {
        zlecRektyfikacje: qrt.zlecRektyfikacje,
        statusZadania: qrt.statusZadania,
    },
};
```

- [ ] **Step 5: Extend .gitignore — obowiązkowe**

Obecna reguła `backend/modules/qac/profiles/*.json` **nie obejmuje podkatalogu** (glob `*` nie przechodzi przez ukośnik). Bez tego kroku usunięty profil trafiłby do repozytorium — czyli usuwanie publikowałoby dane urodzeniowe w historii gita.

W `.gitignore` zastąp linie 55-56:

```
# Profile wygenerowane przez serwer podglądu — dane robocze, nie treść repo.
# Kosz musi mieć własną regułę: glob * nie przechodzi przez ukośnik.
backend/modules/qac/profiles/*.json
backend/modules/qac/profiles/.kosz/
```

Zweryfikuj:

```bash
mkdir -p backend/modules/qac/profiles/.kosz && touch backend/modules/qac/profiles/.kosz/probny.json
git check-ignore -v backend/modules/qac/profiles/.kosz/probny.json
rm -rf backend/modules/qac/profiles/.kosz
```

Expected: wypisze regułę `.gitignore:...:backend/modules/qac/profiles/.kosz/` — plik jest ignorowany. Jeśli komenda nic nie wypisze (kod wyjścia 1), reguła nie działa i **nie wolno iść dalej**.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — cały pakiet zielony.

- [ ] **Step 7: Commit**

```bash
git add backend/modules/qac/index.js backend/modules/qac/src/regulator9/ \
        backend/modules/qac/test/profil.test.js .gitignore
git commit -m "feat(qac): kontrakty listujAvatary i usunProfil — usuwanie przez kosz za bramką 9b"
```

---

### Task 5: Endpointy deweloperskie za flagą

**Files:**
- Modify: `backend/dev_server.js` (po bloku `POST /api/qac/profil`, ~linia 152)
- Modify: `backend/package.json` (skrypt `dev:tools`)

**Interfaces:**
- Consumes: `qac.listujAvatary()`, `qac.wczytajProfil()`, `qac.usunProfil()` (Task 4), `dane_wejsciowe` w profilu (Task 3)
- Produces:
  - `GET /api/qac/dev/profile` → `{ profile: [{ avatar_id, dane_wejsciowe }] }`
  - `DELETE /api/qac/dev/profil/<avatar_id>` → `{ usuniety, kosz }` lub 404

- [ ] **Step 1: Implement the endpoints**

W `backend/dev_server.js` dopisz **po** bloku `POST /api/qac/profil` (kończy się `return;` ~linia 152):

```js
    // --- Narzędzia deweloperskie (QAC_DEV_TOOLS=1) ---
    // Wystawiają daty i miejsca urodzenia realnych osób. Bez flagi trasy nie
    // istnieją — w wersji publicznej nie ma czego usuwać (ADR-008, ADR-009).
    if (process.env.QAC_DEV_TOOLS === '1') {
        if (req.method === 'GET' && req.url === '/api/qac/dev/profile') {
            try {
                const identyfikatory = await qac.listujAvatary();
                const profile = [];
                for (const avatar_id of identyfikatory) {
                    const profil = await qac.wczytajProfil(avatar_id);
                    // Profile 1.0.0 nie mają danych wejściowych — pomijamy zamiast
                    // zgadywać; wpis, z którego nie da się wypełnić formularza,
                    // byłby pułapką.
                    if (!profil?.dane_wejsciowe) continue;
                    profile.push({ avatar_id, dane_wejsciowe: profil.dane_wejsciowe });
                }
                wyslijJson(res, 200, { profile });
            } catch (blad) {
                wyslijJson(res, 500, { blad: blad.message });
            }
            return;
        }

        if (req.method === 'DELETE' && req.url.startsWith('/api/qac/dev/profil/')) {
            try {
                const avatar_id = decodeURIComponent(
                    req.url.slice('/api/qac/dev/profil/'.length).split('?')[0]
                );
                // Walidacja avatar_id żyje w bramce 9b — tu tylko rozróżniamy
                // odmowę autoryzacji (400) od braku profilu (404).
                const kosz = await qac.usunProfil(avatar_id);
                if (!kosz) {
                    wyslijJson(res, 404, { blad: `Brak profilu: ${avatar_id}` });
                    return;
                }
                wyslijJson(res, 200, { usuniety: avatar_id, kosz });
            } catch (blad) {
                wyslijJson(res, 400, { blad: blad.message });
            }
            return;
        }
    }
```

W `backend/package.json` dodaj skrypt:

```json
  "scripts": {
    "test": "node --test 'modules/*/test/*.test.js'",
    "dev": "node dev_server.js",
    "dev:tools": "QAC_DEV_TOOLS=1 node dev_server.js"
  },
```

- [ ] **Step 2: Verify the flag is off by default**

```bash
cd backend && npm run dev &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/qac/dev/profile
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/qac/dev/profil/test_test
kill %1
```

Expected: dwa razy `404`. Jeśli którykolwiek zwróci `200`, flaga nie odgradza — **zatrzymaj się i napraw**.

**Uwaga:** port odczytaj z `dev_server.js` (stała `PORT`), jeśli nie jest to 3000.

- [ ] **Step 3: Verify the flag on**

```bash
cd backend && npm run dev:tools &
sleep 2
curl -s http://localhost:3000/api/qac/dev/profile | head -c 400
kill %1
```

Expected: `200` z JSON-em `{"profile":[...]}`. Przy obecnych profilach 1.0.0 lista będzie **pusta** (`{"profile":[]}`) — to poprawne, nie mają `dane_wejsciowe`.

- [ ] **Step 4: Commit**

```bash
git add backend/dev_server.js backend/package.json
git commit -m "feat(dev): endpointy listy i usuwania profili za flagą QAC_DEV_TOOLS (domyślnie wyłączone)"
```

---

### Task 6: Formularz — czas lokalny, strefa, miejsce

**Files:**
- Modify: `backend/dev_public/podglad.html` (fieldset czasu ~57-61, `rozbijCzas` ~183-188, `submit` ~207-220, uwaga ~48)

**Interfaces:**
- Consumes: kontrakt `generujProfil` (Task 3)
- Produces: POST `/api/qac/profil` z ciałem `{avatar_id, czas_lokalny, strefa, obserwator, miejsce}`

- [ ] **Step 1: Replace the time fieldset**

Zastąp fieldset czasu (~57-61):

```html
        <fieldset>
            <legend>Czas urodzenia (czas lokalny miejsca urodzenia)</legend>
            <label for="czas">Data i godzina — tak jak w akcie urodzenia</label>
            <input id="czas" name="czas" type="datetime-local" step="1" value="1990-06-15T08:30:00" required>

            <label for="strefa">Strefa czasowa miejsca urodzenia</label>
            <select id="strefa" name="strefa" required></select>

            <div id="podglad-utc" class="uwaga"></div>
        </fieldset>
```

Zmień uwagę na górze strony (~48) — zamiast „Czas urodzenia podawany w UTC":

```html
    <p class="uwaga">Narzędzie robocze do sprawdzenia działania modułu (nie jest częścią kontraktu QAC). Czas urodzenia podawaj jako lokalny czas miejsca urodzenia — UTC wylicza moduł na podstawie strefy.</p>
```

- [ ] **Step 2: Fill the timezone list and add the UTC preview**

Dopisz w bloku `<script>` po deklaracjach elementów (~po linii 108):

```js
const poleStrefa = document.getElementById('strefa');
const podgladUtc = document.getElementById('podglad-utc');
const poleCzas = document.getElementById('czas');

// Lista stref z Intl — bez zewnętrznych zależności. UTC nie występuje
// w supportedValuesOf, więc dokładamy je ręcznie.
for (const strefa of ['Europe/Warsaw', 'UTC', ...Intl.supportedValuesOf('timeZone')]) {
    if (poleStrefa.querySelector(`option[value="${strefa}"]`)) continue;
    const opcja = document.createElement('option');
    opcja.value = strefa;
    opcja.textContent = strefa;
    poleStrefa.append(opcja);
}
poleStrefa.value = 'Europe/Warsaw';

// Podgląd wyliczonego UTC — użytkownik widzi, co system zrozumiał.
// Ta sama zasada co w module: godzina nieistniejąca/dwuznaczna nie jest zgadywana.
function odswiezPodgladUtc() {
    // rozbijCzas zakłada pełne 'RRRR-MM-DDTGG:MM:SS' — przy pustym polu
    // destrukturyzacja rzuciłaby TypeError, więc sprawdzamy przed wywołaniem.
    const strefa = poleStrefa.value;
    if (!poleCzas.value || !poleCzas.value.includes('T') || !strefa) {
        podgladUtc.textContent = '';
        return;
    }
    const cl = rozbijCzas(poleCzas.value);
    const t0 = Date.UTC(cl.rok, cl.miesiac - 1, cl.dzien, cl.godzina, cl.minuta, cl.sekunda);
    const offset = (ms) => {
        const cz = new Intl.DateTimeFormat('en-US', { timeZone: strefa, timeZoneName: 'longOffset' })
            .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName').value;
        const m = cz.match(/^GMT([+-])(\d{2}):(\d{2})$/);
        return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
    };
    const DOBA = 86400000;
    const kandydaci = [...new Set([t0 - offset(t0 - DOBA) * 60000, t0 - offset(t0 + DOBA) * 60000])]
        .filter((ms) => {
            const cz = new Intl.DateTimeFormat('en-CA', {
                timeZone: strefa, year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }).formatToParts(new Date(ms)).filter((p) => p.type !== 'literal');
            const w = Object.fromEntries(cz.map((p) => [p.type, Number(p.value)]));
            return w.year === cl.rok && w.month === cl.miesiac && w.day === cl.dzien &&
                (w.hour === 24 ? 0 : w.hour) === cl.godzina && w.minute === cl.minuta;
        });
    if (kandydaci.length === 0) {
        podgladUtc.textContent = 'Ta godzina nie istnieje w wybranej strefie (przeskok na czas letni) — moduł odrzuci dane.';
        return;
    }
    if (kandydaci.length > 1) {
        podgladUtc.textContent = 'Ta godzina jest dwuznaczna w wybranej strefie (powrót na czas zimowy) — moduł odrzuci dane.';
        return;
    }
    const utc = new Date(kandydaci[0]).toISOString().slice(0, 19).replace('T', ' ');
    podgladUtc.textContent = `Wyliczony czas UTC: ${utc} (przesunięcie ${offset(kandydaci[0])} min)`;
}

poleCzas.addEventListener('input', odswiezPodgladUtc);
poleStrefa.addEventListener('change', odswiezPodgladUtc);
odswiezPodgladUtc();
```

- [ ] **Step 3: Update the submit payload**

W handlerze `submit` zastąp obiekt `dane` (~212-219):

```js
    const dane = {
        avatar_id: document.getElementById('avatar_id').value,
        czas_lokalny: rozbijCzas(poleCzas.value),
        strefa: poleStrefa.value,
        obserwator: {
            dlugosc_geo: Number(poleDlugosc.value),
            szerokosc_geo: Number(poleSzerokosc.value),
            wysokosc_npm_m: Number(poleWysokosc.value),
        },
    };
    const miejsce = poleMiasto.value.trim() || miejsceRozpoznane.textContent.replace(/^Wybrano:\s*/, '').trim();
    if (miejsce && !miejsce.startsWith('Nie udało się') && !miejsce.startsWith('Rozpoznaję')) {
        dane.miejsce = miejsce;
    }
```

- [ ] **Step 4: Verify manually**

```bash
cd backend && npm run dev
```

Otwórz `http://localhost:3000/`, sprawdź:
1. Legenda mówi o czasie lokalnym, nie UTC.
2. Lista stref ma `Europe/Warsaw` na starcie.
3. Dla `1990-06-15T08:30:00` + `Europe/Warsaw` podgląd pokazuje **`1990-06-15 06:30:00 (przesunięcie 120 min)`**.
4. Dla `2026-03-29T02:30:00` podgląd ostrzega, że godzina nie istnieje.
5. Dla `2026-10-25T02:30:00` podgląd ostrzega o dwuznaczności.
6. Wygenerowanie profilu kończy się sukcesem, a zapisany plik ma `dane_wejsciowe` z `czas_lokalny`, `strefa` i `miejsce`.

- [ ] **Step 5: Commit**

```bash
git add backend/dev_public/podglad.html
git commit -m "feat(dev): formularz przyjmuje czas lokalny ze strefą i pokazuje wyliczony UTC"
```

---

### Task 7: Lista profili i usuwanie w interfejsie

**Files:**
- Modify: `backend/dev_public/podglad.html` (fieldset awatara ~51-55, blok `<script>`)

**Interfaces:**
- Consumes: `GET /api/qac/dev/profile`, `DELETE /api/qac/dev/profil/<avatar_id>` (Task 5)
- Produces: nic (warstwa końcowa)

- [ ] **Step 1: Add the markup**

Zastąp fieldset awatara (~51-55):

```html
        <fieldset>
            <legend>Awatar</legend>
            <label for="avatar_id">avatar_id (wzorzec: snake_case, min. dwa człony)</label>
            <input id="avatar_id" name="avatar_id" value="test_test" required>

            <div id="dev-profile" hidden>
                <label for="lista-profili">Wczytaj wprowadzony profil (narzędzie deweloperskie)</label>
                <div class="szukaj-rzad">
                    <div>
                        <select id="lista-profili">
                            <option value="">— wybierz profil —</option>
                        </select>
                    </div>
                    <button type="button" class="btn-mala" id="usun-profil" disabled>Usuń</button>
                </div>
            </div>
        </fieldset>
```

- [ ] **Step 2: Wire up loading and filling**

Dopisz na końcu bloku `<script>`:

```js
// --- Narzędzie deweloperskie: lista wprowadzonych profili ---
// Renderuje się wyłącznie gdy endpoint odpowie (QAC_DEV_TOOLS=1). Bez flagi
// dostajemy 404 i formularz działa jak dawniej.
const devProfile = document.getElementById('dev-profile');
const listaProfili = document.getElementById('lista-profili');
const usunBtn = document.getElementById('usun-profil');
let profileDev = [];

async function wczytajListeProfili() {
    try {
        const odp = await fetch('/api/qac/dev/profile');
        if (!odp.ok) return;
        const dane = await odp.json();
        profileDev = dane.profile || [];
        listaProfili.innerHTML = '<option value="">— wybierz profil —</option>';
        for (const p of profileDev) {
            const opcja = document.createElement('option');
            opcja.value = p.avatar_id;
            const cl = p.dane_wejsciowe.czas_lokalny;
            const data = `${cl.rok}-${String(cl.miesiac).padStart(2, '0')}-${String(cl.dzien).padStart(2, '0')}`;
            opcja.textContent = `${p.avatar_id} (${data}${p.dane_wejsciowe.miejsce ? ', ' + p.dane_wejsciowe.miejsce : ''})`;
            listaProfili.append(opcja);
        }
        devProfile.hidden = false;
    } catch {
        // Brak endpointu = brak narzędzi deweloperskich. Cisza jest tu poprawna.
    }
}

function dwaZnaki(n) { return String(n).padStart(2, '0'); }

listaProfili.addEventListener('change', () => {
    const wpis = profileDev.find((p) => p.avatar_id === listaProfili.value);
    usunBtn.disabled = !wpis;
    if (!wpis) return;
    const we = wpis.dane_wejsciowe;

    document.getElementById('avatar_id').value = we.avatar_id;
    const cl = we.czas_lokalny;
    poleCzas.value = `${cl.rok}-${dwaZnaki(cl.miesiac)}-${dwaZnaki(cl.dzien)}` +
        `T${dwaZnaki(cl.godzina)}:${dwaZnaki(cl.minuta)}:${dwaZnaki(cl.sekunda)}`;
    poleStrefa.value = we.strefa;
    poleMiasto.value = we.miejsce || '';
    miejsceRozpoznane.textContent = we.miejsce ? `Wybrano: ${we.miejsce}` : '';

    // UWAGA: celowo NIE wołamy ustawWspolrzedne() — ta funkcja nadpisuje pole
    // wysokości wartością z open-elevation. Wysokość ma pochodzić z profilu.
    poleDlugosc.value = we.obserwator.dlugosc_geo;
    poleSzerokosc.value = we.obserwator.szerokosc_geo;
    poleWysokosc.value = we.obserwator.wysokosc_npm_m;
    znacznik.setLatLng([we.obserwator.szerokosc_geo, we.obserwator.dlugosc_geo]);
    mapa.setView([we.obserwator.szerokosc_geo, we.obserwator.dlugosc_geo], Math.max(mapa.getZoom(), 10));

    odswiezPodgladUtc();
});

usunBtn.addEventListener('click', async () => {
    const avatar_id = listaProfili.value;
    if (!avatar_id) return;
    if (!confirm(`Usunąć profil ${avatar_id}? Trafi do kosza (profiles/.kosz/).`)) return;
    usunBtn.disabled = true;
    try {
        const odp = await fetch(`/api/qac/dev/profil/${encodeURIComponent(avatar_id)}`, { method: 'DELETE' });
        const tresc = await odp.json();
        if (!odp.ok) throw new Error(tresc.blad || 'Nie udało się usunąć profilu');
        wynikDiv.innerHTML = `<p class="status">Profil ${avatar_id} przeniesiony do kosza.</p>`;
        await wczytajListeProfili();
    } catch (blad) {
        wynikDiv.innerHTML = `<p class="status blad">${blad.message}</p>`;
    }
});

wczytajListeProfili();
```

- [ ] **Step 3: Verify manually**

```bash
cd backend && npm run dev:tools
```

Otwórz `http://localhost:3000/` i sprawdź:
1. Wygeneruj profil próbny (np. `jan_kowalski`, Warszawa) — pojawia się na liście.
2. Zmień pola ręcznie, potem wybierz `jan_kowalski` z listy — wszystkie pola wracają do wartości z profilu.
3. **Wysokość n.p.m. zgadza się z profilem** i nie została nadpisana przez open-elevation. To kluczowa asercja tego zadania.
4. Podgląd UTC odświeża się po wypełnieniu.
5. „Usuń" pyta o potwierdzenie, profil znika z listy, a plik jest w `backend/modules/qac/profiles/.kosz/`.
6. Zatrzymaj serwer, uruchom `npm run dev` (bez flagi) — sekcja listy **nie pojawia się**, formularz działa normalnie.

- [ ] **Step 4: Commit**

```bash
git add backend/dev_public/podglad.html
git commit -m "feat(dev): lista wprowadzonych profili z wypełnianiem formularza i usuwaniem do kosza"
```

---

### Task 8: Uporządkowanie istniejących profili

**Files:**
- Modify: `backend/modules/qac/profiles/` (dane robocze, poza gitem)

**Interfaces:**
- Consumes: całość (Tasks 1-7)
- Produces: nic

Wszystkie cztery istniejące profile są w schemacie 1.0.0 i mają błędny czas
(użytkownik wpisywał czas lokalny, system traktował go jako UTC). Backfill jest
niemożliwy — czasu lokalnego, strefy ani miejsca nie ma skąd odtworzyć.

- [ ] **Step 1: Confirm the list is empty**

Uruchom `npm run dev:tools`, otwórz stronę. Lista profili powinna być **pusta** —
profile 1.0.0 nie mają `dane_wejsciowe`, więc endpoint je pomija. Sekcja listy
jest widoczna, ale bez opcji.

- [ ] **Step 2: Re-enter the three real profiles**

Dla każdego wpisz **te same liczby co poprzednio** — użytkownik podawał czas
lokalny, więc tym razem wyjdzie poprawnie. Strefa: `Europe/Warsaw`.

Datę, godzinę lokalną i miejsce każdego profilu odtwórz z poprzedniej wersji
pliku (`jd_ut` w starym profilu). Celowo nie są tu zapisane: repozytorium jest
publiczne, a to dane osobowe.

Wszystkie trzy urodzenia wypadają w czasie zimowym, więc podgląd UTC musi pokazać
przesunięcie **60 minut** (CET). Jeśli pokaże inne — zatrzymaj się.

Współrzędne i miejsce ustal na mapie/wyszukiwarce jak przy zwykłym wprowadzaniu.
Wygenerowanie nadpisze stary profil 1.0.0.

**Zanim zatwierdzisz każdy profil, porównaj podgląd UTC z tabelą.** Jeśli się nie
zgadza — zatrzymaj się, coś jest nie tak z konwersją.

- [ ] **Step 3: Delete the test profile**

`test_test` jest w schemacie 1.0.0, więc **nie pojawi się na liście** — endpoint
pomija profile bez `dane_wejsciowe`, a przycisk „Usuń" działa tylko dla pozycji
z listy. Usuń go przez API (serwer musi działać z `npm run dev:tools`):

```bash
curl -s -X DELETE http://localhost:3000/api/qac/dev/profil/test_test
```

Expected: `{"usuniety":"test_test","kosz":"…/profiles/.kosz/test_test-…json"}`

- [ ] **Step 4: Final verification**

```bash
cd backend && npm test
ls modules/qac/profiles/
python3 -c "
import json
for f in ['andrzej_bogacki','rafal_piechota','emilia_wojcik']:
    d = json.load(open('modules/qac/profiles/%s.json' % f))
    print(f, '|', d['naglowek']['wersja_schematu'], '| lokalny:', d['dane_wejsciowe']['czas_lokalny'],
          '| UTC:', d['dane_surowe']['czas']['czas_utc'], '| offset:', d['dane_surowe']['czas']['offset_minuty'])
"
git status --porcelain
```

Expected:
- `npm test` — cały pakiet zielony.
- Trzy profile w schemacie `1.1.0`, każdy z `offset_minuty: 60`, UTC zgodny z tabelą z kroku 2.
- `test_test.json` zniknął z `profiles/`.
- `git status` **nie pokazuje** żadnych plików z `profiles/` ani z `.kosz/` — jeśli pokazuje, reguła `.gitignore` z Taska 4 nie działa i dane osobowe trafią do repo.

---

## Uwagi końcowe

**Kolejność ma znaczenie.** Taski 1-4 budują fundament w module i muszą przejść
`npm test` przed dotknięciem warstwy dev. Po Tasku 3 kontrakt `generujProfil`
jest złamany dla starego wejścia — dopóki Task 6 nie zaktualizuje formularza,
generowanie profili przez UI nie działa. To oczekiwane.

**Poza zakresem tego planu** (z sekcji „Poza zakresem" specu, każde wymaga własnej
decyzji): brak sesji na `POST /api/qac/profil`, nasłuch na `0.0.0.0`, cichy fallback
wysokości przy awarii open-elevation, błędy stempli środowiskowych (`kp` wywala się
na `naglowki.map is not a function`, `noaa_wiatr` HTTP 404, `schumann` bez endpointu).
