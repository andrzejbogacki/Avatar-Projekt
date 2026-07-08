'use strict';

const { cache } = require('../config');

/**
 * Bufor główny — Redis. Wymaga pakietu `redis` (zależność opcjonalna) oraz
 * działającego serwera. Każda niedostępność = wyjątek; decyzję o fallbacku
 * in-memory podejmuje cache/index.js (jawnie, z odnotowaniem typu bufora).
 */
class AdapterRedis {
    constructor() {
        this.typ = 'redis';
        this._klient = null;
    }

    async polacz() {
        let redis;
        try {
            redis = require('redis');
        } catch {
            throw new Error('Pakiet `redis` niezainstalowany — bufor Redis niedostępny');
        }
        const klient = redis.createClient({
            url: cache.REDIS.url,
            socket: { connectTimeout: cache.REDIS.timeout_polaczenia_ms, reconnectStrategy: false },
        });
        klient.on('error', () => {});
        await klient.connect();
        this._klient = klient;
    }

    _pelnyKlucz(klucz) {
        return `${cache.REDIS.prefiks_klucza}${klucz}`;
    }

    async zapisz(klucz, rekord) {
        await this._klient.set(this._pelnyKlucz(klucz), JSON.stringify(rekord));
    }

    async odczytaj(klucz) {
        const surowy = await this._klient.get(this._pelnyKlucz(klucz));
        return surowy === null ? null : JSON.parse(surowy);
    }

    async klucze() {
        const pelne = await this._klient.keys(`${cache.REDIS.prefiks_klucza}*`);
        return pelne.map((k) => k.slice(cache.REDIS.prefiks_klucza.length));
    }

    async zamknij() {
        if (this._klient) await this._klient.quit();
    }
}

module.exports = { AdapterRedis };
