# QAC — dane wejściowe w profilu, czas lokalny jako źródło prawdy, narzędzia deweloperskie

Data: 2026-07-15
Status: projekt zatwierdzony, oczekuje na plan implementacji

## Kontekst

Zadanie zaczęło się od prośby o listę wyboru wprowadzonych profili w sekcji AVATAR
serwera podglądu. Analiza kodu ujawniła dwa głębsze problemy, które ta prośba
odsłoniła:

1. **Profil nie przechowuje danych wejściowych.** `generujProfil` zapisuje
   `avatar_id` i `obserwator` wprost, ale czas trafia do profilu wyłącznie jako
   `jd_et`/`jd_ut`. Data i godzina urodzenia nie istnieją w czytelnej formie,
   a nazwa miejsca nie jest zapisywana nigdzie. Wypełnienie formularza z profilu
   wymagałoby rekonstrukcji z `jd_ut`.

2. **Formularz przyjmuje czas UTC, a użytkownik wpisywał czas lokalny.** Etykieta
   „Czas urodzenia (UTC)" występowała w trzech miejscach i nie zadziałała.
   Wszystkie cztery istniejące profile mają błędny czas.

Skala błędu (zweryfikowana empirycznie przez odtworzenie `jd_ut`):

| Profil | Pora roku urodzenia | Zastosowana strefa | Błąd |
|---|---|---|---|
| andrzej_bogacki | zima | CET | +1 h |
| emilia_wojcik | zima | CET | +1 h |
| rafal_piechota | zima | CET | +1 h |
| test_test | lato | CEST | +2 h |

Konkretne daty i godziny urodzenia celowo pominięte — repozytorium jest publiczne,
a to dane osobowe. Wartości są w profilach na dysku, wyłączonych z gita.

Godzina różnicy przesuwa Księżyc o ~0,5°, a osie kątowe o ~15°, co zmienia
aktywacje i bramki. Profile są istotnie błędne i wymagają ponownego wygenerowania.

Wniosek projektowy: błąd był niewidoczny, bo profil nie przechowywał wejścia.
Zapis wejścia i przyjęcie czasu lokalnego jako źródła prawdy usuwa przyczynę,
nie objaw.

## Decyzje

| Decyzja | Wybór | Uzasadnienie |
|---|---|---|
| Źródło danych do wypełnienia formularza | Zapis `dane_wejsciowe` w profilu | Odtwarzanie danych, które mieliśmy w ręku, to strata informacji. Nazwy miejsca i czasu lokalnego nie da się odtworzyć w ogóle. |
| Zakres sekcji wejściowej | Pełne wejście + nazwa miejsca + czas lokalny ze strefą | Reprodukowalność 1:1 i zachowanie tego, co widnieje w akcie urodzenia. |
| Źródło prawdy dla czasu | Czas lokalny + strefa IANA; UTC wyliczany | Eliminuje u źródła błąd, który wystąpił. Akt urodzenia podaje czas lokalny. |
| Ochrona narzędzi deweloperskich | Flaga `QAC_DEV_TOOLS`, domyślnie wyłączona | Bez flagi trasy nie istnieją — w wersji publicznej nie ma czego usuwać. |
| Usuwanie profili | Kosz zamiast trwałego kasowania | Katalog profili jest poza gitem; skasowany profil nie ma skąd wrócić. |
| Zgodność wsteczna kontraktu | Brak | Profil w piaskownicy, adres ze statusem kandydata, jedyny klient to dev_server. |

## Kontrakt wejściowy (zmiana)

`generujProfil(daneWejsciowe, zaleznosci)` przyjmuje:

```js
{
  avatar_id: 'emilia_wojcik',
  czas_lokalny: { rok, miesiac, dzien, godzina, minuta, sekunda },
  strefa: 'Europe/Warsaw',        // identyfikator IANA
  obserwator: { dlugosc_geo, szerokosc_geo, wysokosc_npm_m },
  miejsce: 'Gdańsk, Polska'       // opcjonalne, nazwa z geokodera
}
```

Pole `czas_utc` znika z wejścia. Moduł rektyfikacji (`src/rectification/dopasowanie.js`)
używa `czas_utc` dla **wydarzeń życiowych**, nie urodzenia — pozostaje nietknięty.

