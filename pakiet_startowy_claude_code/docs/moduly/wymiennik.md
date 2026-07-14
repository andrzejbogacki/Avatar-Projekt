# Moduł: Wymiennik (Gebo)
- **id:** wymiennik
- **adres_rejestr:** modul.wymiennik — kandydat
- **ścieżka:** backend/modules/wymiennik/
- **status:** piaskownica
- **wersja:** ADR-004 (2026-07-12); kod: zaimplementowany 2026-07-12 (17 testów pass)

## 3 — ZASILANIE (cel i intencja)
- System wymiany tokenów między Avatarami: transakcje bezpośrednie i oferty publiczne, spięty z PS (Moduł 3) jako warstwą walidacji akceptacji. Gebo — wymiana jako równowaga, zero długu systemowego.
- Model tokenów (ADR-004): **avatar token = voucher osobisty** na produkt fizyczny lub usługę; saldo startowe 0; emisja = wytworzenie produktu/usługi przez emitenta. Tokeny wewnętrzne (podaż stała/nieograniczona) i zewnętrzne (adaptery).
- Pojęcia glosariusza: Avatar, Suweren. Terminy-kandydaci: `Gebo` // TERMIN-KANDYDAT, `voucher` // TERMIN-KANDYDAT, `Avatar Token` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3**. Wewnętrznie: `src/wymiana` (3) — `tokeny/salda/transakcje/oferty` (6) — rozliczenie w `src/wymiana` (9a) + `src/regulator9` (9b: walidacja PS, kurs, adaptery).

## 6 — FORMA (struktura i interfejsy)
- **Struktura (stan zapisany):**
  - `config/` — `tokeny` (klasy avatar|wewnetrzny|zewnetrzny, typy podaży, podzielność 0–8), `wymiana` (tryby: system|poza_systemem|zewnetrzny, statusy transakcji i ofert, akceptacje PS dopuszczające: pełna|warunkowa).
  - `src/fabryka/` — tworzenie tokenów SWOBODNE (bez zatwierdzania Suwerena): walidacja schematu; klasa avatar = jeden token per Avatar, podaż nieograniczona; podaż stała = jednorazowa emisja całości na saldo emitenta; klasa zewnętrzna wymaga pola `adapter`.
  - `src/salda/magazyn_sald.js` — salda JSON per avatar_id; transfer wyłącznie przy pełnym pokryciu (zero długu), podzielność respektowana.
  - `src/wymiana/wymiana.js` — propozycja → odpowiedź drugiej strony → zawarcie (walidacja PS) → rozliczenie wg trybu; oferty publiczne (wystawienie/lista/wycofanie/przyjęcie = zawarcie); kurs avatar↔avatar **sztywno 1:1** (zakodowany).
  - `src/regulator9/` — `walidacja_ps` (akceptacja OBU tokenów przez OBIE strony — kontrakt PS), `adaptery` (RejestrAdapterow + AdapterAtrapa; wyniki stemplowane {zrodlo, timestamp, status}).
  - `src/http/router.js` — `/api/wymiennik/*` (sesja obowiązkowa); `index.js` — kontrakt `utworzWymiennik`; `test/` — 17 testów.
- **Zależności:** PS (twarda — walidacja akceptacji, przez kontrakt `podepnijPS`), Auth (tożsamość stron, `podepnijAuth`). Kernel/QAC/Rezonator/Glosariusz: brak.
- **Dane:** katalogi `tokeny/`, `salda/`, `transakcje/`, `oferty/` w `.gitignore`.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** akceptacja PS obu stron dla obu tokenów przed zawarciem (jawna odmowa z przyczyną); pełne pokrycie sald sprawdzane PRZED pierwszym transferem (bez transferów częściowych); kurs 1:1 avatar↔avatar; tryb poza systemem — transfer po OBU potwierdzeniach, anulowanie przez OBIE strony, bezterminowo; wycofanie propozycji jednostronnie tylko przed akceptacją; emisja wyłącznie przez emitenta; brak adaptera = jawna odmowa.
- **Punkty otwarte:**
  - OW1: konkretne integracje adapterów zewnętrznych — poza zakresem fazy 1 (jest interfejs + atrapa).
  - OW2: reguła porządkowa dla akumulujących się transakcji wiszących (model bezterminowy) — przyszła decyzja Suwerena.
  - OW3: wycofanie tokenu (status `wycofany`) — definicja skutków dla istniejących sald: do ustalenia.
- **Decyzje:** ADR-004.
- **Historia zmian:**
  - 2026-07-12 — decyzje Suwerena: schemat tokenu, adaptery (interfejs+atrapa), spory bezterminowe dwustronne, avatar token = voucher osobisty (saldo 0, emisja własna) → ADR-004.
  - 2026-07-12 — implementacja TDD: config, fabryka+salda, wymiana+walidacja PS+rozliczenia+adaptery, router HTTP, kontrakt. Testy: 17 pass. Montaż w dev_server (Auth+PS podpięte), panel `/wymiennik.html`, menu zaktualizowane.
