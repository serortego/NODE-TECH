// contabilidad.js — Módulo de facturación para NODE
// NO es un ES module: se carga con <script src="..."> después de auth.js
// Usa window.db, window.fs y window.firebaseUser expuestos por auth.js
//
// Uso en el SPA (inicio.html):
//   window.navigationManager instancia ContabilidadManager automáticamente
//
// Uso en página standalone (contabilidad.html):
//   Auto-inicializado en el evento 'appReady' si no hay navigationManager

class ContabilidadManager {
    constructor(navigationManager) {
        this.navManager        = navigationManager;
        this.facturas          = [];
        this.editingId         = null;
        this.conceptos         = [];
        this.transacciones     = [];
        this.gastosFijos       = [];
        this.tarifas           = [];
        this.editingTransId    = null;
        this.editingGastoId    = null;
        this.editingTarifaId   = null;
        this._destroyed        = false;
        this._cajaTab          = 'caja';
    }

    // ─── Render HTML ──────────────────────────────────────────────────────────
    render() {
        return `
        <div id="cont-root" class="space-y-4">

            <!-- Cabecera -->
            <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <div>
                    <h1 class="text-2xl font-bold text-white">Contabilidad</h1>
                    <p class="text-sm text-slate-400 mt-0.5">Gestión de facturas y transacciones</p>
                </div>
                <button id="cont-btn-nueva"
                    class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i class="fas fa-plus"></i> <span id="cont-btn-nueva-label">Nueva factura</span>
                </button>
            </div>

            <!-- Selector de pestañas -->
            <div class="flex gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl w-fit">
                <button id="cont-tab-btn-facturas"
                    class="px-4 py-2 rounded-lg text-sm font-semibold bg-[rgba(43,147,166,0.2)] text-[#38BDF8] transition">
                    <i class="fas fa-file-invoice mr-1.5"></i>Facturas
                </button>
                <button id="cont-tab-btn-transacciones"
                    class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                    <i class="fas fa-euro-sign mr-1.5"></i>Caja y gastos
                </button>
            </div>

            <!-- ═══ PESTAÑA FACTURAS ═══ -->
            <div id="cont-tab-facturas">

            <!-- KPIs -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Total facturas</p>
                    <p class="text-2xl font-bold text-white mt-1" id="cont-stat-total">—</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Pendiente</p>
                    <p class="text-2xl font-bold text-[#38BDF8] mt-1" id="cont-stat-pendiente">—</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Cobrado</p>
                    <p class="text-2xl font-bold text-emerald-400 mt-1" id="cont-stat-cobrado">—</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Vencidas</p>
                    <p class="text-2xl font-bold text-red-400 mt-1" id="cont-stat-vencidas">—</p>
                </div>
            </div>

            <!-- Formulario nueva/editar factura (oculto por defecto) -->
            <div id="cont-form-wrapper" class="hidden glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)] space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base font-bold text-white" id="cont-form-titulo">Nueva factura</h2>
                    <button id="cont-btn-cancelar"
                        class="btn-secondary px-3 py-1.5 rounded-lg text-sm">
                        <i class="fas fa-times mr-1"></i> Cancelar
                    </button>
                </div>

                <!-- Datos cliente -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Cliente *</label>
                        <input type="text" id="cont-f-cliente-nombre" placeholder="Nombre o empresa"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Email cliente</label>
                        <input type="email" id="cont-f-cliente-email" placeholder="cliente@empresa.com"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">NIF / CIF</label>
                        <input type="text" id="cont-f-cliente-nif" placeholder="B12345678"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Dirección</label>
                        <input type="text" id="cont-f-cliente-dir" placeholder="Calle, número, ciudad"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                </div>

                <!-- Fechas y estado -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Fecha emisión *</label>
                        <input type="date" id="cont-f-fecha-emision"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Fecha vencimiento</label>
                        <input type="date" id="cont-f-fecha-vencimiento"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Estado</label>
                        <select id="cont-f-estado"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            <option value="borrador" class="bg-[#0f1e35]">Borrador</option>
                            <option value="emitida" class="bg-[#0f1e35]">Emitida</option>
                            <option value="pagada" class="bg-[#0f1e35]">Pagada</option>
                            <option value="vencida" class="bg-[#0f1e35]">Vencida</option>
                        </select>
                    </div>
                </div>

                <!-- Conceptos -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-semibold text-slate-300 uppercase">Conceptos *</label>
                        <button id="cont-btn-add-concepto" type="button"
                            class="bg-[rgba(43,147,166,0.15)] hover:bg-[rgba(43,147,166,0.25)] text-[#38BDF8] px-3 py-1 rounded-lg text-xs font-semibold transition">
                            <i class="fas fa-plus mr-1"></i> Añadir línea
                        </button>
                    </div>
                    <div class="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.08)]">
                        <table class="w-full text-sm">
                            <thead class="bg-[rgba(255,255,255,0.04)] text-xs font-semibold uppercase text-slate-400">
                                <tr>
                                    <th class="px-3 py-2 text-left w-full">Descripción</th>
                                    <th class="px-3 py-2 text-right whitespace-nowrap">Cant.</th>
                                    <th class="px-3 py-2 text-right whitespace-nowrap">Precio unit.</th>
                                    <th class="px-3 py-2 text-right whitespace-nowrap">Subtotal</th>
                                    <th class="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody id="cont-conceptos-body"></tbody>
                        </table>
                    </div>
                </div>

                <!-- IVA y totales -->
                <div class="flex flex-col items-end gap-2">
                    <div class="flex items-center gap-3">
                        <label class="text-sm font-semibold text-slate-300">IVA (%)</label>
                        <input type="number" id="cont-f-iva" min="0" max="100" value="21"
                            class="w-20 px-3 py-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div class="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 w-64 space-y-1 text-sm">
                        <div class="flex justify-between text-slate-400">
                            <span>Base imponible</span><span id="cont-t-base">0,00 €</span>
                        </div>
                        <div class="flex justify-between text-slate-400">
                            <span id="cont-t-iva-label">IVA (21%)</span><span id="cont-t-iva">0,00 €</span>
                        </div>
                        <div class="flex justify-between font-bold text-white border-t border-[rgba(255,255,255,0.08)] pt-1">
                            <span>Total</span><span id="cont-t-total">0,00 €</span>
                        </div>
                    </div>
                </div>

                <!-- Notas -->
                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Notas</label>
                    <textarea id="cont-f-notas" rows="2"
                        placeholder="Condiciones de pago, información adicional..."
                        class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2B93A6]"></textarea>
                </div>

                <!-- Acciones -->
                <div class="flex gap-2 flex-wrap">
                    <button id="cont-btn-guardar"
                        class="btn-primary px-5 py-2 rounded-lg text-sm flex items-center gap-2">
                        <i class="fas fa-save"></i> Guardar borrador
                    </button>
                    <button id="cont-btn-guardar-emitir"
                        class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition flex items-center gap-2">
                        <i class="fas fa-paper-plane"></i> Guardar y emitir
                    </button>
                    <button id="cont-btn-pdf" disabled
                        class="btn-secondary px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="fas fa-file-pdf text-red-400"></i> Exportar PDF
                    </button>
                </div>
            </div>

            <!-- Filtro + lista -->
            <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 class="text-base font-bold text-white">Historial de facturas</h2>
                    <select id="cont-filtro-estado"
                        class="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        <option value="" class="bg-[#0f1e35]">Todos los estados</option>
                        <option value="borrador" class="bg-[#0f1e35]">Borrador</option>
                        <option value="emitida" class="bg-[#0f1e35]">Emitida</option>
                        <option value="pagada" class="bg-[#0f1e35]">Pagada</option>
                        <option value="vencida" class="bg-[#0f1e35]">Vencida</option>
                    </select>
                </div>
                <div id="cont-facturas-lista">
                    <p class="text-slate-500 text-sm p-6 text-center">
                        <i class="fas fa-spinner fa-spin mr-2"></i>Cargando...
                    </p>
                </div>
            </div>

            </div><!-- /cont-tab-facturas -->

            <!-- ═══ PESTAÑA CAJA Y GASTOS ═══ -->
            <div id="cont-tab-transacciones" class="hidden space-y-4">

                <!-- KPIs resumen del mes -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">🟢 Ingresos mes</p>
                        <p class="text-2xl font-bold text-emerald-400 mt-1" id="trans-stat-ingresos">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">🔴 Gastos mes</p>
                        <p class="text-2xl font-bold text-red-400 mt-1" id="trans-stat-gastos">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift">
                        <p class="text-xs text-slate-400 font-medium uppercase">💰 Gastos fijos/mes</p>
                        <p class="text-2xl font-bold text-amber-400 mt-1" id="trans-stat-fijos">—</p>
                    </div>
                    <div class="glass rounded-lg p-4 card-lift border-2 border-[rgba(43,147,166,0.3)]">
                        <p class="text-xs text-slate-400 font-medium uppercase">⚖️ Balance</p>
                        <p class="text-2xl font-bold mt-1" id="trans-stat-balance">—</p>
                    </div>
                </div>

                <!-- Sub-tabs -->
                <div class="flex gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl">
                    <button id="caja-tab-btn-caja" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-[rgba(43,147,166,0.2)] text-[#38BDF8] transition">
                        <i class="fas fa-cash-register mr-1.5"></i>Caja del día
                    </button>
                    <button id="caja-tab-btn-fijos" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                        <i class="fas fa-building mr-1.5"></i>Gastos fijos
                    </button>
                    <button id="caja-tab-btn-tarifa" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                        <i class="fas fa-tags mr-1.5"></i>Tarifa servicios
                    </button>
                </div>

                <!-- ─── SUB-TAB: CAJA ─── -->
                <div id="caja-subtab-caja" class="space-y-3">

                    <!-- Botones rápidos de tarifa -->
                    <div id="caja-atajos" class="flex flex-wrap gap-2">
                        <p class="text-xs text-slate-500 w-full">Añadir ingreso rápido:</p>
                    </div>

                    <!-- Formulario nuevo movimiento -->
                    <div id="trans-form-wrapper" class="glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)]">
                        <h2 class="text-base font-bold text-white mb-3" id="trans-form-titulo">Nuevo movimiento</h2>
                        <form id="trans-form" class="grid grid-cols-2 gap-3">
                            <input type="hidden" id="trans-edit-id">
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Concepto *</label>
                                <input type="text" id="trans-concepto" required placeholder="Ej: Corte, tinte..."
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Tipo *</label>
                                <div class="flex gap-2">
                                    <button type="button" id="trans-tipo-ingreso"
                                        class="flex-1 py-2 rounded-lg text-sm font-bold border-2 border-emerald-500/60 bg-emerald-500/20 text-emerald-300 transition">
                                        ➕ Ingreso
                                    </button>
                                    <button type="button" id="trans-tipo-gasto"
                                        class="flex-1 py-2 rounded-lg text-sm font-bold border-2 border-[rgba(255,255,255,0.1)] text-slate-500 transition">
                                        ➖ Gasto
                                    </button>
                                </div>
                                <input type="hidden" id="trans-tipo" value="ingreso">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Importe (€) *</label>
                                <input type="number" id="trans-importe" required placeholder="0.00" min="0" step="0.50"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Fecha</label>
                                <input type="date" id="trans-fecha"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div class="col-span-2 flex gap-2">
                                <button type="submit" class="btn-primary flex-1 px-4 py-2 rounded-lg text-sm font-semibold"><i class="fas fa-check mr-1"></i>Guardar</button>
                                <button type="button" id="trans-btn-cancelar" class="btn-secondary px-4 py-2 rounded-lg text-sm">Limpiar</button>
                            </div>
                        </form>
                    </div>

                    <!-- Lista movimientos -->
                    <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                            <h3 class="text-sm font-bold text-white">Movimientos</h3>
                            <select id="trans-filtro-mes"
                                class="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg px-3 py-1 text-xs focus:outline-none">
                            </select>
                        </div>
                        <div id="trans-lista">
                            <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                        </div>
                    </div>

                </div><!-- /caja-subtab-caja -->

                <!-- ─── SUB-TAB: GASTOS FIJOS ─── -->
                <div id="caja-subtab-fijos" class="hidden space-y-3">

                    <div class="glass rounded-lg p-4 border border-amber-500/20 text-sm text-amber-200/70">
                        <i class="fas fa-info-circle mr-2"></i>Los gastos fijos son recurrentes (alquiler, luz, nóminas...). Se usan para calcular el coste mensual automáticamente.
                    </div>

                    <!-- Formulario gasto fijo -->
                    <div id="fijo-form-wrapper" class="hidden glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)]">
                        <h2 class="text-base font-bold text-white mb-3" id="fijo-form-titulo">Nuevo gasto fijo</h2>
                        <form id="fijo-form" class="grid grid-cols-2 gap-3">
                            <input type="hidden" id="fijo-edit-id">
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Nombre *</label>
                                <input type="text" id="fijo-nombre" required placeholder="Ej: Alquiler local"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Importe/mes (€) *</label>
                                <input type="number" id="fijo-importe" required placeholder="0.00" min="0" step="0.01"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                                <input type="text" id="fijo-categoria" placeholder="Ej: Local, Personal..." list="fijo-cat-list"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                                <datalist id="fijo-cat-list">
                                    <option value="Local"><option value="Suministros"><option value="Personal">
                                    <option value="Seguros"><option value="Gestoría"><option value="Marketing"><option value="Otros">
                                </datalist>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Día de pago</label>
                                <input type="number" id="fijo-dia" placeholder="1" min="1" max="31"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div class="col-span-2 flex gap-2">
                                <button type="submit" class="btn-primary flex-1 px-4 py-2 rounded-lg text-sm">Guardar</button>
                                <button type="button" id="fijo-btn-cancelar" class="btn-secondary px-4 py-2 rounded-lg text-sm">Cancelar</button>
                            </div>
                        </form>
                    </div>

                    <!-- Lista gastos fijos -->
                    <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                            <h3 class="text-sm font-bold text-white">Gastos fijos mensuales</h3>
                            <button id="fijo-btn-nuevo" class="btn-primary px-3 py-1.5 rounded-lg text-xs"><i class="fas fa-plus mr-1"></i>Añadir</button>
                        </div>
                        <div id="fijos-lista">
                            <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                        </div>
                    </div>

                </div><!-- /caja-subtab-fijos -->

                <!-- ─── SUB-TAB: TARIFA SERVICIOS ─── -->
                <div id="caja-subtab-tarifa" class="hidden space-y-3">

                    <div class="glass rounded-lg p-4 border border-[rgba(43,147,166,0.2)] text-sm text-[#38BDF8]/80">
                        <i class="fas fa-lightbulb mr-2"></i>Los precios que definas aquí aparecerán como botones rápidos al registrar ingresos en Caja.
                    </div>

                    <!-- Formulario tarifa -->
                    <div id="tarifa-form-wrapper" class="hidden glass rounded-lg p-5 border border-[rgba(43,147,166,0.3)]">
                        <h2 class="text-base font-bold text-white mb-3" id="tarifa-form-titulo">Nuevo servicio</h2>
                        <form id="tarifa-form" class="grid grid-cols-2 gap-3">
                            <input type="hidden" id="tarifa-edit-id">
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Servicio *</label>
                                <input type="text" id="tarifa-nombre" required placeholder="Ej: Corte y lavado"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Precio (€) *</label>
                                <input type="number" id="tarifa-precio" required placeholder="0.00" min="0" step="0.50"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            </div>
                            <div class="col-span-2 flex gap-2">
                                <button type="submit" class="btn-primary flex-1 px-4 py-2 rounded-lg text-sm">Guardar</button>
                                <button type="button" id="tarifa-btn-cancelar" class="btn-secondary px-4 py-2 rounded-lg text-sm">Cancelar</button>
                            </div>
                        </form>
                    </div>

                    <!-- Lista tarifas -->
                    <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                            <h3 class="text-sm font-bold text-white">Servicios y precios</h3>
                            <button id="tarifa-btn-nuevo" class="btn-primary px-3 py-1.5 rounded-lg text-xs"><i class="fas fa-plus mr-1"></i>Añadir</button>
                        </div>
                        <div id="tarifa-lista">
                            <p class="text-slate-500 text-sm p-6 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</p>
                        </div>
                    </div>

                </div><!-- /caja-subtab-tarifa -->

            </div><!-- /cont-tab-transacciones -->

        </div>
        `;
    }

