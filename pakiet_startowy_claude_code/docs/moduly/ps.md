# Moduł: PS — Protokół Suwerenności
- **id:** ps
- **adres_rejestr:** modul.ps — kandydat
- **ścieżka:** backend/modules/ps/
- **status:** piaskownica
- **wersja:** schemat ps_v1 odtworzony z ustaleń (ADR-003); kod: zaimplementowany 2026-07-12 (22 testy pass)

## 3 — ZASILANIE (cel i intencja)
- Cztery moduły Protokołu Suwerenności per Avatar: 1) Jakości Kwantowe (autocertyfikacja talentów na 4 osiach), 2) Akceptowane Symulacje, 3) Tokeny z mechaniką Volt (alokacja procentowa jednego tokenu), 4) Protokół Relacji — zasady dostępu (Strumień 1 relacyjny, Strumień 2 wiedzy, bramka wstępna, zgody na kontakt).
- Pojęcia glosariusza: Protokół Suwerenności, Jakości Kwantowe, Avatar, Suweren. Terminy-kandydaci: `bramka wstępna` // TERMIN-KANDYDAT, `Volt Token` // TERMIN-KANDYDAT, `Strumień 1/2` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3** (moduł aplikacji). Wewnętrznie mikro=makro: `src/widoki` (3) — `profile/` (6) — `src/dostep` (9a) + `src/regulator9` (9b).

## 6 — FORMA (struktura i interfejsy)
- **Przechowywanie:** jeden plik JSON per Avatar (`profile/<avatar_id>.json`, **`.gitignore`** — dane osobiste); wzorzec dokumentu: `protokol_suwerennosci.json` w korzeniu repo (piaskownica, zamrożenie osobną decyzją).
- **Struktura (stan zapisany):**
  - `config/` — `osie` (4 osie, poziomy 3/6), `dostep` (hierarchia, stany, macierz domyślna S1 „wszystko brak" — ADR-003, mapa S2, pola tokenu dla ucznia), `volt` (limit 100%).
  - `src/profil/magazyn.js` — magazyn + edycje właściciela: autocertyfikat (`sygnatura_prawdy` zawsze null — bez logiki), symulacje/tokeny (upsert), alokacja Volt (suma ≤ 100, redystrybucja = podmiana całości), poziomy obserwatorów S2, nadpisania S1.
  - `src/dostep/poziomy.js` (9a) — poziom obserwatora (właściciel/przypisany/niesklasyfikowany/gość), stan osi S1 (nadpisanie > macierz domyślna).
  - `src/widoki/strumien2.js` (3) — widok profilu wg zatwierdzonej mapy S2; uczeń: Moduł 3 okrojony do {token, akceptacja, opis}, bez Volt; kopie bez referencji.
  - `src/regulator9/` (9b) — `bramka` (dwa elementy zobowiązania → id gościa w rejestrze dostępu), `kontakt` (prośby + decyzje właściciela, bez automatyzmu), `certyfikacja` (przyjęcie aktu z Auth; typ/poziom null).
  - `src/http/router.js` — `/api/ps/*`; `index.js` — kontrakt `utworzPS`; `test/` — 22 testy `node --test`.
- **Kontrakty wejścia/wyjścia:** patrz README modułu (endpointy + kontrakt publiczny). Tożsamość obserwatora wyłącznie z kontraktu Auth (`podepnijAuth`); gość — cookie `ps_gosc` po bramce.
- **Zależności:** Auth (tożsamość, hook certyfikacji). Kernel: brak (odroczony). QAC/Wymiennik/Rezonator: brak w tej fazie.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** edycje wyłącznie właściciela (sesja Auth); widoki S2 filtrowane per poziom, bez przecieków referencji; macierz S1 „wszystko brak" + jawne nadpisania per para; bramka wstępna wymaga OBU elementów, bez zapisu przy braku; suma alokacji Volt ≤ 100%; decyzja o kontakcie jednokrotna; brak danych = jawny status.
- **Punkty otwarte:**
  - OP1: typ i poziom startowy certyfikatu przy zaproszeniu — decyzja Suwerena odroczona; `certyfikacja_startowa.typ/poziom = null`, stan jawny `certyfikacja_oczekujaca` (wspólne z OA1 Auth).
  - OP2: `sygnatura_prawdy` — pole obecne, logika generowania POZA tą fazą (zgodnie z ustaleniami).
  - OP3: `certyfikaty_zewnetrzne` — pusta tablica, schemat zapisu certyfikatów innych Avatarów POZA tą fazą.
  - OP4: zamrożenie odtworzonego schematu jako ps_v1 (dokument zamykający) — decyzja Suwerena.
  - OP5: rozbieżności z ewentualnie odnalezionym oryginałem protokol_suwerennosci.json → decyzja Suwerena + ADR.
- **Decyzje:** ADR-003 (odtworzenie schematu; macierz S1; zakres widoku ucznia).
- **Historia zmian:**
  - 2026-07-12 — stwierdzony brak pliku protokol_suwerennosci.json; Suweren polecił budowę wg specyfikacji ustaleń; decyzje: macierz S1 „wszystko od braku", uczeń bez warunek/mapowanie_369/Volt → ADR-003; schemat-wzorzec zapisany w korzeniu repo.
  - 2026-07-12 — implementacja TDD: config, magazyn profili + edycje, dostęp 9a, widoki S2, regulator9 (bramka, kontakt, certyfikacja), router HTTP, kontrakt. Testy: 22 pass (suita: 95 pass, 1 skip). Montaż w dev_server + spięcie hookPS Auth→PS; panel `/ps.html`; menu modułów zaktualizowane.
