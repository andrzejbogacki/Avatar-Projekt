# Projekt Avatar — Backend: Roadmap i Prompty dla Claude Code
**Suweren:** Andrzej Bogacki (avatar_id: `andrzej_bogacki`)
**Data dokumentu:** 2026-07-11
**Status:** dokument roboczy — wykonawczy dla Claude Code
---
## ZASADA WYKONANIA (KRYTYCZNE — przeczytaj przed startem)
1. **Wykonuj moduły PO KOLEI, jeden na raz.** Nie zaczynaj kolejnego modułu, dopóki poprzedni nie ma Definition of Done i jawnego zatwierdzenia Suwerena.
2. **Nie zgaduj otwartych punktów (TODO).** Każdy moduł ma sekcję "Otwarte punkty" — dla nich przedstaw propozycję z uzasadnieniem i CZEKAJ na zatwierdzenie przed implementacją. Brak zatwierdzenia = brak zapisu.
3. **Trzymaj się konwencji projektu:**
   - Governance: `pakiet_startowy_claude_code/` (CLAUDE.md, ARCHITEKTURA.md, KONWENCJE.md, MAPA_PROJEKTU.md, rejestr ADR).
   - Wzorzec jakości: moduł QAC (`backend/modules/qac/`) — stemplowanie danych (źródło/timestamp/status: live|cache|stale), nagłówek avatar_id, zero magic numbers, async queue z obowiązkowym polem `pewnosc`, Definition of Done, precyzja topocentryczna TDB/ΔT tam gdzie dotyczy.
   - Każda decyzja architektoniczna → wpis ADR.
