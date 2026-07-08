'use strict';

const crypto = require('node:crypto');

// Kolejka zadań asynchronicznych QRT — pętla obliczeniowa nie blokuje
// interfejsu modułu. Zadania wykonywane sekwencyjnie; między porcjami
// obliczeń pętla oddaje sterowanie (setImmediate) w dopasowanie.js.

class KolejkaZadan {
    constructor() {
        this._zadania = new Map();
        this._lancuch = Promise.resolve();
    }

    /** Kolejkuje funkcję asynchroniczną; zwraca uchwyt {id, wynik(Promise)}. */
    dodaj(fn) {
        const id = crypto.randomUUID();
        const zadanie = { id, status: 'oczekuje', blad: null, wynik: null };
        this._zadania.set(id, zadanie);

        const wykonanie = this._lancuch.then(async () => {
            zadanie.status = 'w_toku';
            try {
                zadanie.wynik = await fn();
                zadanie.status = 'zakonczone';
                return zadanie.wynik;
            } catch (blad) {
                zadanie.status = 'blad';
                zadanie.blad = blad.message;
                throw blad;
            }
        });
        // łańcuch kolejki nie może pęknąć po błędzie pojedynczego zadania
        this._lancuch = wykonanie.catch(() => {});
        return { id, wynik: wykonanie };
    }

    status(id) {
        const z = this._zadania.get(id);
        if (!z) return null;
        return { id: z.id, status: z.status, blad: z.blad };
    }
}

// Oddanie sterowania pętli zdarzeń między porcjami obliczeń.
function oddajSterowanie() {
    return new Promise((resolve) => setImmediate(resolve));
}

module.exports = { KolejkaZadan, oddajSterowanie };
