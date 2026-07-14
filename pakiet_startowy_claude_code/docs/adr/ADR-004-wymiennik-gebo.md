# ADR-004: Wymiennik (Gebo) — model tokenów i rozliczeń
- **Data:** 2026-07-12
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Specyfikacja Wymiennika zostawia otwarte: schemat parametrów tokenu,
architekturę adapterów zewnętrznych, mechanizm sporów trybu „poza
systemem" oraz (luka wykryta przy projektowaniu) pochodzenie i saldo
startowe Avatar Tokena.

## Decyzja
1. **Avatar Token = voucher osobisty.** Nie istnieje jedna globalna
   waluta. Każdy Avatar emituje WŁASNY avatar token w momencie
   wytworzenia produktu fizycznego lub usługi (voucher). Saldo
   startowe każdego Avatara: 0. Emisja = jawna operacja emitenta,
   dopisuje vouchery do jego salda. Jeden token klasy „avatar" per
   Avatar. Kurs avatar↔avatar: sztywno 1:1 (zakodowany, ilości równe).
2. **Schemat tokenu (fabryka, tworzenie swobodne):** token_id
   (snake_case, unikalny), nazwa, opis, emitent, klasa
   (avatar|wewnetrzny|zewnetrzny), podaż (stala → jednorazowa emisja
   całości na saldo emitenta | nieograniczona → emisje jawne),
   podzielność (miejsca dziesiętne, 0 = niepodzielny), mapowanie_369,
   status (aktywny|wycofany), utworzono_ts.
3. **Adaptery zewnętrzne:** kontrakt { id_systemu, sprawdzDostepnosc,
   zarejestrujUmowe → ref_zewnetrzny, potwierdzWykonanie }; rejestr
   w config; wyniki stemplowane {zrodlo, timestamp, status}; brak lub
   awaria adaptera = jawna odmowa. Faza 1: interfejs + atrapa testowa.
4. **Tryb „poza systemem" — bezterminowy.** Transakcja wisi do
   potwierdzenia wykonania przez OBIE strony (wtedy transfer) albo
   anulowania przez OBIE strony. Bez terminów i bez arbitrażu.
   Wyjątek: propozycja jeszcze niezaakceptowana może być wycofana
   jednostronnie przez proponującego.

## Alternatywy odrzucone
- Wspólny Avatar Token z saldem startowym (9 lub 3) — odrzucone:
  token ma być zabezpieczony realnym produktem/usługą emitenta,
  nie kreowany z powietrza.
- Wygaśnięcie transakcji wiszącej po terminie + arbitraż Suwerena —
  odrzucone na rzecz modelu bezterminowego, w pełni dwustronnego.

## Konsekwencje
- Zero długu systemowego: transfer wyłącznie przy wystarczającym
  saldzie; salda nieujemne z konstrukcji.
- Obieg kontrolowany suwerennością: każda transakcja wymaga
  akceptacji OBU tokenów w PS Module 3 OBU stron (zależność twarda).
- Transakcje wiszące mogą akumulować się bezterminowo — przegląd
  własnych transakcji dostępny w API; ewentualna reguła porządkowa
  = przyszła decyzja Suwerena.
