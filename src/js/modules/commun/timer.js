export class Timer {
    constructor() {
        this._startTime = 0;
        this._elapsed = 0;
        this._isRunning = false;
        this._frameId = null;
        this._listeners = [];
    }

    start() {
        if (this._isRunning) return;
        this._startTime = Date.now() - this._elapsed;
        this._isRunning = true;
        this._tick();
    }

    stop() {
        if (!this._isRunning) return;
        this._isRunning = false;
        if (this._frameId) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
        this._elapsed = Date.now() - this._startTime;
        this._notify();
    }

    reset() {
        this.stop();
        this._elapsed = 0;
        this._startTime = 0;
        this._notify();
    }

    getElapsed() {
        if (this._isRunning) {
            return Date.now() - this._startTime;
        }
        return this._elapsed;
    }

    getFormatted() {
        return this._formatMs(this.getElapsed());
    }

    _tick() {
        if (!this._isRunning) return;
        this._notify();
        this._frameId = requestAnimationFrame(() => this._tick());
    }

    _notify() {
        this._listeners.forEach(l => l(this.getElapsed()));
    }

    onTick(listener) {
        this._listeners.push(listener);
        return () => { this._listeners = this._listeners.filter(l => l !== listener); };
    }

    _formatMs(ms) {
        ms = Math.max(0, Math.round(ms));
        const cs = Math.floor((ms % 1000) / 10);
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60000);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }
}