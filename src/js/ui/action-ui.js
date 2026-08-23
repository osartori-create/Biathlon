import { appState } from '../core/state.js';
import { toast } from '../services/toast-service.js';
import { formatTime } from '../utils/format.js';

export class ActionUI {
    constructor() {
        this._container = document.getElementById('app');
        this._controller = null;
        this._maillot = null;
        this._timerDisplay = null;
        this._cleanupTimer = null;
        this._cleanupEvents = [];
        this._config = null;
    }

    render(maillot, controller) {
        this._maillot = maillot;
        this._controller = controller;
        // Récupérer la config depuis window.app
        this._config = window.app?._config || {};
        const state = appState.getState();
        const nbSeries = this._controller?._nbSeries || this._config?.nbSeries || 3;
        const maxFleches = this._controller?.tir?.maxFleches || 2;

        this._container.innerHTML = `
            <button onclick="window.app.action.retour()" class="text-slate-400 font-bold text-sm uppercase tracking-widest text-left mb-2">↩ Retour</button>
            <div id="phasePanel" class="bg-blue-950/80 p-4 rounded-2xl border border-blue-800 mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <div id="phaseName" class="text-2xl font-black uppercase text-blue-400">COURSE</div>
                        <div id="phaseClock" class="text-4xl font-mono font-black text-white">00:00.00</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold text-slate-400">${state.maillot}</div>
                        <div id="serieInfo" class="text-xs text-slate-400">Série ${state.currentSerie+1}/${nbSeries}</div>
                        <div id="handicapDisplay" class="text-xs text-yellow-400 font-bold ${state.handicapMs > 0 ? '' : 'hidden'}">⏱️ +${(state.handicapMs/1000).toFixed(1)}s</div>
                    </div>
                </div>
            </div>

            <!-- Zone de tir -->
            <div id="tirZone" style="display:none;" class="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
                <div class="text-center font-bold text-white text-lg mb-2">🎯 Tir</div>
                <div class="flex justify-center gap-4 flex-wrap">
                    <div onclick="window.app.action.marquerTir(10)" class="bg-yellow-600 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black cursor-pointer btn-tap border-4 border-yellow-400">10</div>
                    <div onclick="window.app.action.marquerTir(8)" class="bg-red-600 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black cursor-pointer btn-tap border-4 border-red-400">8</div>
                    <div onclick="window.app.action.marquerTir(6)" class="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black cursor-pointer btn-tap border-4 border-blue-400">6</div>
                    <div onclick="window.app.action.marquerTir(5)" class="bg-slate-600 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black cursor-pointer btn-tap border-4 border-slate-400">5</div>
                    <div onclick="window.app.action.marquerTir(0)" class="bg-red-900 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black cursor-pointer btn-tap border-4 border-red-800">0</div>
                </div>
                <div id="tirStatus" class="text-center mt-2 text-slate-400 text-sm">Flèches : 0/${maxFleches}</div>
                <button id="btnValiderTir" onclick="window.app.action.validerTir()" disabled class="mt-3 w-full bg-emerald-600 py-3 rounded-xl font-black text-lg uppercase text-white opacity-40 transition-opacity">Valider le tir</button>
                <button onclick="window.app.action.annulerTir()" class="mt-2 w-full bg-slate-700 py-2 rounded-xl text-sm font-bold text-slate-300">↩ Annuler flèche</button>
            </div>

            <!-- Zone pénalité -->
            <div id="penaliteZone" style="display:none;" class="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
                <div class="text-center font-bold text-white text-lg">🔴 Pénalités</div>
                <div id="penaliteStatus" class="text-center text-2xl font-black text-yellow-400">0 / 0</div>
                <button onclick="window.app.action.fairePenalite()" class="mt-3 w-full bg-purple-600 py-3 rounded-xl font-black text-lg uppercase text-white">🏃 Effectuer un tour</button>
            </div>

            <button id="btnAction" onclick="window.app.action.onAction()" class="w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest text-white bg-blue-600 border-4 border-blue-400 shadow-lg btn-tap">
                Démarrer la course
            </button>
        `;

        this._timerDisplay = document.getElementById('phaseClock');
        // Nettoyer l'ancien timer listener
        if (this._cleanupTimer) this._cleanupTimer();
        if (this._controller && this._controller.timer) {
            this._cleanupTimer = this._controller.timer.onTick((ms) => {
                if (this._timerDisplay) {
                    this._timerDisplay.textContent = formatTime(ms);
                }
            });
        }

        this._setupEvents();
        this._updatePhase('course');
    }

    _setupEvents() {
        // Nettoyer les anciens listeners
        this._cleanupEvents.forEach(fn => fn());
        this._cleanupEvents = [];

        const handlers = {
            'show-penalite': (e) => {
                const { penReq, done } = e.detail;
                document.getElementById('penaliteZone').style.display = 'block';
                document.getElementById('penaliteStatus').textContent = `${done || 0} / ${penReq}`;
                document.getElementById('tirZone').style.display = 'none';
                document.getElementById('btnAction').style.display = 'none';
            },
            'penalite-update': (e) => {
                document.getElementById('penaliteStatus').textContent = `${e.detail.done} / ${e.detail.req}`;
            },
            'serie-ready': () => {
                this._updatePhase('course');
                document.getElementById('btnAction').textContent = 'Démarrer la course';
            },
            'return-dashboard': () => {
                this.retour();
            },
            'depart-countdown': (e) => {
                const btn = document.getElementById('btnAction');
                btn.textContent = `⏳ Départ dans ${e.detail.remaining}s...`;
                btn.className = 'w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest text-white bg-yellow-600 border-4 border-yellow-400 shadow-lg opacity-70';
                btn.disabled = true;
            },
            'timer-tick': (e) => {
                // mise à jour si besoin
            }
        };

        Object.keys(handlers).forEach(eventName => {
            const fn = handlers[eventName];
            window.addEventListener(eventName, fn);
            this._cleanupEvents.push(() => window.removeEventListener(eventName, fn));
        });
    }

