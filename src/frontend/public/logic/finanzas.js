// finanzas.js — Gestión de transacciones financieras con Firestore
// Usa window.db y window.fs expuestos por auth-guard.js

class FinanzasManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.transacciones = [];
        this.editingId = null;
    }

    render() {
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-gray-200">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Finanzas</h1>
                        <p class="text-sm text-gray-500 mt-0.5">Control de ingresos y gastos</p>
                    </div>
                    <button id="btn-nueva-transaccion" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nueva Transacción
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Ingresos</p>
                        <p class="text-2xl font-bold text-green-600 mt-1" id="stat-ingresos">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Gastos</p>
                        <p class="text-2xl font-bold text-red-500 mt-1" id="stat-gastos">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Balance</p>
                        <p class="text-2xl font-bold mt-1" id="stat-balance">—</p>
                    </div>
                </div>
                <div id="form-fin-wrapper" class="hidden bg-white rounded-lg p-5 border border-blue-200 shadow-sm">
                    <h2 class="text-base font-bold text-gray-800 mb-3" id="form-fin-titulo">Nueva Transacción</h2>
                    <form id="form-finanzas" class="grid grid-cols-2 gap-3">
                        <input type="hidden" id="fin-edit-id">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Concepto *</label>
                            <input type="text" id="f-concepto" required placeholder="Descripción" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Tipo *</label>
                            <select id="f-tipo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecciona...</option>
                                <option value="ingreso">Ingreso</option>
                                <option value="gasto">Gasto</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Importe (€) *</label>
                            <input type="number" id="f-importe" required placeholder="0.00" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Fecha</label>
                            <input type="date" id="f-fecha" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
                            <input type="text" id="f-categoria" placeholder="Ej: Servicios, Material..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="flex items-end">
                            <div class="flex gap-2 w-full">
                                <button type="submit" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Guardar</button>
                                <button type="button" id="btn-cancelar-fin" class="flex-1 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div id="finanzas-list">
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
            const el = document.getElementById('finanzas-list');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a Firebase.</p>';
            return;
        }
        // Fecha de hoy como default
        const fechaEl = document.getElementById('f-fecha');
        if (fechaEl) fechaEl.value = new Date().toISOString().split('T')[0];

        const colRef = () => collection(db, 'users', uid, 'finanzas');
        const load = async () => {
            try {
                const q = query(colRef(), orderBy('fecha', 'desc'));
                const snap = await getDocs(q);
                this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                try { const snap = await getDocs(colRef()); this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() })); } catch { this.transacciones = []; }
            }
            this._renderStats();
            this._renderLista({ deleteDoc, doc, db, uid, load });
        };
        await load();
        document.getElementById('btn-nueva-transaccion')?.addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('form-finanzas').reset();
            document.getElementById('fin-edit-id').value = '';
            document.getElementById('form-fin-titulo').textContent = 'Nueva Transacción';
            if (fechaEl) fechaEl.value = new Date().toISOString().split('T')[0];
            document.getElementById('form-fin-wrapper').classList.remove('hidden');
        });
        document.getElementById('btn-cancelar-fin')?.addEventListener('click', () => {
            document.getElementById('form-fin-wrapper').classList.add('hidden');
            this.editingId = null;
        });
        document.getElementById('form-finanzas')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const concepto = document.getElementById('f-concepto').value.trim();
            const tipo     = document.getElementById('f-tipo').value;
            const importe  = document.getElementById('f-importe').value;
            if (!concepto || !tipo || !importe) return;
            const data = { concepto, tipo, importe: parseFloat(importe), fecha: document.getElementById('f-fecha').value || new Date().toISOString().split('T')[0], categoria: document.getElementById('f-categoria').value.trim(), updatedAt: serverTimestamp() };
            try {
                if (this.editingId) { await updateDoc(doc(db, 'users', uid, 'finanzas', this.editingId), data); }
                else { data.createdAt = serverTimestamp(); await addDoc(colRef(), data); }
                document.getElementById('form-fin-wrapper').classList.add('hidden');
                this.editingId = null;
                await load();
            } catch (err) { alert('Error al guardar: ' + err.message); }
        });
    }

    _renderStats() {
        let ingresos = 0, gastos = 0;
        this.transacciones.forEach(t => {
            const v = parseFloat(t.importe) || 0;
            if (t.tipo === 'ingreso') ingresos += v; else gastos += v;
        });
        const balance = ingresos - gastos;
        const fmt = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const el = id => document.getElementById(id);
        if (el('stat-ingresos')) el('stat-ingresos').textContent = fmt(ingresos);
        if (el('stat-gastos'))   el('stat-gastos').textContent   = fmt(gastos);
        if (el('stat-balance')) {
            el('stat-balance').textContent  = fmt(Math.abs(balance));
            el('stat-balance').className = 'text-2xl font-bold mt-1 ' + (balance >= 0 ? 'text-green-600' : 'text-red-500');
        }
    }

    _renderLista({ deleteDoc, doc, db, uid, load }) {
        const lista = document.getElementById('finanzas-list');
        if (!lista) return;
        if (!this.transacciones.length) { lista.innerHTML = '<p class="text-gray-400 text-sm p-6 text-center">No hay transacciones registradas.</p>'; return; }
        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        lista.innerHTML = this.transacciones.map(t => {
            const esIngreso = t.tipo === 'ingreso';
            return `
            <div class="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div class="min-w-0">
                    <p class="font-semibold text-gray-900 text-sm">${this._esc(t.concepto||'—')}</p>
                    <div class="flex flex-wrap gap-2 mt-1">
                        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${esIngreso?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}">${t.tipo}</span>
                        ${t.categoria?`<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">${this._esc(t.categoria)}</span>`:''}
                    </div>
                    <p class="text-xs text-gray-400 mt-1">${t.fecha||''}</p>
                </div>
                <div class="flex items-center gap-3 ml-3">
                    <p class="text-base font-bold ${esIngreso?'text-green-600':'text-red-500'}">${esIngreso?'+':'-'}${fmt(t.importe)}</p>
                    <div class="flex gap-1">
                        <button data-edit="${t.id}" class="text-xs border border-gray-300 px-2 py-1 rounded-md text-gray-700 hover:bg-gray-100 transition">Editar</button>
                        <button data-del="${t.id}" class="text-xs border border-red-200 px-2 py-1 rounded-md text-red-600 hover:bg-red-50 transition">Eliminar</button>
                    </div>
                </div>
            </div>
        `}).join('');
        lista.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = this.transacciones.find(x => x.id === btn.dataset.edit);
                if (!t) return;
                this.editingId = t.id;
                document.getElementById('fin-edit-id').value  = t.id;
                document.getElementById('f-concepto').value   = t.concepto  || '';
                document.getElementById('f-tipo').value       = t.tipo      || '';
                document.getElementById('f-importe').value    = t.importe   || '';
                document.getElementById('f-fecha').value      = t.fecha     || '';
                document.getElementById('f-categoria').value  = t.categoria || '';
                document.getElementById('form-fin-titulo').textContent = 'Editar Transacción';
                document.getElementById('form-fin-wrapper').classList.remove('hidden');
            });
        });
        lista.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar esta transacción?')) return;
                try { await deleteDoc(doc(db, 'users', uid, 'finanzas', btn.dataset.del)); await load(); }
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