/**
 * Valide un code PIN (3 chiffres)
 */
export function isValidPin(pin, expectedPin) {
    return pin === expectedPin;
}

/**
 * Valide une distance de piste (positive)
 */
export function isValidDistance(distance) {
    return distance > 0 && distance < 1000;
}

/**
 * Valide un nombre de tours (1-4)
 */
export function isValidNbTours(nb) {
    return nb >= 1 && nb <= 4;
}