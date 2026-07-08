# Pliki efemeryd — zależność dostarczana poza repozytorium

Katalog na binarne pliki efemeryd. **Puste = kalkulator zwraca jawny błąd** —
zakaz cichego fallbacku na efemerydę analityczną Moshiera (algorytm przybliżony).

## Wariant A: Swiss Ephemeris `.se1` (zalecany na start, `ZRODLO_EFEMERYD='swieph'`)
Pliki `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (zakres 1800–2400, ~2 MB każdy),
skompresowane z JPL DE441, precyzja ~0,001″. Źródło: https://github.com/aloistr/swisseph/tree/master/ephe

## Wariant B: JPL DE440/DE441 (`ZRODLO_EFEMERYD='jpleph'`)
- `de440.eph` — zakres 1550–2650, ~100 MB
- `de441.eph` — zakres −13200…+17191, ~2,6 GB
Źródło: https://ssd.jpl.nasa.gov/ftp/eph/planets/

Pobranie wyłącznie za zgodą Suwerena (CLAUDE.md, sekcja Komunikacja).
Wybór wariantu: `config/astronomia.js` → `ZRODLO_EFEMERYD`.