    // ─── Setup listeners + carga inicial ──────────────────────────────────────
    async setupListeners() {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;

        if (!db || !uid) {
            const el = document.getElementById('cont-facturas-lista');
            if (el) el.innerHTML = '<p class="text-red-500 text-sm p-6 text-center">Error: sin conexión a Firebase.</p>';
            return;
        }

        const { collection, getDocs, addDoc, updateDoc, deleteDoc,
                doc, query, orderBy, serverTimestamp, Timestamp } = window.fs;

        window._contMgr = this;

        const col = () => collection(db, 'users', uid, 'facturas');

        const fetchFacturas = async () => {
            try {
                const q    = query(col(), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                this.facturas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                this.facturas = [];
            }
            this._renderLista();
            this._renderStats();
        };

        const generateNumero = async () => {
            const year = new Date().getFullYear();
            const snap = await getDocs(col());
            return `FAC-${year}-${String(snap.size + 1).padStart(3, '0')}`;
        };

        this._fetchFacturas = fetchFacturas;

        this._saveFactura = async (estadoForzado) => {
            const nombre = document.getElementById('cont-f-cliente-nombre')?.value.trim();
            if (!nombre) { alert('El nombre del cliente es obligatorio.'); return; }
            if (this.conceptos.length === 0) { alert('Añade al menos un concepto.'); return; }

            const iva   = parseFloat(document.getElementById('cont-f-iva')?.value) || 0;
            const base  = this.conceptos.reduce((s, c) => s + c.subtotal, 0);
            const total = base + base * (iva / 100);

            const data = {
                estado:           estadoForzado || document.getElementById('cont-f-estado')?.value || 'borrador',
                cliente: {
                    nombre,
                    email:     document.getElementById('cont-f-cliente-email')?.value.trim() || '',
                    nif:       document.getElementById('cont-f-cliente-nif')?.value.trim() || '',
                    direccion: document.getElementById('cont-f-cliente-dir')?.value.trim() || ''
                },
                fechaEmision:     document.getElementById('cont-f-fecha-emision')?.value || '',
                fechaVencimiento: document.getElementById('cont-f-fecha-vencimiento')?.value || '',
                conceptos:        this.conceptos.map(c => ({ ...c })),
                subtotal:         base,
                impuesto:         iva,
                total,
                notas:            document.getElementById('cont-f-notas')?.value.trim() || '',
                userId:           uid
            };

            try {
                if (this.editingId) {
                    const ref = doc(db, 'users', uid, 'facturas', this.editingId);
                    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
                } else {
                    const numero = await generateNumero();
                    await addDoc(col(), { ...data, numero, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                }
                await fetchFacturas();
                this._hideForm();
                this.navManager?.showNotification('✓ Factura guardada', 'success');
            } catch (err) {
                console.error(err);
                alert('Error al guardar la factura.');
            }
        };

        this._deleteFactura = async (id) => {
            if (!confirm('¿Eliminar esta factura? No se puede deshacer.')) return;
            try {
                await deleteDoc(doc(db, 'users', uid, 'facturas', id));
                await fetchFacturas();
                this.navManager?.showNotification('Factura eliminada', 'info');
            } catch {
                alert('Error al eliminar la factura.');
            }
        };

        // ── Tab switching ──
        const tabFacturas = document.getElementById('cont-tab-facturas');
        const tabTrans    = document.getElementById('cont-tab-transacciones');
        const btnTabF     = document.getElementById('cont-tab-btn-facturas');
        const btnTabT     = document.getElementById('cont-tab-btn-transacciones');
        const labelNueva  = document.getElementById('cont-btn-nueva-label');
        let tabActiva     = 'facturas';

        const activarTab = (tab) => {
            tabActiva = tab;
            const esFact = tab === 'facturas';
            tabFacturas?.classList.toggle('hidden', !esFact);
            tabTrans?.classList.toggle('hidden', esFact);
            btnTabF?.classList.toggle('bg-[rgba(43,147,166,0.2)]', esFact);
            btnTabF?.classList.toggle('text-[#38BDF8]', esFact);
            btnTabF?.classList.toggle('text-slate-400', !esFact);
            btnTabT?.classList.toggle('bg-[rgba(43,147,166,0.2)]', !esFact);
            btnTabT?.classList.toggle('text-[#38BDF8]', !esFact);
            btnTabT?.classList.toggle('text-slate-400', esFact);
            if (labelNueva) labelNueva.textContent = esFact ? 'Nueva factura' : 'Nuevo movimiento';
        };

        btnTabF?.addEventListener('click', () => activarTab('facturas'));
        btnTabT?.addEventListener('click', () => activarTab('transacciones'));

        // Sub-tabs Caja
        const activarCajaTab = (tab) => {
            this._cajaTab = tab;
            ['caja','fijos','tarifa'].forEach(t => {
                document.getElementById(`caja-subtab-${t}`)?.classList.toggle('hidden', t !== tab);
                const btn = document.getElementById(`caja-tab-btn-${t}`);
                if (btn) {
                    btn.classList.toggle('bg-[rgba(43,147,166,0.2)]', t === tab);
                    btn.classList.toggle('text-[#38BDF8]', t === tab);
                    btn.classList.toggle('text-slate-400', t !== tab);
                }
            });
        };
        document.getElementById('caja-tab-btn-caja')?.addEventListener('click', () => activarCajaTab('caja'));
        document.getElementById('caja-tab-btn-fijos')?.addEventListener('click', () => activarCajaTab('fijos'));
        document.getElementById('caja-tab-btn-tarifa')?.addEventListener('click', () => activarCajaTab('tarifa'));

        // ── Eventos del botón nueva ──
        document.getElementById('cont-btn-nueva')?.addEventListener('click', () => {
            if (tabActiva === 'facturas') this._showForm(null);
            else if (this._cajaTab === 'fijos') {
                this._resetFijoForm();
                document.getElementById('fijo-form-wrapper')?.classList.remove('hidden');
            } else if (this._cajaTab === 'tarifa') {
                this._resetTarifaForm();
                document.getElementById('tarifa-form-wrapper')?.classList.remove('hidden');
            }
        });
        document.getElementById('cont-btn-cancelar')?.addEventListener('click', () => this._hideForm());
        document.getElementById('cont-btn-add-concepto')?.addEventListener('click', () => this._addConcepto());
        document.getElementById('cont-filtro-estado')?.addEventListener('change', () => this._renderLista());
        document.getElementById('cont-f-iva')?.addEventListener('input', () => this._updateTotals());

        document.getElementById('cont-btn-guardar')?.addEventListener('click', () => {
            this._saveFactura(document.getElementById('cont-f-estado')?.value);
        });
        document.getElementById('cont-btn-guardar-emitir')?.addEventListener('click', () => {
            if (document.getElementById('cont-f-estado')) document.getElementById('cont-f-estado').value = 'emitida';
            this._saveFactura('emitida');
        });
        document.getElementById('cont-btn-pdf')?.addEventListener('click', () => {
            if (!this.editingId) return;
            const f = this.facturas.find(x => x.id === this.editingId);
            if (f) this._generatePDF(f);
        });

        document.getElementById('cont-conceptos-body')?.addEventListener('input', e => {
            const el = e.target;
            const i  = parseInt(el.dataset.i);
            if (!isNaN(i)) this._updateConcepto(i, el.dataset.f, el.value);
        });
        document.getElementById('cont-conceptos-body')?.addEventListener('click', e => {
            const btn = e.target.closest('[data-del]');
            if (btn) this._removeConcepto(parseInt(btn.dataset.del));
        });

        await fetchFacturas();

        // ── CAJA: Movimientos ──
        const colTrans  = () => collection(db, 'users', uid, 'finanzas');
        const colFijos  = () => collection(db, 'users', uid, 'gastosFijos');
        const colTarifa = () => collection(db, 'users', uid, 'tarifas');

        // Fecha de hoy por defecto
        const fechaTransEl = document.getElementById('trans-fecha');
        if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split('T')[0];

        // Selector tipo ingreso/gasto
        const setTipoTrans = (tipo) => {
            document.getElementById('trans-tipo').value = tipo;
            const btnI = document.getElementById('trans-tipo-ingreso');
            const btnG = document.getElementById('trans-tipo-gasto');
            if (tipo === 'ingreso') {
                btnI?.classList.add('border-emerald-500/60','bg-emerald-500/20','text-emerald-300');
                btnI?.classList.remove('border-[rgba(255,255,255,0.1)]','text-slate-500');
                btnG?.classList.remove('border-red-500/60','bg-red-500/20','text-red-300');
                btnG?.classList.add('border-[rgba(255,255,255,0.1)]','text-slate-500');
            } else {
                btnG?.classList.add('border-red-500/60','bg-red-500/20','text-red-300');
                btnG?.classList.remove('border-[rgba(255,255,255,0.1)]','text-slate-500');
                btnI?.classList.remove('border-emerald-500/60','bg-emerald-500/20','text-emerald-300');
                btnI?.classList.add('border-[rgba(255,255,255,0.1)]','text-slate-500');
            }
        };
        document.getElementById('trans-tipo-ingreso')?.addEventListener('click', () => setTipoTrans('ingreso'));
        document.getElementById('trans-tipo-gasto')?.addEventListener('click', () => setTipoTrans('gasto'));

        const loadTrans = async () => {
            try {
                const q = query(colTrans(), orderBy('fecha', 'desc'));
                const snap = await getDocs(q);
                this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                try { const snap = await getDocs(colTrans()); this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() })); } catch { this.transacciones = []; }
            }
            this._rellenarFiltroMes();
            this._renderTransStats();
            this._renderTransLista({ deleteDoc, doc, db, uid, loadTrans });
        };

        document.getElementById('trans-filtro-mes')?.addEventListener('change', () => {
            this._renderTransStats();
            this._renderTransLista({ deleteDoc, doc, db, uid, loadTrans });
        });

        document.getElementById('trans-btn-cancelar')?.addEventListener('click', () => {
            document.getElementById('trans-form')?.reset();
            setTipoTrans('ingreso');
            if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split('T')[0];
            this.editingTransId = null;
            document.getElementById('trans-form-titulo').textContent = 'Nuevo movimiento';
        });

        document.getElementById('trans-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const concepto = document.getElementById('trans-concepto').value.trim();
            const tipo     = document.getElementById('trans-tipo').value;
            const importe  = document.getElementById('trans-importe').value;
            if (!concepto || !tipo || !importe) return;
            const data = {
                concepto, tipo,
                importe:   parseFloat(importe),
                fecha:     document.getElementById('trans-fecha').value || new Date().toISOString().split('T')[0],
                updatedAt: serverTimestamp()
            };
            try {
                if (this.editingTransId) {
                    await updateDoc(doc(db, 'users', uid, 'finanzas', this.editingTransId), data);
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(colTrans(), data);
                }
                document.getElementById('trans-form')?.reset();
                setTipoTrans('ingreso');
                if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split('T')[0];
                document.getElementById('trans-form-titulo').textContent = 'Nuevo movimiento';
                this.editingTransId = null;
                await loadTrans();
                this.navManager?.showNotification('✓ Movimiento guardado', 'success');
            } catch (err) { alert('Error al guardar: ' + err.message); }
        });

