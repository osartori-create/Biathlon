// Service de notifications Toast (popup temporaire)
class ToastService {
    constructor() {
        this._toast = null;
        this._timeout = null;
        this._createElement();
    }

    _createElement() {
        this._toast = document.createElement('div');
        this._toast.id = 'toast';
        this._toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: white; padding: 12px 24px; 
            border-radius: 12px; font-weight: 700; font-size: 1.1rem; 
            z-index: 9999; box-shadow: 0 8px 30px rgba(0,0,0,0.6);
            display: none; text-align: center; max-width: 90%;
            border: 2px solid #334155; transition: opacity 0.3s;
        `;
        document.body.appendChild(this._toast);
    }

    show(message, duration = 3000, type = 'info') {
        if (this._timeout) clearTimeout(this._timeout);
        this._toast.textContent = message;
        this._toast.style.display = 'block';
        this._toast.style.opacity = '1';

        // Couleur selon le type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        this._toast.style.borderColor = colors[type] || '#334155';

        this._timeout = setTimeout(() => {
            this._toast.style.opacity = '0';
            setTimeout(() => {
                this._toast.style.display = 'none';
            }, 300);
        }, duration);
    }

    success(message, duration = 3000) {
        this.show(message, duration, 'success');
    }
    error(message, duration = 3000) {
        this.show(message, duration, 'error');
    }
    warning(message, duration = 3000) {
        this.show(message, duration, 'warning');
    }
}

export const toast = new ToastService();