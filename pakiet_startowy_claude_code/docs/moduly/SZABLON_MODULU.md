# Szablon dokumentacji modułu
Kopiuj do `docs/moduly/<id>.md`. Sekcje odwzorowują matrycę 3·6·9 — dokumentacja modułu ma tę samą geometrię co system.

---

# Moduł: <nazwa>
- **id:** <id>
- **adres_rejestr:** <root>.<id> | kandydat
- **ścieżka:** backend/modules/<id>/ | frontend/src/modules/<id>/
- **status:** piaskownica | zamrożony_vN
- **wersja:** <spec / kod>

## 3 — ZASILANIE (cel i intencja)
- Co moduł wnosi do systemu (1–3 zdania).
- Pojęcia glosariusza, które realizuje: [...]
- Pozycja modułu w mapowaniu 3·6·9 systemu.

## 6 — FORMA (struktura i interfejsy)
- **Struktura katalogów** (drzewo).
- **Kontrakty wejścia:** co przyjmuje, od kogo, schemat.
- **Kontrakty wyjścia:** co emituje, dla kogo, schemat.
- **Zależności zewnętrzne** (biblioteki, API, usługi) + zachowanie przy ich braku.
- **Dane i schematy:** pliki, klucze, formaty, stałe konfiguracyjne.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje i warunki brzegowe:** co moduł odrzuca i kiedy.
- **Punkty otwarte:** numerowane O1, O2, ...
- **Decyzje:** odnośniki do ADR.
- **Historia zmian:** data — zakres — status zatwierdzenia.
