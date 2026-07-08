# QAC — Quantum Avatar Core

Moduł backendu Projekt Avatar. Silnik wprowadzania, walidacji i analizy relacyjnej
profili Awatarów: obliczenia astronomiczne (Swiss Ephemeris, natywny binding `sweph`),
dane środowiskowe i normalizacja do matrycy 3·6·9.

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/qac.md`
**Specyfikacja:** `pakiet_startowy_claude_code/docs/qac_prompt_v2.md`
**Adres rejestru:** `modul.qac` (kandydat), submoduł QRT: `modul.qac.qrt` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/calculator/` — silnik astronomiczny (pozycja 3 — impuls)
- `profiles/` — baza dokumentowa profili (pozycja 6 — forma)
- `src/normalizer/` (9a rezonator) + `src/regulator9/` (9b regulator) — pozycja 9 dwuaspektowo
- `src/rectification/` — submoduł QRT (zadania asynchroniczne)
- `cache/` — bufor środowiskowy (Redis + fallback in-memory)
- `config/` — wszystkie stałe modułu (zakaz magic numbers poza tą warstwą)
- `ephemeris/` — pliki efemeryd, dostarczane osobno (patrz `ephemeris/README.md`)

## Uruchomienie testów
```
cd backend && npm test
```
