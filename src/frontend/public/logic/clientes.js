// clientes.js — Gestión de clientes con DataManager
// Sincronización en tiempo real via Firestore listeners

class ClientesManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.clientes = [];
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
                        <h1 class="text-2xl font-bold text-white">Clientes</h1>
                        <p class="text-sm text-slate-400 mt-0.5">Gestión de tu base de clientes</p>
                    </div>
                    <button id="btn-nuevo-cliente" class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nuevo Cliente
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Total</p>
                        <p class="text-2xl font-bold text-white mt-1" id="kpi-cli-total">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Este mes</p>
                        <p class="text-2xl font-bold text-[#38BDF8] mt-1" id="kpi-cli-mes">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">Con email</p>
                        <p class="text-2xl font-bold text-emerald-400 mt-1" id="kpi-cli-email">—</p>
                    </div>
                </div>
                <div id="form-cliente-wrapper" class="hidden glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)]">
                    <h2 class="text-base font-bold text-white mb-3" id="form-cliente-titulo">Nuevo Cliente</h2>
                    <form id="form-cliente" class="grid grid-cols-2 gap-3">
                        <input type="hidden" id="cliente-edit-id">
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Nombre *</label>
                            <input type="text" id="c-nombre" required placeholder="Nombre completo" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                            <input type="tel" id="c-telefono" placeholder="Ej: 612 345 678" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                            <input type="email" id="c-email" placeholder="correo@ejemplo.com" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Notas</label>
                            <input type="text" id="c-notas" placeholder="Observaciones..." class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div class="col-span-2 flex gap-2 pt-1">
                            <button type="submit" class="btn-primary px-4 py-2 rounded-lg text-sm">Guardar</button>
                            <button type="button" id="btn-cancelar-cliente" class="btn-secondary px-4 py-2 rounded-lg text-sm">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                    <div class="p-3 border-b border-[rgba(255,255,255,0.06)]">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                            <input type="text" id="clientes-buscador" placeholder="Buscar clienta por nombre, teléfono o email..."
                                class="w-full pl-8 pr-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                    </div>
                    <div id="clientes-lista">
                        <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async setupListeners() {
        if (!this.dataManager) {
            console.error('❌ DataManager no disponible');
            const el = document.getElementById('clientes-lista');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a datos.</p>';
            return;
        }

        // Cargar clientes iniciales desde caché
        this.clientes = await this.dataManager.obtenerClientes();
        this._updateKPIs();
        this._renderLista();

        // ✨ Suscribirse a cambios en tiempo real
        this.unsubscribe = this.dataManager.suscribirse('clientes', (clientes) => {
            this.clientes = clientes;
            this._updateKPIs();
            this._renderLista();
            console.log('🔄 Clientes actualizados en vista');
        });

        // Listeners de UI
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

        // Buscador en tiempo real
        document.getElementById('clientes-buscador')?.addEventListener('input', (e) => {
            this._filtro = e.target.value.toLowerCase().trim();
            this._renderLista();
        });

        document.getElementById('form-cliente')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('c-nombre').value.trim();
            if (!nombre) return;

            const data = {
                nombre,
                telefono: document.getElementById('c-telefono').value.trim(),
                email: document.getElementById('c-email').value.trim(),
                notas: document.getElementById('c-notas').value.trim()
            };

            try {
                if (this.editingId) {
                    await this.dataManager.actualizarCliente(this.editingId, data);
                    console.log('✅ Cliente actualizado en Firebase');
                } else {
                    await this.dataManager.crearCliente(data);
                    console.log('✅ Cliente creado en Firebase');
                }
                document.getElementById('form-cliente-wrapper').classList.add('hidden');
                this.editingId = null;
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
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

    _renderLista() {
        const lista = document.getElementById('clientes-lista');
        if (!lista) return;

        // Aplicar filtro de búsqueda
        const filtro = (this._filtro || '').toLowerCase().trim();
        const clientesFiltrados = filtro
            ? this.clientes.filter(c =>
                (c.nombre || '').toLowerCase().includes(filtro) ||
                (c.telefono || '').toLowerCase().includes(filtro) ||
                (c.email || '').toLowerCase().includes(filtro))
            : this.clientes;

        if (!this.clientes.length) {
            lista.innerHTML = '<p class="text-slate-500 text-sm p-6 text-center">No hay clientes. ¡Añade el primero!</p>';
            return;
        }
        if (!clientesFiltrados.length) {
            lista.innerHTML = `<p class="text-slate-500 text-sm p-6 text-center">No se encontró ninguna clienta con "${this._esc(filtro)}"</p>`;
            return;
        }

        lista.innerHTML = clientesFiltrados.map(c => `
            <div class="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(43,147,166,0.06)] transition">
                <div class="min-w-0">
                    <p class="font-semibold text-white text-sm">${this._esc(c.nombre)}</p>
                    <p class="text-xs text-slate-400 mt-0.5">${[c.telefono,c.email].filter(Boolean).join(' · ')||'Sin datos de contacto'}</p>
                    ${c.notas?`<p class="text-xs text-slate-500 mt-0.5 italic">${this._esc(c.notas)}</p>`:''}
                </div>
                <div class="flex gap-2 ml-3">
                    <button data-edit="${c.id}" class="text-xs border border-[rgba(43,147,166,0.4)] px-3 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">Editar</button>
                    <button data-del="${c.id}" class="text-xs border border-red-500/30 px-3 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">Eliminar</button>
                </div>
            </div>
        `).join('');

        // Listeners para editar
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

        // Listeners para eliminar
        lista.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este cliente?')) return;
                try {
                    await this.dataManager.eliminarCliente(btn.dataset.del);
                    console.log('✅ Cliente eliminado de Firebase');
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