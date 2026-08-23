import { appState } from '../core/state.js';
import { firebaseService } from '../core/firebase-service.js';
import { toast } from '../services/toast-service.js';

export class LoginUI {
    constructor() {
        this._container = document.getElementById('app');
        this._config = null;
        this._pinInput = '';
        this._selectedEquipe = '';
        this._unsubscribeConfig = null;
    }

    render() {
        // Nettoyer l'ancien listener
        if (this._unsubscribeConfig) this._unsubscribeConfig();
        this._unsubscribeConfig = firebaseService.watchConfig(config => {
            this._config = config;
            this._renderLogin();
        });
    }

    _renderLogin() {
        if (!this._config) {
            this._container.innerHTML = `<div class="text-center text-slate-400">⏳ Chargement...</div>`;
            return;
        }

        const equipes = Object.keys(this._config.equipes || {});
        
        let html = `
            <div class="flex flex-col items-center justify-center flex-1">
                <h1 class="text-5xl font-black text-center text-blue-500 uppercase tracking-widest mb-8 italic">Arcathlon</h1>
                <select id="selEquipe" class="w-full max-w-md bg-black p-5 rounded-2xl text-2xl font-black uppercase text-center border-4 border-slate-700 outline-none mb-6 text-white">
                    <option value="">-- CHOISIR L'ÉQUIPE --</option>
                    ${equipes.map(eq => `<option value="${eq}">ÉQUIPE ${eq}</option>`).join('')}
                </select>
                <div id="numpad" class="flex-col items-center hidden">
                    <div class="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Code PIN (3 chiffres)</div>
                    <div id="pinDisplay" class="bg-slate-950 border-2 border-slate-700 w-48 h-14 rounded-xl flex items-center justify-center text-3xl font-mono tracking-[0.6em] mb-4 text-emerald-400 shadow-inner"></div>
                    <div class="grid grid-cols-3 gap-3">
                        ${[1,2,3,4,5,6,7,8,9].map(n => `<button onclick="window.app.login.addPin(${n})" class="btn-tap bg-slate-800 w-16 h-16 rounded-xl text-2xl font-black active:bg-blue-600">${n}</button>`).join('')}
                        <button onclick="window.app.login.clearPin()" class="btn-tap bg-red-950 text-red-400 w-16 h-16 rounded-xl text-xs font-black uppercase border border-red-800 active:bg-red-800">Effacer</button>
                        <button onclick="window.app.login.addPin(0)" class="btn-tap bg-slate-800 w-16 h-16 rounded-xl text-2xl font-black active:bg-blue-600">0</button>
                        <button onclick="window.app.login.validatePin()" class="btn-tap bg-emerald-600 text-white w-16 h-16 rounded-xl text-xs font-black uppercase border-2 border-emerald-400 active:bg-emerald-700">OK</button>
                    </div>
                </div>
                <div id="loginError" class="text-red-400 text-sm font-bold mt-4 hidden"></div>
            </div>
        `;
        this._container.innerHTML = html;

        // Écouter la sélection d'équipe
        document.getElementById('selEquipe').addEventListener('change', (e) => {
            this._selectedEquipe = e.target.value;
            const numpad = document.getElementById('numpad');
            if (this._selectedEquipe) {
                numpad.classList.remove('hidden');
                numpad.classList.add('flex');
                this._pinInput = '';
                document.getElementById('pinDisplay').textContent = '';
            } else {
                numpad.classList.add('hidden');
            }
        });
    }

    addPin(num) {
        if (this._pinInput.length < 3) {
            this._pinInput += num;
            document.getElementById('pinDisplay').textContent = '•'.repeat(this._pinInput.length);
            document.getElementById('loginError').classList.add('hidden');
        }
    }

    clearPin() {
        this._pinInput = '';
        document.getElementById('pinDisplay').textContent = '';
    }

    validatePin() {
        if (!this._selectedEquipe) {
            toast.show('❗ Choisissez une équipe d\'abord.', 2000, 'error');
            return;
        }
        const equipe = this._config.equipes[this._selectedEquipe];
        if (!equipe) return;

        if (this._pinInput === equipe.pin) {
            // Connexion réussie
            appState.setState({
                equipe: this._selectedEquipe,
                pin: this._pinInput,
                maillot: null,
                juge: null,
                currentSerie: 0,
                currentPhase: 'course',
                isRunning: false
            });
            // Passer au dashboard
            window.app.dashboard.render(this._config);
            toast.success(`✅ Connecté à l'équipe ${this._selectedEquipe}`);
        } else {
            document.getElementById('loginError').textContent = '❌ Code PIN incorrect';
            document.getElementById('loginError').classList.remove('hidden');
            this.clearPin();
            toast.error('❌ Code PIN incorrect');
        }
    }

    // Nettoyage
    cleanup() {
        if (this._unsubscribeConfig) this._unsubscribeConfig();
    }
}