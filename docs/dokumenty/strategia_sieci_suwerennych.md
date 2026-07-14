# Strategia Skalowalności i Odporności Sieci Suwerennych

**Projekt:** Avatar — Architektura Nowej Ziemi
**Suweren:** Andrzej Bogacki (avatar_id: `andrzej_bogacki`)
**Status:** piaskownica, v1
**Typ dokumentu:** strategia (nie blueprint, nie specyfikacja techniczna)

---

## 1. Cel i zakres

Ten dokument opisuje, jak zbudować sieć cyfrową odporną na dwie domeny zagrożeń:

**Domena fizyczna** — awaria infrastruktury zewnętrznej: od zwykłej przerwy w dostawie internetu, przez katastrofę fizyczną i zniszczenie węzłów, aż po impuls elektromagnetyczny (EMP).

**Domena logiczna** — zagrożenia dla samego ruchu i zasobów sieci:
- *przeciążenie złośliwe* — ataki informatyczne typu zalewowego (DDoS), w których wrogie węzły wyczerpują wąskie pasmo radiowe i moc obliczeniową komórki;
- *przeciążenie naturalne* — sukces sieci jako zagrożenie: wzrost liczby węzłów i wolumenu danych przekraczający pojemność komórki (problem skalowalności zasobów i transferów);
- *infiltracja* — wrogi węzeł podszywający się pod członka komórki (fałszywe dane, podsłuch, sabotaż tras).

Strategia dotyczy Projektu Avatar, ale jest napisana tak, aby mogła służyć każdej społeczności budującej własną, niezależną sieć.

**Czym ten dokument jest:** mapą zasad i decyzji kierunkowych. Odpowiada na pytanie „co i dlaczego".

**Czym ten dokument nie jest:** instrukcją montażu ani specyfikacją kodu. Konkretne modele sprzętu, listy komponentów (BOM), formaty protokołów i podział kodu na moduły należą do dokumentów niższego rzędu: blueprintów i promptów wykonawczych dla środowiska programistycznego. Odpowiedź na pytanie „jak dokładnie" powstaje tam.

Podstawowe założenie strategii: **system, który zależy od jednego centrum, umiera razem z tym centrum.** Dlatego cała architektura opiera się na rozproszeniu.

---

## 2. Zasady nadrzędne

**2.1. Decentralizacja fraktalna.** Sieć składa się z komórek lokalnych, z których każda jest kompletną, samowystarczalną miniaturą całości. Mikro = makro: ta sama logika opisuje pojedynczy węzeł, komórkę lokalną i sieć globalną. Zniszczenie dowolnego fragmentu nie zabija organizmu — pozostałe komórki działają dalej w pełnym zakresie.

**2.2. Zero-Dependency.** Żaden element sieci nie może wymagać do działania zewnętrznego serwera centralnego, chmury komercyjnej ani stałego dostępu do internetu. Internet, gdy jest dostępny, jest wygodą — nigdy warunkiem.

**2.3. Autonomia węzła.** Każdy węzeł ma własne zasilanie, własną kopię potrzebnych danych i własną zdolność podejmowania decyzji. Węzeł odcięty od świata nie przechodzi w stan awarii — przechodzi w stan samodzielności.

**2.4. Decyzja Suwerena jest nadrzędna.** System automatyzuje reakcje (przekierowanie ruchu, oszczędzanie energii, blokowanie ciężkich danych), ale progi i polityki tych automatyzmów ustala właściciel węzła. Automat wykonuje wolę — nie zastępuje jej.

**2.5. Mapowanie 3·6·9 (kanon projektu).**
- **3 — impuls / zasilanie:** energia i komunikacja; to, co wprawia sieć w ruch (zasilanie off-grid, kanały radiowe, transmisja danych).
- **6 — forma / materializacja:** fizyczna struktura sieci; węzły, komórki, sprzęt, zmagazynowane dane.
- **9 — meta-regulator:** warstwa decyzyjna ponad obiegiem; polityki Suwerena, mechanizmy samonaprawy, tryby pracy systemu. Nie uczestniczy w transmisji — steruje jej regułami.

---

