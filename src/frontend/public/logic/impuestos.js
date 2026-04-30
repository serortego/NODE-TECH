// impuestos.js — Módulo de impuestos para NODE
// Clase: ImpuestosManager
// Placeholder para IVA, IRPF y modelos trimestrales.

class ImpuestosManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
    }

    render() {
        return `
        <div class="space-y-4">
            <div class="flex items-center gap-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <i class="fas fa-percentage text-[#2B93A6] text-xl"></i>
                <div>
                    <h1 class="text-2xl font-bold text-white">Impuestos</h1>
                    <p class="text-sm text-slate-400 mt-0.5">IVA, IRPF y modelos trimestrales</p>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="glass rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                    <p class="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">IVA repercutido</p>
                    <p class="text-2xl font-black text-white">—</p>
                    <p class="text-xs text-slate-600 mt-1">Pendiente de datos</p>
                </div>
                <div class="glass rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                    <p class="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">IVA soportado</p>
                    <p class="text-2xl font-black text-white">—</p>
                    <p class="text-xs text-slate-600 mt-1">Pendiente de datos</p>
                </div>
                <div class="glass rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                    <p class="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Resultado IVA</p>
                    <p class="text-2xl font-black text-white">—</p>
                    <p class="text-xs text-slate-600 mt-1">Pendiente de datos</p>
                </div>
            </div>
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-8 text-center">
                <i class="fas fa-tools text-3xl text-slate-700 mb-3 block"></i>
                <p class="text-slate-400 font-semibold">Módulo de impuestos en construcción</p>
                <p class="text-slate-600 text-sm mt-1">Próximamente: Modelo 303, 130, resumen trimestral automático</p>
            </div>
        </div>`;
    }

    setupListeners() {}

    destroy() {}
}

// Auto-init para la pagina standalone impuestos.html
document.addEventListener('appReady', async () => {
    if (window.navManager) return;
    const container = document.getElementById('imp-standalone');
    if (!container) return;
    const mgr = new ImpuestosManager(null);
    container.innerHTML = mgr.render();
    await mgr.setupListeners();
});
