# Moduł: Rezonator Kwantowy
- **id:** rezonator
- **adres_rejestr:** modul.rezonator — kandydat
- **ścieżka:** backend/modules/rezonator/
- **status:** piaskownica (Faza A — warstwa logiczna)
- **wersja:** ADR-005 (2026-07-12); kod: zaimplementowany 2026-07-12 (15 testów pass)

## 3 — ZASILANIE (cel i intencja)
- System autonomicznej stabilizacji Źródeł: każde Źródło (Avatar, obiekt, misja) posiada własny, zintegrowany obiekt Rezonatora (nie zewnętrzny sterownik). Mechanika kreacji dźwiękiem w 3 etapach: fokus częstotliwości (wzornik) → synchronizacja rytmu (BPM ⇄ Sync(t)) → wielowarstwowa modulacja (niskie/średnie/wysokie z niezależną kontrolą f/amplitudy/fazy).
- Pojęcia glosariusza: Rezonator Kwantowy, Źródło, 3 6 9, Solfeggio. Terminy-kandydaci: `wzornik` // TERMIN-KANDYDAT, `Kosmiczna Oktawa` // TERMIN-KANDYDAT, `sygnatura Źródła` // TERMIN-KANDYDAT.
- Pozycja systemowa: **3**. Wewnętrznie: `src/emisja` (3) — `zrodla/` (6) — `src/sync` (9a — rezonans) + `src/regulator9` (9b — klient QAC, walidacja pasm).

## 6 — FORMA (struktura i interfejsy)
- **Struktura (stan zapisany):**
  - `config/` — `czestotliwosci` (tabela Cousto: okresy + oktawy, Hz WYLICZANE — spójność gwarantowana testem; Solfeggio 174–963; tolerancja zgodności), `pasma` (5 pasm z funkcjami; sub/ultra domyślnie wyłączone; amplitudy domyślne warstw), `sync` (T=360 s, zakres BPM 20–300).
  - `src/zrodla/magazyn.js` — rekordy Źródeł: samodzielne, eksportowalne (zrodlo_id, typ, wibracja_f, rytm_bpm, misja, T_s, wlasciciel); edycja wyłącznie właściciela.
  - `src/sync/zegar.js` (9a) — `sync(t,T)=mod(t,T)`, `sygnaturaZrodla` (faza cyklu, timestamp).
  - `src/emisja/plan.js` (3) — plan 3-etapowy; `oktawujDoPasma` (tożsamość oktawowa); składniki: solfeggio (walidacja skali) / planetarna (tabela Cousto) / qac; brak danych składnika = oznaczenie jawne, plan z pozostałych; wszystkie puste = odmowa; pasma wyłączone = odmowa.
  - `src/regulator9/klient_qac.js` (9b) — request-response na żądanie, bez cache; stempel {zrodlo, timestamp, status}; pole `pewnosc` obowiązkowe (null = jawny brak metryki); częstotliwość spersonalizowana = `czestotliwosc_odniesienia_hz × czynnik_modulacji` [wniosek logiczny ADR-005].
  - `src/sesje/rejestr.js` — sesje ręczne start/stop (pamięć; restart = koniec sesji — jawna konsekwencja); tryb automatyczny odroczony do Fazy B/C.
  - `src/http/router.js` — `/api/rezonator/*`; `index.js` — kontrakt `utworzRezonator`; `test/` — 15 testów.
- **Zależności:** QAC (wymagany — NOWY kontraktowy eksport `wczytajProfil` dodany do `modules/qac/index.js`; brak profilu nie blokuje sesji), Auth (tożsamość, `podepnijAuth`). PS: odczyt avatar_id przez Auth. Kernel: brak (odroczony).
- **Dane:** `zrodla/*.json` w `.gitignore`.

## 9 — REGULACJA (kontrola i stan)
- **Walidacje:** typ Źródła z listy; wibracja_f > 0; BPM w zakresie config; edycja Źródła wyłącznie właściciel; stop sesji wyłącznie właściciel/uruchamiający; składniki wzornika walidowane (skala Solfeggio, tabela ciał, klasa); pasma wyłączone = jawna odmowa; QAC brak profilu = jawny `brak_danych`, nigdy cichy default.
- **Punkty otwarte:**
  - OR1: Faza B — klient HA + encje (wymaga instancji HA i tokenu od Suwerena) — osobne zatwierdzenie.
  - OR2: Faza C — mosty DMX/MIDI + automatyka warunkowa — osobne zatwierdzenie.
  - OR3: formuła częstotliwości spersonalizowanej QAC (odniesienie × czynnik modulacji) — robocza, do rewizji przy kanonizacji O7 QAC.
  - OR4: ton Słońca 126,22 Hz — wartość publikowana Cousto bez wyprowadzenia okresowego (jawnie oznaczone w config).
- **Decyzje:** ADR-005 (tabela Cousto, T=360 s, pasma 20-250/250-2000/2000-20000 + sub/ultra wyłączone, fazy A/B/C).
- **Historia zmian:**
  - 2026-07-12 — cztery otwarte punkty rozstrzygnięte przez Suwerena → ADR-005.
  - 2026-07-12 — implementacja TDD Fazy A: config (test spójności wykrył i skorygował 2 rozbieżności tabeli — oktawy roku platońskiego, okres Urana), Źródła+Sync, klient QAC + plan emisji, sesje + router. Testy: 15 pass. Kontraktowy eksport `wczytajProfil` w QAC. Montaż w dev_server, panel `/rezonator.html` (WebAudio), menu zaktualizowane.
