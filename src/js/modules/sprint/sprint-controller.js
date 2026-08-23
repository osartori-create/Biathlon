import { Timer } from '../commun/timer.js';
import { TirService } from '../commun/tir.js';
import { firebaseService } from '../../core/firebase-service.js';
import { appState } from '../../core/state.js';
import { toast } from '../../services/toast-service.js';
import { VMA_POINTS, VITESSE_SUSPECTE } from '../../config/constants.js';

export class SprintController {
    constructor() {
        this.timer = new Timer();
        this.tir = new TirService();
        this._isSubmitting = false;
        this._currentVMA = 12;
        this._distanceTotale = 200;
        this._nbSeries = 3;
        this._cleanupTimer = null;
    }

    init(config) {
        this._distanceTotale = config.distanceTotale || 200;
        this._nbSeries = config.nbSeries || 3;
        this.tir.reset(config.nbFleches || 2);
        const state = appState.getState();
        const key = `${state.equipe}-${state.maillot}`;
        this._currentVMA = (config.vmaReference && config.vmaReference[key]) || 12;

        // Nettoyer l'ancien listener de timer
        if (this._cleanupTimer) this._cleanupTimer();
        this._cleanupTimer = this.timer.onTick((ms) => {
            const phase = appState.getState().currentPhase;
            if (phase === 'course' || phase === 'tir' || phase === 'penalite') {
                // Mise à jour de l'affichage (délégué à l'UI)
                window.dispatchEvent(new CustomEvent('timer-tick', { detail: { ms, phase } }));
            }
        });
    }

    startCourse() {
        if (appState.getState().isRunning) return;
        this.timer.reset();
        this.tir.reset();
        appState.setState({ currentPhase: 'course', isRunning: true });
        this.timer.start();
    }

    stopCourse() {
        if (!appState.getState().isRunning) return;
        this.timer.stop();
        appState.setState({ isRunning: false });
        appState.setState({ currentPhase: 'tir' });
    }

    async finishSerie() {
        if (this._isSubmitting) {
            toast.show('⏳ Envoi en cours...', 2000, 'warning');
            return;
        }

        const state = appState.getState();
        const serieIndex = state.currentSerie;

        if (!this.tir.isComplete()) {
            toast.show('❗ Tirez toutes les flèches avant de valider.', 2500, 'error');
            return;
        }

        this._isSubmitting = true;

        try {
            const tempsMs = this.timer.getElapsed();
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
                courseMs: Math.round(tempsMs * 0.8),
                tirMs: Math.round(tempsMs * 0.2),
                penaliteMs: 0,
                shots: this.tir.getShots(),
                penReq: 0,
                penDone: 0,
                serie: serieIndex + 1,
                mode: 'sprint',
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

    _calculateVitesse(tempsMs) {
        if (tempsMs <= 0) return 0;
        const heures = tempsMs / 3600000;
        const distanceKm = this._distanceTotale / 1000;
        return distanceKm / heures;
    }

    _calculatePointsVMA(vitesse) {
        const vma = this._currentVMA;
        if (vitesse >= vma + 1) return VMA_POINTS.PLUS_1;
        if (vitesse >= vma - 0.5) return VMA_POINTS.MOINS_0_5;
        if (vitesse >= vma - 1) return VMA_POINTS.MOINS_1;
        return 0;
    }

    _isVitesseSuspecte(vitesse) {
        return vitesse > VITESSE_SUSPECTE || vitesse > this._currentVMA * 1.5;
    }

    cleanup() {
        if (this._cleanupTimer) this._cleanupTimer();
        this.timer.stop();
    }
}