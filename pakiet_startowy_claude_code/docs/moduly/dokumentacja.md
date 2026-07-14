# Moduł: Dokumentacja (artefakty treściowe projektu)
- **id:** dokumentacja
- **adres_rejestr:** modul.dokumentacja — kandydat
- **ścieżka:** backend/modules/dokumentacja/
- **status:** piaskownica
- **wersja:** ADR-007 (2026-07-13, status: propozycja); kod: zaimplementowany 2026-07-13 (9 testów pass)

## 3 — ZASILANIE (cel i intencja)
- „Wszystko w projekcie": dokumenty kierunkowe (strategie, źródła prawdy) żyją w repozytorium, zarejestrowane w manifeście dokumentów z hash-em treści, serwowane przez API z auto-linkingiem terminów glosariusza. Żaden dokument kierunkowy nie istnieje wyłącznie poza repo.
- Pojęcia glosariusza: terminy słownika strategii (rozdz. 10) — wszystkie 17 obecnych w glosariuszu (stan 2026-07-13, 67 rekordów; auto-linking aktywny). Terminy-kandydaci: `manifest dokumentów` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3** (moduł aplikacji). Wewnętrznie: `src/http` odczyt/serwowanie (3) — `docs/dokumenty/` + `manifest.json` (6) — spójność hash treści (9a) + walidacja wpisów i bramka przebudowy `src/regulator9/` (9b).

## 6 — FORMA (struktura i interfejsy)
- **Dane:** `docs/dokumenty/` — katalog treści projektu (WERSJONOWANY w git); `docs/dokumenty/manifest.json` — rejestr: `{id, tytul, typ, status, wersja_dokumentu, format, sciezka, hash_zrodla, bajty}` + `{wersja, zbudowano_ts}`. Ścieżki względne wobec korzenia repo; manifest może wskazywać dokumenty poza katalogiem (stan startowy: `docs/glosariusz.json`, `protokol_suwerennosci.json`) — bez przenoszenia ich z lokalizacji kontraktowych.
- **Struktura (stan zapisany):**
  - `src/regulator9/walidacja.js` — walidacja wpisu (id `[a-z0-9_]{1,64}`, typ: strategia|zrodlo_prawdy|specyfikacja|blueprint, status: piaskownica|zamrozony_vN, format: markdown|json, ścieżka względna wewnątrz korzenia repo — ochrona path traversal).
  - `src/regulator9/magazyn.js` — manifest, lista (zgodność hash per dokument), odczyt dokumentu ze stemplem `{zrodlo, timestamp, status: live}`, przebudowa manifestu (jedyna ścieżka zapisu; wylicza hash SHA-256 + bajty, metadanych nie tyka), limit rozmiaru dokumentu.
  - `src/http/router.js` — `/api/dokumentacja/*`; `index.js` — kontrakt: `utworzDokumentacje({sciezkaManifestu?, katalogRepo?, maksBajty?, zegar?})` → `{obsluzZadanie, podepnijAuth, podepnijGlosariusz, przebudujManifest, magazyn_dokumentow}`; `test/` — 9 testów; `backend/narzedzia/przebuduj_manifest_dokumentow.js`.
- **Kontrakty wejścia:** `GET /manifest` (publiczne), `GET /dokumenty/:id`, `GET /dokumenty/:id/oznaczony`, `POST /manifest/przebuduj` (sesja Auth).
- **Kontrakty wyjścia:** dokument = metadane manifestu + `tresc` + `aktualny` (hash zgodny) + stempel; wariant oznaczony = `segmenty` skanera glosariusza zamiast `tresc` (segmenty sklejają się do oryginału co do znaku).
- **Zależności:** brak twardych. Auth opcjonalny (przebudowa manifestu przez HTTP); Glosariusz opcjonalny (oznaczanie — jego brak = jawny status `glosariusz_niepodpiety` 503, rdzeń działa). Strona podglądu: `dev_public/dokumenty.html`.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** każdy odczyt manifestu waliduje wszystkie wpisy; ścieżka bezwzględna lub wychodząca poza korzeń repo = odrzucenie; dokument ponad limit bajtów = jawny błąd; zmiana treści poza przebudową = `aktualny: false` (rozjazd hash); brak pliku = `dostepny: false` na liście, nie wyjątek; zapis manifestu wyłącznie przez przebudowę.
- **Punkty otwarte:**
  - OD1: zatwierdzenie ADR-007 przez Suwerena (zapis wykonawczy na polecenie „Dokumentacja jako moduł"; wariant i szczegóły do potwierdzenia).
  - OD2: termin `manifest dokumentów` — zgłoszenie do Toru glosariusza (terminy słownika strategii już w glosariuszu — zweryfikowano 2026-07-13). Uwaga porządkowa: dokumentacja glosariusza podaje 45 rekordów, plik ma 67 — do uspójnienia w module glosariusz.
  - OD3: rendering markdown w podglądzie (obecnie treść surowa z oznaczeniem terminów) — przyszła integracja PWA.
  - OD4: rejestracja dokumentów zamrożonych (`zamrozony_vN`) po pierwszym dokumencie zamykającym — wzorzec PS_v1.
- **Decyzje:** ADR-007 (moduł + manifest z hash-em; alternatywy: katalog governance, rozszerzenie glosariusza — odrzucone).
- **Historia zmian:**
  - 2026-07-13 — utworzenie modułu: magazyn+walidacja, router, kontrakt, narzędzie przebudowy, strona podglądu, manifest startowy (3 dokumenty: strategia_sieci_suwerennych, glosariusz, protokol_suwerennosci). Testy: 9 pass. Status zatwierdzenia: wykonane na polecenie Suwerena, ADR-007 w statusie propozycji.
