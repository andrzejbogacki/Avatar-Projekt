# ADR-002: Technologia i przechowywanie danych modułu Auth
- **Data:** 2026-07-11
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Moduł 0 (Auth) wymaga wyboru technologii tożsamości i sesji oraz formatu
przechowywania kont. Rejestracja wyłącznie przez zaproszenie z dwufazowym
zatwierdzaniem przez Suwerena — mechanizm nieobsługiwany przez gotowe
produkty bez rozszerzeń customowych.

## Decyzja
1. Auth jako własny moduł Node.js w `backend/modules/auth/` — bez
   zewnętrznego dostawcy tożsamości i bez Keycloak. Hasła: `node:crypto`
   scrypt z solą (zero nowych zależności). Sesja: cookie `httpOnly`
   + rejestr sesji po stronie serwera.
2. Konta przechowywane jako JSON per konto:
   `backend/modules/auth/accounts/<avatar_id>.json` — wzorzec spójny
   z QAC (`profiles/<avatar_id>.json`) i PS (jeden JSON per Avatar).
3. Aktywacja konta po zatwierdzeniu zaproszenia: jednorazowy token
   aktywacyjny; zapraszany sam ustawia hasło przy pierwszym wejściu.
   Konto nie posiada hasła nadanego przez osobę trzecią.

## Alternatywy odrzucone
- Zewnętrzny dostawca (Auth0/Clerk): tożsamości Avatarów u trzeciej
  strony — konflikt z zasadą suwerenności.
- Keycloak: osobny proces Java, konfiguracja poza repozytorium, obcy
  stos wobec ADR-001; przerost dla sieci zaproszeniowej.
- SQLite: nowa zależność, odejście od wzorca JSON-per-Avatar;
  transakcyjność zbędna przy tej skali.
- Hasło startowe nadawane przez zapraszającego: osoba trzecia zna
  sekret konta.

## Konsekwencje
- Pozytywne: pełna suwerenność danych tożsamości; jednolity stos JS;
  prosta ścieżka migracji do szyfrowanej bazy węzła 9 (ADR-001).
- Koszty: własna odpowiedzialność za poprawność krypto (ograniczona
  użyciem wyłącznie prymitywów `node:crypto`); sesje w pamięci —
  restart serwera wymusza ponowne logowanie (konsekwencja jawna,
  zaakceptowana).
- Wpływ: PS, Wymiennik i Rezonator czytają tożsamość z Auth przez
  kontrakt modułu; format identyfikatora = `avatar_id` (snake_case),
  zgodny z kluczem głównym profili.
- Certyfikat startowy przy zaproszeniu: NIEROZSTRZYGNIĘTY — Auth
  wystawia punkt wywołania do PS ze stanem jawnym
  `certyfikacja_oczekujaca`; wartość ustali osobna decyzja Suwerena
  przed uruchomieniem ścieżki end-to-end (patrz roadmapa, Moduł PS).
