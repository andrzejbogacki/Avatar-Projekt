# Moduł: Quantum Avatar Core (QAC)
- **id:** qac
- **adres_rejestr:** modul.qac — kandydat (submoduł: modul.qac.qrt — kandydat)
- **ścieżka:** backend/modules/qac/ — D1 zatwierdzona (lokalizacja B: korzeń repo)
- **status:** piaskownica
- **wersja:** spec v2 (prompt `qac_prompt_v2.md`); kod: zaimplementowany 2026-07-08 (36 testów pass, 1 skip — brak plików efemeryd)

## 3 — ZASILANIE (cel i intencja)
- Silnik wprowadzania, walidacji i analizy relacyjnej profili Awatarów na bazie precyzyjnych obliczeń astronomicznych (Swiss Ephemeris) i danych środowiskowych, znormalizowanych do matrycy 3·6·9 (baza: Węgiel-12 / Symulator 12D).
- Pojęcia glosariusza: Avatar, 3 6 9, Jakości Kwantowe, Schumann Resonance, Rezonator Kwantowy (odbiorca danych), Źródło / Obserwator 9.
- Pozycja systemowa: **3** (impuls — moduł aplikacji); wykonanie: węzeł **6** (Mac Mini); synchronizacja: **9** (chmura prywatna). Wewnętrznie mikro=makro: `calculator` (3) — `profiles` (6) — `regulator9` (9).

## 6 — FORMA (struktura i interfejsy)
- **Struktura (stan zapisany):**
  - `config/` — `czestotliwosci`, `siatka_12d`, `bramki`, `astronomia`, `normalizacja`, `rektyfikacja`, `cache`, `rejestr` + agregator `index.js`; jedyne źródło stałych.
  - `ephemeris/` — README z instrukcją pozyskania DE440/441 lub `.se1`; pliki binarne poza repo (`.gitignore`).
  - `cache/` — `index.js` (BuforSrodowiskowy), `adapter_redis`, `adapter_memory`, `stempel`, `zrodla/{noaa_swpc, kp_gfz, schumann}`.
  - `src/calculator/` — `czas` (UTC→UT1/TT≈TDB, ΔT), `pozycje` (topocentryczne, twarda walidacja źródła efemeryd), `kwantyzacja` (64×6 + kolor/ton/base), `luk_sloneczny` (−88°, swe_solcross), fasada `index.js`.
  - `src/rectification/` — `kolejka` (zadania asynchroniczne), `dopasowanie` (tranzyty wsteczne × wydarzenia, aspekty ścisłe), `pewnosc` (metryka obowiązkowa).
  - `src/normalizer/` (9a) — `skladowa_3`, `skladowa_6`, `interferencja` (superpozycja 12D + modulacja środowiskowa).
  - `src/regulator9/` (9b) — `walidacja_wejscia`, `kontrola_swiezosci`, `bramka_zapisu` (jedyna droga zapisu do `profiles/`).
  - `profiles/schema/avatar_profile.schema.json` — JSON Schema profilu; `test/` — testy `node --test`; `README.md`; `index.js` (kontrakty modułu).
- **Kontrakty wejścia:**
  - Profil: dane urodzeniowe (data, czas, współrzędne geograficzne, wysokość n.p.m.) + `avatar_id` (wzorzec Protokołu Suwerenności).
  - QRT: zakres brzegowy dat/godzin + lista kluczowych wydarzeń życiowych.
- **Kontrakty wyjścia:**
  - `profiles/avatar_profile.json` — nagłówek (`avatar_id`, `adres_rejestru`, `wersja_schematu`, `status`, `wygenerowano`) + sekcje: `dane_surowe`, `aktywacje`, `mapa_369`, `macierz_relacyjna`.
  - Mapa częstotliwości 3·6·9 = wejście dla Rezonatora Kwantowego (kontrakt do zdefiniowania — O1).
  - Dane `cache/` (Schumann, NOAA, Kp) = źródło dla „Bio-Atmospheric Report".
