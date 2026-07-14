# Rezonator Kwantowy — autonomiczna stabilizacja Źródeł

Moduł backendu Projekt Avatar (Faza A — warstwa logiczna, ADR-005).
Rozproszone rezonatory per Źródło (Avatar/obiekt/misja), plan emisji
3-etapowy (wzornik → rytm → wielowarstwowa modulacja), integracja QAC
request-response. Warstwa wykonawcza (Home Assistant): Fazy B/C.

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/rezonator.md`
**Decyzje:** ADR-005 (Cousto, T=360 s, pasma, fazy)
**Adres rejestru:** `modul.rezonator` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/emisja/` — plan emisji 3-etapowy (pozycja 3 — impuls)
- `zrodla/` + `src/zrodla/` — samodzielne, eksportowalne rekordy Źródeł (6; dane w `.gitignore`)
- `src/sync/` — Sync(t) = mod(t, T), sygnatura Źródła (pozycja 9a — rezonans)
- `src/regulator9/` — klient QAC (stemplowanie, `pewnosc`, jawny `brak_danych`), walidacja pasm (9b)
- `src/sesje/` — sesje emisji ręczne (rejestr w pamięci; tryb automatyczny = Faza B/C)
- `config/` — tabela Cousto (Hz wyliczane z okresów), Solfeggio, pasma, T — zero magic numbers

## Częstotliwości
- **Planetarne:** Kosmiczna Oktawa (Cousto) — `f = (1/okres) · 2ⁿ`; spójność tabeli
  gwarantowana testem.
- **Solfeggio:** pełna skala 174–963 Hz (baza projektu: 432/528).
- **QAC:** `czestotliwosc_odniesienia_hz × czynnik_modulacji` z mapy 3·6·9 profilu
  (kontrakt `qac.wczytajProfil`); brak profilu = jawny `brak_danych`.
- **Pasma:** niskie 20–250 (materia) · średnie 250–2000 (relacje) · wysokie 2000–20000 (intencja);
  sub/ultra zdefiniowane, domyślnie wyłączone (uwaga sprzętowa).

## Kontrakt publiczny (`index.js`)
`utworzRezonator({ katalogZrodel?, katalogProfiliQAC?, rozszerzenia_wlaczone?, zegar? })` →
`{ obsluzZadanie, podepnijAuth, magazyn_zrodel, generator_planu, rejestr_sesji, klient_qac }`

## Endpointy `/api/rezonator` (sesja Auth obowiązkowa)
`GET /konfiguracja` · `GET|POST /zrodla` · `PUT /zrodla/:id` · `GET /zrodla/:id/sygnatura` ·
`POST /zrodla/:id/plan` · `POST /sesje` (start ręczny) · `GET /sesje` · `POST /sesje/:id/stop`

## Podgląd
`npm run dev` → `/rezonator.html` — synteza WebAudio w przeglądarce
(narzędzie robocze Fazy A; docelowa emisja przez HA w Fazie B).
