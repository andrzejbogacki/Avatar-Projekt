'use strict';

const { cache: konfigCache } = require('../config');
const { AdapterMemory } = require('./adapter_memory');
const { AdapterRedis } = require('./adapter_redis');
const { stemplujLive, stempelBrakuDanych, zWyprowadzonymStatusem } = require('./stempel');
const { xray, wiatr } = require('./zrodla/noaa_swpc');
const { kp } = require('./zrodla/kp_gfz');
const { schumann } = require('./zrodla/schumann');

const ZRODLA_DOMYSLNE = [xray, wiatr, kp, schumann];

/**
 * Bufor środowiskowy QAC. Redis jako bufor główny; przy braku — fallback
 * in-memory. Awaria źródła nie nadpisuje ostatniego stabilnego stanu;
 * status rekordu wyprowadzany z wieku (live|cache|stale).
 */
class BuforSrodowiskowy {
    constructor({ zrodla = ZRODLA_DOMYSLNE, fetchFn = fetch } = {}) {
        this._zrodla = zrodla;
        this._fetchFn = fetchFn;
        this._adapter = null;
        this._interwal = null;
        this.typ_bufora = null;
    }

    async inicjalizuj() {
        const redis = new AdapterRedis();
        try {
            await redis.polacz();
            this._adapter = redis;
        } catch (blad) {
            this._adapter = new AdapterMemory();
            this.powod_fallbacku = blad.message;
        }
        this.typ_bufora = this._adapter.typ;
        return this;
    }

    /** Jeden cykl odpytania wszystkich źródeł (równolegle). */
    async odswiez() {
        const wyniki = await Promise.allSettled(
            this._zrodla.map(async (z) => {
                const { zrodlo, wartosc } = await z.pobierz(this._fetchFn);
                await this._adapter.zapisz(z.klucz, stemplujLive(zrodlo, wartosc));
                return z.klucz;
            })
        );
        const raport = {};
        for (const [i, wynik] of wyniki.entries()) {
            const z = this._zrodla[i];
            if (wynik.status === 'fulfilled') {
                raport[z.klucz] = 'live';
                continue;
            }
            // Awaria: ostatni stabilny stan pozostaje; przy braku jakiegokolwiek
            // stanu — jawny rekord braku danych.
            const istniejacy = await this._adapter.odczytaj(z.klucz);
            if (!istniejacy) {
                await this._adapter.zapisz(
                    z.klucz,
                    stempelBrakuDanych(z.klucz, wynik.reason.message)
                );
            }
            raport[z.klucz] = `blad: ${wynik.reason.message}`;
        }
        return raport;
    }

    start() {
        if (this._interwal) return;
        this._interwal = setInterval(() => {
            this.odswiez().catch(() => {});
        }, konfigCache.CYKL_ODPYTYWANIA_MS);
        this._interwal.unref();
    }

    stop() {
        if (this._interwal) {
            clearInterval(this._interwal);
            this._interwal = null;
        }
    }

    async odczytaj(klucz, terazMs = Date.now()) {
        return zWyprowadzonymStatusem(await this._adapter.odczytaj(klucz), terazMs);
    }

    /** Migawka wszystkich parametrów środowiskowych — wejście dla normalizera 9a. */
    async migawka(terazMs = Date.now()) {
        const wynik = {};
        for (const z of this._zrodla) {
            wynik[z.klucz] = await this.odczytaj(z.klucz, terazMs);
        }
        return wynik;
    }

    async zamknij() {
        this.stop();
        if (this._adapter) await this._adapter.zamknij();
    }
}

module.exports = { BuforSrodowiskowy, ZRODLA_DOMYSLNE };
