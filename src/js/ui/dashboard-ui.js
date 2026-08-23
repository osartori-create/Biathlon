import { appState } from '../core/state.js';
import { photoService } from '../services/photo-service.js';
import { firebaseService } from '../core/firebase-service.js';
import { toast } from '../services/toast-service.js';

export class DashboardUI {
    constructor() {
        this._container = document.getElementById('app');
        this._config = null;
        this._unsubscribeState = null;
        this._cleanup = null;
        this._refreshInterval = null;
    }

    render(config) {
        this._config = config;
        const state = appState.getState();
        if (!state.equipe) {
            window.app.login.render();
            return;
        }

        const equipeConfig = config.equipes[state.equipe];
        if (!equipeConfig) {
            toast.error('Équipe non trouvée');
            window.app.login.render();
            return;
        }

        this._container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-3xl font-black text-white">Équipe ${state.equipe}</h2>
                <button onclick="window.app.dashboard.logout()" class="text-slate-400 text-sm font-bold hover:text-white">↩ Changer</button>
            </div>
            <div class="text-center text-sm font-bold text-slate-400 mb-4">
                👤 Juge : ${state.juge || 'Non sélectionné'}
                <button onclick="window.app.dashboard.selectJuge()" class="ml-2 text-blue-400 text-xs underline">Choisir</button>
            </div>
            <div id="teamTotal" class="text-2xl font-black text-emerald-400 text-center mb-4">🏆 Moyenne : -- pts</div>
            <div class="grid grid-cols-2 gap-4" id="maillotsGrid"></div>
            <div id="rankingContainer" class="mt-6 space-y-2"></div>
            <button onclick="window.app.dashboard.logout()" class="mt-6 w-full bg-slate-800 py-3 rounded-xl text-sm font-bold text-slate-400 border border-slate-700">🔒 Se déconnecter</button>
        `;

        this._renderMaillots(equipeConfig);

        // Écouter les changements d'état
        if (this._unsubscribeState) this._unsubscribeState();
        this._unsubscribeState = appState.subscribe(() => {
            this._updateRanking();
        });

        // Mise à jour périodique toutes les 5 secondes
        if (this._refreshInterval) clearInterval(this._refreshInterval);
        this._refreshInterval = setInterval(() => this._updateRanking(), 5000);
    }

    async _renderMaillots(equipeConfig) {
        const grid = document.getElementById('maillotsGrid');
        const membres = equipeConfig.membres || [];
        const state = appState.getState();

        const photoPromises = membres.map(async (m) => {
            const url = await photoService.getPhotoByCode(m.code);
            return { maillot: m.maillot, url, statut: m.statut };
        });
        const photos = await Promise.all(photoPromises);

        const bgColor = {
            'Rouge': 'bg-red-950/80 border-red-600 text-red-400',
            'Jaune': 'bg-yellow-950/80 border-yellow-600 text-yellow-400',
            'Bleu': 'bg-blue-950/80 border-blue-600 text-blue-400',
            'Vert': 'bg-green-950/80 border-green-600 text-green-400'
        };

        let html = '';
        membres.forEach((m) => {
            const photo = photos.find(p => p.maillot === m.maillot);
            const photoHtml = photo?.url ? 
                `<img src="${photo.url}" class="w-12 h-12 rounded-full object-cover">` : 
                `<div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl">👤</div>`;

            const isDisabled = (m.statut === 'absent' || m.statut === 'inapte');
            const statusLabel = m.statut === 'absent' ? '❌ Absent' : (m.statut === 'inapte' ? '⚠️ Inapte' : '✅');
            const bg = bgColor[m.maillot] || 'bg-slate-800 border-slate-600 text-white';

            html += `
                <div onclick="${isDisabled ? '' : `window.app.dashboard.openAction('${m.maillot}')`}" 
                     class="${bg} border-4 p-4 rounded-3xl flex flex-col items-center ${isDisabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer btn-tap'}">
                    ${photoHtml}
                    <span class="font-black text-2xl uppercase tracking-widest mt-2">${m.maillot}</span>
                    <span class="text-xs font-bold text-slate-300">VMA: ${m.vma}</span>
                    <span class="text-xs font-bold mt-1 ${m.statut === 'inapte' ? 'text-yellow-400' : 'text-emerald-400'}">${statusLabel}</span>
                    <div class="text-sm font-bold text-slate-400 mt-1">Série: ${state.currentSerie+1}/${this._config.nbSeries}</div>
                    <div id="coureurPoints_${m.maillot}" class="text-xl font-bold text-yellow-400">0 pts</div>
                </div>
            `;
        });
        grid.innerHTML = html;

        // Mettre à jour les points immédiatement
        this._updateRanking();
    }

    _updateRanking() {
        const state = appState.getState();
        if (!state.equipe) return;

        const grid = document.getElementById('maillotsGrid');
        if (!grid) return;

        // Récupérer les passages depuis Firebase
        firebase.database().ref('arcathlon/live/passages').once('value', snap => {
            const passages = snap.val() || {};
            const scores = {};

            // Calculer les points par équipe + maillot
            Object.values(passages).forEach(p => {
                const key = `${p.equipe}-${p.maillot}`;
                if (!scores[key]) scores[key] = 0;
                scores[key] += (p.ptsVMA || 0) + (p.ptsTir || 0);
            });

            // Mettre à jour chaque carte
            grid.querySelectorAll('.bg-red-950\\/80, .bg-yellow-950\\/80, .bg-blue-950\\/80, .bg-green-950\\/80, .bg-slate-800')
                .forEach(card => {
                    const span = card.querySelector('.font-black.text-2xl');
                    if (!span) return;
                    const maillot = span.textContent.trim();
                    const key = `${state.equipe}-${maillot}`;
                    const pts = scores[key] || 0;
                    const ptsEl = card.querySelector('.text-xl.font-bold');
                    if (ptsEl) ptsEl.textContent = `${pts} pts`;
                });

            // Mettre à jour la moyenne de l'équipe
            const totalTeam = Object.keys(scores)
                .filter(k => k.startsWith(`${state.equipe}-`))
                .reduce((sum, k) => sum + scores[k], 0);
            const nbMembres = Object.keys(scores)
                .filter(k => k.startsWith(`${state.equipe}-`)).length;
            const moyenne = nbMembres > 0 ? (totalTeam / nbMembres).toFixed(1) : 0;
            const teamTotalEl = document.getElementById('teamTotal');
            if (teamTotalEl) teamTotalEl.textContent = `🏆 Moyenne : ${moyenne} pts/coureur`;

            // Classement global (simplifié)
            const container = document.getElementById('rankingContainer');
            if (container) {
                const totalPts = Object.values(scores).reduce((a, b) => a + b, 0);
                container.innerHTML = `
                    <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div class="text-xs text-slate-400">📊 Total des points : <span class="text-emerald-400 font-bold">${totalPts}</span></div>
                    </div>
                `;
            }
        });
    }

    selectJuge() {
        const membres = this._config?.equipes[appState.getState().equipe]?.membres || [];
        const presents = membres.filter(m => m.statut === 'present');
        
        if (presents.length === 0) {
            toast.show('⚠️ Aucun membre présent pour être juge.', 2000, 'error');
            return;
        }

        let message = '👤 Choisissez le juge (entrez le numéro) :\n';
        presents.forEach((m, i) => {
            message += `  ${i+1}. ${m.code}\n`;
        });
        message += '\n👉 Tapez le numéro (1, 2, 3...)';

        const choix = prompt(message);
        if (choix === null) return;

        const idx = parseInt(choix) - 1;
        if (idx >= 0 && idx < presents.length) {
            const jugeSelectionne = presents[idx].code;
            appState.setState({ juge: jugeSelectionne });
            toast.success(`👤 Juge : ${jugeSelectionne}`);
            this.render(this._config);
        } else {
            toast.error('❌ Numéro invalide. Entrez 1, 2, 3 ou 4.');
            setTimeout(() => this.selectJuge(), 500);
        }
    }

    openAction(maillot) {
        if (window.app && typeof window.app.startAction === 'function') {
            window.app.startAction(maillot);
        } else {
            toast.error('Erreur : application non initialisée.');
        }
    }

    logout() {
        if (this._refreshInterval) clearInterval(this._refreshInterval);
        appState.reset();
        firebaseService.cleanup();
        if (this._unsubscribeState) this._unsubscribeState();
        window.app.login.render();
        toast.success('🔒 Déconnecté');
    }
}