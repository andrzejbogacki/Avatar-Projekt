# Moduł: Glosariusz (Inteligentny System Uspójniania Zrozumienia)
- **id:** glosariusz
- **adres_rejestr:** modul.glosariusz — kandydat
- **ścieżka:** backend/modules/glosariusz/
- **status:** piaskownica
- **wersja:** ADR-006 (2026-07-12); kod: zaimplementowany 2026-07-12 (19 testów pass)

## 3 — ZASILANIE (cel i intencja)
- Automatyczna detekcja terminów glosariusza w dowolnej treści — włącznie z formami odmienionymi (fleksja polska) — przez prekomputowany indeks, BEZ analizy NLP w czasie działania. Inline-linking bez zmiany widocznego tekstu; hover = `wprowadzenie`, klik = `rozszerzenie`. Zasięg nieograniczony (dowolny tekst przez API).
- Pojęcia glosariusza: Glosariusz (sam siebie opisuje — 45 terminów v4). Terminy-kandydaci: `indeks form` // TERMIN-KANDYDAT, `inline-linking` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3**. Wewnętrznie: `src/skaner` (3) — `docs/glosariusz.json` + `indeks/formy.json` (6) — spójność indeksu przez hash źródła (9a) + bramka dwufazowa (9b).

## 6 — FORMA (struktura i interfejsy)
- **Dane:** źródło prawdy `docs/glosariusz.json` (NIETKNIĘTE poza bramką — migracja v4→v5 w toku); indeks `indeks/formy.json` — osobny plik, WERSJONOWANY w git (ADR-006): mapa forma→terminy (odczyt O(1)), `hash_zrodla`, `silnik`, `zbudowano_ts`, `statusy_form` per termin, `maks_slow`. Stan startowy: 45 terminów → ~2,5 tys. form.
- **Struktura (stan zapisany):**
  - `src/fleksja/regulowy.js` — zapasowy generator regułowy (paradygmaty: męski spółgłoskowy z wymianami miejscownika, żeński -a/-ja/-ka, nijaki -o/-e, przymiotnikowy -y/-i/-we/-ne, -ość/-ści); formy `przyblizone` (jawny status); terminy wielowyrazowe = ograniczone kombinacje form członów, forma podstawowa zawsze pierwsza.
  - `src/indeks/budowa.js` — budowa indeksu + hash SHA-256 źródła.
  - `src/skaner/oznacz.js` — tokenizacja, najdłuższe dopasowanie od lewej (ADR-006), remis → forma podstawowa, bez zagnieżdżeń, granice słów, case-insensitive, segmenty sklejają się do oryginału co do znaku.
  - `src/regulator9/` — `magazyn` (odczyt/zapis terminów, przebudowa i status indeksu), `propozycje` (dwufazowość: propozycja → decyzja WYŁĄCZNIE Suwerena → zapis + obowiązkowa przebudowa indeksu).
  - `src/http/router.js` — `/api/glosariusz/*` (odczyt i skan publiczne; propozycje z sesją Auth); `index.js` — kontrakt; `test/` — 19 testów; `backend/narzedzia/przebuduj_indeks_glosariusza.js`.
- **Zależności:** brak twardych (rdzeń działa bez Auth — zgodnie ze spec); Auth podpinany opcjonalnie dla tożsamości proponującego i decyzji Suwerena. Python/Morfeusz2: NIEZAINSTALOWANY — silnik kanoniczny odroczony (ADR-006).

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** zapis do glosariusza wyłącznie przez bramkę dwufazową (decyzja Suwerena); zapis = wyzwalacz przebudowy indeksu; rozjazd hash = jawny status `aktualny:false`; limity długości pól i skanowanego tekstu; propozycja rozstrzygnięta nie wraca.
- **Punkty otwarte:**
  - OG1: dołączenie Morfeusz2 (pip3 install morfeusz2) i podmiana silnika — decyzja Suwerena odroczona; przebudowa jedną komendą.
  - OG2: pokrycie form generatora regułowego — przybliżone (jawny status); znane luki uzupełniane testami (np. „Jakości Kwantowych" dodane 2026-07-12).
  - OG3: migracja glosariusz.json v4→v5 — poza zakresem modułu; indeks przebudować po migracji.
  - OG4: linki do widoków terminów w PWA — przyszła integracja (poza zakresem — spec).
- **Decyzje:** ADR-006 (silnik regułowy teraz / Morfeusz2 kanoniczny, indeks osobny commitowany, kolizje: najdłuższe dopasowanie).
- **Historia zmian:**
  - 2026-07-12 — trzy otwarte punkty rozstrzygnięte przez Suwerena → ADR-006 (w tym: bez instalacji Morfeusza na razie).
  - 2026-07-12 — implementacja TDD: fleksja+indeks (w tym poprawka paradygmatu -we/-ne i -ści wykryta testem), skaner (kolizje, granice słów, wierność tekstu), dwufazowość+router, kontrakt. Testy: 19 pass. Indeks startowy 45 terminów zbudowany i zapisany. Montaż w dev_server, panel `/glosariusz.html` (hover + wysuwany panel definicji), menu — komplet 6 modułów aktywnych.