        // ── GASTOS FIJOS ──
        const loadFijos = async () => {
            try {
                const snap = await getDocs(colFijos());
                this.gastosFijos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { this.gastosFijos = []; }
            this._renderFijosLista({ deleteDoc, doc, db, uid, loadFijos });
            this._renderTransStats();
        };

        document.getElementById('fijo-btn-nuevo')?.addEventListener('click', () => {
            this._resetFijoForm();
            document.getElementById('fijo-form-wrapper')?.classList.remove('hidden');
        });
        document.getElementById('fijo-btn-cancelar')?.addEventListener('click', () => {
            document.getElementById('fijo-form-wrapper')?.classList.add('hidden');
            this.editingGastoId = null;
        });
        document.getElementById('fijo-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre  = document.getElementById('fijo-nombre').value.trim();
            const importe = parseFloat(document.getElementById('fijo-importe').value);
            if (!nombre || !importe) return;
            const data = {
                nombre, importe,
                categoria: document.getElementById('fijo-categoria').value.trim(),
                dia:       parseInt(document.getElementById('fijo-dia').value) || 1,
                updatedAt: serverTimestamp()
            };
            try {
                if (this.editingGastoId) {
                    await updateDoc(doc(db, 'users', uid, 'gastosFijos', this.editingGastoId), data);
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(colFijos(), data);
                }
                document.getElementById('fijo-form-wrapper')?.classList.add('hidden');
                this.editingGastoId = null;
                await loadFijos();
                this.navManager?.showNotification('✓ Gasto fijo guardado', 'success');
            } catch (err) { alert('Error: ' + err.message); }
        });

