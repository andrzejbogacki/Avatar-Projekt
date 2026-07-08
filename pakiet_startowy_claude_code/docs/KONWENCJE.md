# Konwencje — Projekt Avatar
Status: piaskownica · v1

## 1. Język i pliki
- Dokumentacja i nazwy pojęć: polski. Identyfikatory w kodzie: bez znaków diakrytycznych; pliki: snake_case.
- Kodowanie: UTF-8 wszędzie.
- **Python + JSON: `ensure_ascii=False` obowiązkowo** — pominięcie psuje polskie znaki we wszystkich plikach.
- Node.js: `JSON.stringify` zapisuje UTF-8 natywnie — bez dodatkowych flag.

## 2. Cykl pracy (workflow Suwerena)
1. Propozycja → jawne zatwierdzenie („Akceptuję" / „Tak" / „Zatwierdzam") → zapis. Jedna faza naraz.
2. Rozróżnienie stanów: **„omówione w rozmowie" ≠ „zapisane w artefakcie"**. Dokumentacja odnotowuje wyłącznie stan zapisany.
3. Decyzje architektoniczne i strukturalne: cykl propozycja–potwierdzenie **przed** budową; rozstrzygnięcie zapisywane jako ADR.
4. Wpisy glosariusza: dwufazowo — wprowadzenie → rozszerzenie, każda faza zatwierdzana osobno.
5. Założenia interpretacyjne bez twardego źródła oznaczane jako wnioski logiczne.

## 3. Adresacja kanoniczna (rejestr.json)
- Format: dot-address (np. `modul.qac`, `modul.qac.qrt`).
- Rooty (9, otwarte na rozszerzenia): `avatar`, `modul`, `jakosc`, `token`, `symulacja`, `warstwa`, `funkcja`, `protokol`, `zrodlo`.
- Kolejność zasilania: jakosc → token → symulacja → modul → zrodlo → warstwa → protokol → funkcja → avatar.
- Nowy byt bez adresu = kandydat; adres nadaje wyłącznie decyzja Suwerena.

## 4. Semantyka
- Termin użyty w kodzie/dokumentacji, nieobecny w glosariuszu → oznaczenie `TERMIN-KANDYDAT` (komentarz w kodzie, adnotacja w dokumentacji) + zgłoszenie do bieżącego Toru glosariusza.
- Pojęcia pokrywające się znaczeniowo: rekord wskaźnikowy zamiast duplikatu, chyba że istnieje istotna różnica (mikro ≠ makro).

## 5. Statusy i wersjonowanie
- `piaskownica` — w budowie, mutowalne.
- `zamrożony_vN` — wersja zamknięta dokumentem zamykającym (wzorzec: `PS_v1_dokument_zamykajacy.md`). Kolejne prace = nowa wersja (vN+1), stara pozostaje nienaruszona.
- Publikacja niemutowalna (blockchain) wyłącznie ze statusu zamrożonego.

## 6. Jakość danych (zakaz konfabulacji systemowej)
- Brak danych → jawne pole statusu, nigdy wartość domyślna bez oznaczenia.
- Dane środowiskowe/zewnętrzne zawsze stemplowane: `{zrodlo, timestamp, status: live|cache|stale}`.
- Wyniki algorytmiczne o charakterze szacunkowym zawsze z metryką pewności.
