# ADR-001: Stos technologiczny aplikacji
- **Data decyzji pierwotnej:** wcześniejsza faza projektu; zapis retroaktywny: 2026-07-08
- **Status:** zapis retroaktywny — oczekuje potwierdzenia Suwerena (punkt decyzyjny D4)
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Aplikacja Projekt Avatar wymaga jednolitego stosu dla rozwijalności modułowej oraz przyszłej architektury węzłów rozproszonych (telefon = 3, serwer lokalizacji = 6, chmura prywatna = 9).

## Decyzja
Frontend: React PWA. Backend: Node.js — moduły domenowe w `backend/modules/`. Baza: szyfrowana, w chmurze prywatnej (węzeł 9). Repozytorium: rozdział `frontend/` i `backend/` pod przyszłą ekspansję wieloplatformową.

## Alternatywy odrzucone
- Backend w Pythonie — odrzucony na rzecz jednolitego stosu JS; dopuszczony wyłącznie jako tooling pomocniczy.

## Konsekwencje
- Moduły backendu (w tym QAC) implementowane w Node.js; obliczenia astronomiczne przez natywny binding `sweph`/`swisseph` zamiast implementacji Python.
- Tooling pomocniczy w Pythonie: JSON wyłącznie z `ensure_ascii=False`.
