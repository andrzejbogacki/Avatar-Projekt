# ADR-008: Topologia wystawienia publicznego i granica bezpieczeństwa
- **Data:** 2026-07-14
- **Status:** zatwierdzony
- **Decydent:** Suweren (Andrzej Bogacki)

## Kontekst
Planowane jest publiczne udostępnienie strony testowej pod domeną
`andrzejbogacki.cloud` (Cloudflare + tunel `cloudflared`). Dotychczas
projekt nie miał żadnej decyzji o tym, JAK aplikacja jest wystawiana
publicznie — mimo ADR na stos (001), Auth (002) i pozostałe moduły.

Ta luka doprowadziła do incydentu: od 30.06 do 14.07.2026 domena serwowała
CAŁY katalog repozytorium przez `python -m http.server --directory` (agent
launchd `com.avatar.resonator`, za tunelem cloudflared). Serwer plików
ignoruje `.gitignore`, więc publiczne były hashe haseł (auth/accounts),
profile PS, dane Wymiennika, wzorzec protokołu, katalog `.git/` i paczka
backup. Sekrety nie wyciekły przez git (są w `.gitignore`) — wyłącznie przez
serwer plików katalogu roboczego.

## Decyzja
1. **Zakaz serwowania surowego katalogu.** Publicznie nigdy nie wystawia się
   katalogu repo, `backend/`, `backend/modules/**` ani żadnego katalogu
   danych per-user. Mechanizmy typu „http.server na katalogu projektu" są
   zakazane jako warstwa publiczna.
2. **Tylko dedykowany punkt wejścia.** Publicznie dostępny jest wyłącznie
   świadomie zbudowany artefakt: dedykowany katalog statyczny (`public/`
   z jawną listą plików) LUB aplikacja przez własny router, który serwuje
   tylko trasy zadeklarowane w kodzie — nigdy pliki z dysku po ścieżce.
3. **Dane wrażliwe poza warstwą web.** Katalogi z `.gitignore`
   (accounts, zaproszenia, profile, salda, transakcje, tokeny, oferty,
   zrodla, profiles, propozycje) nie mogą być osiągalne żadną trasą HTTP.
4. **Granica dev vs publiczne.** `dev_server.js` pozostaje narzędziem dev
   (Tailscale serve, tylko tailnet). Wystawienie publiczne to osobna,
   świadoma konfiguracja — nie „ten sam serwer wystawiony na świat".
5. **Tunel Cloudflare — jawny ingress.** Ingress tunelu wskazuje wyłącznie
   na zatwierdzony punkt z pkt 2. Zmiana ingressu = świadoma decyzja.

## Alternatywy odrzucone
- Statyczny serwer na katalogu repo (stan sprzed incydentu) — przyczyna
  wycieku; odrzucony kategorycznie.
- Poleganie na „nikt nie zgadnie ścieżki" — bezpieczeństwo przez
  niejawność; odrzucone.

## Konsekwencje
- Przed publikacją: przekierować/usunąć ingress tunelu (obecnie martwy
  `→ localhost:8000`) i wskazać zatwierdzony punkt wejścia.
- Trzeba zbudować dedykowaną warstwę publiczną (katalog `public/` lub
  router z jawnymi trasami) — praca do zaplanowania osobno; wybór wariantu
  z pkt 2 = osobna decyzja wykonawcza przy budowie strony.
- Testy/CI mogą sprawdzać, że trasy publiczne nie sięgają katalogów danych.