    _updatePhase(phase) {
        const panel = document.getElementById('phasePanel');
        const name = document.getElementById('phaseName');
        const btn = document.getElementById('btnAction');

        if (phase === 'course') {
            panel.className = 'bg-blue-950/80 p-4 rounded-2xl border border-blue-800 mb-4';
            name.textContent = 'COURSE';
            name.className = 'text-2xl font-black uppercase text-blue-400';
            document.getElementById('tirZone').style.display = 'none';
            document.getElementById('penaliteZone').style.display = 'none';
            btn.style.display = 'block';
            btn.textContent = 'Démarrer la course';
            btn.className = 'w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest text-white bg-blue-600 border-4 border-blue-400 shadow-lg btn-tap';
            btn.disabled = false;
        } else if (phase === 'tir') {
            panel.className = 'bg-orange-950/80 p-4 rounded-2xl border border-orange-800 mb-4';
            name.textContent = 'TIR';
            name.className = 'text-2xl font-black uppercase text-orange-400';
            document.getElementById('tirZone').style.display = 'block';
            document.getElementById('penaliteZone').style.display = 'none';
            btn.style.display = 'none';
            // Réinitialiser le tir si le contrôleur existe
            if (this._controller && this._controller.tir) {
                this._controller.tir.reset(this._controller.tir.maxFleches);
                const max = this._controller.tir.maxFleches;
                document.getElementById('tirStatus').textContent = `Flèches : 0/${max}`;
                document.getElementById('btnValiderTir').disabled = true;
                document.getElementById('btnValiderTir').classList.add('opacity-40');
            }
        }
    }

    onAction() {
        const state = appState.getState();
        if (state.currentPhase === 'course') {
            if (!state.isRunning) {
                if (this._controller && typeof this._controller.startCourse === 'function') {
                    this._controller.startCourse();
                    document.getElementById('btnAction').textContent = '🏁 Arrivée';
                    document.getElementById('btnAction').className = 'w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest text-white bg-green-600 border-4 border-green-400 shadow-lg btn-tap';
                } else {
                    toast.error('Contrôleur non disponible');
                }
            } else {
                if (this._controller && typeof this._controller.stopCourse === 'function') {
                    this._controller.stopCourse();
                    this._updatePhase('tir');
                    toast.info('🎯 Passez au tir !');
                } else {
                    toast.error('Contrôleur non disponible');
                }
            }
        }
    }

    marquerTir(pts) {
        if (!this._controller || !this._controller.tir) {
            toast.error('Service de tir non disponible');
            return;
        }
        const success = this._controller.tir.fire(pts);
        if (!success) {
            if (this._controller.tir.shots.length >= this._controller.tir.maxFleches) {
                toast.show('Toutes les flèches sont tirées !', 1500, 'warning');
            }
            return;
        }
        const status = document.getElementById('tirStatus');
        const total = this._controller.tir.shots.length;
        const max = this._controller.tir.maxFleches;
        status.textContent = `Flèches : ${total}/${max}`;

        if (total >= max) {
            document.getElementById('btnValiderTir').disabled = false;
            document.getElementById('btnValiderTir').classList.remove('opacity-40');
            toast.success('✅ Toutes les flèches tirées !');
        }
    }

    annulerTir() {
        if (!this._controller || !this._controller.tir) return;
        const success = this._controller.tir.undoLast();
        if (success) {
            const status = document.getElementById('tirStatus');
            const total = this._controller.tir.shots.length;
            const max = this._controller.tir.maxFleches;
            status.textContent = `Flèches : ${total}/${max}`;
            document.getElementById('btnValiderTir').disabled = true;
            document.getElementById('btnValiderTir').classList.add('opacity-40');
            toast.info('Flèche annulée');
        }
    }

    validerTir() {
        if (!this._controller || !this._controller.tir) {
            toast.error('Service de tir non disponible');
            return;
        }
        if (!this._controller.tir.isComplete()) {
            toast.show('Tirez toutes les flèches !', 2000, 'error');
            return;
        }
        if (typeof this._controller.finishSerie === 'function') {
            this._controller.finishSerie();
        } else {
            toast.error('Méthode finishSerie manquante');
        }
    }

    fairePenalite() {
        if (this._controller && typeof this._controller.onPenaliteDone === 'function') {
            this._controller.onPenaliteDone();
        } else {
            toast.error('Méthode de pénalité non disponible');
        }
    }

    retour() {
        // Nettoyer
        this._cleanupEvents.forEach(fn => fn());
        this._cleanupEvents = [];
        if (this._cleanupTimer) {
            this._cleanupTimer();
            this._cleanupTimer = null;
        }
        if (this._controller && this._controller.timer) {
            this._controller.timer.stop();
        }
        window.app.dashboard.render(window.app._config);
    }
}