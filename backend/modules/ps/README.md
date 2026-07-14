# PS — Protokół Suwerenności

Moduł backendu Projekt Avatar. Cztery moduły Protokołu Suwerenności na jednym
pliku JSON per Avatar (schemat ps_v1, odtworzony — ADR-003): Jakości Kwantowe,
Akceptowane Symulacje, Tokeny (z mechaniką Volt), Protokół Relacji
(Strumień 1/2, bramka wstępna, zgody na kontakt).

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/ps.md`
**Decyzje:** ADR-003 (odtworzenie schematu, macierz S1 „wszystko brak")
**Wzorzec dokumentu:** `protokol_suwerennosci.json` (korzeń repo)
**Adres rejestru:** `modul.ps` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/widoki/` — filtrowanie profilu wg Strumienia 2 (pozycja 3 — impuls)
- `profile/` + `src/profil/` — dokumenty PS per `avatar_id` (pozycja 6; katalog w `.gitignore`)
- `src/dostep/` — poziom obserwatora i stany osi S1 (pozycja 9a — rezonator)
- `src/regulator9/` — bramka wstępna, zgody na kontakt, przyjęcie certyfikacji z Auth (9b)
- `config/` — osie, poziomy, stany, macierz domyślna, mapa Strumienia 2

## Kontrakt publiczny (`index.js`)
`utworzPS({ katalogProfili?, zegar? })` → `{ obsluzZadanie(req,res), podepnijAuth(auth),
przyjmijAktCertyfikacji, magazyn_profili, usluga_bramki, usluga_kontaktu }`

Integracja z Auth (dwukierunkowa, wyłącznie przez kontrakty):
- PS czyta tożsamość: `podepnijAuth(instancjaAuth)`.
- Auth zapisuje akt certyfikacji: `utworzAuth({ hookPS: ps.przyjmijAktCertyfikacji })`.
  Typ/poziom certyfikatu = null (decyzja Suwerena odroczona).

## Endpointy `/api/ps`
`GET /profil/:id` (widok S2) · `GET /profil/:id/os/:os` (stan S1) ·
`POST /bramka/:id` (zobowiązanie 2-elementowe → cookie gościa) ·
`POST /kontakt/:id` · `GET|POST /moj` · `PUT /moj/jakosci` · `PUT /moj/symulacje` ·
`PUT /moj/tokeny` · `PUT /moj/tokeny/volt` · `PUT /moj/strumien1` · `PUT /moj/strumien2` ·
`GET /moj/kontakty` · `POST /moj/kontakty/:id/decyzja`

## Uruchomienie
```
cd backend && npm test        # testy modułu razem z resztą suity
npm run dev                   # panel deweloperski: /ps.html
```
