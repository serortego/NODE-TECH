// clientes.js — Gestión de clientes con Firestore
// Usa window.db y window.fs expuestos por auth-guard.js

class ClientesManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.clientes = [];
        this.editingId = null;
    }

    render() {
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-gray-200">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p class="text-sm text-gray-500 mt-0.5">Gestión de tu base de clientes</p>
                    </div>
                    <button id="btn-nuevo-cliente" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nuevo Cliente
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Total</p>
                        <p class="text-2xl font-bold text-gray-900 mt-1" id="kpi-cli-total">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Este mes</p>
                        <p class="text-2xl font-bold text-blue-600 mt-1" id="kpi-cli-mes">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Con email</p>
                        <p class="text-2xl font-bold text-green-600 mt-1" id="kpi-cli-email">—</p>
                    </div>
                </div>
                <div id="form-cliente-wrapper" class="hidden bg-white rounded-lg p-5 border border-blue-200 shadow-sm">
                    <h2 class="text-base font-bold text-gray-800 mb-3" id="form-cliente-titulo">Nuevo Cliente</h2>
                    <form id="form-cliente" class="grid grid-cols-2 gap-3">
                        <input type="hidden" id="cliente-edit-id">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                            <input type="text" id="c-nombre" required placeholder="Nombre completo" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                            <input type="tel" id="c-telefono" placeholder="Ej: 612 345 678" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                            <input type="email" id="c-email" placeholder="correo@ejemplo.com" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
                            <input type="text" id="c-notas" placeholder="Observaciones..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="col-span-2 flex gap-2 pt-1">
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Guardar</button>
                            <button type="button" id="btn-cancelar-cliente" class="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div id="clientes-lista">
                        <p class="text-gray-400 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async setupListeners() {
        const { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } = window.fs;
        const db  = window.db;
        const uid = window.firebaseUser?.uid;
        if (!db || !uid) {
            const el = document.getElementById('clientes-lista');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a Firebase.</p>';
            return;
        }
        const colRef = () => collection(db, 'users', uid, 'clientes');
        const load = async () => {
            try {
                const q = query(colRef(), orderBy('nombre'));
                const snap = await getDocs(q);
                this.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                try { const snap = await getDocs(colRef()); this.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() })); } catch { this.clientes = []; }
            }
            this._updateKPIs();
            this._renderLista({ deleteDoc, doc, db, uid, load });
        };
        await load();
        document.getElementById('btn-nuevo-cliente')?.addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('form-cliente').reset();
            document.getElementById('cliente-edit-id').value = '';
            document.getElementById('form-cliente-titulo').textContent = 'Nuevo Cliente';
            document.getElementById('form-cliente-wrapper').classList.remove('hidden');
        });
        document.getElementById('btn-cancelar-cliente')?.addEventListener('click', () => {
            document.getElementById('form-cliente-wrapper').classList.add('hidden');
            this.editingId = null;
        });
        document.getElementById('form-cliente')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('c-nombre').value.trim();
            if (!nombre) return;
            const data = { nombre, telefono: document.getElementById('c-telefono').value.trim(), email: document.getElementById('c-email').value.trim(), notas: document.getElementById('c-notas').value.trim(), updatedAt: serverTimestamp() };
            try {
                if (this.editingId) { await updateDoc(doc(db, 'users', uid, 'clientes', this.editingId), data); }
                else { data.createdAt = serverTimestamp(); await addDoc(colRef(), data); }
                document.getElementById('form-cliente-wrapper').classList.add('hidden');
                this.editingId = null;
                await load();
            } catch (err) { alert('Error al guardar: ' + err.message); }
        });
    }

    _updateKPIs() {
        const ahora = new Date();
        const primeroDeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const esteMes = this.clientes.filter(c => { if (!c.createdAt) return false; const ts = c.createdAt.toDate ? c.createdAt.toDate() : new Date((c.createdAt.seconds||0) * 1000); return ts >= primeroDeMes; }).length;
        const conEmail = this.clientes.filter(c => c.email).length;
        const el = id => document.getElementById(id);
        if (el('kpi-cli-total'))  el('kpi-cli-total').textContent  = this.clientes.length;
        if (el('kpi-cli-mes'))    el('kpi-cli-mes').textContent    = esteMes;
        if (el('kpi-cli-email'))  el('kpi-cli-email').textContent  = conEmail;
    }

    _renderLista({ deleteDoc, doc, db, uid, load }) {
        const lista = document.getElementById('clientes-lista');
        if (!lista) return;
        if (!this.clientes.length) { lista.innerHTML = '<p class="text-gray-400 text-sm p-6 text-center">No hay clientes. ¡Añade el primero!</p>'; return; }
        lista.innerHTML = this.clientes.map(c => `
            <div class="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div class="min-w-0">
                    <p class="font-semibold text-gray-900 text-sm">${this._esc(c.nombre)}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${[c.telefono,c.email].filter(Boolean).join(' · ')||'Sin datos de contacto'}</p>
                    ${c.notas?`<p class="text-xs text-gray-400 mt-0.5 italic">${this._esc(c.notas)}</p>`:''}
                </div>
                <div class="flex gap-2 ml-3">
                    <button data-edit="${c.id}" class="text-xs border border-gray-300 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-100 transition">Editar</button>
                    <button data-del="${c.id}" class="text-xs border border-red-200 px-3 py-1 rounded-md text-red-600 hover:bg-red-50 transition">Eliminar</button>
                </div>
            </div>
        `).join('');
        lista.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = this.clientes.find(x => x.id === btn.dataset.edit);
                if (!c) return;
                this.editingId = c.id;
                document.getElementById('cliente-edit-id').value = c.id;
                document.getElementById('c-nombre').value   = c.nombre   || '';
                document.getElementById('c-telefono').value = c.telefono || '';
                document.getElementById('c-email').value    = c.email    || '';
                document.getElementById('c-notas').value    = c.notas    || '';
                document.getElementById('form-cliente-titulo').textContent = 'Editar Cliente';
                document.getElementById('form-cliente-wrapper').classList.remove('hidden');
            });
        });
        lista.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este cliente?')) return;
                try { await deleteDoc(doc(db, 'users', uid, 'clientes', btn.dataset.del)); await load(); }
                catch (err) { alert('Error al eliminar: ' + err.message); }
            });
        });
    }

    _esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}