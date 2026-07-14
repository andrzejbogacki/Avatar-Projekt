'use strict';

// Rozdział środowisk (pozycja 9b — regulator): konto demo wyłącznie poza produkcją.
const SRODOWISKO_PRODUKCYJNE = 'production';

function kontoDemoDozwolone(srodowisko) {
    return srodowisko !== SRODOWISKO_PRODUKCYJNE;
}

module.exports = { kontoDemoDozwolone, SRODOWISKO_PRODUKCYJNE };
