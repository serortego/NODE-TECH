// empleados.js — Gestión de empleados con Firestore
// Usa window.db y window.fs expuestos por auth-guard.js

class EmpleadosManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.empleados = [];
        this.editingId = null;
    }

    render() {
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-gray-200">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Empleados</h1>
                        <p class="text-sm text-gray-500 mt-0.5">Gestión de personal</p>
                    </div>
                    <button id="btn-nuevo-empleado" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Total</p>
                        <p class="text-2xl font-bold text-gray-900 mt-1" id="kpi-emp-total">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Nómina estimada</p>
                        <p class="text-2xl font-bold text-blue-600 mt-1" id="kpi-emp-nomina">—</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-medium uppercase">Puestos</p>
                        <p class="text-2xl font-bold text-green-600 mt-1" id="kpi-emp-puestos">—</p>
                    </div>
                </div>
                <div id="form-empleado-wrapper" class="hidden bg-white rounded-lg p-5 border border-blue-200 shadow-sm">
                    <h2 class="text-base font-bold text-gray-800 mb-3" id="form-empleado-titulo">Nuevo Empleado</h2>
                    <form id="form-empleado" class="grid grid-cols-2 gap-3">
                        <input type="hidden" id="empleado-edit-id">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                            <input type="text" id="e-nombre" required placeholder="Nombre completo" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Puesto</label>
                            <input type="text" id="e-puesto" placeholder="Ej: Estilista" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                            <input type="tel" id="e-telefono" placeholder="Ej: 612 345 678" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Salario mensual (€)</label>
                            <input type="number" id="e-salario" placeholder="0" min="0" step="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                            <input type="email" id="e-email" placeholder="correo@ejemplo.com" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
                            <input type="text" id="e-notas" placeholder="Observaciones..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="col-span-2 flex gap-2 pt-1">
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Guardar</button>
                            <button type="button" id="btn-cancelar-empleado" class="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div id="empleados-lista">
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
            const el = document.getElementById('empleados-lista');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a Firebase.</p>';
            return;
        }
        const colRef = () => collection(db, 'users', uid, 'empleados');
        const load = async () => {
            try {
                const q = query(colRef(), orderBy('nombre'));
                const snap = await getDocs(q);
                this.empleados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                try { const snap = await getDocs(colRef()); this.empleados = snap.docs.map(d => ({ id: d.id, ...d.data() })); } catch { this.empleados = []; }
            }
            this._updateKPIs();
            this._renderLista({ deleteDoc, doc, db, uid, load });
        };
        await load();
        document.getElementById('btn-nuevo-empleado')?.addEventListener('click', () => {
            this.editingId = null;
            document.getElementById('form-empleado').reset();
            document.getElementById('empleado-edit-id').value = '';
            document.getElementById('form-empleado-titulo').textContent = 'Nuevo Empleado';
            document.getElementById('form-empleado-wrapper').classList.remove('hidden');
        });
        document.getElementById('btn-cancelar-empleado')?.addEventListener('click', () => {
            document.getElementById('form-empleado-wrapper').classList.add('hidden');
            this.editingId = null;
        });
        document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('e-nombre').value.trim();
            if (!nombre) return;
            const data = { nombre, puesto: document.getElementById('e-puesto').value.trim(), telefono: document.getElementById('e-telefono').value.trim(), salario: parseFloat(document.getElementById('e-salario').value)||0, email: document.getElementById('e-email').value.trim(), notas: document.getElementById('e-notas').value.trim(), updatedAt: serverTimestamp() };
            try {
                if (this.editingId) { await updateDoc(doc(db, 'users', uid, 'empleados', this.editingId), data); }
                else { data.createdAt = serverTimestamp(); await addDoc(colRef(), data); }
                document.getElementById('form-empleado-wrapper').classList.add('hidden');
                this.editingId = null;
                await load();
            } catch (err) { alert('Error al guardar: ' + err.message); }
        });
    }

    _updateKPIs() {
        const nomina = this.empleados.reduce((s, e) => s + (parseFloat(e.salario)||0), 0);
        const puestos = [...new Set(this.empleados.map(e => e.puesto).filter(Boolean))].length;
        const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toFixed(0);
        const el = id => document.getElementById(id);
        if (el('kpi-emp-total'))   el('kpi-emp-total').textContent   = this.empleados.length;
        if (el('kpi-emp-nomina'))  el('kpi-emp-nomina').textContent  = fmt(nomina) + ' €';
        if (el('kpi-emp-puestos')) el('kpi-emp-puestos').textContent = puestos;
    }

    _renderLista({ deleteDoc, doc, db, uid, load }) {
        const lista = document.getElementById('empleados-lista');
        if (!lista) return;
        if (!this.empleados.length) { lista.innerHTML = '<p class="text-gray-400 text-sm p-6 text-center">No hay empleados. ¡Añade el primero!</p>'; return; }
        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES') + ' €';
        lista.innerHTML = this.empleados.map(e => `
            <div class="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div class="min-w-0">
                    <p class="font-semibold text-gray-900 text-sm">${this._esc(e.nombre)}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${[e.puesto, e.salario ? fmt(e.salario)+'/mes' : ''].filter(Boolean).join(' · ')||'Sin información'}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${[e.telefono, e.email].filter(Boolean).join(' · ')}</p>
                </div>
                <div class="flex gap-2 ml-3">
                    <button data-edit="${e.id}" class="text-xs border border-gray-300 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-100 transition">Editar</button>
                    <button data-del="${e.id}" class="text-xs border border-red-200 px-3 py-1 rounded-md text-red-600 hover:bg-red-50 transition">Eliminar</button>
                </div>
            </div>
        `).join('');
        lista.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const e = this.empleados.find(x => x.id === btn.dataset.edit);
                if (!e) return;
                this.editingId = e.id;
                document.getElementById('empleado-edit-id').value = e.id;
                document.getElementById('e-nombre').value   = e.nombre   || '';
                document.getElementById('e-puesto').value   = e.puesto   || '';
                document.getElementById('e-telefono').value = e.telefono || '';
                document.getElementById('e-salario').value  = e.salario  || '';
                document.getElementById('e-email').value    = e.email    || '';
                document.getElementById('e-notas').value    = e.notas    || '';
                document.getElementById('form-empleado-titulo').textContent = 'Editar Empleado';
                document.getElementById('form-empleado-wrapper').classList.remove('hidden');
            });
        });
        lista.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este empleado?')) return;
                try { await deleteDoc(doc(db, 'users', uid, 'empleados', btn.dataset.del)); await load(); }
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