### Regulator 9b — walidacja wejścia

`src/regulator9/walidacja_wejscia.js`:

- `czas_lokalny` — sześć składowych, wszystkie liczbowe (jak dotychczas `czas_utc`).
- `strefa` — musi należeć do `Intl.supportedValuesOf('timeZone')`. Nieznana strefa
  = odrzucenie, bez cichego domyślnego `Europe/Warsaw`.
- `obserwator` — bez zmian.
- `miejsce` — opcjonalne; jeśli obecne, musi być niepustym stringiem.
- Zachowana zasada: zwracamy **wszystkie** braki naraz.

## Konwersja czasu

Nowa funkcja `lokalnyNaUtc(czas_lokalny, strefa)` w `src/calculator/czas.js`,
symetryczna do istniejącej `utcNaSkaleCzasowe`.

Implementacja bez nowych zależności — `Intl.DateTimeFormat` z `timeZoneName: 'longOffset'`
zna pełną historię reguł DST (zweryfikowane: Warszawa 1982-11 → +01:00,
1982-07 → +02:00, 1949-01 → +01:00).

Algorytm (offset zależy od momentu, a moment od offsetu):

1. `t0` = potraktuj czas lokalny jak UTC.
2. `o0` = offset strefy w `t0`; `t1 = t0 − o0`.
3. `o1` = offset strefy w `t1`; jeśli `o1 ≠ o0`, `t = t0 − o1`, inaczej `t = t1`.
4. Weryfikacja zwrotna: przelicz `t` z powrotem na czas lokalny w strefie.

### Przypadki brzegowe DST — odrzucenie, nie zgadywanie

Zgodnie z zasadą zakazu cichych wartości domyślnych:

- **Czas nieistniejący** (przeskok wiosenny, np. 02:30 w noc zmiany na letni):
  weryfikacja zwrotna nie zgadza się z wejściem → odrzucenie z komunikatem
  wskazującym, że ta godzina nie istnieje w podanej strefie.
- **Czas dwuznaczny** (powrót jesienny, godzina występuje dwukrotnie):
  dwa różne offsety dają poprawną weryfikację zwrotną → odrzucenie z komunikatem
  wymagającym rozstrzygnięcia.

Oba przypadki są realne dla dat urodzenia. Regulator 9b odrzuca je jawnie zamiast
wybierać offset po cichu.

`lokalnyNaUtc` zwraca `{ czas_utc: {rok…sekunda}, offset_minuty }`.

## Struktura profilu — schemat 1.1.0

Granica: `dane_wejsciowe` = co wprowadzono, `dane_surowe` = co wyliczono.

```json
{
  "naglowek": { "wersja_schematu": "1.1.0", "...": "bez zmian" },
  "dane_wejsciowe": {
    "avatar_id": "emilia_wojcik",
    "czas_lokalny": { "rok": 1982, "miesiac": 11, "dzien": 15,
                      "godzina": 1, "minuta": 10, "sekunda": 0 },
    "strefa": "Europe/Warsaw",
    "obserwator": { "dlugosc_geo": 18.623334, "szerokosc_geo": 54.366537,
                    "wysokosc_npm_m": 41 },
    "miejsce": "Gdańsk, Polska"
  },
  "dane_surowe": {
    "czas": {
      "czas_utc": { "rok": 1982, "...": "…" },
      "offset_minuty": 60,
      "jd_et": 0, "jd_ut": 0, "delta_t_s": 0, "skala": "TT (…)"
    },
    "obserwator": { "...": "bez zmian" },
    "forma_swiadoma": { "...": "bez zmian" },
    "forma_nieswiadoma": { "...": "bez zmian" }
  },
  "aktywacje": {}, "mapa_369": {}, "macierz_relacyjna": {}
}
```

`obserwator` występuje w obu sekcjach świadomie: w `dane_wejsciowe` jako część
kompletnego wejścia (bez niego sekcja nie jest reprodukowalna), w `dane_surowe`
jako kontekst obliczeń. Koszt: trzy liczby.

### Pochodne zmiany

