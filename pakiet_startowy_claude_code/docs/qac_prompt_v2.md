# Prompt dla Claude Code: Inicjalizacja Quantum Avatar Core (QAC) — v2

**Status: piaskownica — użycie po zatwierdzeniu Suwerena.**
Zmiany względem v1 oznaczone **[Δ]**.

---

## Kontekst projektu [Δ]

- Projekt nadrzędny: **Projekt Avatar — Architektura Nowej Ziemi**.
- Źródła prawdy: `glosariusz_v4.json` (semantyka), `rejestr.json` (adresacja kanoniczna), `kernel_specyfikacja_v1.md` (warstwa 9 / SOLID), `protokol_suwerennosci.json` (tożsamość, avatar_id).
- Mapowanie systemowe 3·6·9: aplikacja/moduł = **3** (impuls), sprzęt/węzeł = **6** (forma), kernel/chmura = **9** (regulacja). QAC = moduł (3), wykonanie na węźle 6 (Mac Mini), synchronizacja do 9 (chmura prywatna).
- Klucz główny profili: `avatar_id` w formacie zgodnym z Protokołem Suwerenności (wzorzec: `andrzej_bogacki`).
- Terminy-kandydaci (nieobecne w glosariuszu — oznaczać w kodzie komentarzem `// TERMIN-KANDYDAT`): Quantum Avatar Core, Quantum Rectification Tool, 64 Bramki, Węgiel-12 (6-6-6), Symulator 12D, Kathara (MCEO), Astrologia Ewolucyjna, Kompozyt Kwantowy, Phase-Locking.

## Cel główny

Zbuduj modułowy system backendowy **Quantum Avatar Core (QAC)** z submodułem **Quantum Rectification Tool (QRT)**. System służy do wprowadzania, walidacji i analizy relacyjnej awatarów na podstawie precyzyjnych obliczeń astronomicznych i środowiskowych, sprowadzonych do matrycy 3·6·9 w obrębie Symulatora 12D (baza: Węgiel-12).

## Krok 0: Protokół przedwdrożeniowy (Pre-flight Checklist)

Zanim wygenerujesz jakikolwiek kod produkcyjny, przeprowadź weryfikację i zwróć raport:

1. **Walidacja zasobów:** dostępność bindingu Swiss Ephemeris dla Node.js (`sweph` lub `swisseph` z npm) **[Δ — stos zamknięty: Node.js, zgodnie z ADR-001]**, Redis (opcjonalny bufor — patrz warstwa cache), obsługa Float64/BigInt.
2. **Weryfikacja logiczna:** spójność transformacji współrzędnych barycentrycznych na topocentryczne z uwzględnieniem czasu jednostajnego (TDB) i poprawki ΔT.
3. **Zatwierdzenie struktury:** przedstaw ostateczną architekturę katalogów **przed zapisem plików i zatrzymaj się do czasu jawnej akceptacji**. [Δ]
4. **[Δ] Odczyt konwencji:** przeczytaj `docs/KONWENCJE.md` oraz `docs/moduly/SZABLON_MODULU.md`. Moduł bez wpisu dokumentacyjnego = moduł niekompletny.

## Struktura katalogów [Δ — integracja z układem repo frontend/ + backend/]

Lokalizacja: `backend/modules/qac/` (monolit modułowy wewnątrz backendu).

```
backend/modules/qac
│
├── config/             # Stałe: siatka 12D, parametry C-12, częstotliwości projektu
│                       # (420 Hz — pozycja 6; Solfeggio 432 / 528 Hz), adres rejestru modułu
├── ephemeris/          # Lokalne pliki binarne efemeryd JPL DE440/441
├── cache/              # Adapter Redis + fallback in-memory [Δ]
│
├── src/
│   ├── calculator/     # Silnik matematyczny (Swiss Ephemeris, współrzędne topocentryczne)
│   ├── rectification/  # Submoduł QRT — zadania asynchroniczne (kolejka) [Δ]
│   ├── normalizer/     # Warstwa mapowania danych do matrycy 3-6-9
│   └── regulator9/     # [Δ] Aspekt regulacyjny pozycji 9 (opis niżej)
│
├── profiles/           # Baza dokumentowa profili awatarów (JSON, klucz: avatar_id)
├── README.md           # [Δ] Obowiązkowy — wskazuje docs/moduly/qac.md
└── index.js            # Punkt wejścia modułu (interfejs wewnętrzny backendu)
```

## Specyfikacja modułów

### 1. Silnik astronomiczno-matematyczny (`src/calculator`)

- **Biblioteka:** natywny binding Swiss Ephemeris (libswe). Kategoryczny zakaz algorytmów przybliżonych.
- **Precyzja:** długość ekliptyczna z dokładnością do ułamków sekund kątowych. Uwzględnienie czasu TDB, precesji, nutacji oraz poprawki ΔT.
- **Korekta topocentryczna:** pozycje planet przeliczane dla dokładnych współrzędnych geograficznych i wysokości n.p.m. punktu wejścia awatara (nie dla środka Ziemi).
- **Kwantyzacja kątowa:** podział koła 360° na 64 bramki (po 5,625°), każda bramka na 6 linii (0,9375°), z dalszym mapowaniem na kolory, tony i podstawy (base).
- **Przesunięcie słoneczne:** algorytm numeryczny wyliczający moment wejścia formy nieświadomej przez odjęcie dokładnie 88° łuku słonecznego od pozycji urodzenia.

