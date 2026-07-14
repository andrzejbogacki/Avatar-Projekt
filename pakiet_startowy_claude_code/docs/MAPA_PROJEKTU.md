# Mapa Projektu — punkt wejścia
Projekt Avatar — Architektura Nowej Ziemi · Status: piaskownica · v1.0

## Dwa punkty wejścia
- **Człowiek:** czytaj w kolejności → `ARCHITEKTURA.md` → `KONWENCJE.md` → `moduly/<id>.md` (moduł, którego dotyczy praca).
- **Program (AI / agent):** czytaj `mapa_projektu.json`, następnie dokumentację właściwego modułu. Przed zmianą struktury: `KONWENCJE.md`, sekcja „Cykl pracy".

## Zawartość pakietu
| Plik | Funkcja |
|---|---|
| `mapa_projektu.json` | Maszynowy indeks projektu (moduły, ścieżki, statusy, źródła prawdy) |
| `ARCHITEKTURA.md` | Warstwy 3·6·9, węzły, układ repozytorium, reguły rozszerzania |
| `KONWENCJE.md` | Język, kodowanie, workflow zatwierdzeń, adresacja, statusy |
| `adr/` | Rejestr decyzji architektonicznych (ADR) |
| `moduly/SZABLON_MODULU.md` | Szablon dokumentacji modułu (sekcje 3·6·9) |
| `moduly/qac.md` | Dokumentacja modułu Quantum Avatar Core |
| `moduly/auth.md` | Dokumentacja modułu Auth (tożsamość, sesja, zaproszenia) |
| `moduly/ps.md` | Dokumentacja modułu PS — Protokół Suwerenności |
| `moduly/wymiennik.md` | Dokumentacja modułu Wymiennik (Gebo) — wymiana tokenów |
| `moduly/rezonator.md` | Dokumentacja modułu Rezonator Kwantowy (Faza A) |
| `moduly/glosariusz.md` | Dokumentacja modułu Glosariusz (auto-linking terminów) |
| `moduly/dokumentacja.md` | Dokumentacja modułu Dokumentacja (manifest dokumentów treściowych) |
| `ROADMAPA_BACKEND.md` | Roadmapa backendu: kolejność modułów, zależności, otwarte punkty |

## Zasada nadrzędna
Żadna zmiana struktury bez równoczesnej aktualizacji `mapa_projektu.json` + dokumentacji modułu. Kod bez dokumentacji = moduł niekompletny.
