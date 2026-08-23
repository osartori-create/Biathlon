import { firebaseService } from './core/firebase-service.js';
import { appState } from './core/state.js';
import { LoginUI } from './ui/login-ui.js';
import { DashboardUI } from './ui/dashboard-ui.js';
import { ActionUI } from './ui/action-ui.js';
import { SprintController } from './modules/sprint/sprint-controller.js';
import { PoursuiteController } from './modules/poursuite/poursuite-controller.js';
import { toast } from './services/toast-service.js';

class App {
    constructor() {
        this.login = new LoginUI();
        this.dashboard = new DashboardUI();
        this.action = new ActionUI();
        this.sprint = new SprintController();
        this.poursuite = new PoursuiteController();
        this._config = null;
        this._currentController = null;
        this._unsubscribeConfig = null;
        this._unsubscribeState = null;

        window.app = this;
        this._init();
    }

    _init() {
        // Écouter la config Firebase
        this._unsubscribeConfig = firebaseService.watchConfig(config => {
            this._config = config;
            this._onConfigUpdate(config);
        });

        // Écouter l'état
        this._unsubscribeState = appState.subscribe(state => {
            this._onStateUpdate(state);
        });

        // Afficher le login par défaut
        this.login.render();

        // Gestion des retours
        window.addEventListener('return-dashboard', () => {
            this.dashboard.render(this._config);
        });
    }

    _onConfigUpdate(config) {
        const state = appState.getState();
        if (state.equipe && state.maillot) {
            this.dashboard.render(config);
        }
    }

    _onStateUpdate(state) {
        if (!this._config) return;
        const mode = this._config.mode || 'sprint';
        let controller = mode === 'poursuite' ? this.poursuite : this.sprint;

        if (this._currentController !== controller) {
            if (this._currentController?.cleanup) this._currentController.cleanup();
            this._currentController = controller;
            if (state.equipe && state.maillot) {
                controller.init(this._config);
            }
        }
    }

    // Point d'entrée pour l'UI d'action (appelé par DashboardUI)
    startAction(maillot) {
    const mode = this._config?.mode || 'sprint';
    const controller = mode === 'poursuite' ? this.poursuite : this.sprint;
    if (controller && this._config) {
        controller.init(this._config);
        this.action.render(maillot, controller);
    } else {
        toast.error('Erreur : configuration non chargée');
    }
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', () => {
    new App();
});