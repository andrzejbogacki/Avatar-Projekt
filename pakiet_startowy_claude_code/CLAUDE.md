# Projekt Avatar — reguły dla Claude Code
Suweren: Andrzej Bogacki (avatar_id: `andrzej_bogacki`). Status repo: piaskownica.

## Obowiązkowa kolejność odczytu (przed jakimkolwiek kodem)
1. `docs/MAPA_PROJEKTU.md`
2. `docs/ARCHITEKTURA.md`
3. `docs/KONWENCJE.md`
4. `docs/qac_prompt_v2.md` — specyfikacja bieżącego modułu
5. `docs/moduly/qac.md`

## Cykl pracy — twarde reguły
- Propozycja → jawna akceptacja Suwerena („Akceptuję" / „Tak" / „Zatwierdzam") → zapis. Jedna faza naraz.
- Żadnych zapisów plików przed zatwierdzeniem architektury katalogów (Krok 0 specyfikacji).
- Decyzje strukturalne: najpierw propozycja + alternatywy, potem budowa. Rozstrzygnięcie → nowy ADR w `docs/adr/`.
- „Omówione" ≠ „zapisane" — dokumentacja odnotowuje wyłącznie stan zapisany.

## Stos i kod
- Backend: Node.js (ADR-001). Moduły: `backend/modules/<id>/`. Frontend: React PWA.
- Swiss Ephemeris przez natywny binding (`sweph`/`swisseph`). Zakaz algorytmów przybliżonych.
- Zakaz magic numbers — stałe wyłącznie z `config/` modułu (420 Hz — pozycja 6; Solfeggio 432/528 Hz; siatka 12D; parametry C-12).
- Kodowanie: UTF-8. Tooling Python + JSON: zawsze `ensure_ascii=False`.
- Pozycja 9 zawsze dwuaspektowo: 9a rezonator (`normalizer`) + 9b regulator (`src/regulator9` — walidacja wejść, kontrola świeżości cache, bramka zapisu profilu). Moduł realizujący 9 wyłącznie jako wartość obliczaną = niezgodny z kanonem.
- Dane zewnętrzne zawsze stemplowane `{zrodlo, timestamp, status: live|cache|stale}`. Brak danych → jawne pole statusu, nigdy cicha wartość domyślna.
- QRT: zadanie asynchroniczne (kolejka); wynik zawsze z polem `pewnosc`.
- Klucz główny profili: `avatar_id` (wzorzec Protokołu Suwerenności).

## Definition of Done modułu
Kod + `README.md` modułu + `docs/moduly/<id>.md` + aktualizacja `docs/mapa_projektu.json` + adres w rejestrze (lub oznaczenie „kandydat") + terminy spoza glosariusza oznaczone `// TERMIN-KANDYDAT`.
Każda zmiana struktury = aktualizacja mapy i dokumentacji w tym samym kroku.

## Decyzje przyjęte (D1–D5)
- D1: lokalizacja `backend/modules/qac/`.
- D2: adresy `modul.qac`, `modul.qac.qrt` jako kandydaci do czasu zasilenia rejestru.
- D3: terminy-kandydaci oznaczane w kodzie; przydział do Toru glosariusza poza zakresem prac kodowych.
- D4: ADR-001 (stos Node.js) obowiązuje.
- D5: obowiązująca specyfikacja = `docs/qac_prompt_v2.md`.
Zmiana którejkolwiek decyzji: wyłącznie Suweren, przez edycję tej sekcji.

## Komunikacja
- Język: polski. Zero-fluff: bez uprzejmości, krótkie raporty stanu.
- Nieznany parametr lub brak danych = stop i pytanie do Suwerena. Absolutny zakaz konfabulacji.
- Zależności zewnętrzne wymagające pobrania (pliki efemeryd DE440/441) zgłaszaj — nie pobieraj bez zgody.
