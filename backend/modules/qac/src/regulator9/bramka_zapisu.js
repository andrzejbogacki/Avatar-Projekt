'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { rejestr } = require('../../config');

// 9b — REGULATOR: bramka wyjściowa. Jedyna autoryzowana droga zapisu profilu
// do profiles/ — zapis poza bramką jest niezgodny z kanonem pozycji 9.

const KATALOG_PROFILI = path.join(__dirname, '..', '..', 'profiles');
const WYMAGANE_SEKCJE = ['naglowek', 'dane_wejsciowe', 'dane_surowe', 'aktywacje', 'mapa_369', 'macierz_relacyjna'];
const WYMAGANE_POLA_NAGLOWKA = ['avatar_id', 'adres_rejestru', 'wersja_schematu', 'status', 'wygenerowano'];

function walidujProfil(profil) {
    const bledy = [];
    for (const sekcja of WYMAGANE_SEKCJE) {
        if (!profil?.[sekcja]) bledy.push(`brak sekcji ${sekcja}`);
    }
    for (const pole of WYMAGANE_POLA_NAGLOWKA) {
        if (profil?.naglowek?.[pole] === undefined) bledy.push(`brak pola naglowek.${pole}`);
    }
    if (profil?.naglowek?.avatar_id && !rejestr.WZORZEC_AVATAR_ID.test(profil.naglowek.avatar_id)) {
        bledy.push(`avatar_id niezgodny z wzorcem PS: ${profil.naglowek.avatar_id}`);
    }
    if (profil?.mapa_369 && !profil.mapa_369.stemple_srodowiskowe) {
        bledy.push('mapa_369 bez stempli pochodzenia parametrów środowiskowych');
    }
    if (bledy.length > 0) {
        throw new Error(`Bramka zapisu (9b) odmówiła autoryzacji: ${bledy.join('; ')}`);
    }
}

/**
 * Autoryzuje i zapisuje profil jako czysty JSON (UTF-8) pod kluczem avatar_id.
 * Zwraca ścieżkę zapisu.
 */
function autoryzujIZapisz(profil, katalog = KATALOG_PROFILI) {
    walidujProfil(profil);
    fs.mkdirSync(katalog, { recursive: true });
    const sciezka = path.join(katalog, `${profil.naglowek.avatar_id}.json`);
    fs.writeFileSync(sciezka, `${JSON.stringify(profil, null, 2)}\n`, 'utf8');
    return sciezka;
}

const KATALOG_KOSZA = '.kosz';

/** Znacznik RRRRMMDD-GGMMSS (UTC) — bez dwukropków, te są kłopotliwe w nazwach plików. */
function znacznikCzasu(teraz = new Date()) {
    const iso = teraz.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    return `${iso.slice(0, 8)}-${iso.slice(9, 15)}`;
}

/**
 * Autoryzuje i usuwa profil — przeniesienie do profiles/.kosz/ zamiast kasowania.
 * Katalog profili jest poza gitem, więc trwałe usunięcie byłoby nieodwracalne.
 * Walidacja avatar_id PRZED złożeniem ścieżki jest zabezpieczeniem przed
 * wyjściem poza katalog profili — wzorzec PS odrzuca kropki i ukośniki.
 * Zwraca ścieżkę w koszu albo null, gdy profilu nie było.
 */
function autoryzujIUsun(avatar_id, katalog = KATALOG_PROFILI) {
    if (typeof avatar_id !== 'string' || !rejestr.WZORZEC_AVATAR_ID.test(avatar_id)) {
        throw new Error(
            `Bramka 9b odmówiła usunięcia: avatar_id niezgodny z wzorcem PS: ${avatar_id}`
        );
    }
    const zrodlo = path.join(katalog, `${avatar_id}.json`);
    if (!fs.existsSync(zrodlo)) return null;

    const kosz = path.join(katalog, KATALOG_KOSZA);
    fs.mkdirSync(kosz, { recursive: true });
    const cel = path.join(kosz, `${avatar_id}-${znacznikCzasu()}.json`);
    fs.renameSync(zrodlo, cel);
    return cel;
}

module.exports = { autoryzujIZapisz, autoryzujIUsun, walidujProfil, KATALOG_PROFILI, KATALOG_KOSZA };
