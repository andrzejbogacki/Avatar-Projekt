# ADR-005: Rezonator Kwantowy — częstotliwości, synchronizacja, fazy wdrożenia
- **Data:** 2026-07-12
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Specyfikacja Rezonatora zostawia otwarte: tabelę częstotliwości
planetarnych, wartość domyślną stałej T w Sync(t), granice pasm
emisji oraz podział wdrożenia Home Assistant na fazy.

## Decyzja
1. **Częstotliwości planetarne wg Kosmicznej Oktawy (Hans Cousto, 1978):**
   okres astronomiczny → f = (1/T)·2ⁿ w pasmo słyszalne. Config
   przechowuje okresy i liczby oktaw; Hz wyliczane, spójność
   gwarantowana testem. 13 pozycji: doba (194,18), rok (136,10 „Om"),
   rok platoński (172,06), Księżyc syn. (210,42), Słońce (126,22 —
   wartość publikowana, wyprowadzenie pozakeplerowskie), Merkury
   (141,27), Wenus (221,23), Mars (144,72), Jowisz (183,58), Saturn
   (147,85), Uran (207,36), Neptun (211,45), Pluton (140,25).
2. **Sync(t) = mod(t, T), T domyślne = 360 s** — rytm spójny z matrycą
   3·6·9 (3·120 = 6·60 = 9·40); T konfigurowalne per Rezonator.
3. **Pasma emisji:** niskie 20–250 Hz (fundament/materia — mieszczą
   tony planetarne), średnie 250–2000 Hz (relacje — mieszczą
   Solfeggio), wysokie 2000–20000 Hz (wektor intencji). Rozszerzenia
   sub (<20 Hz) i ultra (>20 kHz) zdefiniowane, DOMYŚLNIE WYŁĄCZONE
   (uwaga sprzętowa) — włączane parametrem konfiguracji.
4. **Wdrożenie fazowe:** Faza A (ta implementacja) — warstwa logiczna,
   integracja QAC request-response, API REST, sesje ręczne, synteza
   WebAudio w panelu dev. Faza B — klient HA + encje (wymaga instancji
   HA i tokenu). Faza C — mosty DMX/MIDI + automatyka warunkowa.
   Fazy B i C: osobne zatwierdzenia przed implementacją.

## Alternatywy odrzucone
- T = 60 s (zegar systemowy) i T = 86 400 s (cykl dobowy) — odrzucone
  na rzecz 360 s.
- Emisja audio bezpośrednio z Node — sprzeczna ze specyfikacją
  (wszystko przez HA); WebAudio w panelu dev to narzędzie robocze
  fazy A, nie kontrakt modułu.

## Konsekwencje
- Warstwa logiczna działa bez sprzętu; rekordy Rezonatorów
  eksportowalne (samodzielne, pełny zestaw parametrów).
- Modulacja z QAC: odczyt mapy 3·6·9 profilu przez NOWY eksport
  kontraktu QAC `wczytajProfil` (bez sięgania do wnętrza modułu);
  częstotliwość spersonalizowana = czestotliwosc_odniesienia_hz ×
  czynnik_modulacji [wniosek logiczny — formuła robocza, spójna
  z O7 QAC]; brak profilu = jawny status brak_danych, sesja może
  trwać na źródłach Solfeggio/planetarnych.
- Pasma wyłączone → żądanie emisji poza pasmem = jawna odmowa.
