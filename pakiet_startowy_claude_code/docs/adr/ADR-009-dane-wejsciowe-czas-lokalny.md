# ADR-009: Dane wejściowe w profilu — czas lokalny źródłem prawdy
- **Data:** 2026-07-15
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Profil QAC zapisywał wyłącznie pochodne czasu — `jd_et`/`jd_ut` — nigdy
danych wejściowych, z których powstały. Formularz przyjmował czas UTC,
mimo etykiety „(UTC)" umieszczonej w trzech miejscach interfejsu;
użytkownik w praktyce wpisywał czas lokalny miejsca urodzenia. Etykieta
nie zadziałała, bo problem leżał w projekcie systemu, nie w uwadze
użytkownika.

Skutek: wszystkie cztery istniejące profile mają błędny czas urodzenia.
Dla urodzeń w czasie zimowym (CET, `andrzej_bogacki`, `emilia_wojcik`,
`rafal_piechota`) błąd wynosi +1 h; dla urodzenia w czasie letnim (CEST,
`test_test`) +2 h. Godzina błędu przesuwa Księżyc o ~0,5° i osie kątowe
(ASC/MC) o ~15°, co zmienia aktywacje i bramki wyliczane z tych osi —
błąd nie jest kosmetyczny, zmienia treść profilu.

Błąd był niewykrywalny post factum: skoro profil nie przechowywał
`czas_lokalny`/`strefa`/`miejsce`, nie było z czym porównać zapisanych
`jd_et`/`jd_ut`, ani jak odtworzyć, co użytkownik faktycznie wpisał.

## Decyzja
1. **Sekcja `dane_wejsciowe` w profilu.** Profil dostaje jawną granicę
   między tym, co wprowadził człowiek (`dane_wejsciowe`: `avatar_id`,
   `czas_lokalny`, `strefa`, `obserwator`, `miejsce`), a tym, co
   wyliczono (`dane_surowe`, w tym `czas_utc` i `offset_minuty`).
   Podanie zapisanej sekcji `dane_wejsciowe` ponownie do `generujProfil`
   musi dawać identyczny profil (reprodukowalność) — to jest test, nie
   tylko intencja.
2. **Czas lokalny + strefa IANA są źródłem prawdy.** Użytkownik podaje
   czas ścienny miejsca urodzenia i identyfikator strefy (np.
   `Europe/Warsaw`); UTC nie jest już wejściem, tylko wynikiem konwersji
   `lokalnyNaUtc` (Task 1, `src/calculator/czas.js`).
3. **Wersja schematu profilu: `1.1.0`** (z `1.0.0`) — zmiana kontraktu
   wejścia i struktury profilu.
4. **Godziny nieistniejące i dwuznaczne (DST) są odrzucane, nigdy
   zgadywane.** Przeskok wiosenny (godzina nie istnieje) i powrót
   jesienny (godzina istnieje dwukrotnie) regulator 9b odrzuca jawnym
   wyjątkiem — zero cichych wartości domyślnych, rozstrzygnięcie zawsze
   po stronie człowieka.
5. **Brak zgodności wstecznej, brak migracji profili 1.0.0.** Artefakt
   jest w statusie piaskownica, adres modułu ma status kandydata, a
   jedynym klientem zapisu jest `dev_server`. Koszt migracji przewyższa
   wartość zachowania kontraktu, którego jedyny efekt to utrwalenie
   znanego błędu.

## Alternatywy odrzucone
- **Rekonstrukcja czasu lokalnego z `jd_ut` przy wypełnianiu formularza.**
  Odwrócenie `jd_ut → UTC` działa z błędem < 20 µs, ale `jd_ut` nie niesie
  informacji o strefie ani o czasie ściennym, jakim posłużył się
  użytkownik — te dane nigdy nie istniały w zapisie. Rekonstrukcja
  dałaby poprawny UTC, ale nie odtworzyłaby `czas_lokalny`, `strefa` ani
  `miejsce`, więc nie spełniłaby wymogu reprodukowalności z sekcji
  `dane_wejsciowe`.
- **Ręcznie wpisywany offset UTC zamiast strefy IANA.** Przenosi na
  człowieka dokładnie ten błąd, który ta decyzja eliminuje — user musiałby
  znać i poprawnie policzyć offset dla danej daty (w tym DST), czyli
  powtórzyć pracę, którą ma wykonywać `lokalnyNaUtc`.

## Konsekwencje
- Cztery istniejące profile (`andrzej_bogacki`, `emilia_wojcik`,
  `rafal_piechota`, `test_test`) wymagają ponownego wygenerowania z
  poprawnym czasem lokalnym i strefą. Backfill z istniejących danych jest
  niemożliwy — czasu lokalnego, strefy i miejsca nie ma skąd odtworzyć
  (zob. alternatywy odrzucone).
- Kontrakt kalkulatora (`obliczDaneSurowe({czas_utc, obserwator})`)
  pozostaje bez zmian — nadal przyjmuje UTC; konwersja przesuwa się na
  wejście do `generujProfil`, nie w głąb kalkulatora.
- `czas_utc` w module rektyfikacji (`src/rectification/dopasowanie.js`)
  dotyczy wydarzeń życiowych, nie urodzenia — poza zakresem tej decyzji,
  pozostaje nietknięty.
- Brak nowych zależności: `Intl` (wbudowane w Node.js) zna pełną historię
  reguł DST — zweryfikowane empirycznie dla Warszawy (1982-11 → +01:00,
  1982-07 → +02:00), więc konwersja stref nie wymaga zewnętrznej bazy
  danych stref czasowych.
