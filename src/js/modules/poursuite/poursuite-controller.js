import { SprintController } from '../sprint/sprint-controller.js';
import { firebaseService } from '../../core/firebase-service.js';
import { appState } from '../../core/state.js';
import { toast } from '../../services/toast-service.js';
import { PENALITE_TIR, TEMPS_PENALITE_PAR_TOUR } from '../../config/constants.js';

export class PoursuiteController extends SprintController {
    constructor() {
        super();
        this._handicapListener = null;
        this._departListener = null;
        this._departCountdown = null;
        this._penaliteEnCours = false;
        this._penaliteDone = 0;
        this._penaliteReq = 0;
    }

    init(config) {
        super.init(config);

        // Écouter les handicaps en temps réel
        if (this._handicapListener) this._handicapListener();
        this._handicapListener = firebaseService.watchHandicaps(handicaps => {
            const state = appState.getState();
            const key = `${state.equipe}-${state.maillot}`;
            const handicapMs = handicaps[key] || 0;
            appState.setState({ handicapMs });
            if (handicapMs > 0) {
                toast.show(`⏱️ Handicap : +${(handicapMs/1000).toFixed(1)}s`, 3000, 'warning');
            }
        });

        // Écouter le départ centralisé
        if (this._departListener) this._departListener();
        this._departListener = firebaseService.watchDepart(departData => {
            this._handleDepart(departData);
        });
    }

    _handleDepart(departData) {
        const now = Date.now();
        const delai = departData.delai || 0;
        const targetTime = departData.timestamp + (delai * 1000);
        const remaining = Math.max(0, Math.round((targetTime - now) / 1000));

        if (this._departCountdown) clearInterval(this._departCountdown);

        if (remaining > 0) {
            toast.show(`🚦 Départ dans ${remaining}s...`, 3000, 'info');
            this._departCountdown = setInterval(() => {
                const rem = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
                if (rem > 0) {
                    // Mise à jour de l'affichage via event
                    window.dispatchEvent(new CustomEvent('depart-countdown', { detail: { remaining: rem } }));
                } else {
                    clearInterval(this._departCountdown);
                    toast.success('🚀 GO !');
                    this.startCourse();
                }
            }, 200);
        } else {
            toast.success('🚀 GO !');
            this.startCourse();
        }
    }

    // Surcharge : après le tir, on gère les pénalités
    async finishSerie() {
        if (this._isSubmitting) return;
        if (!this.tir.isComplete()) {
            toast.show('❗ Tirez toutes les flèches.', 2500, 'error');
            return;
        }

        const ptsTir = this.tir.getTotal();
        let penReq = 0;
        if (ptsTir < PENALITE_TIR.SEUIL_1) penReq = 3;
        else if (ptsTir < PENALITE_TIR.SEUIL_2) penReq = 2;
        else if (ptsTir < PENALITE_TIR.SEUIL_3) penReq = 1;

        if (penReq > 0) {
            this._penaliteEnCours = true;
            this._penaliteReq = penReq;
            this._penaliteDone = 0;
            appState.setState({ currentPhase: 'penalite' });
            window.dispatchEvent(new CustomEvent('show-penalite', { detail: { penReq, done: 0 } }));
            toast.show(`🔴 ${penReq} tour(s) de pénalité à effectuer`, 3000, 'warning');
            return;
        }

        // Pas de pénalité → validation directe
        await this._submitWithPenalite(0);
    }

    // Appelé par l'UI quand un tour de pénalité est complété
    onPenaliteDone() {
        if (!this._penaliteEnCours) return;
        this._penaliteDone++;
        const remaining = this._penaliteReq - this._penaliteDone;
        window.dispatchEvent(new CustomEvent('penalite-update', { 
            detail: { done: this._penaliteDone, req: this._penaliteReq } 
        }));

        if (this._penaliteDone >= this._penaliteReq) {
            this._penaliteEnCours = false;
            toast.success('✅ Pénalités terminées !');
            // On soumet avec le temps des pénalités
            const tempsPenalite = this._penaliteReq * TEMPS_PENALITE_PAR_TOUR;
            this._submitWithPenalite(tempsPenalite);
        }
    }

    async _submitWithPenalite(tempsPenaliteMs) {
        if (this._isSubmitting) return;
        this._isSubmitting = true;

        try {
            const state = appState.getState();
            const serieIndex = state.currentSerie;
            const tempsMs = this.timer.getElapsed() + tempsPenaliteMs;
            const vitesse = this._calculateVitesse(tempsMs);
            const ptsVMA = this._calculatePointsVMA(vitesse);
            const ptsTir = this.tir.getTotal();

            const passageData = {
                equipe: state.equipe,
                maillot: state.maillot,
                juge: state.juge,
                ptsVMA,
                ptsTir,
                vitesse: Math.round(vitesse * 10) / 10,
                temps: Math.round(tempsMs),
                courseMs: Math.round(this.timer.getElapsed() * 0.8),
                tirMs: Math.round(this.timer.getElapsed() * 0.2),
                penaliteMs: tempsPenaliteMs,
                shots: this.tir.getShots(),
                penReq: this._penaliteReq,
                penDone: this._penaliteDone,
                serie: serieIndex + 1,
                mode: 'poursuite',
                timestamp: Date.now(),
                alerteTriche: this._isVitesseSuspecte(vitesse),
                handicap: state.handicapMs || 0
            };

            await firebaseService.submitPassage(passageData);

            const nextSerie = serieIndex + 1;
            if (nextSerie < this._nbSeries) {
                appState.setState({ currentSerie: nextSerie, currentPhase: 'course', isRunning: false });
                this.timer.reset();
                this.tir.reset();
                this._penaliteReq = 0;
                this._penaliteDone = 0;
                toast.success(`✅ Série ${nextSerie+1} prête`);
                window.dispatchEvent(new CustomEvent('serie-ready', { detail: { serie: nextSerie } }));
            } else {
                toast.success('🏆 Toutes les séries terminées !');
                window.dispatchEvent(new CustomEvent('return-dashboard'));
            }

        } catch (error) {
            console.error(error);
            toast.error('❌ Erreur réseau, réessayez.');
        } finally {
            this._isSubmitting = false;
        }
    }

    cleanup() {
        if (this._handicapListener) this._handicapListener();
        if (this._departListener) this._departListener();
        if (this._departCountdown) clearInterval(this._departCountdown);
        super.cleanup();
    }
}