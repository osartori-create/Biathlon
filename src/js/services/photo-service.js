// Service de gestion des photos (IndexedDB)
class PhotoService {
    constructor() {
        this._db = null;
        this._init();
    }

    _init() {
        const request = indexedDB.open("Arcathlon_Prof_DB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("eleves")) {
                db.createObjectStore("eleves", { keyPath: "id" });
            }
        };
        request.onsuccess = (e) => { this._db = e.target.result; };
        request.onerror = (e) => console.error("IndexedDB error", e);
    }

    _getPhoto(id) {
        return new Promise((resolve) => {
            if (!this._db) return resolve(null);
            const tx = this._db.transaction("eleves", "readonly");
            const req = tx.objectStore("eleves").get(id);
            req.onsuccess = () => resolve(req.result ? URL.createObjectURL(req.result.blob) : null);
            req.onerror = () => resolve(null);
        });
    }

    async getPhotoByCode(code) {
        // Dans cette version, le code est de type "EQ1 - Rouge"
        // On génère un ID à partir du code (simplifié)
        const id = code.replace(/\s/g, '_').toLowerCase();
        return this._getPhoto(id);
    }

    // Méthode pour purger les photos
    purgeAll() {
        return new Promise((resolve) => {
            if (!this._db) return resolve();
            const tx = this._db.transaction("eleves", "readwrite");
            const store = tx.objectStore("eleves");
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }
}

export const photoService = new PhotoService();