- `config/rejestr.js` — `WERSJA_SCHEMATU_PROFILU = '1.1.0'`.
- `src/regulator9/bramka_zapisu.js` — `WYMAGANE_SEKCJE` += `dane_wejsciowe`.
- `profiles/schema/avatar_profile.schema.json` — dokument opisowy, nieegzekwowany
  w kodzie; aktualizowany dla zgodności z rzeczywistością.
- `test/profil.test.js:78` — przypina `'1.0.0'`, wymaga aktualizacji.

## Bramka 9b — usuwanie przez kosz

`bramka_zapisu.js` deklaruje się jako jedyna autoryzowana droga zapisu do `profiles/`.
Usunięcie również modyfikuje ten katalog, więc przechodzi przez regulator.

Nowa funkcja `autoryzujIUsun(avatar_id, katalog)`:

1. Waliduje `avatar_id` wzorcem `rejestr.WZORZEC_AVATAR_ID` **przed** złożeniem
   ścieżki. Wzorzec odrzuca kropki i ukośniki — to zabezpieczenie przed wyjściem
   poza katalog profili, nie kosmetyka.
2. Przenosi plik do `profiles/.kosz/<avatar_id>-<znacznik>.json`, gdzie znacznik
   to czas UTC w formie `RRRRMMDD-GGMMSS` (bez dwukropków — te są kłopotliwe
   w nazwach plików). Znacznik zapobiega kolizji przy ponownym usunięciu tego
   samego `avatar_id`.
3. Brak pliku → zwraca `null` (spójnie z `wczytajProfil`).

### .gitignore — obowiązkowe rozszerzenie

Obecna reguła `backend/modules/qac/profiles/*.json` **nie obejmuje podkatalogu** —
glob `*` nie przechodzi przez ukośnik (zweryfikowane przez `git check-ignore`).
Bez zmiany reguły kosz trafiłby do repozytorium, czyli usunięcie profilu
wpisywałoby czyjeś dane urodzeniowe do historii gita — odwrotność intencji.

Dodać: `backend/modules/qac/profiles/.kosz/`

## Kontrakty modułu QAC

`index.js` — uzupełnienie obok istniejącego `wczytajProfil`:

- `listujAvatary(katalog?)` → `string[]` — lista `avatar_id` z plików `*.json`
  w katalogu profili. Podkatalog `.kosz/` jest pomijany naturalnie (filtr po `*.json`
  na jednym poziomie).
- `usunProfil(avatar_id, katalog?)` → ścieżka w koszu lub `null` — delegat do
  `regulator9.autoryzujIUsun`.

Oba są uczciwymi kontraktami modułu, nie doklejką dev-ową: `listujAvatary` uzupełnia
`wczytajProfil`, a `usunProfil` to jedyna kanoniczna droga usunięcia danych.
Dzięki nim `dev_server` nie sięga do wnętrza modułu ani nie dotyka plików sam —
wzorzec Brahmandy pozostaje nienaruszony.

## Warstwa deweloperska (znika w wersji publicznej)

Cały blok owinięty w `process.env.QAC_DEV_TOOLS === '1'`. Bez flagi trasy nie
istnieją i zwracają 404.

- `GET /api/qac/dev/profile` → `[{ avatar_id, dane_wejsciowe }]`. Profile bez sekcji
  `dane_wejsciowe` (schemat 1.0.0) są **pomijane** — nie da się z nich wypełnić
  formularza, a wpis bez danych byłby pułapką. Endpoint nie zgaduje i nie rekonstruuje.
- `DELETE /api/qac/dev/profil/:avatar_id` → przeniesienie do kosza. Działa również
  dla profili 1.0.0, żeby dało się posprzątać stare wpisy przez UI.

Skrypt npm `dev:tools` ustawia flagę, żeby nie eksportować jej ręcznie.

Uwaga bezpieczeństwa: te trasy wystawiają daty i miejsca urodzenia realnych osób.
Serwer nasłuchuje na `0.0.0.0`, a `POST /api/qac/profil` nie wymaga sesji — patrz
„Poza zakresem".

## Formularz (`dev_public/podglad.html`)

