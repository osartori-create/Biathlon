/**
 * Formate un temps en millisecondes vers MM:SS.cc
 */
export function formatTime(ms) {
    ms = Math.max(0, Math.round(ms));
    const cs = Math.floor((ms % 1000) / 10);
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Formate une vitesse en km/h avec 1 décimale
 */
export function formatVitesse(vitesse) {
    return vitesse ? Math.round(vitesse * 10) / 10 : 0;
}

/**
 * Formate une VMA en nombre
 */
export function formatVMA(vma) {
    return vma || 12;
}