        // ── TARIFAS ──
        const loadTarifas = async () => {
            try {
                const snap = await getDocs(colTarifa());
                this.tarifas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { this.tarifas = []; }
            this._renderTarifaLista({ deleteDoc, doc, db, uid, loadTarifas });
            this._renderAtajos();
        };

        document.getElementById('tarifa-btn-nuevo')?.addEventListener('click', () => {
            this._resetTarifaForm();
            document.getElementById('tarifa-form-wrapper')?.classList.remove('hidden');
        });
        document.getElementById('tarifa-btn-cancelar')?.addEventListener('click', () => {
            document.getElementById('tarifa-form-wrapper')?.classList.add('hidden');
            this.editingTarifaId = null;
        });
        document.getElementById('tarifa-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('tarifa-nombre').value.trim();
            const precio = parseFloat(document.getElementById('tarifa-precio').value);
            if (!nombre || !precio) return;
            const data = { nombre, precio, updatedAt: serverTimestamp() };
            try {
                if (this.editingTarifaId) {
                    await updateDoc(doc(db, 'users', uid, 'tarifas', this.editingTarifaId), data);
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(colTarifa(), data);
                }
                document.getElementById('tarifa-form-wrapper')?.classList.add('hidden');
                this.editingTarifaId = null;
                await loadTarifas();
                this.navManager?.showNotification('✓ Servicio guardado', 'success');
            } catch (err) { alert('Error: ' + err.message); }
        });

