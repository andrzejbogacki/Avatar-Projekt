# Dokumentacja — artefakty treściowe projektu

Moduł backendu Projekt Avatar. Dokumenty treściowe projektu (strategie, źródła
prawdy) żyją w repozytorium, są zarejestrowane w manifeście dokumentów
z hash-em treści i serwowane przez API — z opcjonalnym oznaczaniem terminów
przez moduł Glosariusz. „Wszystko w projekcie": żaden dokument kierunkowy
nie istnieje wyłącznie poza repo.

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/dokumentacja.md`
**Decyzje:** ADR-007 (dokumentacja jako moduł, manifest z hash-em)
**Dane:** `docs/dokumenty/` (dokumenty + `manifest.json` — WERSJONOWANE w git);
manifest wskazuje też dokumenty poza tym katalogiem (np. `docs/glosariusz.json`,
`protokol_suwerennosci.json`) bez przenoszenia ich z miejsc kontraktowych.
**Adres rejestru:** `modul.dokumentacja` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/http/router.js` — odczyt i serwowanie dokumentów (pozycja 3 — impuls)
- `docs/dokumenty/` + `manifest.json` — magazyn treści i rejestr (6 — forma)
- spójność hash treści z manifestem, jawny status `aktualny` (9a)
- `src/regulator9/` — walidacja wpisów manifestu (id, typ, status, ścieżka
  w korzeniu repo) + bramka przebudowy manifestu (9b)

## Zasady (ADR-007)
- **Metadane wpisów** (id, tytuł, typ, status, ścieżka) utrzymuje Suweren edycją
  `docs/dokumenty/manifest.json`; **hash i rozmiar** wylicza wyłącznie przebudowa:
  `node narzedzia/przebuduj_manifest_dokumentow.js`.
- Zmiana treści dokumentu poza przebudową = jawny status `aktualny: false`
  (rozjazd hash), nigdy cicha akceptacja.
- Ścieżki wpisów wyłącznie względne i wewnątrz korzenia repo (ochrona path
  traversal); typy: `strategia | zrodlo_prawdy | specyfikacja | blueprint`;
  statusy wg KONWENCJE §5 (`piaskownica | zamrozony_vN`).
- Rdzeń działa bez Auth (odczyt publiczny) i bez Glosariusza (brak oznaczania
  = jawny status `glosariusz_niepodpiety`, nie błąd).

## Kontrakt publiczny (`index.js`)
`utworzDokumentacje({ sciezkaManifestu?, katalogRepo?, maksBajty?, zegar? })` →
`{ obsluzZadanie, podepnijAuth, podepnijGlosariusz, przebudujManifest(), magazyn_dokumentow }`

## Endpointy `/api/dokumentacja`
Publiczne: `GET /manifest` (lista + zgodność hash) · `GET /dokumenty/:id`
(treść ze stemplem `{zrodlo, timestamp, status: live}`) ·
`GET /dokumenty/:id/oznaczony` (segmenty glosariusza).
Z sesją: `POST /manifest/przebuduj`.
