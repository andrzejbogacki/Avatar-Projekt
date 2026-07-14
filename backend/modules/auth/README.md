# Auth — tożsamość, sesja i rejestracja przez zaproszenie

Moduł backendu Projekt Avatar (Moduł 0 roadmapy). Logowanie, sesje cookie `httpOnly`,
rejestracja WYŁĄCZNIE przez dwufazowe zaproszenie (propozycja → jawne zatwierdzenie
Suwerena → konto). Własna implementacja Node.js bez zewnętrznego dostawcy (ADR-002).

**Dokumentacja kanoniczna:** `pakiet_startowy_claude_code/docs/moduly/auth.md`
**Decyzje:** `pakiet_startowy_claude_code/docs/adr/ADR-002-technologia-auth.md`
**Adres rejestru:** `modul.auth` (kandydat), zaproszenia: `modul.auth.zaproszenia` (kandydat)

## Struktura (mikro=makro 3·6·9)
- `src/logowanie/` — logowanie, aktywacja kont, krypto scrypt (pozycja 3 — impuls)
- `accounts/` + `src/konta/` — konta JSON per `avatar_id` (pozycja 6 — forma; katalog w `.gitignore` — sekrety)
- `zaproszenia/` — propozycje zaproszeń JSON (pozycja 6; katalog w `.gitignore`)
- `src/sesje/` — rejestr sesji w pamięci (pozycja 9a — rezonator; wniosek logiczny zatwierdzony 2026-07-11)
- `src/regulator9/` — bramka zaproszeń, walidacja, rozdział środowisk (pozycja 9b — regulator)
- `src/http/` — router `/api/auth/*`
- `config/` — wszystkie stałe modułu (zakaz magic numbers poza tą warstwą)
- `schema/konto.schema.json` — JSON Schema rekordu konta

## Kontrakt publiczny (`index.js`)
`utworzAuth({ katalogKont?, katalogZaproszen?, hookPS?, zegar? })` →
`{ obsluzZadanie(req,res), bootstrapSuwerena(), usluga_logowania, usluga_zaproszen, sesje, magazyn_kont }`

Endpointy: `POST /api/auth/logowanie`, `POST /api/auth/wylogowanie`, `GET /api/auth/sesja`,
`POST /api/auth/aktywacja`, `POST /api/auth/zaproszenia` (sesja), `GET /api/auth/zaproszenia` (Suweren),
`POST /api/auth/zaproszenia/<id>/decyzja` (Suweren).

## Uruchomienie
```
cd backend && npm test                      # testy (node --test)
node narzedzia/bootstrap_suwerena.js        # jednorazowe konto Suwerena (pusty magazyn)
npm run dev                                 # dev_server montuje /api/auth/*
```

## Stan certyfikacji PS
Typ i poziom certyfikatu startowego przy zaproszeniu: NIEROZSTRZYGNIĘTE (decyzja
Suwerena odroczona). Konto powstaje ze stanem jawnym `certyfikacja_oczekujaca`;
punkt wywołania PS = parametr `hookPS` (domyślnie odracza z jawnym powodem).
