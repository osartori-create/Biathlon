const STORAGE_KEY = 'arcathlon_eleve_state_v2';

class AppState {
    constructor() {
        this._state = {
            equipe: null,
            pin: null,
            maillot: null,
            juge: null,
            currentSerie: 0,
            currentPhase: 'course',
            isRunning: false,
            handicapMs: 0,
            mode: 'sprint'
        };
        this._listeners = [];
        this._restore();
    }

    _restore() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this._state = { ...this._state, ...parsed };
            }
        } catch (e) { /* ignore */ }
    }

    _persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
        } catch (e) { /* ignore */ }
    }

    getState() { return { ...this._state }; }

    setState(updates) {
        this._state = { ...this._state, ...updates };
        this._persist();
        this._notify();
    }

    reset() {
        this._state = {
            equipe: null, pin: null, maillot: null, juge: null,
            currentSerie: 0, currentPhase: 'course', isRunning: false,
            handicapMs: 0, mode: 'sprint'
        };
        localStorage.removeItem(STORAGE_KEY);
        this._notify();
    }

    subscribe(listener) {
        this._listeners.push(listener);
        listener(this.getState());
        return () => { this._listeners = this._listeners.filter(l => l !== listener); };
    }

    _notify() {
        const state = this.getState();
        this._listeners.forEach(l => l(state));
    }
}

export const appState = new AppState();