        this._loadTrans   = loadTrans;
        this._loadFijos   = loadFijos;
        this._loadTarifas = loadTarifas;
        await Promise.all([loadTrans(), loadFijos(), loadTarifas()]);
    }

    destroy() {
        this._destroyed = true;
        delete window._contMgr;
    }

    // ─── Helpers privados ─────────────────────────────────────────────────────

    _showForm(factura) {
        this.editingId = factura ? factura.id : null;
        const today = new Date().toISOString().split('T')[0];
        const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        document.getElementById('cont-form-titulo').textContent = factura ? `Editar ${factura.numero || 'factura'}` : 'Nueva factura';
        document.getElementById('cont-f-cliente-nombre').value    = factura?.cliente?.nombre    || '';
        document.getElementById('cont-f-cliente-email').value     = factura?.cliente?.email     || '';
        document.getElementById('cont-f-cliente-nif').value       = factura?.cliente?.nif       || '';
        document.getElementById('cont-f-cliente-dir').value       = factura?.cliente?.direccion || '';
        document.getElementById('cont-f-fecha-emision').value     = factura?.fechaEmision       || today;
        document.getElementById('cont-f-fecha-vencimiento').value = factura?.fechaVencimiento   || in30;
        document.getElementById('cont-f-estado').value            = factura?.estado             || 'borrador';
        document.getElementById('cont-f-iva').value               = factura?.impuesto           ?? 21;
        document.getElementById('cont-f-notas').value             = factura?.notas              || '';
        const pdfBtn = document.getElementById('cont-btn-pdf');
        if (pdfBtn) pdfBtn.disabled = !factura;

        this.conceptos = factura ? (factura.conceptos || []).map(c => ({ ...c })) : [];
        if (!factura) this._addConcepto();
        else this._renderConceptos();

        document.getElementById('cont-form-wrapper').classList.remove('hidden');
        document.getElementById('cont-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    _hideForm() {
        document.getElementById('cont-form-wrapper')?.classList.add('hidden');
        this.editingId = null;
        this.conceptos = [];
    }

    _rellenarFiltroMes() {
        const sel = document.getElementById('trans-filtro-mes');
        if (!sel) return;
        const meses = new Set();
        this.transacciones.forEach(t => { if (t.fecha) meses.add(t.fecha.substring(0, 7)); });
        const sorted = [...meses].sort().reverse();
        const hoy = new Date().toISOString().substring(0, 7);
        sel.innerHTML = `<option value="">Todo</option>` + sorted.map(m => {
            const [y, mo] = m.split('-');
            const label = new Date(y, parseInt(mo) - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            return `<option value="${m}" ${m === hoy ? 'selected' : ''}>${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
        }).join('');
    }

    _renderAtajos() {
        const cont = document.getElementById('caja-atajos');
        if (!cont) return;
        const label = cont.querySelector('p');
        cont.innerHTML = '';
        if (label) cont.appendChild(label);
        this.tarifas.forEach(t => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgba(43,147,166,0.4)] text-[#38BDF8] bg-[rgba(43,147,166,0.08)] hover:bg-[rgba(43,147,166,0.2)] transition';
            btn.innerHTML = `${this._escHtml(t.nombre)} — ${this._fmtEur(t.precio)}`;
            btn.addEventListener('click', () => {
                document.getElementById('trans-concepto').value = t.nombre;
                document.getElementById('trans-importe').value  = t.precio;
                document.getElementById('trans-tipo').value     = 'ingreso';
                // Refrescar visual del toggle
                const btnI = document.getElementById('trans-tipo-ingreso');
                const btnG = document.getElementById('trans-tipo-gasto');
                btnI?.classList.add('border-emerald-500/60','bg-emerald-500/20','text-emerald-300');
                btnI?.classList.remove('border-[rgba(255,255,255,0.1)]','text-slate-500');
                btnG?.classList.remove('border-red-500/60','bg-red-500/20','text-red-300');
                btnG?.classList.add('border-[rgba(255,255,255,0.1)]','text-slate-500');
                document.getElementById('trans-importe')?.focus();
            });
            cont.appendChild(btn);
        });
        if (!this.tarifas.length) {
            const p = document.createElement('p');
            p.className = 'text-xs text-slate-500';
            p.textContent = 'Añade servicios en la pestaña «Tarifa servicios» para acceder a ellos rápidamente.';
            cont.appendChild(p);
        }
    }

    _renderTransStats() {
        const filtroMes = document.getElementById('trans-filtro-mes')?.value || '';
        const trans = filtroMes
            ? this.transacciones.filter(t => (t.fecha || '').startsWith(filtroMes))
            : this.transacciones;
        let ingresos = 0, gastos = 0;
        trans.forEach(t => {
            const v = parseFloat(t.importe) || 0;
            if (t.tipo === 'ingreso') ingresos += v; else gastos += v;
        });
        const totalFijos = this.gastosFijos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0);
        const balance = ingresos - gastos - (filtroMes ? totalFijos : 0);
        const fmt = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const el = id => document.getElementById(id);
        if (el('trans-stat-ingresos')) el('trans-stat-ingresos').textContent = fmt(ingresos);
        if (el('trans-stat-gastos'))   el('trans-stat-gastos').textContent   = fmt(gastos);
        if (el('trans-stat-fijos'))    el('trans-stat-fijos').textContent    = fmt(totalFijos);
        if (el('trans-stat-balance')) {
            el('trans-stat-balance').textContent = fmt(Math.abs(balance));
            el('trans-stat-balance').className = 'text-2xl font-bold mt-1 ' + (balance >= 0 ? 'text-emerald-400' : 'text-red-400');
        }
    }

    _renderTransLista({ deleteDoc, doc, db, uid, loadTrans }) {
        const lista = document.getElementById('trans-lista');
        if (!lista) return;
        const filtroMes = document.getElementById('trans-filtro-mes')?.value || '';
        const trans = filtroMes
            ? this.transacciones.filter(t => (t.fecha || '').startsWith(filtroMes))
            : this.transacciones;
        if (!trans.length) {
            lista.innerHTML = '<p class="text-slate-500 text-sm p-6 text-center">No hay movimientos en este período.</p>';
            return;
        }
        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        lista.innerHTML = trans.map(t => {
            const esI = t.tipo === 'ingreso';
            return `
            <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(43,147,166,0.04)] transition">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="text-lg">${esI ? '🟢' : '🔴'}</span>
                    <div class="min-w-0">
                        <p class="font-semibold text-white text-sm truncate">${this._escHtml(t.concepto||'—')}</p>
                        <p class="text-xs text-slate-500">${t.fecha||''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <p class="text-base font-bold ${esI?'text-emerald-400':'text-red-400'}">${esI?'+':'-'}${fmt(t.importe)}</p>
                    <button data-trans-edit="${t.id}" class="text-xs border border-[rgba(43,147,166,0.3)] px-2 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">✏️</button>
                    <button data-trans-del="${t.id}" class="text-xs border border-red-500/20 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">🗑</button>
                </div>
            </div>`;
        }).join('');

        lista.querySelectorAll('[data-trans-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = this.transacciones.find(x => x.id === btn.dataset.transEdit);
                if (!t) return;
                this.editingTransId = t.id;
                document.getElementById('trans-form-titulo').textContent = 'Editar movimiento';
                document.getElementById('trans-concepto').value = t.concepto || '';
                document.getElementById('trans-importe').value  = t.importe  || '';
                document.getElementById('trans-fecha').value    = t.fecha    || '';
                document.getElementById('trans-tipo').value     = t.tipo     || 'ingreso';
                // Refrescar toggle visual
                const btnI = document.getElementById('trans-tipo-ingreso');
                const btnG = document.getElementById('trans-tipo-gasto');
                if (t.tipo === 'ingreso') {
                    btnI?.classList.add('border-emerald-500/60','bg-emerald-500/20','text-emerald-300');
                    btnI?.classList.remove('border-[rgba(255,255,255,0.1)]','text-slate-500');
                    btnG?.classList.remove('border-red-500/60','bg-red-500/20','text-red-300');
                    btnG?.classList.add('border-[rgba(255,255,255,0.1)]','text-slate-500');
                } else {
                    btnG?.classList.add('border-red-500/60','bg-red-500/20','text-red-300');
                    btnG?.classList.remove('border-[rgba(255,255,255,0.1)]','text-slate-500');
                    btnI?.classList.remove('border-emerald-500/60','bg-emerald-500/20','text-emerald-300');
                    btnI?.classList.add('border-[rgba(255,255,255,0.1)]','text-slate-500');
                }
                document.getElementById('trans-concepto')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
        lista.querySelectorAll('[data-trans-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este movimiento?')) return;
                try {
                    await deleteDoc(doc(db, 'users', uid, 'finanzas', btn.dataset.transDel));
                    await loadTrans();
                    this.navManager?.showNotification('Movimiento eliminado', 'info');
                } catch (err) { alert('Error al eliminar: ' + err.message); }
            });
        });
    }

    _renderFijosLista({ deleteDoc, doc, db, uid, loadFijos }) {
        const lista = document.getElementById('fijos-lista');
        if (!lista) return;
        if (!this.gastosFijos.length) {
            lista.innerHTML = '<p class="text-slate-500 text-sm p-6 text-center">No hay gastos fijos. Añade alquiler, luz, nóminas...</p>';
            return;
        }
        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        const total = this.gastosFijos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0);
        lista.innerHTML = this.gastosFijos.map(g => `
            <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition">
                <div class="min-w-0">
                    <p class="font-semibold text-white text-sm">${this._escHtml(g.nombre||'—')}</p>
                    <p class="text-xs text-slate-500">${this._escHtml(g.categoria||'')}${g.dia ? ' · Día ' + g.dia : ''}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <p class="text-base font-bold text-amber-400">${fmt(g.importe)}/mes</p>
                    <button data-fijo-edit="${g.id}" class="text-xs border border-[rgba(43,147,166,0.3)] px-2 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">✏️</button>
                    <button data-fijo-del="${g.id}" class="text-xs border border-red-500/20 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">🗑</button>
                </div>
            </div>`).join('') +
            `<div class="flex justify-between items-center px-4 py-3 bg-[rgba(255,255,255,0.04)] border-t border-[rgba(255,255,255,0.06)]">
                <span class="text-sm font-bold text-slate-300">Total gastos fijos</span>
                <span class="text-lg font-black text-amber-400">${fmt(total)}/mes</span>
            </div>`;

        lista.querySelectorAll('[data-fijo-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const g = this.gastosFijos.find(x => x.id === btn.dataset.fijoEdit);
                if (!g) return;
                this.editingGastoId = g.id;
                document.getElementById('fijo-form-titulo').textContent = 'Editar gasto fijo';
                document.getElementById('fijo-edit-id').value    = g.id;
                document.getElementById('fijo-nombre').value     = g.nombre    || '';
                document.getElementById('fijo-importe').value    = g.importe   || '';
                document.getElementById('fijo-categoria').value  = g.categoria || '';
                document.getElementById('fijo-dia').value        = g.dia       || '';
                document.getElementById('fijo-form-wrapper')?.classList.remove('hidden');
            });
        });
        lista.querySelectorAll('[data-fijo-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este gasto fijo?')) return;
                try {
                    await deleteDoc(doc(db, 'users', uid, 'gastosFijos', btn.dataset.fijoDel));
                    await loadFijos();
                    this.navManager?.showNotification('Gasto fijo eliminado', 'info');
                } catch (err) { alert('Error: ' + err.message); }
            });
        });
    }

    _renderTarifaLista({ deleteDoc, doc, db, uid, loadTarifas }) {
        const lista = document.getElementById('tarifa-lista');
        if (!lista) return;
        if (!this.tarifas.length) {
            lista.innerHTML = '<p class="text-slate-500 text-sm p-6 text-center">No hay servicios definidos todavía.</p>';
            return;
        }
        const fmt = n => (parseFloat(n)||0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        lista.innerHTML = this.tarifas.map(t => `
            <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition">
                <p class="font-semibold text-white text-sm">${this._escHtml(t.nombre||'—')}</p>
                <div class="flex items-center gap-2">
                    <p class="text-base font-bold text-[#38BDF8]">${fmt(t.precio)}</p>
                    <button data-tarifa-edit="${t.id}" class="text-xs border border-[rgba(43,147,166,0.3)] px-2 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">✏️</button>
                    <button data-tarifa-del="${t.id}" class="text-xs border border-red-500/20 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">🗑</button>
                </div>
            </div>`).join('');

        lista.querySelectorAll('[data-tarifa-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = this.tarifas.find(x => x.id === btn.dataset.tarifaEdit);
                if (!t) return;
                this.editingTarifaId = t.id;
                document.getElementById('tarifa-form-titulo').textContent = 'Editar servicio';
                document.getElementById('tarifa-edit-id').value  = t.id;
                document.getElementById('tarifa-nombre').value   = t.nombre || '';
                document.getElementById('tarifa-precio').value   = t.precio || '';
                document.getElementById('tarifa-form-wrapper')?.classList.remove('hidden');
            });
        });
        lista.querySelectorAll('[data-tarifa-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este servicio?')) return;
                try {
                    await deleteDoc(doc(db, 'users', uid, 'tarifas', btn.dataset.tarifaDel));
                    await loadTarifas();
                    this.navManager?.showNotification('Servicio eliminado', 'info');
                } catch (err) { alert('Error: ' + err.message); }
            });
        });
    }

    _resetFijoForm() {
        this.editingGastoId = null;
        document.getElementById('fijo-form-titulo').textContent = 'Nuevo gasto fijo';
        document.getElementById('fijo-form')?.reset();
    }

    _resetTarifaForm() {
        this.editingTarifaId = null;
        document.getElementById('tarifa-form-titulo').textContent = 'Nuevo servicio';
        document.getElementById('tarifa-form')?.reset();
    }

    _addConcepto(desc = '', qty = 1, precio = 0) {
        this.conceptos.push({ descripcion: desc, cantidad: qty, precioUnitario: precio, subtotal: qty * precio });
        this._renderConceptos();
    }

    _removeConcepto(index) {
        this.conceptos.splice(index, 1);
        this._renderConceptos();
    }

    _updateConcepto(index, field, value) {
        if (field === 'descripcion') {
            this.conceptos[index][field] = value;
        } else {
            this.conceptos[index][field] = parseFloat(value) || 0;
        }
        this.conceptos[index].subtotal = this.conceptos[index].cantidad * this.conceptos[index].precioUnitario;
        this._updateTotals();
    }

    _renderConceptos() {
        const tbody = document.getElementById('cont-conceptos-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.conceptos.forEach((c, i) => {
            const tr = document.createElement('tr');
            tr.className = 'border-t border-[rgba(255,255,255,0.06)]';
            tr.innerHTML = `
              <td class="px-3 py-2">
                <input type="text" value="${this._esc(c.descripcion)}" data-i="${i}" data-f="descripcion"
                  placeholder="Descripción" class="w-full px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-md text-sm focus:outline-none focus:border-[#2B93A6]">
              </td>
              <td class="px-3 py-2">
                <input type="number" value="${c.cantidad}" min="1" data-i="${i}" data-f="cantidad"
                  class="w-16 px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-md text-sm text-right focus:outline-none focus:border-[#2B93A6]">
              </td>
              <td class="px-3 py-2">
                <input type="number" value="${c.precioUnitario}" min="0" step="0.01" data-i="${i}" data-f="precioUnitario"
                  class="w-24 px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded-md text-sm text-right focus:outline-none focus:border-[#2B93A6]">
              </td>
              <td class="px-3 py-2 text-right font-semibold text-white whitespace-nowrap" data-subtotal="${i}">${this._fmtEur(c.subtotal)}</td>
              <td class="px-3 py-2 text-center">
                <button type="button" data-del="${i}" class="text-red-400 hover:text-red-300 text-sm px-1">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>`;
            tbody.appendChild(tr);
        });
        this._updateTotals();
    }

    _updateTotals() {
        const iva       = parseFloat(document.getElementById('cont-f-iva')?.value) || 0;
        const base      = this.conceptos.reduce((s, c) => s + c.subtotal, 0);
        const ivaAmount = base * (iva / 100);

        this.conceptos.forEach((c, i) => {
            const cell = document.querySelector(`[data-subtotal="${i}"]`);
            if (cell) cell.textContent = this._fmtEur(c.subtotal);
        });
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('cont-t-base',      this._fmtEur(base));
        set('cont-t-iva-label', `IVA (${iva}%)`);
        set('cont-t-iva',       this._fmtEur(ivaAmount));
        set('cont-t-total',     this._fmtEur(base + ivaAmount));
    }

    _renderLista() {
        const container = document.getElementById('cont-facturas-lista');
        if (!container) return;
        const filtro   = document.getElementById('cont-filtro-estado')?.value || '';
        const filtered = filtro ? this.facturas.filter(f => f.estado === filtro) : this.facturas;

        const estadoClasses = {
            borrador: 'bg-slate-500/20 text-slate-300',
            emitida:  'bg-[rgba(43,147,166,0.2)] text-[#38BDF8]',
            pagada:   'bg-emerald-500/20 text-emerald-300',
            vencida:  'bg-red-500/20 text-red-300'
        };

        if (!filtered.length) {
            container.innerHTML = `
              <div class="flex flex-col items-center gap-2 py-10 text-slate-500">
                <i class="fas fa-file-invoice text-4xl"></i>
                <p class="text-sm">${filtro ? 'No hay facturas con este estado.' : '¡Sin facturas todavía! Crea la primera.'}</p>
              </div>`;
            return;
        }

        container.innerHTML = filtered.map(f => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(43,147,166,0.06)] transition last:border-0">
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-bold text-[#38BDF8]">${this._escHtml(f.numero || '—')}</span>
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${estadoClasses[f.estado] || 'bg-slate-500/20 text-slate-300'}">${f.estado}</span>
              </div>
              <p class="text-sm font-semibold text-white truncate">${this._escHtml(f.cliente?.nombre || '—')}</p>
              <p class="text-xs text-slate-500">${f.fechaEmision || '—'}${f.fechaVencimiento ? ' · Vence: ' + f.fechaVencimiento : ''}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-base font-bold text-white">${this._fmtEur(f.total || 0)}</span>
              <div class="flex gap-1">
                <button onclick="window._contMgr._showForm(window._contMgr.facturas.find(x=>x.id==='${f.id}'))"
                  class="border border-[rgba(43,147,166,0.4)] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">
                  <i class="fas fa-pencil-alt mr-1"></i> Editar
                </button>
                <button onclick="window._contMgr._generatePDF(window._contMgr.facturas.find(x=>x.id==='${f.id}'))"
                  class="border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition">
                  <i class="fas fa-file-pdf mr-1"></i> PDF
                </button>
                <button onclick="window._contMgr._deleteFactura('${f.id}')"
                  class="border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('');
    }

    _renderStats() {
        const emitidas = this.facturas.filter(f => f.estado === 'emitida');
        const pagadas  = this.facturas.filter(f => f.estado === 'pagada');
        const vencidas = this.facturas.filter(f => f.estado === 'vencida');

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('cont-stat-total',     this.facturas.length);
        set('cont-stat-pendiente', this._fmtEur(emitidas.reduce((s, f) => s + (f.total || 0), 0)));
        set('cont-stat-cobrado',   this._fmtEur(pagadas.reduce((s, f) => s + (f.total || 0), 0)));
        set('cont-stat-vencidas',  vencidas.length);
    }

    // ─── Generación PDF ────────────────────────────────────────────────────────
    _generatePDF(factura) {
        if (!window.jspdf?.jsPDF) {
            alert('La librería de PDF no está disponible. Asegúrate de cargar jsPDF.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const pdfdoc    = new jsPDF({ unit: 'mm', format: 'a4' });

        const blue  = [37, 99, 235];
        const dark  = [15, 23, 42];
        const gray  = [100, 116, 139];
        let y = 20;

        // Cabecera
        pdfdoc.setFillColor(...blue);
        pdfdoc.rect(0, 0, 210, 35, 'F');
        pdfdoc.setFont('helvetica', 'bold');
        pdfdoc.setFontSize(22);
        pdfdoc.setTextColor(255, 255, 255);
        pdfdoc.text('FACTURA', 15, 16);
        pdfdoc.setFontSize(10);
        pdfdoc.setFont('helvetica', 'normal');
        pdfdoc.text(factura.numero || '—', 15, 24);
        pdfdoc.text(factura.fechaEmision || '—', 195, 16, { align: 'right' });
        if (factura.fechaVencimiento) pdfdoc.text(`Vence: ${factura.fechaVencimiento}`, 195, 24, { align: 'right' });

        y = 48;

        // Datos cliente
        pdfdoc.setFillColor(248, 250, 252);
        pdfdoc.rect(15, y - 5, 85, 30, 'F');
        pdfdoc.setFont('helvetica', 'bold');
        pdfdoc.setFontSize(8);
        pdfdoc.setTextColor(...gray);
        pdfdoc.text('CLIENTE', 18, y);
        y += 5;
        pdfdoc.setFont('helvetica', 'bold');
        pdfdoc.setFontSize(10);
        pdfdoc.setTextColor(...dark);
        pdfdoc.text(factura.cliente?.nombre || '—', 18, y);
        y += 5;
        pdfdoc.setFont('helvetica', 'normal');
        pdfdoc.setFontSize(9);
        pdfdoc.setTextColor(...gray);
        if (factura.cliente?.nif)       { pdfdoc.text(`NIF: ${factura.cliente.nif}`, 18, y); y += 5; }
        if (factura.cliente?.email)     { pdfdoc.text(factura.cliente.email, 18, y); y += 5; }
        if (factura.cliente?.direccion) { pdfdoc.text(factura.cliente.direccion, 18, y); y += 5; }

        y = 88;

        // Tabla conceptos
        pdfdoc.setFillColor(...blue);
        pdfdoc.rect(15, y - 5, 180, 10, 'F');
        pdfdoc.setFont('helvetica', 'bold');
        pdfdoc.setFontSize(8);
        pdfdoc.setTextColor(255, 255, 255);
        pdfdoc.text('DESCRIPCIÓN', 18, y);
        pdfdoc.text('CANT.', 118, y, { align: 'right' });
        pdfdoc.text('PRECIO', 155, y, { align: 'right' });
        pdfdoc.text('SUBTOTAL', 193, y, { align: 'right' });

        y += 7;
        pdfdoc.setFont('helvetica', 'normal');
        pdfdoc.setTextColor(...dark);

        (factura.conceptos || []).forEach((c, idx) => {
            if (y > 255) { pdfdoc.addPage(); y = 20; }
            if (idx % 2 === 0) {
                pdfdoc.setFillColor(248, 250, 252);
                pdfdoc.rect(15, y - 5, 180, 8, 'F');
            }
            pdfdoc.setFontSize(9);
            const lines = pdfdoc.splitTextToSize(c.descripcion || '—', 95);
            pdfdoc.text(lines, 18, y);
            pdfdoc.text(String(c.cantidad), 118, y, { align: 'right' });
            pdfdoc.text(this._fmtEur(c.precioUnitario), 155, y, { align: 'right' });
            pdfdoc.text(this._fmtEur(c.subtotal), 193, y, { align: 'right' });
            y += Math.max(8, lines.length * 5);
        });

        // Totales
        y += 6;
        pdfdoc.setDrawColor(226, 232, 240);
        pdfdoc.line(130, y, 195, y);
        y += 6;

        const iva       = factura.impuesto || 0;
        const ivaAmount = (factura.subtotal || 0) * (iva / 100);

        pdfdoc.setFontSize(9);
        pdfdoc.setTextColor(...gray);
        pdfdoc.text('Base imponible:', 132, y);
        pdfdoc.setTextColor(...dark);
        pdfdoc.text(this._fmtEur(factura.subtotal || 0), 193, y, { align: 'right' });
        y += 7;

        pdfdoc.setTextColor(...gray);
        pdfdoc.text(`IVA (${iva}%):`, 132, y);
        pdfdoc.setTextColor(...dark);
        pdfdoc.text(this._fmtEur(ivaAmount), 193, y, { align: 'right' });
        y += 3;

        pdfdoc.line(130, y, 195, y);
        y += 6;

        pdfdoc.setFillColor(...blue);
        pdfdoc.rect(130, y - 5, 65, 11, 'F');
        pdfdoc.setFont('helvetica', 'bold');
        pdfdoc.setFontSize(11);
        pdfdoc.setTextColor(255, 255, 255);
        pdfdoc.text('TOTAL', 133, y + 2);
        pdfdoc.text(this._fmtEur(factura.total || 0), 193, y + 2, { align: 'right' });

        if (factura.notas) {
            y += 18;
            pdfdoc.setFont('helvetica', 'bold');
            pdfdoc.setFontSize(8);
            pdfdoc.setTextColor(...gray);
            pdfdoc.text('NOTAS', 15, y);
            y += 5;
            pdfdoc.setFont('helvetica', 'normal');
            pdfdoc.setFontSize(9);
            pdfdoc.setTextColor(...dark);
            pdfdoc.text(pdfdoc.splitTextToSize(factura.notas, 170), 15, y);
        }

        pdfdoc.setFontSize(8);
        pdfdoc.setTextColor(...gray);
        pdfdoc.text('Generado por NODE · ' + new Date().toLocaleDateString('es-ES'), 105, 288, { align: 'center' });

        pdfdoc.save(`${factura.numero || 'factura'}.pdf`);
    }

    // ─── Utilidades ───────────────────────────────────────────────────────────
    _fmtEur(n) {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
    }
    _escHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    _esc(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

// ─── Auto-init para la página standalone contabilidad.html ───────────────────
// Si no hay navigationManager (no estamos en el SPA), inicializar directamente.
document.addEventListener('appReady', async () => {
    if (window.navManager) return; // El SPA lo gestiona
    const container = document.getElementById('cont-standalone');
    if (!container) return;
    const mgr = new ContabilidadManager(null);
    container.innerHTML = mgr.render();
    await mgr.setupListeners();
});