## 3. Warstwa fizyczna — przetrwanie sprzętu

### 3.1. Zagrożenia

Strategia zakłada trzy klasy zdarzeń:
1. **Odcięcie infrastruktury** — brak prądu z sieci, brak internetu, awaria operatorów.
2. **Zniszczenie fizyczne** — utrata pojedynczego węzła (pożar, kradzież, celowe uszkodzenie).
3. **Impuls elektromagnetyczny (EMP)** — zdarzenie niszczące niechronioną elektronikę na dużym obszarze; najbardziej wymagający scenariusz, który wyznacza standard ochrony dla całości.

Zagrożenia domeny logicznej (przeciążenie złośliwe, przeciążenie naturalne, infiltracja — rozdz. 1) są adresowane w warstwach komunikacji i danych (rozdz. 4–6).

### 3.2. Zasady ochrony

**Ekranowanie (klatka Faradaya).** Rdzeń obliczeniowy każdego węzła — komputer, dyski, zapasowe radia, akumulatory — pracuje lub jest przechowywany w obudowie ekranowanej, która blokuje impuls elektromagnetyczny. Klatka Faradaya to w najprostszej formie szczelna metalowa obudowa; jej parametry dla poszczególnych klas węzłów definiuje osobny dokument techniczny.

**Zasilanie autonomiczne — dywersyfikacja dwupoziomowa.** Fotowoltaika jako jedyne źródło to pojedynczy punkt awarii: panele są wielkopowierzchniowe, kruche i niemożliwe do ukrycia. Dlatego zasilanie węzła jest projektowane w dwóch poziomach:

*Poziom operacyjny (technologie zweryfikowane).* Baza: panel fotowoltaiczny plus akumulator o chemii odpornej i bezpiecznej (klasa LiFePO4), przechowywany w obudowie ekranowanej. Dywersyfikacja: mikrowiatr, agregat awaryjny, ładowanie ręczne (korba/pedały) dla węzłów T1, termogeneracja (piec → moduł termoelektryczny). Zasada: węzeł T3 dysponuje minimum dwoma niezależnymi źródłami energii. Węzeł musi utrzymać funkcje podstawowe (tekst, synchronizacja) bez zasilania zewnętrznego.

*Poziom rozwojowy — technologie zbieżne z matrycą 3·6·9 (klasyfikacja projektowa).* Układy oparte na geometrii vortex — cewki Tesli, uzwojenia toroidalne, koncepcje mag-grav, odzysk elektrostatyczny (wyładowania atmosferyczne, kolektor na ekranowaniu przed uziemieniem). Geometria tych układów odwzorowuje matrycę projektu, co czyni je priorytetowym kierunkiem obserwacji i testów własnych. Stanowisko Suwerena: technologie te nie weszły do kanonu naukowego wskutek instytucjonalnych mechanizmów blokujących; projekt nie czeka na zewnętrzną walidację, lecz prowadzi weryfikację suwerenną — pomiary własne w testach terenowych (Etap 3 roadmapy), spójnie z zasadą autocertyfikacji Protokołu Suwerenności (prawda poświadczana u źródła, pomiarem własnym). Do czasu pozytywnej weryfikacji własnej żadna technologia tego poziomu nie może być jedynym źródłem funkcji krytycznej.

**Zasada poświęcalności.** Elementy wystawione na świat zewnętrzny — anteny, kable, moduły nadawcze — są z definicji „poświęcalne": tanie, standardowe, wymienialne w kilkanaście minut z zapasu przechowywanego w ekranowaniu. Chronimy to, czego nie da się szybko odtworzyć (dane, rdzeń obliczeniowy); godzimy się na utratę tego, co wymienialne. Każde rozwiązanie sprzętowe w projekcie przechodzi test: *czy uszkodzony podzespół da się wymienić siłami użytkownika, bez serwisu, z części zapasowej?*

**Obniżona sygnatura.** Węzły nie manifestują swojej obecności — brak zbędnych emisji, dyskretna zabudowa, urządzenia mobilne chronione lekkim ekranowaniem elektroniki sterującej.

---

## 4. Warstwa komunikacji — łączność bez infrastruktury

