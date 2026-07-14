# Moduł: Auth (tożsamość i sesja)
- **id:** auth
- **adres_rejestr:** modul.auth — kandydat (submoduł: modul.auth.zaproszenia — kandydat)
- **ścieżka:** backend/modules/auth/
- **status:** piaskownica
- **wersja:** roadmapa backendu 2026-07-11 (Moduł 0); kod: zaimplementowany 2026-07-11 (37 testów pass)

## 3 — ZASILANIE (cel i intencja)
- Tożsamość, sesja i rejestracja przez zaproszenie dla wszystkich modułów Projekt Avatar. Rejestracja WYŁĄCZNIE dwufazowa: propozycja dowolnego aktywnego Avatara → jawne zatwierdzenie Suwerena → konto. Brak otwartej rejestracji publicznej.
- Pojęcia glosariusza: Avatar, Suweren, Protokół Suwerenności (avatar_id). Terminy-kandydaci: `token aktywacyjny` // TERMIN-KANDYDAT, `bramka zaproszeń` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3** (moduł aplikacji). Wewnętrznie mikro=makro: `src/logowanie` (3) — `accounts/`+`zaproszenia/` (6) — `src/sesje` (9a) + `src/regulator9` (9b).

## 6 — FORMA (struktura i interfejsy)
- **Struktura (stan zapisany):**
  - `config/` — `krypto` (scrypt OWASP: N=2^17, r=8, p=1; minimalna długość hasła), `sesje` (TTL 12 h, cookie), `zaproszenia` (TTL tokenu 7 dni), `konta` (statusy, wzorzec avatar_id, id Suwerena) + agregator `index.js`.
  - `accounts/` — konta JSON per `avatar_id`; **`.gitignore`** (hashe haseł, tokeny). Schemat: `schema/konto.schema.json`.
  - `zaproszenia/` — propozycje JSON per id; **`.gitignore`**.
  - `src/konta/magazyn.js` — magazyn kont (utworzenie z atomową odmową duplikatu `wx`, odczyt, aktualizacja, walidacja wzorca avatar_id — ochrona przed path traversal).
  - `src/logowanie/` — `krypto` (scrypt + timingSafeEqual, token aktywacyjny), `usluga` (logowanie/wylogowanie/aktywacja; wyniki jako jawne statusy).
  - `src/sesje/rejestr.js` (9a — rezonator; wniosek logiczny zatwierdzony 2026-07-11: sesja = punkt mediacji między impulsem żądania a stanem kont) — rejestr w pamięci, TTL, jawne statusy `aktywna|wygasla|brak_sesji`.
  - `src/regulator9/` (9b — regulator) — `zaproszenia` (bramka dwufazowa — jedyna droga powstania konta poza bootstrapem), `magazyn_zaproszen`, `srodowisko` (konto demo wyłącznie poza produkcją).
  - `src/http/router.js` — endpointy `/api/auth/*`; `index.js` — kontrakt publiczny `utworzAuth(...)`; `test/` — 37 testów `node --test`.
  - `backend/narzedzia/bootstrap_suwerena.js` — jednorazowe utworzenie konta Suwerena (odmowa przy niepustym magazynie).
- **Kontrakty wejścia:** logowanie `{avatar_id, haslo}`; aktywacja `{avatar_id, token, nowe_haslo}`; propozycja `{kandydat_avatar_id, uzasadnienie}` (zapraszający z sesji); decyzja `{decyzja: zatwierdzona|odrzucona}` (wyłącznie Suweren).
- **Kontrakty wyjścia:** sesja cookie `httpOnly` (`avatar_sesja`); `GET /api/auth/sesja` → `{status, avatar_id?}` — źródło tożsamości obserwatora dla PS, Wymiennika, Rezonatora; rekord konta wg `schema/konto.schema.json`.
- **Zależności zewnętrzne:** brak (wyłącznie `node:crypto`, `node:fs`).

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** żadne konto nie powstaje poza bramką zaproszeń (jedyny wyjątek: jednorazowy bootstrap Suwerena na pustym magazynie); decyzja o zaproszeniu wyłącznie Suweren; token aktywacyjny jednorazowy z TTL, porównania `timingSafeEqual`; złe hasło i nieistniejące konto = identyczna odpowiedź (bez enumeracji kont); brak danych = jawny status, nigdy cichy default; konto demo wykluczone z produkcji (`srodowisko.js`).
- **Punkty otwarte:**
  - OA1: typ i poziom startowy certyfikatu PS przy zaproszeniu — decyzja Suwerena odroczona; konto powstaje ze stanem jawnym `certyfikacja_oczekujaca`, punkt wywołania = parametr `hookPS` kontraktu (domyślnie odracza z jawnym powodem).
  - OA2: trwałość sesji po restarcie (obecnie: rejestr w pamięci — ADR-002, konsekwencja jawna).
  - OA3: transportowe zabezpieczenie cookie (`Secure`) — do włączenia przy wdrożeniu HTTPS.
- **Decyzje:** ADR-002 (własny moduł Node.js, JSON per konto, aktywacja tokenem jednorazowym).
- **Historia zmian:**
  - 2026-07-11 — otwarte punkty Modułu 0 rozstrzygnięte przez Suwerena (technologia, storage, aktywacja) → ADR-002; Krok 0 (struktura katalogów, kontrakt HTTP, schemat konta, bootstrap) zatwierdzony, w tym interpretacja 9a=sesje (wniosek logiczny).
  - 2026-07-11 — implementacja TDD: config, krypto, magazyn kont, sesje, logowanie+aktywacja, zaproszenia+regulator9, router HTTP, kontrakt, bootstrap. Testy: 37 pass. Montaż w dev_server (`/api/auth/*`), glob testów rozszerzony na `modules/*/test/`.
