// Seuils de bonus pour le tir (Sprint)
export const BONUS_TIR = {
    SEUIL_1: 7,   // < 7 pts : 0s
    SEUIL_2: 12,  // 7-11 pts : -10s
    SEUIL_3: 16,  // 12-15 pts : -15s
    // >= 16 pts : -20s
};

// Seuils de pénalité pour le tir (Poursuite)
export const PENALITE_TIR = {
    SEUIL_1: 7,   // < 7 pts : 3 tours
    SEUIL_2: 12,  // 7-11 pts : 2 tours
    SEUIL_3: 16,  // 12-15 pts : 1 tour
    // >= 16 pts : 0 tour
};

// Seuils de points VMA (selon vitesse)
export const VMA_POINTS = {
    PLUS_1: 3,    // >= VMA + 1 : 3 pts
    MOINS_0_5: 2, // >= VMA - 0.5 : 2 pts
    MOINS_1: 1,   // >= VMA - 1 : 1 pt
    // < VMA - 1 : 0 pt
};

export const VITESSE_SUSPECTE = 25; // km/h au-dessus = alerte triche
export const TEMPS_PENALITE_PAR_TOUR = 5000; // 5 secondes par tour de pénalité