Sieć nie może zależeć od światłowodów i masztów komórkowych, bo to najdelikatniejsze ogniwa. Strategia definiuje trzy komplementarne kanały:

**4.1. Radio krótkofalowe (HF) — kanał dalekiego zasięgu.** Fale krótkie pozwalają łączyć komórki oddalone o setki i tysiące kilometrów bez żadnej infrastruktury pośredniej. Nowoczesne tryby cyfrowe (klasa VARA, FT8) przesyłają tekst i dane nawet przy bardzo słabym sygnale. To kanał wolny, ale prawie niezniszczalny — łącznik między komórkami lokalnymi a resztą świata.

**4.2. Sieć kratowa LoRa (Mesh) — kanał lokalny.** Tanie, energooszczędne moduły radiowe o zasięgu od kilku do kilkunastu kilometrów tworzą lokalną „pajęczynę". Każde urządzenie jest jednocześnie odbiorcą i przekaźnikiem — wiadomość sama znajduje drogę przez sąsiednie węzły. To krwiobieg komórki lokalnej.

**4.3. Łącze optyczne (FSO) — kanał wewnętrzny wysokiej przepustowości.** Transmisja laserowa punkt-punkt między węzłami, które się „widzą". Całkowicie odporna na zakłócenia elektromagnetyczne i niesłyszalna radiowo. Uzupełnienie tam, gdzie potrzeba dużego transferu wewnątrz komórki.

**4.4. Zasada store-and-forward (DTN).** Sieć nie zakłada, że odbiorca jest dostępny natychmiast. Wiadomość czeka w węźle i rusza dalej, gdy tylko pojawi się okno łączności — jak list, który podróżuje etapami, a nie rozmowa telefoniczna wymagająca ciągłego połączenia. Dzięki temu sieć działa nawet przy łączności sporadycznej i jednostronnej.

**4.5. Tryb przetrwania (Survival State).** Po wykryciu anomalii (utrata zasilania, zanik kanałów, zdarzenie klasy EMP) system automatycznie: ogranicza transmisję wyłącznie do danych krytycznych (Warstwa 0 — rozdz. 5), odcina zasilanie modułów wysokoprzepustowych, przełącza komunikację na najbardziej odporne pasma i anteny zapasowe. Powrót do trybu normalnego następuje według polityki Suwerena.

**4.6. Obrona przed przeciążeniem złośliwym.** Pasmo radiowe komórki jest wąskie z natury, więc atak zalewowy (DDoS) jest w niej groźniejszy niż w internecie. Trzy mechanizmy obrony na poziomie kanału:
- *Limity ruchu per węzeł (rate limiting):* każdy węzeł ma przydzielony maksymalny udział w paśmie komórki; przekroczenie limitu skutkuje automatycznym dławieniem jego transmisji.
- *Priorytet Warstwy 0 jako bezpiecznik:* dane krytyczne mają gwarantowany, nienaruszalny udział w paśmie — żaden wolumen ruchu niższych warstw, także złośliwego, nie może ich wyprzeć.
- *Odcięcie węzła anomalnego:* węzeł generujący ruch odbiegający od zadeklarowanego profilu może zostać czasowo odcięty od komórki; decyzja o trwałym wykluczeniu należy do komórki (jej Suwerenów), nie do automatu.

---

## 5. Warstwa danych — co, kiedy i jak podróżuje

Łącza awaryjne są wąskie. Dlatego dane mają priorytety — sieć zawsze wie, co jest niezbędne, a co może poczekać.

**5.1. Trzy warstwy priorytetów.**
- **Warstwa 0 — krytyczna:** tekst, konfiguracje, klucze szyfrujące, stan systemu. Przesyłana zawsze, każdym dostępnym kanałem, z najwyższym priorytetem.
- **Warstwa 1 — funkcjonalna:** multimedia w silnej kompresji. Przesyłana, gdy jakość łącza jest stabilna.
- **Warstwa 2 — pełna:** dane w pełnej rozdzielczości. Przesyłane wyłącznie w oknach wysokiego transferu lub na wyraźne żądanie Suwerena.

