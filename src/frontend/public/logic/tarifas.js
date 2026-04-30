// tarifas.js — Módulo de tarifas/servicios para NODE
// Clase: TarifasManager
// CRUD completo de servicios y precios base.
// Requiere: window.db, window.fs, window.firebaseUser

class TarifasManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
    }

    render() {
        const cfg   = window.BCONFIG || {};
        const label = cfg.servicioPlural  || 'Servicios';
        const sing  = cfg.servicioSingular || 'Servicio';

        return `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-white"><i class="fas fa-tags text-[#2B93A6] mr-2"></i>${label} y tarifas</h1>
                    <p class="text-sm text-slate-400 mt-0.5">Precios base de cada servicio</p>
                </div>
                <button id="tar-btn-nuevo" class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i class="fas fa-plus"></i> Nuevo ${sing.toLowerCase()}
                </button>
            </div>

            <!-- Formulario añadir / editar -->
            <div id="tar-form-wrapper" class="hidden glass border border-[rgba(43,147,166,0.3)] rounded-xl p-5">
                <h2 class="text-base font-bold text-white mb-3" id="tar-form-titulo">Nuevo ${sing.toLowerCase()}</h2>
                <form id="tar-form" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="hidden" id="tar-edit-id">
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold text-slate-300 mb-1">${sing} *</label>
                        <input type="text" id="tar-nombre" required placeholder="Ej: Corte y lavado"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-1">Precio (€) *</label>
                        <input type="number" id="tar-precio" required placeholder="0.00" min="0" step="0.50"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div class="sm:col-span-3 flex gap-2">
                        <button type="submit" class="btn-primary flex-1 px-4 py-2 rounded-lg text-sm">Guardar</button>
                        <button type="button" id="tar-btn-cancelar" class="btn-secondary px-4 py-2 rounded-lg text-sm">Cancelar</button>
                    </div>
                </form>
            </div>

            <!-- Lista -->
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                <div id="tar-lista">
                    <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                </div>
            </div>
        </div>`;
    }

    async setupListeners() {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;
        const fs  = window.fs;

        if (!db || !uid || !fs) {
            const el = document.getElementById('tar-lista');
            if (el) el.innerHTML = '<p class="text-red-400 text-sm p-6 text-center">Sin conexión a Firebase</p>';
            return;
        }

        const { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } = fs;
        const col = () => collection(db, 'users', uid, 'tarifas');
        let tarifas   = [];
        let editingId = null;

        const renderLista = () => {
            const lista = document.getElementById('tar-lista');
            if (!lista) return;
            if (!tarifas.length) {
                lista.innerHTML = '<p class="text-slate-600 text-sm p-8 text-center">Sin tarifas aún — pulsa «+» para añadir</p>';
                return;
            }
            lista.innerHTML = tarifas.map(t => `
                <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] transition group" data-id="${t.id}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(43,147,166,0.15)">
                            <i class="fas fa-tag text-[#38BDF8] text-xs"></i>
                        </div>
                        <span class="text-sm font-semibold text-white">${t.nombre}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-base font-black text-[#38BDF8]">€${parseFloat(t.precio || 0).toFixed(2)}</span>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button class="tar-edit p-1.5 text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded transition text-xs" data-id="${t.id}" title="Editar"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                            <button class="tar-del p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition text-xs" data-id="${t.id}" title="Eliminar"><i class="fas fa-trash pointer-events-none"></i></button>
                        </div>
                    </div>
                </div>`).join('');

            lista.querySelectorAll('.tar-edit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const t = tarifas.find(x => x.id === btn.dataset.id);
                    if (!t) return;
                    editingId = t.id;
                    document.getElementById('tar-edit-id').value  = t.id;
                    document.getElementById('tar-nombre').value   = t.nombre;
                    document.getElementById('tar-precio').value   = t.precio;
                    document.getElementById('tar-form-titulo').textContent = 'Editar servicio';
                    document.getElementById('tar-form-wrapper').classList.remove('hidden');
                    document.getElementById('tar-nombre').focus();
                });
            });

            lista.querySelectorAll('.tar-del').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('¿Eliminar esta tarifa?')) return;
                    try {
                        await deleteDoc(doc(db, 'users', uid, 'tarifas', btn.dataset.id));
                        tarifas = tarifas.filter(t => t.id !== btn.dataset.id);
                        renderLista();
                        this.navManager?.showNotification('Tarifa eliminada', 'success');
                    } catch { this.navManager?.showNotification('Error al eliminar', 'error'); }
                });
            });
        };

        const loadTarifas = async () => {
            try {
                const snap = await getDocs(col());
                tarifas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { tarifas = []; }
            renderLista();
        };

        await loadTarifas();

        document.getElementById('tar-btn-nuevo')?.addEventListener('click', () => {
            editingId = null;
            document.getElementById('tar-edit-id').value  = '';
            document.getElementById('tar-nombre').value   = '';
            document.getElementById('tar-precio').value   = '';
            document.getElementById('tar-form-titulo').textContent = 'Nuevo servicio';
            document.getElementById('tar-form-wrapper').classList.remove('hidden');
            document.getElementById('tar-nombre').focus();
        });

        document.getElementById('tar-btn-cancelar')?.addEventListener('click', () => {
            document.getElementById('tar-form-wrapper').classList.add('hidden');
            editingId = null;
        });

        document.getElementById('tar-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('tar-nombre').value.trim();
            const precio = parseFloat(document.getElementById('tar-precio').value) || 0;
            if (!nombre) return;
            try {
                if (editingId) {
                    await updateDoc(doc(db, 'users', uid, 'tarifas', editingId), { nombre, precio });
                    this.navManager?.showNotification('Tarifa actualizada', 'success');
                } else {
                    await addDoc(col(), { nombre, precio, createdAt: serverTimestamp() });
                    this.navManager?.showNotification('Tarifa añadida', 'success');
                }
                editingId = null;
                document.getElementById('tar-form-wrapper').classList.add('hidden');
                await loadTarifas();
            } catch { this.navManager?.showNotification('Error al guardar', 'error'); }
        });
    }

    destroy() {}
}

// Auto-init para la pagina standalone tarifas.html
document.addEventListener('appReady', async () => {
    if (window.navManager) return;
    const container = document.getElementById('tar-standalone');
    if (!container) return;
    const mgr = new TarifasManager(null);
    container.innerHTML = mgr.render();
    await mgr.setupListeners();
});