### 2. Warstwa dynamiczna i buforowanie (`cache/`) [Δ]

Cykliczne odpytywanie (co 60 s) zewnętrznych API:

- **Space Weather:** rozbłyski (X-ray flux) i wiatr słoneczny — NOAA SWPC.
- **Geomagnetyzm:** Indeks Kp — GFZ Potsdam / NOAA.
- **Rezonans Schumanna:** parser bieżących częstotliwości i amplitud piku bazowego (7,83 Hz).

Zasady [Δ]:
- Redis jako bufor główny; **przy braku Redisa fallback in-memory**. Brak sieci ani bufora nie blokuje kalkulatora (ostatni stabilny stan).
- **Każdy rekord stemplowany:** `{zrodlo, timestamp, status: live|cache|stale}`. Zakaz cichych wartości domyślnych.
- Warstwa ta jest źródłem danych dla „Bio-Atmospheric Report" (powiązanie glosariuszowe: Schumann Resonance).

### 3. Warstwa normalizacji 3-6-9 (`src/normalizer` + `src/regulator9`)

Sprowadzenie danych surowych do wspólnego mianownika częstotliwościowego w strukturze Węgla-12 (6-6-6 jako kod bazowy gęstości 3D):

- **3 — Potencjał elektryczny / Intencja:** mapowanie danych z Astrologii Ewolucyjnej (Pluton, oś Węzłów Księżycowych, progresje jako wektory pędu).
- **6 — Matryca magnetyczna / Forma:** mapowanie aktywacji świadomych i nieświadomych z sekcji 64 bramek oraz siatki pól Kathara (MCEO).
- **9 — dwuaspektowo, zgodnie z `kernel_specyfikacja_v1.md`:** [Δ]
  - **9a Rezonator** (`normalizer`): matematyczny punkt przecięcia (interferencja falowa) składowych 3 i 6, modyfikowany w czasie rzeczywistym parametrami z `cache/`.
  - **9b Regulator** (`regulator9`): nie uczestniczy w obliczeniu — kontroluje je. Walidacja kompletności danych wejściowych, odrzucanie parametrów `stale` powyżej progu świeżości, autoryzacja zapisu profilu (bramka wyjściowa).
- Stałe częstotliwościowe wyłącznie z `config/` — zakaz magic numbers w kodzie. [Δ]

### 4. Submoduł Rektyfikacji Kwantowej (`src/rectification`) [Δ]

Quantum Rectification Tool (QRT). Przy braku dokładnej godziny urodzenia:

1. Przyjmij tablicę dat/godzin z podanego zakresu brzegowego.
2. Przelicz tranzyty planetarne wstecz dla listy kluczowych wydarzeń życiowych awatara.
3. Dopasuj geometryczne momenty aspektów ścisłych do dat wydarzeń, zwracając precyzyjny czas narodzenia.

Zasady [Δ]:
- Wykonanie jako **zadanie asynchroniczne** (kolejka) — pętla obliczeniowa nie blokuje interfejsu modułu.
- Wynik **zawsze z polem `pewnosc`** (metryka dopasowania). Zakaz zwracania czasu bez metryki.

### 5. Format wyjściowy (`profiles/avatar_profile.json`) [Δ — rozszerzony nagłówek]

Czysty JSON. Kategoryczny zakaz generowania opisów tekstowych. Schemat:

- **naglowek:** `avatar_id` (wzorzec PS), `adres_rejestru`, `wersja_schematu`, `status: "piaskownica"`, `wygenerowano` (timestamp)
- **dane_surowe:** współrzędne topocentryczne, czas TDB, ΔT
- **aktywacje:** bramki, linie, tony, kolory, base
- **mapa_369:** znormalizowany wektor częstotliwości + stemple pochodzenia per parametr środowiskowy
- **macierz_relacyjna:** przygotowana pod kompozyty kwantowe i synchronizację fazową (Phase-Locking) między awatarami

Kodowanie: UTF-8. Jeśli w toolingu pojawi się Python: **`ensure_ascii=False` obowiązkowo**. [Δ]

## Zasady jakości [Δ]

1. Zakaz algorytmów przybliżonych — bez zmian względem v1.
2. **Zakaz konfabulacji systemowej:** brak danych → jawne pole statusu, nigdy wartość domyślna bez oznaczenia.
3. Po każdej zmianie struktury: aktualizacja `docs/moduly/qac.md` oraz `docs/mapa_projektu.json`.
4. SOLID zgodnie z regułami `kernel_specyfikacja_v1.md`.

Zaimplementuj powyższą specyfikację, zachowując bezkompromisową jakość kodu i pełną precyzję matematyczną.
