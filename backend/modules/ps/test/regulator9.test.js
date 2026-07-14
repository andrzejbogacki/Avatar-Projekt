'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { MagazynProfili } = require('../src/profil/magazyn');
const { UslugaBramki } = require('../src/regulator9/bramka');
const { UslugaKontaktu } = require('../src/regulator9/kontakt');
const { utworzPrzyjecieCertyfikacji } = require('../src/regulator9/certyfikacja');

function srodowisko() {
    const magazyn = new MagazynProfili({
        katalog: fs.mkdtempSync(path.join(os.tmpdir(), 'ps-reg9-')),
        zegar: () => 1_000_000,
    });
    return {
        magazyn,
        bramka: new UslugaBramki({ magazyn, zegar: () => 1_000_000 }),
        kontakt: new UslugaKontaktu({ magazyn, zegar: () => 1_000_000 }),
        certyfikacja: utworzPrzyjecieCertyfikacji({ magazyn, zegar: () => 1_000_000 }),
    };
}

test('bramka: oba elementy zatwierdzenia wymagane — zapis zobowiązania, id gościa', async () => {
    const { magazyn, bramka } = srodowisko();
    await magazyn.utworzProfil({ avatar_id: 'andrzej_bogacki', imie: 'Andrzej' });

    // brak któregokolwiek elementu = odmowa, bez zapisu
    for (const wejscie of [
        { uznanie_statusu: true, klauzula_nieuzycia: false },
        { uznanie_statusu: false, klauzula_nieuzycia: true },
        {},
    ]) {
        const wynik = await bramka.zatwierdzBramke('andrzej_bogacki', wejscie);
        assert.equal(wynik.status, 'odmowa');
    }
    let profil = await magazyn.odczytajProfil('andrzej_bogacki');
    assert.equal(profil.modul_4_protokol_relacji.rejestr_dostepu.length, 0);

    const ok = await bramka.zatwierdzBramke('andrzej_bogacki', {
        uznanie_statusu: true, klauzula_nieuzycia: true,
    });
    assert.equal(ok.status, 'zapisano');
    assert.match(ok.id_goscia, /^[0-9a-f]+$/);

    profil = await magazyn.odczytajProfil('andrzej_bogacki');
    const wpis = profil.modul_4_protokol_relacji.rejestr_dostepu[0];
    assert.equal(wpis.id_goscia, ok.id_goscia);
    assert.equal(wpis.uznanie_statusu, true);
    assert.equal(wpis.klauzula_nieuzycia, true);
    assert.ok(wpis.ts);

    // gość z zobowiązaniem ma dostęp niesklasyfikowany; obcy identyfikator — nie
    assert.equal(bramka.goscMaDostep(profil, ok.id_goscia), true);
    assert.equal(bramka.goscMaDostep(profil, 'nieistniejacy'), false);
});

test('kontakt: prośba → decyzja właściciela; ponowna decyzja odrzucana', async () => {
    const { magazyn, kontakt } = srodowisko();
    await magazyn.utworzProfil({ avatar_id: 'andrzej_bogacki', imie: 'Andrzej' });

    const prosba = await kontakt.prosOKontakt('andrzej_bogacki', { od: 'jan_kowalski' });
    assert.equal(prosba.status, 'zapisano');

    const lista = await kontakt.listaProsb('andrzej_bogacki');
    assert.equal(lista.length, 1);
    assert.equal(lista[0].status, 'oczekujaca');

    const decyzja = await kontakt.zdecyduj('andrzej_bogacki', prosba.id, 'zaakceptowana');
    assert.equal(decyzja.status, 'zapisano');

    const profil = await magazyn.odczytajProfil('andrzej_bogacki');
    const zgoda = profil.modul_4_protokol_relacji.zgody_na_kontakt[0];
    assert.equal(zgoda.status, 'zaakceptowana');
    assert.ok(zgoda.decyzja_ts);

    // brak automatycznego przyznania i brak ponownego rozstrzygania
    assert.equal((await kontakt.zdecyduj('andrzej_bogacki', prosba.id, 'odrzucona')).status, 'odmowa');
    assert.equal((await kontakt.zdecyduj('andrzej_bogacki', 'nie_ma', 'zaakceptowana')).status, 'odmowa');
    assert.equal((await kontakt.zdecyduj('andrzej_bogacki', prosba.id, 'moze')).status, 'odmowa');
});

test('certyfikacja z Auth: tworzy profil nowego konta, zapis aktu ze stanem jawnym, typ/poziom=null', async () => {
    const { magazyn, certyfikacja } = srodowisko();
    const wynik = await certyfikacja({ avatar_id: 'jan_kowalski', zapraszajacy: 'andrzej_bogacki' });
    assert.equal(wynik.status, 'zapisano_oczekujaca');

    const profil = await magazyn.odczytajProfil('jan_kowalski');
    assert.ok(profil, 'profil PS powstaje przy zatwierdzonym zaproszeniu');
    assert.deepEqual(profil.certyfikacja_startowa, {
        status: 'certyfikacja_oczekujaca',
        zapraszajacy: 'andrzej_bogacki',
        typ: null,    // NIEROZSTRZYGNIĘTE — decyzja Suwerena odroczona (ADR-002/003)
        poziom: null,
        ts: new Date(1_000_000).toISOString(),
    });
});

test('certyfikacja z Auth: profil istniejący — akt dopisany tylko raz', async () => {
    const { magazyn, certyfikacja } = srodowisko();
    await certyfikacja({ avatar_id: 'jan_kowalski', zapraszajacy: 'andrzej_bogacki' });
    const ponownie = await certyfikacja({ avatar_id: 'jan_kowalski', zapraszajacy: 'inny_avatar' });
    assert.equal(ponownie.status, 'odmowa');
    const profil = await magazyn.odczytajProfil('jan_kowalski');
    assert.equal(profil.certyfikacja_startowa.zapraszajacy, 'andrzej_bogacki'); // bez nadpisania
});
