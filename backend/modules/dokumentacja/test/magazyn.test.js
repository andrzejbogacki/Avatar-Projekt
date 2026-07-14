'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { MagazynDokumentow, hashZrodla } = require('../src/regulator9/magazyn');
const { walidujWpis } = require('../src/regulator9/walidacja');

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

const WPIS_STRATEGII = {
    id: 'strategia_testowa',
    tytul: 'Strategia testowa',
    typ: 'strategia',
    status: 'piaskownica',
    wersja_dokumentu: 'v1',
    format: 'markdown',
    sciezka: 'docs/dokumenty/strategia_testowa.md',
    hash_zrodla: null,
    bajty: null,
};

function uruchomSrodowisko({ tresc = '# Strategia\n\nSieć suwerenna.\n' } = {}) {
    const repo = tmp('dok-repo-');
    const katalogDokumentow = path.join(repo, 'docs', 'dokumenty');
    fs.mkdirSync(katalogDokumentow, { recursive: true });
    fs.writeFileSync(path.join(katalogDokumentow, 'strategia_testowa.md'), tresc, 'utf8');
    const sciezkaManifestu = path.join(katalogDokumentow, 'manifest.json');
    fs.writeFileSync(sciezkaManifestu, JSON.stringify({
        wersja: 1, zbudowano_ts: null, dokumenty: [{ ...WPIS_STRATEGII }],
    }, null, 2), 'utf8');
    return {
        repo,
        sciezkaManifestu,
        magazyn: new MagazynDokumentow({ sciezkaManifestu, katalogRepo: repo }),
    };
}

test('dokumentacja magazyn: przebudowa wylicza hash i bajty, nie tyka metadanych', async () => {
    const { magazyn, sciezkaManifestu } = uruchomSrodowisko();
    const manifest = await magazyn.przebudujManifest();

    const wpis = manifest.dokumenty[0];
    assert.equal(wpis.tytul, 'Strategia testowa');
    assert.equal(wpis.hash_zrodla, hashZrodla('# Strategia\n\nSieć suwerenna.\n'));
    assert.equal(wpis.bajty, Buffer.byteLength('# Strategia\n\nSieć suwerenna.\n', 'utf8'));
    assert.ok(manifest.zbudowano_ts);

    // zapis trafił na dysk — jedyna ścieżka zapisu manifestu
    const zapisany = JSON.parse(fs.readFileSync(sciezkaManifestu, 'utf8'));
    assert.equal(zapisany.dokumenty[0].hash_zrodla, wpis.hash_zrodla);
});

test('dokumentacja magazyn: odczyt dokumentu ze stemplem live i zgodnością hash', async () => {
    const { magazyn, repo } = uruchomSrodowisko();
    await magazyn.przebudujManifest();

    const dokument = await magazyn.dokument('strategia_testowa');
    assert.equal(dokument.tresc, '# Strategia\n\nSieć suwerenna.\n');
    assert.equal(dokument.aktualny, true);
    assert.equal(dokument.stempel.status, 'live');
    assert.equal(dokument.stempel.zrodlo, 'docs/dokumenty/strategia_testowa.md');

    // zmiana treści poza przebudową = jawna nieaktualność, treść nadal live
    fs.writeFileSync(path.join(repo, 'docs', 'dokumenty', 'strategia_testowa.md'),
        '# Strategia\n\nZmieniona.\n', 'utf8');
    const zmieniony = await magazyn.dokument('strategia_testowa');
    assert.equal(zmieniony.aktualny, false);
    assert.equal((await magazyn.lista()).aktualny, false);

    assert.equal(await magazyn.dokument('nie_ma_takiego'), null);
});

test('dokumentacja magazyn: brak pliku dokumentu = jawny status dostepny:false na liście', async () => {
    const { magazyn, repo } = uruchomSrodowisko();
    await magazyn.przebudujManifest();
    fs.rmSync(path.join(repo, 'docs', 'dokumenty', 'strategia_testowa.md'));

    const lista = await magazyn.lista();
    assert.equal(lista.dokumenty[0].dostepny, false);
    assert.equal(lista.dokumenty[0].aktualny, false);
});

test('dokumentacja magazyn: dokument ponad limit bajtów jest odrzucany jawnie', async () => {
    const { sciezkaManifestu, repo } = uruchomSrodowisko({ tresc: 'x'.repeat(64) });
    const maly = new MagazynDokumentow({ sciezkaManifestu, katalogRepo: repo, maksBajty: 16 });
    await assert.rejects(() => maly.dokument('strategia_testowa'), /przekracza limit/);
});

test('dokumentacja walidacja: odrzuca ścieżkę poza repo, zły typ, status i id', () => {
    const repo = tmp('dok-wal-');
    const poprawny = { ...WPIS_STRATEGII };
    assert.equal(walidujWpis(poprawny, { katalogRepo: repo }), poprawny);
    assert.ok(WPIS_STRATEGII.status.match(/piaskownica/));

    assert.throws(() => walidujWpis({ ...poprawny, sciezka: '../poza_repo.md' },
        { katalogRepo: repo }), /poza korzeń repozytorium/);
    assert.throws(() => walidujWpis({ ...poprawny, sciezka: '/etc/hosts' },
        { katalogRepo: repo }), /musi być względna/);
    assert.throws(() => walidujWpis({ ...poprawny, typ: 'notatka' },
        { katalogRepo: repo }), /nieznany typ/);
    assert.throws(() => walidujWpis({ ...poprawny, status: 'gotowy' },
        { katalogRepo: repo }), /nieznany status/);
    assert.throws(() => walidujWpis({ ...poprawny, id: 'Duże Litery' },
        { katalogRepo: repo }), /nieprawidłowy id/);
    assert.throws(() => walidujWpis({ ...poprawny, format: 'pdf' },
        { katalogRepo: repo }), /nieznany format/);

    // status zamrożony_vN (zapis bez diakrytyków) jest dozwolony
    assert.ok(walidujWpis({ ...poprawny, status: 'zamrozony_v1' }, { katalogRepo: repo }));
});
