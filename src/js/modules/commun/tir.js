export class TirService {
    constructor(maxFleches = 2) {
        this.maxFleches = maxFleches;
        this.shots = [];
        this._isLocked = false;
    }

    reset(maxFleches) {
        this.maxFleches = maxFleches || this.maxFleches;
        this.shots = [];
        this._isLocked = false;
    }

    // ✅ Verrouillage anti-double-clic
    fire(pts) {
        if (this._isLocked) return false;
        if (this.shots.length >= this.maxFleches) return false;

        this._isLocked = true;
        this.shots.push(pts);
        setTimeout(() => { this._isLocked = false; }, 300);
        return true;
    }

    undoLast() {
        if (this.shots.length === 0) return false;
        this.shots.pop();
        return true;
    }

    getTotal() {
        return this.shots.reduce((acc, val) => acc + val, 0);
    }

    isComplete() {
        return this.shots.length === this.maxFleches;
    }

    getShots() {
        return [...this.shots];
    }
}