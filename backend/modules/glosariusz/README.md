# Glosariusz — Inteligentny System Uspójniania Zrozumienia

Moduł backendu Projekt Avatar. Automatyczna detekcja terminów glosariusza
(z formami odmienionymi) w dowolnym tekście, inline-linking bez zmiany treści,
podgląd (wprowadzenie) i pełna definicja (rozszerzenie) na żądanie.

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/glosariusz.md`
**Decyzje:** ADR-006 (silnik fleksji, format indeksu, reguła kolizji)
**Źródło prawdy:** `docs/glosariusz.json` (v4→v5 w toku) — moduł go NIE modyfikuje
poza bramką dwufazową. **Adres rejestru:** `modul.glosariusz` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/skaner/` — detekcja + oznaczanie segmentów (pozycja 3 — impuls)
- `indeks/formy.json` — prekomputowany indeks form (6; WERSJONOWANY w git — ADR-006)
- `src/indeks/` + `src/fleksja/` — budowa indeksu, generator regułowy (9a — spójność, hash źródła)
- `src/regulator9/` — bramka dwufazowa zmian terminów, magazyn (9b)
- `propozycje/` — propozycje zmian (poza git)

## Zasady (ADR-006)
- **Silnik:** regułowy (formy `przyblizone`, jawny status); kanoniczny Morfeusz2
  do dołączenia — przebudowa: `node narzedzia/przebuduj_indeks_glosariusza.js`.
- **Kolizje:** najdłuższe dopasowanie wygrywa; remis → forma podstawowa;
  bez zagnieżdżeń; wielkość liter bez znaczenia; tekst widoczny bez zmian.
- **Dwufazowość:** propozycja (sesja Auth) → zatwierdzenie WYŁĄCZNIE Suwerena
  → zapis do glosariusza → automatyczna przebudowa indeksu.
- Rozjazd hash źródła i indeksu = jawny status `aktualny: false`.

## Kontrakt publiczny (`index.js`)
`utworzGlosariusz({ sciezkaGlosariusza?, sciezkaIndeksu?, katalogPropozycji?, zegar? })` →
`{ obsluzZadanie, podepnijAuth, przebudujIndeks(), oznacz(tekst), magazyn_glosariusza, usluga_propozycji }`

## Endpointy `/api/glosariusz`
Publiczne (rdzeń bez Auth — spec): `GET /terminy` · `GET /terminy/:nazwa` ·
`POST /oznacz {tekst}` → segmenty · `GET /indeks` (status).
Z sesją: `POST /propozycje` · `GET /propozycje` (Suweren) ·
`POST /propozycje/:id/decyzja` (Suweren) · `POST /indeks/przebuduj`.