- Etykiety: „Czas urodzenia (UTC)" → **czas lokalny miejsca urodzenia**.
- Nowe pole: lista stref z `Intl.supportedValuesOf('timeZone')`, domyślnie `Europe/Warsaw`.
- Pole „miasto" zaczyna być wysyłane jako `miejsce` (dotąd wyłącznie pomocnicze).
- Podgląd wyliczonego UTC — użytkownik widzi, co system zrozumiał.
- `<select>` z profilami obok pola `avatar_id` + przycisk usunięcia z potwierdzeniem.
  Lista renderuje się **tylko** gdy endpoint odpowie; 404 lub błąd sieci = formularz
  działa jak dziś.

### Wypełnianie nie może wywołać autofillu wysokości

Wybór profilu ustawia znacznik i widok mapy **z pominięciem** `ustawWspolrzedne()`.
Ta funkcja nadpisuje pole wysokości wartością z open-elevation; wysokość ma pochodzić
z profilu. To ten sam mechanizm, który stoi za pierwotną rozbieżnością zgłoszoną
przez użytkownika.

## Migracja istniejących profili

Backfill jest **niemożliwy**: `czas_utc` odtworzyłbym z `jd_ut` (zweryfikowane,
błąd < 20 µs), ale czasu lokalnego, strefy i nazwy miejsca nie ma skąd wziąć —
nie istnieją w danych. Dodatkowo wszystkie cztery profile mają błędny czas i tak
wymagają ponownego wygenerowania.

Plan: `andrzej_bogacki`, `rafal_piechota`, `emilia_wojcik` wprowadzić ponownie przez
formularz (te same liczby co poprzednio — użytkownik wpisywał czas lokalny);
`test_test` usunąć. Profile 1.0.0 nie są wspierane — brak ścieżki migracji w kodzie.

## ADR-009

Zmiana kanonu (kontrakt wejściowy modułu + wersja schematu profilu) wymaga wpisu
w `pakiet_startowy_claude_code/docs/adr/`, wzorem ADR-008. Treść: przyjęcie czasu
lokalnego ze strefą jako źródła prawdy, sekcja `dane_wejsciowe`, kontekst incydentu
błędnych czasów.

## Testy (TDD)

Moduł QAC (`test/`):

- `lokalnyNaUtc` — round-trip z `utcNaSkaleCzasowe` na czterech rzeczywistych datach
  urodzenia; wartości oczekiwane zweryfikowane empirycznie (tabela w „Kontekst").
- `lokalnyNaUtc` — zima (+01:00) i lato (+02:00) dla `Europe/Warsaw`.
- `lokalnyNaUtc` — odrzucenie czasu nieistniejącego (przeskok wiosenny).
- `lokalnyNaUtc` — odrzucenie czasu dwuznacznego (powrót jesienny).
- `walidujDaneWejsciowe` — odrzucenie nieznanej strefy; zwracanie wszystkich braków.
- `generujProfil` — reprodukowalność: `dane_wejsciowe` z profilu podane ponownie
  dają identyczny profil (poza `naglowek.wygenerowano`).
- `listujAvatary` — na katalogu z fixturami; pomijanie `.kosz/`.
- `autoryzujIUsun` — przeniesienie do kosza; odrzucenie `avatar_id` z próbą wyjścia
  poza katalog; `null` dla nieistniejącego profilu.

Endpointy i UI są dev-only — bez testów automatycznych.

## Poza zakresem

Świadomie nietknięte, wymagają własnej decyzji:

- **`POST /api/qac/profil` nie wymaga sesji** — `auth.obsluzZadanie` obsługuje
  wyłącznie własne trasy i przepuszcza resztę dalej.
- **Serwer nasłuchuje na `0.0.0.0`** — `serwer.listen(PORT)` bez hosta
  (`dev_server.js:251`).
- **Cichy fallback wysokości** — gdy open-elevation zawiedzie, pole zachowuje
  poprzednią wartość i trafia ona do profilu bez ostrzeżenia (`podglad.html:137`).
- **Błędy stempli środowiskowych** — `kp` wywala się na `naglowki.map is not a function`,
  `noaa_wiatr` zwraca HTTP 404, `schumann` nie ma endpointu (punkt otwarty O5).
  Efektywnie modulacja środowiskowa nie działa (`czynnik_modulacji: 1`).

Te punkty nie są doklejane do narzędzia deweloperskiego.
