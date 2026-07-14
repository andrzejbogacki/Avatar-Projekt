# ADR-007: Dokumentacja treściowa jako moduł z manifestem dokumentów
- **Data:** 2026-07-13
- **Status:** propozycja (zapis wykonawczy na polecenie Suwerena „Dokumentacja jako moduł, aby wszystko było w projekcie"; jawne zatwierdzenie wariantu — do potwierdzenia)
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Dokumenty kierunkowe projektu (strategia sieci suwerennych, źródła prawdy) powstawały poza repozytorium i nie miały miejsca w strukturze. Polecenie Suwerena: dokumentacja jako moduł, aby wszystko było w projekcie. Repo rozróżnia dokumentację governance (`pakiet_startowy_claude_code/docs/` — mapa, konwencje, ADR, moduły) od treści projektu (`docs/` w korzeniu — dotąd tylko `glosariusz.json`).

## Decyzja
Utworzyć moduł `backend/modules/dokumentacja/` oraz katalog treści `docs/dokumenty/` z manifestem dokumentów (`manifest.json`): rejestr artefaktów treściowych `{id, tytul, typ, status, wersja_dokumentu, format, sciezka, hash_zrodla, bajty}`, ścieżki względne wobec korzenia repo. Metadane wpisów utrzymuje Suweren edycją manifestu; hash i rozmiar wylicza wyłącznie przebudowa (`narzedzia/przebuduj_manifest_dokumentow.js` lub `POST /manifest/przebuduj` z sesją). Moduł serwuje dokumenty przez `/api/dokumentacja/*` z oznaczaniem terminów przez podpięty Glosariusz (zależność opcjonalna). Dokumenty kontraktowe pozostają w swoich lokalizacjach (`docs/glosariusz.json`, `protokol_suwerennosci.json`) — manifest je wskazuje, nie przenosi. Pierwszy dokument treściowy: `docs/dokumenty/strategia_sieci_suwerennych.md` (v1, piaskownica).

## Alternatywy odrzucone
- **Tylko katalog w pakiecie governance** (`pakiet_startowy_claude_code/docs/strategie/`) — nie realizuje polecenia „jako moduł": brak manifestu z hash-em, brak serwowania i auto-linkingu terminów; miesza treść projektu z governance.
- **Rozszerzenie modułu Glosariusz o magazyn dokumentów** — miesza odpowiedzialności (silnik semantyki ≠ magazyn treści), niezgodne z wzorcem Brahmandy (jeden cel na moduł).

## Konsekwencje
Pozytywne: każdy dokument kierunkowy ma miejsce w repo, hash treści (wykrycie manipulacji — spójne z zasadą weryfikowalności blueprintów ze strategii, rozdz. 9), auto-linking terminów glosariusza, jawne statusy `aktualny`/`dostepny`. Koszty: nowy moduł do utrzymania; dodanie dokumentu wymaga wpisu w manifeście + przebudowy. Wpływ: dev_server montuje moduł; menu podglądu +1 pozycja; mapa projektu +1 moduł. Terminy słownika strategii (rozdz. 10) są już obecne w glosariuszu (stan 2026-07-13, 67 rekordów) — auto-linking działa od pierwszego serwowania.