Zasada przepływu: Warstwa 0 jest wypychana przez system automatycznie; Warstwy 1 i 2 podlegają kontroli stanu kanału i polityce właściciela węzła.

**5.2. Manifest zamiast pliku.** Każdy zasób ma lekki plik kontrolny (manifest) opisujący dostępne warianty (tekst / wersja skompresowana / pełna). Węzeł najpierw pobiera manifest, a dopiero potem — zgodnie ze stanem łącza i decyzją Suwerena — wybiera, który wariant pobrać, o ile w ogóle.

**5.3. Pamięć rozproszona i deduplikacja.** Dane żyją w komórkach, nie w chmurze. Każdy zasób jest identyfikowany odciskiem treści (hash) — sieć nigdy nie przesyła dwa razy tego samego. Jeśli jeden węzeł w komórce już pobrał plik, sąsiedzi kopiują go lokalnie, nie obciążając łącza radiowego.

**5.4. Synchronizacja hierarchiczna.** Komórka lokalna przechowuje komplet własnych danych; z siecią globalną synchronizuje wyłącznie kluczowe metadane. Silniejsze węzły z nadmiarem zasobów mogą ogłaszać się jako punkty dostępu do danych wysokiej rozdzielczości dla słabszych sąsiadów.

**5.5. Skalowalność przez podział — odpowiedź na przeciążenie naturalne.** Wzrost sieci nie może prowadzić do rozbudowy jednej komórki w przeciążony moloch. Gdy komórka zbliża się do granicy pojemności (pasmo radiowe, magazyn danych, moc obliczeniowa węzła T3), strategia przewiduje jej podział na dwie komórki-córki połączone bramką. Każda córka dziedziczy pełną architekturę i samowystarczalność. To fraktalna mechanika wzrostu spójna z zasadą decentralizacji (rozdz. 2.1, mikro=makro): sieć skaluje się przez pączkowanie kompletnych organizmów, nie przez puchnięcie jednego.

---

## 6. Klasy węzłów — sieć z tego, co jest pod ręką

Sieć suwerenna nie wymaga jednolitego sprzętu. Każde urządzenie dostaje rolę na miarę swoich możliwości.

**T1 — węzeł peryferyjny.** Najprostsze urządzenia: stare telefony, mikrokontrolery. Obsługują tekst, metadane i przekaźnictwo w sieci kratowej. Nie liczą nic ciężkiego — analizę delegują wyżej.

**T2 — węzeł pośredni.** Współczesne telefony, tablety, małe komputery jednopłytkowe. Obsługują skompresowane media, lekkie lokalne modele AI, buforują dane dla węzłów T1.

**T3 — węzeł rdzeniowy (Sovereign Node).** Stacjonarny serwer w pełnym ekranowaniu (w architekturze projektu: węzeł klasy Mac Mini). Pełna obsługa mediów, zaawansowane modele AI, brama radiowa HF do świata, magazyn rozproszonej bazy danych dla całej komórki.

**Zasady współpracy klas:**
- **Automatyczne profilowanie:** urządzenie przy pierwszym uruchomieniu samo bada swoje zasoby (pamięć, moc, łączność) i przyjmuje profil klasy.
- **Delegowanie obliczeń:** słaby węzeł wysyła pytanie do najbliższego węzła T3; wraca gotowa, lekka odpowiedź tekstowa. Inteligencja sieci jest wspólna, nie prywatna.
- **Sovereign Switch:** właściciel może ręcznie nadpisać profil („mój telefon to T2, mój serwer to T3") i ogłosić w komórce swoje ograniczenia („nie wysyłajcie mi wideo — oszczędzam baterię"). Sieć respektuje te deklaracje automatycznie.
- **Przejmowanie ról:** po utracie węzła jego zadania przejmuje najbliższy węzeł o wystarczających parametrach.
- **Dołączanie nowego węzła — obrona przed infiltracją:** nowy węzeł wchodzi do komórki wyłącznie z poświadczeniem istniejącego członka (zasada zaproszenia — spójna z logiką modułu Auth projektu: zaproszenie + zatwierdzenie). Po dołączeniu przechodzi okres kwarantanny z ograniczonymi uprawnieniami: obsługuje tylko Warstwę 0, bez dostępu do magazynu danych komórki, do czasu zbudowania wiarygodności. Zdjęcie kwarantanny to decyzja Suwerenów komórki, nie automatu.