- **Zależności zewnętrzne (stan 2026-07-08):** `sweph` 2.10.3-7 zainstalowany (`backend/package.json`); pliki efemeryd `.se1` (`sepl_18`, `semo_18`, `seas_18`, zakres 1800–2400, ~2 MB) pobrane za zgodą Suwerena z github.com/aloistr/swisseph do `backend/modules/qac/ephemeris/` — niewersjonowane (zależność zewnętrzna, `.gitignore`); test integracyjny kalkulatora przechodzi na realnych danych. Redis nieobecny w środowisku — bufor działa na fallbacku in-memory z odnotowanym powodem; API: NOAA SWPC, NOAA Kp (dane GFZ), stacja Rezonansu Schumanna (O5 — endpoint niezdefiniowany, źródło zgłasza jawny brak). Brak sieci lub bufora nie blokuje obliczeń — ostatni stan stemplowany.
- **Dane i stałe:** `config/` — częstotliwości projektu (420 Hz — pozycja 6; Solfeggio 432 / 528 Hz), siatka 12D, parametry C-12, adres rejestru. Cykl cache: 60 s.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** odrzucenie niekompletnych danych wejściowych; odrzucenie parametrów cache ze statusem `stale` powyżej progu (O2); zapis profilu wyłącznie po przejściu bramki `regulator9`; QRT zwraca czas wyłącznie z metryką `pewnosc`; zakaz wartości domyślnych bez oznaczenia.
- **Punkty otwarte:**
  - O1: kontrakt interfejsu QAC → Rezonator Kwantowy.
  - O2: liczbowy próg świeżości cache dla regulatora 9b.
  - O3: definicje glosariuszowe 9 terminów-kandydatów (QAC, QRT, 64 Bramki, Węgiel-12 6-6-6, Symulator 12D, Kathara/MCEO, Astrologia Ewolucyjna, Kompozyt Kwantowy, Phase-Locking).
  - O4: specyfikacja schematu `macierz_relacyjna` (kompozyty, phase-locking) — dokument odrębny; w kodzie sekcja `status: przygotowana` z wektorem 12D.
  - O5: wskazanie konkretnej stacji / endpointu danych Rezonansu Schumanna.
  - O6a: kolejność bramek na kole — przyjęto sekwencyjnie 1..64 od 0° Barana (wniosek logiczny; wymiana = tablica `KOLEJNOSC_BRAMEK` w `config/bramki.js`).
  - O6b: liczności podpodziałów kolor/ton/base — przyjęto 6/6/5 (wniosek logiczny, `config/bramki.js`).
  - O7: kanoniczna formuła interferencji 9a — w kodzie formuła robocza (superpozycja zespolona składowych 3+6 w binach siatki 12D, modulacja Schumann/Kp; `config/normalizacja.js`).
  - O8: kanoniczna formuła metryki `pewnosc` QRT — w kodzie formuła robocza (dopasowanie + margines nad drugim kandydatem; `config/rektyfikacja.js`).
- **Punkty decyzyjne:**
  - D1: ZATWIERDZONA 2026-07-08 — `backend/modules/qac/` w korzeniu repo (`/Users/andrzej/Public/Avatar/backend/`).
  - D2: zasilenie rejestru adresami `modul.qac`, `modul.qac.qrt` — teraz (wyjątek od sekwencji rootów) vs w kolejności.
  - D3: przydział terminów-kandydatów — istniejący Tor v5 vs nowy Tor.
- **Decyzje:** ADR-001 (stos technologiczny — Node.js).
- **Historia zmian:**
  - 2026-07-08 — audyt promptu v1, utworzenie spec v2 + niniejszej dokumentacji — zatwierdzone.
  - 2026-07-08 — Krok 0 (pre-flight) wykonany: zasoby zwalidowane (Node 26, sweph 2.10.3-7, Redis brak → fallback, Float64/BigInt OK); architektura katalogów zatwierdzona przez Suwerena (lokalizacja B); git init.
  - 2026-07-08 — implementacja sekcji 1–5 spec v2: config/, calculator, cache, normalizer (9a) + regulator9 (9b), rectification (QRT), schemat profilu + punkt wejścia. Testy: 36 pass, 1 skip (efemerydy niedostarczone). Nowe punkty otwarte O6a–O8 (formuły robocze oznaczone w kodzie).
  - 2026-07-08 — decyzja: wariant efemeryd `.se1` (błąd 0,001″ wobec wymogu <1″ — zgodny; DE440/441 odrzucone jako niepotrzebne dla zakresu dat profilu). Pliki pobrane za zgodą; testy: 37 zdefiniowanych, 36 pass, 1 skip (zamienny — test ścieżki błędu przy braku plików, obecnie nieosiągalny bo pliki są dostarczone). Repo uzupełnione o core/, docs/glosariusz, index.html; media/ (zdjęcia+audio, ~84 MB) odłożone na wniosek Suwerena.