4. **Dwufazowe zatwierdzanie obowiązuje wszędzie:** propozycja → jawne zatwierdzenie Suwerena → zapis. "Omówione" ≠ "zapisane".
5. **Brak danych = jawny status, nigdy cichy default.** Nieznany parametr = stop, decyzja do Suwerena.
---
## KOLEJNOŚĆ MODUŁÓW
1. **Auth** (Moduł 0) — tożsamość i sesja
2. **PS — Protokół Suwerenności** (Moduły 1–4)
3. **Wymiennik (Gebo)** — zależny od PS Moduł 3
4. **Rezonator Kwantowy**
5. **Glosariusz**
**Kernel — pominięty.** Brak dostarczonej treści `kernel_specyfikacja_v1.md`. Wszystkie moduły rozwijane niezależnie, integracja z kernelem odroczona do czasu dostarczenia specyfikacji.
---
## MAPA ZALEŻNOŚCI
| Moduł | Zależy od | Kto od niego zależy |
|---|---|---|
| Auth | — | PS, Wymiennik, Rezonator |
| PS | Auth (tożsamość) | Wymiennik, Rezonator |
| Wymiennik | PS (Moduł 3), Auth | — |
| Rezonator Kwantowy | QAC, Auth, PS | — |
| Glosariusz | — (dane własne) | — |
| Kernel | — | odroczone dla wszystkich |
---
---
# MODUŁ 0 — AUTH
```
ZADANIE: Backend modułu Auth — tożsamość, sesja i rejestracja
przez zaproszenie dla Projekt Avatar.
ZAKRES:
- Logowanie / wylogowanie / zarządzanie sesją
- Endpoint weryfikacji sesji (kto zalogowany, jaki identyfikator)
- Rejestracja WYŁĄCZNIE przez zaproszenie — brak otwartej,
  publicznej rejestracji
MECHANIZM ZAPROSZENIA (dwufazowy, zgodny z regułą projektu
propozycja → zatwierdzenie → zapis):
1. Dowolny zarejestrowany Avatar może wygenerować PROPOZYCJĘ
   zaproszenia (kandydat + uzasadnienie).
2. Propozycja trafia do Suwerena (Andrzej Bogacki) do ręcznego
   zatwierdzenia. Żadne konto nie powstaje bez tego kroku.
3. Po zatwierdzeniu: (a) konto zostaje utworzone w Auth,
   (b) w module PS zapisany zostaje pierwszy akt certyfikacji
   dla nowego konta — zapraszający oświadcza zaufanie do
   zapraszanego (typ certyfikatu i poziom startowy: DO USTALENIA
   z Suwerenem w kolejnym kroku, nie zakładać domyślnie).
POZA ZAKRESEM:
- Poziomy dostępu (niesklasyfikowany/uczeń/adept/mistrz) jako
  atrybut konta — to dane PS, nie Auth.
- Automatyczne, niezatwierdzone tworzenie kont w jakiejkolwiek formie.
ZALEŻNOŚCI (dwukierunkowe):
- Auth zapisuje do PS przy tworzeniu konta (akt certyfikacji).
- PS czyta z Auth tożsamość zalogowanego obserwatora.
ŚRODOWISKA:
- Produkcja: brak kont domyślnych/testowych, brak otwartej rejestracji.
- Dev/test: dozwolone konto demo, wykluczone z builda produkcyjnego.
OTWARTE PUNKTY (TODO dla Claude Code):
- Wybór technologii Auth (własny system / gotowy dostawca /
  Keycloak) — przedstawić rekomendację z uzasadnieniem przed
  implementacją. [ROZSTRZYGNIĘTE: ADR-002 — własny moduł Node.js]
- Przechowywanie kont (JSON vs baza) — rekomendacja w tym samym kroku.
  [ROZSTRZYGNIĘTE: ADR-002 — JSON per konto]
- Typ i poziom startowy certyfikatu nadawanego przy zaproszeniu —
  wymaga decyzji Suwerena przed napisaniem logiki zapisu do PS.
  [OTWARTE]
```
---
# MODUŁ PS — PROTOKÓŁ SUWERENNOŚCI (Moduły 1–4)
```
ZADANIE: Backend modułu PS dla Projekt Avatar. Implementacja API
CRUD + logiki dostępu dla czterech modułów Protokołu Suwerenności,
zgodnie ze schematem protokol_suwerennosci.json (v1, zamrożony).
PRZECHOWYWANIE:
- Jeden plik JSON per Avatar (schemat = protokol_suwerennosci.json).
- Suweren: Andrzej Bogacki, avatar_id: andrzej_bogacki (dane startowe).
═══════════════════════════════════════════
MODUŁ 1 — Jakości Kwantowe (Talenty Avatara)
═══════════════════════════════════════════
- 4 osie (Wolność/Akceptacja, Mądrość/Piękno, Sprawiedliwość/Dobro,
  Odpowiedzialność/Prawda), każda z poziom_3 i poziom_6.
- Każdy poziom = { autocertyfikat, certyfikaty_zewnetrzne[] }.
- autocertyfikat.sygnatura_prawdy: pole obecne w schemacie,
  wartość null. NIE implementować logiki generowania/wypełniania
  tego pola w tej fazie — tylko struktura gotowa na przyszłe użycie.
- certyfikaty_zewnetrzne: pusta tablica. NIE implementować schematu
  zapisu certyfikatów od innych Avatarów w tej fazie — tylko puste
  miejsce w strukturze.
- Endpointy: odczyt pełnej matrycy, edycja poziomu przez Suwerena
  (autocertyfikacja = wyłącznie Suweren edytuje własne dane).
═══════════════════════════════════════════
MODUŁ 2 — Akceptowane Symulacje (Gry)
═══════════════════════════════════════════
- Rejestr symulacji: { symulacja, akceptacja: pełna|warunkowa|brak,
  warunek, opis }.
- Endpointy: odczyt rejestru, dodanie/edycja wpisu przez Suwerena.
═══════════════════════════════════════════
MODUŁ 3 — Tokeny (Systemy Wymiany)
═══════════════════════════════════════════
- Rejestr tokenów: { token, akceptacja, warunek, mapowanie_369, opis }.
- Volt Token: pełna mechanika (1 token/Avatar, alokacja procentowa
  płynna, redystrybucja w dowolnym momencie) — zaimplementować jako
  osobny podmoduł z endpointem alokacji.
- Endpointy: odczyt rejestru, edycja alokacji Volt Token przez
  zalogowanego Avatara (własna alokacja), edycja rejestru przez Suwerena.
═══════════════════════════════════════════
MODUŁ 4 — Protokół Relacji (Zasady Dostępu)
═══════════════════════════════════════════
HIERARCHIA POZIOMÓW: niesklasyfikowany < uczeń < adept < mistrz
STANY DOSTĘPU: brak < warunkowy < akceptacja < dozwolony
STRUMIEŃ 1 — dostęp relacyjny:
- Macierz domyślna per oś (już zdefiniowana w protokol_suwerennosci.json
  → strumien_1_dostep_relacyjny.macierz_domyslna).
- Tryb: domyślne + nadpisanie ręczne per para właściciel-obserwator.
STRUMIEŃ 2 — dostęp do wiedzy (mapa ZATWIERDZONA, wdrożyć dokładnie):
- niesklasyfikowany: tylko dane podstawowe (imię, status suwerenny)
- uczeń: + Moduł 2 (pełny) + Moduł 3 (bez szczegółów certyfikacji)
- adept: + Moduł 1 (pełny) + Moduł 3 (pełny)
- mistrz: wszystko, łącznie z Modułem 4
BRAMKA WSTĘPNA:
- Działa PRZED rejestracją, dla każdej osoby niezalogowanej
  próbującej zobaczyć Profil Suwerena.
- Dwa elementy zatwierdzenia: (1) uznanie statusu Profilu Suwerena,
  (2) klauzula nieużycia danych przeciw Suwerenowi.
- Zatwierdzenie = zapis zobowiązania w rejestrze dostępu, odblokowuje
  podgląd zgodny z poziomem "niesklasyfikowany" (Strumień 2).
ZGODA NA KONTAKT (stan "warunkowy"):
- UI: przycisk "proś o kontakt" → Suweren/właściciel osi otrzymuje
  żądanie → akceptacja lub odmowa.
- Brak automatycznego przyznania dostępu bez tej akcji.
═══════════════════════════════════════════
ZALEŻNOŚCI (dwukierunkowe)
═══════════════════════════════════════════
- PS CZYTA z Auth: tożsamość i sesję zalogowanego obserwatora.
- PS NIE przechowuje poziomów dostępu w Auth — poziomy (Strumień 1
  i 2) są danymi PS, przypisanymi do identyfikatora z Auth.
- Auth ZAPISUJE do PS przy zatwierdzonym zaproszeniu: pierwszy akt
  certyfikacji nowego konta. Typ i poziom startowy tego certyfikatu:
  OTWARTE — patrz niżej. PS musi mieć gotowy endpoint przyjmujący
  ten zapis, ale bez założonej z góry wartości.
- PS NIE zależy od Kernela — rozwój niezależny, punkt integracji
  do ustalenia po dostarczeniu kernel_specyfikacja_v1.md.
═══════════════════════════════════════════
OTWARTE PUNKTY (TODO / blokady częściowe)
═══════════════════════════════════════════
- Typ i poziom startowy certyfikatu przy zaproszeniu (zależność
  z Auth) — wymaga decyzji Suwerena przed uruchomieniem tej ścieżki
  end-to-end. Endpoint ma istnieć, ale logika wartości — zablokowana.
- Wybór technologii Auth (własny system / dostawca / Keycloak) —
  wpływa na format identyfikatora, który PS będzie odczytywać.
  Do potwierdzenia przed pełną integracją Auth↔PS.
  [ROZSTRZYGNIĘTE: ADR-002 — identyfikator = avatar_id]
- UWAGA (2026-07-11): plik protokol_suwerennosci.json NIEOBECNY
  w repozytorium — dostarczyć przed startem modułu PS.
```
---
# MODUŁ WYMIENNIK (GEBO)
```
ZADANIE: Backend modułu Wymiennik dla Projekt Avatar. System
wymiany tokenów między Avatarami, spięty z PS (Moduł 3 — Tokeny)
jako warstwą walidacji akceptacji. Nazwa koncepcyjna: Gebo —
wymiana jako równowaga, zero długu systemowego.
═══════════════════════════════════════════
WALIDACJA PRZEZ PS (warunek każdej transakcji)
═══════════════════════════════════════════
- Transakcja tokenem X między Avatarem A i B jest dopuszczalna
  WYŁĄCZNIE gdy token X ma status akceptacji (pełna lub warunkowa)
  w PS Module 3 OBU stron.
- Wymiennik odpytuje PS przed dopuszczeniem transakcji.
  Brak akceptacji po którejkolwiek stronie = odrzucenie
  z jawnym komunikatem przyczyny.
═══════════════════════════════════════════
OBSŁUGIWANE TOKENY
═══════════════════════════════════════════
1. Avatar Token — natywny, oś transakcyjna.
2. Tokeny wewnętrzne — stworzone w środowisku przez Avatarów
   (patrz: Narzędzia stwarzania tokenów).
3. Tokeny zewnętrzne — obsługa przez API (integracja z systemami
   spoza środowiska; architektura adapterowa, konkretne
   integracje poza zakresem fazy 1 — przygotować interfejs).
═══════════════════════════════════════════
ZASADY KURSU
═══════════════════════════════════════════
- Avatar Token ↔ Avatar Token: sztywno 1:1, bez negocjacji
  (zasada Gebo, zakodowana, nie konfigurowalna).
- Wszystkie inne pary tokenów: kurs uzgadniany przez strony
  transakcji per transakcja. System nie narzuca kursu.
═══════════════════════════════════════════
TRYBY INICJACJI WYMIANY (oba od startu)
═══════════════════════════════════════════
1. Oferta publiczna: Avatar wystawia ofertę (co oddaje, czego
   oczekuje, kurs proponowany) widoczną dla sieci; inni odpowiadają.
2. Transakcja bezpośrednia: dwaj Avatarowie uzgadniają wymianę
   prywatnie i rejestrują ją w systemie.
═══════════════════════════════════════════
ROZLICZENIE
═══════════════════════════════════════════
- Tokeny wewnętrzne (w tym Avatar Token): salda prowadzone
  przez system, transfer automatyczny w momencie zawarcia
  transakcji.
- Tryb dodatkowy "poza systemem": strony oznaczają transakcję
  jako wykonywaną fizycznie (spotkanie 3D); system rejestruje
  umowę, transfer sald następuje po OBUSTRONNYM potwierdzeniu
  wykonania. Brak potwierdzenia = transakcja wisząca, bez
  transferu.
- Tokeny zewnętrzne: rejestracja umowy + wywołanie API
  zewnętrznego systemu (w ramach architektury adapterowej).
═══════════════════════════════════════════
NARZĘDZIA STWARZANIA TOKENÓW
═══════════════════════════════════════════
- Każdy Avatar tworzy własne tokeny SWOBODNIE — bez zatwierdzania
  przez Suwerena.
- Kontrola obiegu przez suwerenność, nie przez emisję:
  nowy token NIE uczestniczy w wymianie z danym Avatarem, dopóki
  ten nie zaakceptuje go we własnym PS (Moduł 3). Tworzenie
  wolne, akceptacja indywidualna.
- Schemat parametrów tokenu przy tworzeniu: OTWARTE — patrz TODO.
═══════════════════════════════════════════
ZALEŻNOŚCI
═══════════════════════════════════════════
- PS (Moduł 3): walidacja akceptacji tokenów — zależność twarda.
- Auth: tożsamość stron transakcji.
- Kernel: brak zależności w tej fazie.
- QAC, Rezonator, Glosariusz: brak zależności.
═══════════════════════════════════════════
OTWARTE PUNKTY (TODO dla Claude Code)
═══════════════════════════════════════════
- Schemat parametrów tokenu przy tworzeniu (nazwa, opis, emitent,
  podaż, mapowanie_369, inne) — Claude Code proponuje pełny schemat
  do zatwierdzenia przez Suwerena PRZED implementacją fabryki tokenów.
- Architektura adapterów API dla tokenów zewnętrznych — propozycja
  interfejsu do zatwierdzenia.
- Mechanizm sporów przy trybie "poza systemem" (jedna strona
  potwierdza, druga nie) — propozycja reguły do zatwierdzenia.
```
---
# MODUŁ REZONATOR KWANTOWY
```
ZADANIE: Backend modułu Rezonator Kwantowy dla Projekt Avatar.
System autonomicznej stabilizacji Źródeł: warstwa logiczna
(rozproszone rezonatory per Źródło) + warstwa wykonawcza
(sterowanie fizycznym sprzętem przez Home Assistant).
═══════════════════════════════════════════
WARSTWA LOGICZNA — Rozproszone Rezonatory
═══════════════════════════════════════════
- Każde Źródło (Avatar, obiekt, misja) posiada własny, dedykowany
  obiekt Rezonatora. Rezonator NIE jest zewnętrznym sterownikiem —
  jest zintegrowanym modułem Źródła.
- Obiekt Źródła — parametry:
  * wibracja_f (częstotliwość bazowa, Hz)
  * rytm_bpm (tempo synchronizacji)
  * misja (identyfikator/opis celu Źródła)
- Funkcja synchronizacji: Sync(t) = mod(t, T), gdzie T = stała
  czasowa synchronizacji per Rezonator. Cykliczne odświeżanie
  sygnatury Źródła w interwałach (analogia zegara systemowego).
- Struktura danych zaprojektowana jako eksportowalna (rozproszona):
  każdy Rezonator = samodzielny rekord z pełnym zestawem parametrów.
═══════════════════════════════════════════
MECHANIKA KREACJI DŹWIĘKIEM — 3 etapy
═══════════════════════════════════════════
1. FOKUS CZĘSTOTLIWOŚCI (Wzornik):
   Emisja konkretnej częstotliwości jako matrycy organizującej.
   Źródła częstotliwości (trzy klasy, łączone):
   * Solfeggio (baza: 432Hz, 528Hz, pełna skala do konfiguracji)
   * Modulacja z QAC (Human Design, dane astrologiczne Avatara)
   * Częstotliwości planetarne (poziom symulatora)
2. SYNCHRONIZACJA RYTMU (Tempo Kreacji):
   Warstwa rytmiczna BPM sprzężona z funkcją Sync(t).
   Rytm = nośnik stabilności czasowej emisji.
3. WIELOWARSTWOWA MODULACJA (Nakładanie Sygnału):
   Równoczesna emisja wielu pasm z przypisanymi funkcjami:
   * niskie tony  → fundament/stabilność (materia)
   * średnie pasmo → relacje/przepływ informacji między Źródłami
   * wysokie tony → wektor intencji (kierunek kreacji)
   Silnik audio musi wspierać syntezę wielowarstwową
   (równoległe generatory z niezależną kontrolą f/amplitudy/fazy).
═══════════════════════════════════════════
WARSTWA WYKONAWCZA — Sprzęt
═══════════════════════════════════════════
- Centralny hub: Home Assistant. WSZYSTKO przechodzi przez HA,
  łącznie z syntezą audio — wymaga customowej integracji HA.
- Kategorie sprzętu docelowego:
  * akcesoria smart home (światło, gniazdka, ambient)
  * sprzęt DJ/estradowy (mosty do DMX/MIDI w ramach integracji HA)
- Wdrożenie FAZOWE — Claude Code proponuje podział na fazy
  (np. Faza A: synteza audio + podstawowe encje HA; Faza B: DMX/MIDI;
  Faza C: pełna automatyka) do zatwierdzenia przez Suwerena
  PRZED implementacją.
- UWAGA sprzętowa (nie blokuje warstwy logicznej): pasma sub-
  i ultradźwiękowe wymagają dedykowanych przetworników poza
  zakresem typowych głośników. Implementacja audio ma być
  parametryczna (zakres pasma konfigurowalny), bez założenia,
  że cały zakres jest fizycznie emitowany od startu.
═══════════════════════════════════════════
INTEGRACJA Z QAC
═══════════════════════════════════════════
- Architektura request-response: Rezonator = klient QAC API,
  zapytania w czasie rzeczywistym (na żądanie). Bez cache,
  bez push.
- Zgodność z konwencjami QAC: stemplowanie danych
  (źródło/timestamp/status), pole pewnosc, avatar_id w nagłówku,
  zero magic numbers.
═══════════════════════════════════════════
URUCHAMIANIE SESJI
═══════════════════════════════════════════
- Tryb ręczny: użytkownik startuje sesję (przycisk/komenda).
- Tryb automatyczny: programowalna automatyka (harmonogram i/lub
  warunki — do konfiguracji przez użytkownika, silnik reguł
  w ramach HA lub modułu).
═══════════════════════════════════════════
ZALEŻNOŚCI
═══════════════════════════════════════════
- QAC: wymagany (źródło danych częstotliwości spersonalizowanych).
- Auth: tożsamość Avatara dla przypisania Rezonatorów per Źródło.
- PS: odczyt avatar_id i parametrów Avatara.
- Kernel: BRAK zależności w tej fazie — integracja odroczona.
═══════════════════════════════════════════
OTWARTE PUNKTY (TODO dla Claude Code)
═══════════════════════════════════════════
- Konkretne wartości częstotliwości planetarnych (tabela mapowania
  planeta→Hz) — Claude Code przedstawia propozycję tabeli ze
  źródłem danych do zatwierdzenia przez Suwerena przed implementacją.
- Wartość domyślna stałej czasowej T w Sync(t) — propozycja
  z uzasadnieniem, decyzja Suwerena.
- Mapowanie pasm (granice Hz: niskie/średnie/wysokie) — propozycja
  do zatwierdzenia, zero magic numbers w kodzie.
- Podział na fazy wdrożenia HA — propozycja do zatwierdzenia.
```
---
# MODUŁ GLOSARIUSZ (Inteligentny System Uspójniania Zrozumienia)
```
ZADANIE: Backend + integracja frontend modułu Glosariusz dla
Projekt Avatar. Automatyczna detekcja terminów w dowolnej treści,
inline-linking, podgląd i pełna definicja na żądanie.
DANE ŹRÓDŁOWE:
- Baza terminów: glosariusz.json (aktualnie v4, migracja do v5
  w toku), pola: nazwa, status, wprowadzenie, rozszerzenie.
═══════════════════════════════════════════
FUNKCJA GŁÓWNA — Auto-linking
═══════════════════════════════════════════
1. Detekcja: system skanuje dowolny tekst/dokument wgrany do
   systemu i wykrywa wystąpienia terminów z glosariusza —
   włącznie z formami odmienionymi (patrz niżej).
2. Inline-link: wykryty termin zostaje oznaczony jako link
   wewnątrz treści, bez zmiany widocznego tekstu (dyskretna
   integracja — nie przerywa naturalnego czytania).
3. Podgląd (hover): najechanie na oznaczony termin pokazuje
   skróconą podpowiedź znaczenia (pole "wprowadzenie").
4. Pełna treść (click): kliknięcie otwiera wysuwany panel
   z pełną definicją (pole "rozszerzenie", jeśli obecne).
ZASIĘG: nieograniczony — mechanizm działa na dowolnym dokumencie/
tekście wgranym do systemu, nie tylko wewnątrz PWA.
═══════════════════════════════════════════
DOPASOWANIE FORM ODMIENIONYCH (fleksja języka polskiego)
═══════════════════════════════════════════
- Metoda: prekomputowany indeks form fleksyjnych.
- Silnik generowania: Morfeusz2 lub Stempel (Claude Code wybiera
  i uzasadnia wybór biblioteki dostępnej w ekosystemie Node.js/
  Python zgodnym ze stackiem projektu).
- Proces:
  1. Przy każdej zmianie glosariusza (dodanie/edycja terminu)
     — generowanie WSZYSTKICH form odmiany dla danej nazwy
     (przypadki, liczby) i zapis do indeksu.
  2. Dopasowanie w czasie działania: proste sprawdzenie
     wystąpienia formy w prekomputowanym indeksie — BEZ
     analizy NLP w czasie rzeczywistym.
- Wydajność: indeks budowany raz per zmianę glosariusza,
  odczyt przy skanowaniu treści ma być szybki i deterministyczny.
═══════════════════════════════════════════
INTEGRACJA Z PROCESEM ZATWIERDZANIA (zasada projektu)
═══════════════════════════════════════════
- Dodanie/edycja terminu w glosariuszu podlega zasadzie
  dwufazowej: propozycja → jawne zatwierdzenie przez Suwerena
  → zapis. Zapis do glosariusza = wyzwalacz przebudowy indeksu
  form fleksyjnych.
ZALEŻNOŚCI:
- Brak zależności od Auth, PS, Rezonatora, Kernela w tej fazie —
  moduł operuje na własnych danych (glosariusz.json + indeks form).
- Przyszła integracja: linki mogą prowadzić do przyszłych
  szczegółowych widoków terminów w PWA — poza zakresem tego promptu.
OTWARTE PUNKTY (TODO dla Claude Code):
- Wybór konkretnej biblioteki (Morfeusz2 vs Stempel vs inna) —
  rekomendacja z uzasadnieniem przed implementacją.
- Format przechowywania indeksu form (osobny plik JSON vs
  wbudowany w strukturę glosariusza) — do zaproponowania.
- Reguła kolizji: co gdy jeden fragment tekstu pasuje do dwóch
  różnych terminów jednocześnie (np. podłańcuch) — Claude Code
  proponuje regułę priorytetu (np. najdłuższe dopasowanie wygrywa)
  do zatwierdzenia.
```
---
## OTWARTE PUNKTY OGÓLNE (cross-module, niezaadresowane)
- **Kernel** — brak dostarczonej specyfikacji, integracja odroczona dla wszystkich modułów powyżej.
- **PS** — niesprecyzowany brak zgłoszony przez Suwerena w toku ustaleń ("jeszcze coś sprawdźmy"), bez konkretnej treści. Status: OPEN, wymaga doprecyzowania w kolejnej sesji.
---
*Koniec dokumentu.*
