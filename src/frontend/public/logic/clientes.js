// clientes.js — Módulo de clientes para NODE
// Clase: ClientesManager
// Muestra la lista de clientes derivada del historial de citas.
// Requiere: window.BCONFIG, acceso a citas vía navigationManager

class ClientesManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
    }

    render() {
        const citas     = this.navManager?.citas || [];
        const mapa      = {};
        citas.forEach(c => {
            if (!mapa[c.cliente]) {
                mapa[c.cliente] = {
                    nombre:            c.cliente,
                    ultimaVisita:      c.fecha,
                    ultimoTratamiento: c.servicio,
                    totalVisitas:      0,
                    totalFacturado:    0
                };
            }
            if (c.fecha > mapa[c.cliente].ultimaVisita) {
                mapa[c.cliente].ultimaVisita      = c.fecha;
                mapa[c.cliente].ultimoTratamiento = c.servicio;
            }
            mapa[c.cliente].totalVisitas++;
            mapa[c.cliente].totalFacturado += parseInt(c.precio || 0);
        });
        const clientes = Object.values(mapa).sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita));

        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.08)]">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-users text-[#2B93A6] text-lg"></i>
                        <h2 class="text-xl font-bold text-white">${window.BCONFIG?.clientePlural || 'Clientes'}</h2>
                        <span class="text-xs text-slate-500">(${clientes.length} registrados)</span>
                    </div>
                    <button id="cli-btn-nuevo" class="btn-primary rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1">
                        <i class="fas fa-user-plus"></i> ${window.BCONFIG?.nuevaCita || 'Nueva cita'}
                    </button>
                </div>
                <input type="text" id="cli-search" placeholder="Buscar por nombre o ${window.BCONFIG?.servicioSingular?.toLowerCase() || 'servicio'}..."
                    class="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B93A6] text-sm">
                <div class="glass rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden" id="cli-list">
                    ${clientes.length > 0 ? clientes.map(p => `
                        <div class="cli-row p-3 flex items-center justify-between hover:bg-[rgba(43,147,166,0.08)] border-b border-[rgba(255,255,255,0.06)] transition">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[rgba(43,147,166,0.2)] flex items-center justify-center text-[#38BDF8] font-bold text-sm flex-shrink-0">
                                    ${p.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="font-semibold text-white text-sm">${p.nombre}</p>
                                    <p class="text-xs text-slate-400">${p.ultimoTratamiento} · ${new Date(p.ultimaVisita + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="text-right hidden sm:block">
                                    <p class="text-xs text-slate-400">${p.totalVisitas} visita${p.totalVisitas !== 1 ? 's' : ''}</p>
                                    <p class="text-xs text-emerald-400 font-semibold">€${p.totalFacturado}</p>
                                </div>
                                <button class="cli-btn-cita px-2 py-1 text-xs bg-[rgba(43,147,166,0.15)] text-[#38BDF8] rounded hover:bg-[rgba(43,147,166,0.3)] transition" data-nombre="${p.nombre}" title="Nueva cita">
                                    <i class="fas fa-calendar-plus"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="p-8 text-center">
                            <i class="fas fa-users text-3xl text-slate-600 mb-3"></i>
                            <p class="text-slate-500 text-sm">No hay clientes registrados aún</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    setupListeners() {
        const search = document.getElementById('cli-search');
        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.toLowerCase();
                document.querySelectorAll('.cli-row').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }
        document.querySelectorAll('.cli-btn-cita').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navManager?.showNewCitaModal({ cliente: btn.dataset.nombre, fecha: new Date().toISOString().split('T')[0] });
            });
        });
        document.getElementById('cli-btn-nuevo')?.addEventListener('click', () => {
            this.navManager?.showNewCitaModal({ fecha: new Date().toISOString().split('T')[0] });
        });
    }

    destroy() {}
}
