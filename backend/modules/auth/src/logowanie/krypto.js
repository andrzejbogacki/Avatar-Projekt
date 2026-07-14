'use strict';

// Krypto haseł i tokenów — wyłącznie prymitywy node:crypto (ADR-002).
const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const konfig = require('../../config');

const scryptAsync = promisify(scrypt);

function opcjeScrypt() {
    const { KOSZT_N, ROZMIAR_BLOKU_R, ROWNOLEGLOSC_P, MAKS_PAMIEC_BAJTY } = konfig.krypto.SCRYPT;
    return { N: KOSZT_N, r: ROZMIAR_BLOKU_R, p: ROWNOLEGLOSC_P, maxmem: MAKS_PAMIEC_BAJTY };
}

async function wyliczHash(haslo, solHex) {
    const klucz = await scryptAsync(
        haslo,
        Buffer.from(solHex, 'hex'),
        konfig.krypto.SCRYPT.DLUGOSC_KLUCZA_BAJTY,
        opcjeScrypt()
    );
    return klucz.toString('hex');
}

async function hashujHaslo(haslo) {
    if (typeof haslo !== 'string' || haslo.length < konfig.krypto.MIN_DLUGOSC_HASLA) {
        throw new Error(`Hasło musi mieć co najmniej ${konfig.krypto.MIN_DLUGOSC_HASLA} znaków`);
    }
    const sol = randomBytes(konfig.krypto.DLUGOSC_SOLI_BAJTY).toString('hex');
    const hash = await wyliczHash(haslo, sol);
    const { KOSZT_N, ROZMIAR_BLOKU_R, ROWNOLEGLOSC_P } = konfig.krypto.SCRYPT;
    return {
        hash,
        sol,
        parametry_scrypt: { KOSZT_N, ROZMIAR_BLOKU_R, ROWNOLEGLOSC_P },
    };
}

async function weryfikujHaslo(haslo, rekord) {
    if (typeof haslo !== 'string' || !rekord || !rekord.hash || !rekord.sol) return false;
    const hash = await wyliczHash(haslo, rekord.sol);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(rekord.hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}

function generujTokenAktywacji() {
    return randomBytes(konfig.krypto.DLUGOSC_TOKENU_AKTYWACJI_BAJTY).toString('hex');
}

module.exports = { hashujHaslo, weryfikujHaslo, generujTokenAktywacji };
