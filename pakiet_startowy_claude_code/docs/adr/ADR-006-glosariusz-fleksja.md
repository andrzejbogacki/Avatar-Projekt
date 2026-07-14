# ADR-006: Glosariusz — silnik fleksji, format indeksu, reguła kolizji
- **Data:** 2026-07-12
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Auto-linking terminów glosariusza wymaga dopasowania polskich form
odmienionych przez prekomputowany indeks (bez NLP w czasie działania).
Otwarte: silnik generowania form, format indeksu, reguła kolizji.
Morfeusz2 nie jest zainstalowany w środowisku (Python 3.9 dostępny).

## Decyzja
1. **Silnik kanoniczny: Morfeusz2** (jedyny pełny generator form
   fleksyjnych polszczyzny — słownik SGJP; uruchamiany jako tooling
   Python wyłącznie przy zmianie glosariusza, zgodnie z ADR-001).
   **Na razie: zapasowy generator regułowy w Node** (paradygmaty
   rzeczownikowo-przymiotnikowe) — formy oznaczone jawnym statusem
   `przyblizone`; nadgeneracja w indeksie dopasowań jest niegroźna
   (błędna forma nie wystąpi w tekście). Dołączenie Morfeusza =
   instalacja + przebudowa jedną komendą, bez zmian kodu skanera.
   Stempel ODRZUCONY: stemmer (nie generator), stos Java, wymagałby
   analizy w czasie rzeczywistym — sprzeczne ze specyfikacją.
2. **Indeks: osobny plik** `backend/modules/glosariusz/indeks/formy.json`,
   COMMITOWANY do repo (odtwarzalność bez silnika). Mapa forma→terminy
   (odczyt O(1), deterministyczny) + metadane: hash źródła (wykrycie
   nieaktualności), silnik, zbudowano_ts, status form per termin.
   `glosariusz.json` (docs/, v4→v5 w toku) pozostaje NIETKNIĘTY.
3. **Kolizje: najdłuższe dopasowanie wygrywa** (w znakach, od tej samej
   pozycji startowej; „Avatar Token" > „Avatar"). Remis → forma
   podstawowa przed odmienioną. Skan od lewej, dopasowania bez
   zagnieżdżeń. Porównanie bez rozróżniania wielkości liter; tekst
   widoczny bez jakiejkolwiek zmiany.

## Alternatywy odrzucone
- Stempel — patrz wyżej.
- Instalacja Morfeusz2 teraz — odroczona decyzją Suwerena.
- Indeks wbudowany w glosariusz.json — zaśmiecałby źródło prawdy
  artefaktem pochodnym w trakcie migracji v4→v5.

## Konsekwencje
- Skaner działa deterministycznie na indeksie; jakość pokrycia form
  rośnie po dołączeniu Morfeusza bez zmiany kontraktów.
- Zapis do glosariusza (po dwufazowym zatwierdzeniu) automatycznie
  przebudowuje indeks; rozjazd hash źródła = jawny status nieaktualności.
