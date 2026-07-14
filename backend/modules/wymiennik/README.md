# Wymiennik (Gebo) — wymiana tokenów między Avatarami

Moduł backendu Projekt Avatar. Wymiana jako równowaga, zero długu systemowego.
Walidacja każdej transakcji przez PS (Moduł 3 — akceptacja obu tokenów przez
obie strony). Avatar token = voucher osobisty na produkt/usługę (ADR-004).

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/wymiennik.md`
**Decyzje:** ADR-004 (model voucherów, adaptery, spory bezterminowe)
**Adres rejestru:** `modul.wymiennik` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/wymiana/` — transakcje bezpośrednie, oferty publiczne, rozliczenia (3 + 9a)
- `tokeny/`, `salda/`, `transakcje/`, `oferty/` — dane JSON (6; katalogi w `.gitignore`)
- `src/fabryka/` — tworzenie tokenów (swobodne) + emisja voucherów
- `src/salda/` — salda nieujemne z konstrukcji, transfer przy pełnym pokryciu
- `src/regulator9/` — walidacja PS (twarda), adaptery zewnętrzne (interfejs + atrapa) (9b)
- `config/` — klasy tokenów, tryby, statusy — zero magic numbers

## Reguły zakodowane
- Kurs avatar↔avatar: sztywno **1:1** (nie konfigurowalny — zasada Gebo).
- Transakcja dopuszczalna wyłącznie przy akceptacji (pełna|warunkowa) OBU tokenów
  w PS Module 3 OBU stron — inaczej jawna odmowa z przyczyną.
- Tryb „poza systemem": transfer po potwierdzeniu wykonania przez OBIE strony;
  anulowanie także wymaga OBU stron; bezterminowo (ADR-004).
- Saldo startowe: 0 — vouchery powstają wyłącznie przez emisję emitenta
  (wytworzenie produktu/usługi).

## Kontrakt publiczny (`index.js`)
`utworzWymiennik({ katalogi..., zegar? })` → `{ obsluzZadanie, podepnijAuth, podepnijPS,
fabryka, wymiana, rejestr_adapterow, magazyn_tokenow, magazyn_sald }`

## Endpointy `/api/wymiennik` (sesja Auth obowiązkowa)
`GET|POST /tokeny` · `POST /tokeny/:id/emisja` · `GET /moje/salda` ·
`GET /moje/transakcje` · `POST /transakcje` ·
`POST /transakcje/:id/{wycofaj|odpowiedz|potwierdz|anuluj}` ·
`GET|POST /oferty` · `POST /oferty/:id/{wycofaj|przyjmij}`