---

## 6a. Warstwa łącz zewnętrznych i bezpieczeństwa (Uplink & VPN)

**6a.1. Zasada nadrzędna.** Internet tradycyjny jest dodatkiem, nie fundamentem. Tam, gdzie jest dostępny, daje szybkość, płynność i pełną funkcjonalność — ale sieć suwerenna musi działać bez niego. Cel projektu (rozdz. 2.2, Zero-Dependency) pozostaje nienaruszony: łącze zewnętrzne nigdy nie staje się warunkiem działania, wyłącznie jego przyspieszeniem.

**6a.2. Bramka oportunistyczna.** Każde dostępne łącze szerokopasmowe — telefon z transmisją danych, WiFi sąsiada, złącze biurowe, łącze stałe — może w danej chwili pełnić rolę tymczasowej bramki dla komórki, poprzez zwykłe udostępnianie połączenia. Węzeł, który taką bramkę posiada, automatycznie ogłasza się w komórce; pozostałe węzły korzystają z niej, dopóki jest dostępna. W chwili utraty łącza węzeł nie wypada z sieci — po prostu wraca do roli zwykłego uczestnika mesh, a komórka szuka innej bramki. Przełączanie jest automatyczne i nie zrywa działających połączeń wewnątrz komórki.

**6a.3. Maksymalizacja dostępności łącz.** Elastyczność i niezawodność sieci rosną wraz z liczbą niezależnych punktów wyjścia na zewnątrz. Zasady:
- każde łącze szerokopasmowe w zasięgu komórki jest traktowane jako potencjalny zasób wspólny, nie prywatna własność jednego węzła;
- komórka może korzystać z kilku bramek jednocześnie, rozkładając ruch między nimi;
- węzeł nie powinien być oddalony od najbliższej bramki o więcej niż trzy skoki sieci kratowej — każdy kolejny skok znacząco obniża przepustowość i podnosi opóźnienie;
- wybór aktywnej bramki jest dynamiczny — sieć kieruje ruch przez łącze aktualnie najlepsze (siła sygnału, obciążenie, stabilność), nie przez łącze ustawione na sztywno.

**6a.4. VPN — kiedy i po co.** Sieć suwerenna stosuje szyfrowany tunel (VPN) tam, gdzie jest to niezbędne z punktu widzenia bezpieczeństwa, nie jako domyślny stan każdego połączenia. Cztery sytuacje, w których VPN jest wymagany:
- **ruch przez cudze lub publiczne łącze** (hotspot, udostępnianie z telefonu, sieć obca) — chroni przed podsłuchem po stronie operatora tego łącza;
- **łączenie odległych komórek przez internet**, gdy kanał radiowy (HF) jest niedostępny lub zbyt wolny — tunel zastępuje wtedy bramkę radiową, zachowując tę samą zasadę szczelności;
- **ukrycie topologii sieci** przed obserwacją zewnętrzną — VPN nie ujawnia postronnym, ile węzłów istnieje i jak są rozmieszczone;
- **bramka jako punkt szyfrujący dla całej komórki** — jeśli węzeł pełniący rolę bramki dysponuje wystarczającymi zasobami, szyfruje ruch wchodzący i wychodzący dla wszystkich węzłów za nim, tak że tunelowany jest tylko styk z internetem, nie cały ruch wewnętrzny komórki (który i tak biegnie przez zaufaną sieć kratową).

Zasada doboru: tunelujemy punkt styku z siecią obcą, nie duszymy nim ruchu wewnątrz komórki, gdzie zaufanie węzłów jest już ustalone przez mechanizm zaproszenia (rozdz. 6).

**6a.5. Degradacja z wdziękiem.** Hierarchia dostępności, od najlepszego do najgorszego wariantu: internet szerokopasmowy → radio HF/sieć kratowa lokalna → tryb w pełni offline (komórka izolowana, w pełni funkcjonalna wewnętrznie). Utrata każdego wyższego poziomu obniża komfort i szybkość — nigdy nie zabija sieci. To bezpośrednie rozwinięcie zasady autonomii węzła (rozdz. 2.3).

