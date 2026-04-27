// empleados.js — Gestión de empleados con DataManager
// Sincronización en tiempo real via Firestore listeners

class EmpleadosManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.empleados = [];
        this.editingId = null;
        this.unsubscribe = null; // Para desuscribirse de cambios
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
    
    get dataManager() {
        if (!window.dataManager) {
            throw new Error('DataManager no está inicializado. Espera a appReady.');
        }
        return window.dataManager;
    }

    render() {
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                    <div>
                        <h1 class="text-2xl font-bold text-white">Empleados</h1>
                        <p class="text-sm text-slate-400 mt-0.5">Gestión de personal</p>
                    </div>
                    <button id="btn-nuevo-empleado" class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nuevo Empleado
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Total</p>
                        <p class="text-2xl font-bold text-white mt-1" id="kpi-emp-total">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Nómina estimada</p>
                        <p class="text-2xl font-bold text-[#38BDF8] mt-1" id="kpi-emp-nomina">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Puestos</p>
                        <p class="text-2xl font-bold text-emerald-400 mt-1" id="kpi-emp-puestos">—</p>
                    </div>
                </div>
                <div id="form-empleado-wrapper" class="hidden glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)]">
                    <h2 class="text-base font-bold text-white mb-3" id="form-empleado-titulo">Nuevo Empleado</h2>
                    <form id="form-empleado" class="grid grid-cols-2 gap-3">
                        <input type="hidden" id="empleado-edit-id">
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Nombre *</label>
                            <input type="text" id="e-nombre" required placeholder="Nombre completo" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Puesto</label>
                            <input type="text" id="e-puesto" placeholder="Ej: Estilista" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                            <input type="tel" id="e-telefono" placeholder="Ej: 612 345 678" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Salario mensual (€)</label>
                            <input type="number" id="e-salario" placeholder="0" min="0" step="100" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                            <input type="email" id="e-email" placeholder="correo@ejemplo.com" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Notas</label>
                            <input type="text" id="e-notas" placeholder="Observaciones..." class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div class="col-span-2 flex gap-2 pt-1">
                            <button type="submit" class="btn-primary px-4 py-2 rounded-lg text-sm">Guardar</button>
                            <button type="button" id="btn-cancelar-empleado" class="btn-secondary px-4 py-2 rounded-lg text-sm">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                    <div id="empleados-lista">
                        <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async setupListeners() {
        if (!this.dataManager) {
            console.error('❌ DataManager no disponible');
            const el = document.getElementById('empleados-lista');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a datos.</p>';
            return;
        }

        // Cargar empleados iniciales desde caché
        this.empleados = await this.dataManager.obtenerEmpleados();
        this._updateKPIs();
        this._renderLista();

        // ✨ Suscribirse a cambios en tiempo real
        this.unsubscribe = this.dataManager.suscribirse('empleados', (empleados) => {
            this.empleados = empleados;
            this._updateKPIs();
            this._renderLista();
            console.log('🔄 Empleados actualizados en vista');
        });

        // Listeners de UI
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

            const data = {
                nombre,
                puesto: document.getElementById('e-puesto').value.trim(),
                telefono: document.getElementById('e-telefono').value.trim(),
                salario: parseFloat(document.getElementById('e-salario').value) || 0,
                email: document.getElementById('e-email').value.trim(),
                notas: document.getElementById('e-notas').value.trim()
            };

            try {
                if (this.editingId) {
                    await this.dataManager.actualizarEmpleado(this.editingId, data);
                    console.log('✅ Empleado actualizado en Firebase');
                } else {
                    await this.dataManager.crearEmpleado(data);
                    console.log('✅ Empleado creado en Firebase');
                }
                document.getElementById('form-empleado-wrapper').classList.add('hidden');
                this.editingId = null;
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
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

    _renderLista() {
        const lista = document.getElementById('empleados-lista');
        if (!lista) return;
        if (!this.empleados.length) { 
            lista.innerHTML = '<p class="text-slate-500 text-sm p-6 text-center">No hay empleados. ¡Añade el primero!</p>'; 
            return; 
        }

        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES') + ' €';
        lista.innerHTML = this.empleados.map(e => `
            <div class="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(43,147,166,0.06)] transition">
                <div class="min-w-0">
                    <p class="font-semibold text-white text-sm">${this._esc(e.nombre)}</p>
                    <p class="text-xs text-slate-400 mt-0.5">${[e.puesto, e.salario ? fmt(e.salario)+'/mes' : ''].filter(Boolean).join(' · ')||'Sin información'}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${[e.telefono, e.email].filter(Boolean).join(' · ')}</p>
                </div>
                <div class="flex gap-2 ml-3">
                    <button data-edit="${e.id}" class="text-xs border border-[rgba(43,147,166,0.4)] px-3 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">Editar</button>
                    <button data-del="${e.id}" class="text-xs border border-red-500/30 px-3 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">Eliminar</button>
                </div>
            </div>
        `).join('');

        // Listeners para editar
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

        // Listeners para eliminar
        lista.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este empleado?')) return;
                try {
                    await this.dataManager.eliminarEmpleado(btn.dataset.del);
                    console.log('✅ Empleado eliminado de Firebase');
                } catch (err) {
                    alert('Error al eliminar: ' + err.message);
                }
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