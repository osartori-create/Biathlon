import { db } from '../config/firebase-config.js';

class FirebaseService {
    constructor() {
        this._refs = {
            config: db.ref('arcathlon/config'),
            passages: db.ref('arcathlon/live/passages'),
            depart: db.ref('arcathlon/commandes/depart'),
            handicaps: db.ref('arcathlon/config/handicaps')
        };
        this._listeners = [];
    }

    // Écoute la configuration (sans les noms/prénoms)
    watchConfig(callback) {
        const ref = this._refs.config;
        const handler = ref.on('value', snap => {
            const config = snap.val() || {};
            const sanitized = {
                seanceId: config.seanceId,
                mode: config.mode || 'sprint',
                nbSeries: config.nbSeries || 3,
                nbFleches: config.nbFleches || 2,
                distanceTotale: config.distanceTotale || 200,
                longueurPenalite: config.longueurPenalite || 30,
                vmaReference: config.vmaReference || {},
                equipes: {}
            };
            if (config.equipes) {
                Object.keys(config.equipes).forEach(eqId => {
                    const eq = config.equipes[eqId];
                    sanitized.equipes[eqId] = {
                        pin: eq.pin,
                        membres: (eq.membres || []).map(m => ({
                            maillot: m.maillot,
                            vma: m.vma,
                            code: m.code,
                            statut: m.absent ? 'absent' : (m.inapte ? 'inapte' : 'present')
                        }))
                    };
                });
            }
            callback(sanitized);
        });
        this._listeners.push({ ref, handler, event: 'value' });
        return () => ref.off('value', handler);
    }

    // Écoute les handicaps en temps réel
    watchHandicaps(callback) {
        const ref = this._refs.handicaps;
        const handler = ref.on('value', snap => {
            callback(snap.val() || {});
        });
        this._listeners.push({ ref, handler, event: 'value' });
        return () => ref.off('value', handler);
    }

    // Écoute le départ centralisé
    watchDepart(callback) {
        const ref = this._refs.depart;
        const handler = ref.on('value', snap => {
            const data = snap.val();
            if (data && data.timestamp) {
                callback(data);
            }
        });
        this._listeners.push({ ref, handler, event: 'value' });
        return () => ref.off('value', handler);
    }

    // Envoi d'un passage
    async submitPassage(passageData) {
        return this._refs.passages.push().set(passageData);
    }

    // Nettoyage complet
    cleanup() {
        this._listeners.forEach(({ ref, handler, event }) => {
            ref.off(event, handler);
        });
        this._listeners = [];
    }
}

export const firebaseService = new FirebaseService();