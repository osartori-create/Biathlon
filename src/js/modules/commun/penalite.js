export class PenaliteService {
    constructor() {
        this._req = 0;
        this._done = 0;
        this._listeners = [];
    }

    start(requis) {
        this._req = requis;
        this._done = 0;
        this._notify();
    }

    completeOne() {
        if (this._done < this._req) {
            this._done++;
            this._notify();
            return true;
        }
        return false;
    }

    isComplete() {
        return this._done >= this._req;
    }

    getDone() { return this._done; }
    getReq() { return this._req; }

    onUpdate(listener) {
        this._listeners.push(listener);
        return () => { this._listeners = this._listeners.filter(l => l !== listener); };
    }

    _notify() {
        this._listeners.forEach(l => l({ req: this._req, done: this._done }));
    }

    reset() {
        this._req = 0;
        this._done = 0;
        this._notify();
    }
}