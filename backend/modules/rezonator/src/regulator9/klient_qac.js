'use strict';

// Klient QAC (pozycja 9b — regulator): architektura request-response,
// zapytania na żądanie, bez cache, bez push. Konwencje QAC: stemplowanie
// {zrodlo, timestamp, status}, pole pewnosc obowiązkowe, zero magic numbers.
const ZRODLO_STEMPLA = 'modul.qac';

// Częstotliwość spersonalizowana = czestotliwosc_odniesienia_hz × czynnik_modulacji
// [wniosek logiczny ADR-005 — formuła robocza, spójna z O7 QAC].
// pewnosc: null = jawny brak metryki dla odczytu profilu (metrykę pewności
// definiuje QRT, nie odczyt zapisanych danych) — nigdy wartość zmyślona.
function utworzKlientaQAC({ qac, katalogProfili, zegar = Date.now }) {
    async function czestotliwoscAvatara(avatar_id) {
        const timestamp = new Date(zegar()).toISOString();
        let profil = null;
        try {
            profil = await qac.wczytajProfil(avatar_id, katalogProfili);
        } catch {
            profil = null;
        }
        if (!profil || !profil.mapa_369) {
            return {
                status: 'brak_danych',
                hz: null,
                mapa_369: null,
                pewnosc: null,
                stempel: { zrodlo: ZRODLO_STEMPLA, timestamp, status: 'stale' },
                powod: `Brak profilu QAC dla ${avatar_id} — wygeneruj profil w module QAC`,
            };
        }
        const { czestotliwosc_odniesienia_hz, czynnik_modulacji,
            pozycja_3, pozycja_6, pozycja_9_rezonans } = profil.mapa_369;
        return {
            status: 'live',
            hz: czestotliwosc_odniesienia_hz * czynnik_modulacji,
            mapa_369: { pozycja_3, pozycja_6, pozycja_9_rezonans },
            pewnosc: null,
            stempel: { zrodlo: ZRODLO_STEMPLA, timestamp, status: 'live' },
        };
    }

    return { czestotliwoscAvatara };
}

module.exports = { utworzKlientaQAC, ZRODLO_STEMPLA };
