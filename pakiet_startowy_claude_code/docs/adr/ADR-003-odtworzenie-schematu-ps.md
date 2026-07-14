# ADR-003: Odtworzenie schematu Protokołu Suwerenności (PS v1)
- **Data:** 2026-07-12
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Roadmapa nakazuje implementację modułu PS „zgodnie ze schematem
protokol_suwerennosci.json (v1, zamrożony)", ale plik nie istnieje w repo
ani w dostępnych materiałach. Suweren dostarczył pełną specyfikację
czterech modułów PS w treści ustaleń i polecił budowę na jej podstawie.

## Decyzja
1. Schemat `protokol_suwerennosci.json` zostaje ODTWORZONY ze specyfikacji
   ustaleń i zapisany w korzeniu repo jako wzorzec dokumentu (status:
   piaskownica; zamrożenie jako v1 osobną decyzją Suwerena).
2. Macierz domyślna Strumienia 1 (brak w ustaleniach — decyzja Suwerena
   2026-07-12): WSZYSTKIE poziomy obserwatora startują od stanu „brak"
   dla wszystkich 4 osi. Dostęp relacyjny wyłącznie przez ręczne
   nadpisania właściciela per para obserwator–oś.
3. Strumień 2, poziom uczeń, „Moduł 3 bez szczegółów certyfikacji":
   uczeń widzi rejestr tokenów okrojony do {token, akceptacja, opis};
   pola warunek i mapowanie_369 oraz alokacja Volt widoczne od poziomu
   adept.
4. Przechowywanie: jeden plik JSON per Avatar w
   `backend/modules/ps/profile/<avatar_id>.json` (dane osobiste — poza git).

## Alternatywy odrzucone
- Czekanie na odnalezienie oryginalnego pliku — blokowałoby roadmapę
  bezterminowo; specyfikacja ustaleń jest kompletna poza macierzą S1.
- Macierz schodkowa (uczeń→warunkowy, adept→akceptacja, mistrz→dozwolony)
  — odrzucona przez Suwerena na rzecz wariantu najbardziej restrykcyjnego.

## Konsekwencje
- Odtworzony schemat = jedyna wykładnia struktury PS; ewentualne
  rozbieżności z odnalezionym oryginałem v1 → decyzja Suwerena + nowy ADR.
- Pola przygotowane bez logiki (zgodnie z ustaleniami):
  `sygnatura_prawdy` (zawsze null), `certyfikaty_zewnetrzne` (zawsze []),
  `certyfikacja_startowa.typ/poziom` (null do decyzji Suwerena).