**6a.6. Zastrzeżenie suwerenności.** Internet publiczny jest traktowany jako środowisko nieufne z założenia. Każdy ruch przechodzący przez łącze niekontrolowane przez komórkę (cudzy operator, publiczna sieć) jest szyfrowany. Wygoda tradycyjnego internetu nigdy nie jest powodem do obniżenia progu bezpieczeństwa ustalonego w rozdz. 4.6 i 6 (kwarantanna, poświadczenie).

---

## 7. Skalowanie sieci — od komórki do świata

**7.1. Komórka lokalna.** Podstawowa jednostka: grupa węzłów połączona siecią kratową, z co najmniej jednym węzłem T3. Komórka jest w pełni samowystarczalna — działa bez świata zewnętrznego bezterminowo.

**7.2. Bramki.** Węzły wyposażone w radio HF (lub inny kanał daleki) pełnią rolę mostów między komórkami. Komórka bez bramki nadal żyje — jest tylko czasowo osobna. Bramka jest też szwem łączącym komórki-córki powstałe z podziału przeciążonej komórki-matki (rozdz. 5.5) — podział to podstawowa mechanika wzrostu sieci.

**7.3. Sieć globalna.** Suma komórek połączonych bramkami w logice store-and-forward. Nie istnieje żaden punkt centralny, którego utrata zatrzymuje całość.

**7.4. Samonaprawa (self-healing).** Zniszczenie węzła jest dla sieci zdarzeniem logicznym, nie katastrofą: sieć kratowa natychmiast wyznacza trasy zastępcze, a role zniszczonego węzła przejmują sąsiedzi — bez interwencji człowieka. Interwencja Suwerena jest potrzebna dopiero do odtworzenia zasobu fizycznego (wymiana poświęcalnego podzespołu, rozdz. 3.2).

---

## 8. Roadmapa 2026–2032

**Etap 3 — Fundamenty (2026–2028).** Impuls: uruchomienie pierwszych węzłów.
- Finalizacja węzła suwerennego (sprzęt klasy T3 + ekranowanie).
- Opracowanie protokołu manifestów dla danych warstwowych.
- Testy terenowe łączności w warunkach kontrolowanego zakłócenia sygnału.
- Pomiary własne technologii poziomu rozwojowego zasilania (rozdz. 3.2) — weryfikacja suwerenna.

**Etap 6 — Skalowanie (2028–2030).** Forma: materializacja sieci we własnych strukturach.
- Wdrożenie pełnej komórki lokalnej w strukturach własnych projektu.
- Automatyzacja generowania blueprintów: system sam tworzy dokumentację, listę komponentów i skrypty instalacyjne na podstawie działającej konfiguracji.
- Optymalizacja kompresji mediów w locie.

**Etap 9 — Upowszechnienie (2030–2032).** Meta-regulacja: sieć zaczyna się replikować sama.
- Publikacja „Pakietu Suwerenności" — otwartego blueprintu dla społeczności.
- Mechanizm Self-Discovery: nowe urządzenia są automatycznie rozpoznawane i włączane do komórki — wyłącznie w ramach mechanizmu zaproszenia i kwarantanny (rozdz. 6). Wykrycie automatyczne ≠ zaufanie automatyczne.

---

## 9. Blueprinty dla społeczności

Celem końcowym nie jest jedna sieć, lecz wzorzec, który każda społeczność może powtórzyć. Blueprint opiera się na trzech filarach:

**Filar 1 — Sprzęt (Hardware BOM).** Lista sprawdzonych, odpornych i tanich komponentów — z naciskiem na dostępność z rynku wtórnego — wraz z instrukcją ekranowania dla każdej klasy węzła.

**Filar 2 — Oprogramowanie (Software Stack).** Gotowy do wgrania obraz systemu z kompletem modułów: zarządzanie węzłem, silnik synchronizacji warstwowej, obsługa radiowa. Instalacja bez wiedzy programistycznej.

