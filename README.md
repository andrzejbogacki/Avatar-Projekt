# Avatar-Projekt

Repozytorium projektu Avatar.

## Synchronizacja: Mac Mini ↔ GitHub ↔ Claude Code (chmura)

Wymiana plików między Mac Mini a sesjami Claude Code odbywa się przez GitHub.
Nie ma bezpośredniego połączenia między Mac Mini a środowiskiem chmurowym —
wszystko przechodzi przez to repozytorium.

```
Mac Mini  ──push/pull──►  GitHub  ◄──push/pull──  Claude Code (chmura)
```

### Codzienny workflow na Mac Mini

```bash
# Pobranie najnowszych zmian (np. tych zrobionych przez Claude w chmurze)
git pull origin main

# Po wprowadzeniu własnych zmian
git add .
git commit -m "Opis zmian"
git push origin main
```

## Struktura

Strukturę katalogów uzupełnimy w miarę rozwoju projektu.