**Filar 3 — Zarządzanie (Governance Manual).** Opisane ludzkim językiem reguły decyzyjne: jak ustawiać progi transmisji, priorytety danych i polityki energetyczne — z możliwością adaptacji do własnych warunków społeczności.

**Zasady dystrybucji blueprintów:**
- **Modularność:** społeczność wybiera zakres — „Węzeł Minimalny" (tekst) albo „Węzeł Pełny" (media + brama HF). Blueprint nie jest monolitem.
- **Weryfikowalność:** każdy blueprint i każdy profil węzła nosi podpis cyfrowy (hash), co uniemożliwia niezauważoną manipulację treścią przez czynniki zewnętrzne.
- **Autonomia:** wszystko projektowane do pracy bez internetu, wyłącznie na lokalnej sieci kratowej i radiu.
- **Zastrzeżenie publikacyjne:** technologie zbieżne z matrycą 3·6·9 (rozdz. 3.2, poziom rozwojowy) wchodzą do filarów Sprzęt i Zarządzanie dopiero po pozytywnej weryfikacji suwerennej z Etapu 3. Blueprint publikowany społeczności zawiera wyłącznie rozwiązania zweryfikowane pomiarem własnym.

---

## 10. Słownik pojęć dokumentu

**Terminy istniejące w Glosariuszu (odesłania):** Szczelność Informacyjna, Rezonator Kwantowy, Projekt Avatar, 3 6 9, Zaufanie.

**Terminy nowe — kandydaci do Glosariusza (status: piaskownica):**

| Termin | Znaczenie robocze |
|---|---|
| Węzeł Suwerenny (Sovereign Node) | Autonomiczny serwer klasy T3: własne zasilanie, ekranowanie, pełna instancja systemu |
| Komórka lokalna | Samowystarczalna grupa węzłów połączona siecią kratową |
| Klasy węzłów T1/T2/T3 | Hierarchia wydajnościowa urządzeń w sieci |
| Warstwy danych 0/1/2 | Priorytety transmisji: krytyczne / skompresowane / pełne |
| Tryb przetrwania (Survival State) | Automatyczne ograniczenie systemu do funkcji krytycznych po detekcji anomalii |
| Poświęcalność | Zasada projektowa: elementy zewnętrzne tanie i wymienialne, rdzeń chroniony |
| Bramka (Gateway) | Węzeł łączący komórkę z siecią globalną kanałem dalekiego zasięgu |
| Store-and-forward (DTN) | Transmisja etapowa bez wymogu ciągłej łączności |
| Manifest danych | Lekki plik kontrolny opisujący warianty zasobu przed jego pobraniem |
| Sovereign Switch | Ręczna deklaracja właściciela nadpisująca automatyczny profil węzła |
| Self-healing | Automatyczna rekonfiguracja sieci po utracie węzła |
| Klatka Faradaya | Obudowa ekranująca chroniąca elektronikę przed impulsem elektromagnetycznym |
| Weryfikacja suwerenna | Walidacja technologii pomiarem własnym zamiast czekania na kanon zewnętrzny |
| Kwarantanna węzła | Ograniczone uprawnienia nowego członka komórki do czasu zbudowania wiarygodności |
| Podział komórki | Fraktalna mechanika wzrostu: podział przeciążonej komórki na samowystarczalne córki |
| Bramka oportunistyczna | Węzeł tymczasowo udostępniający własne łącze szerokopasmowe całej komórce, z automatycznym powrotem do roli zwykłego uczestnika po utracie łącza |
| Degradacja z wdziękiem | Hierarchia dostępności (internet → radio/mesh → offline), w której utrata wyższego poziomu obniża komfort, nie funkcjonalność |

Adnotacja porządkowa (stan na 2026-07-13): wszystkie terminy z tabeli powyżej są już obecne w glosariuszu projektu (`docs/glosariusz.json`, 67 rekordów) — auto-linking modułu Glosariusz obejmuje je w treści tego dokumentu. Tabela pozostaje jako słownik roboczy dokumentu.

---

*Dokument v1 — piaskownica. Zmiany wymagają zatwierdzenia Suwerena.*
