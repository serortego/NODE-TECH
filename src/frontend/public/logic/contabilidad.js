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
        this.navManager  = navigationManager;
        this.facturas    = [];
        this.editingId   = null;
        this.conceptos   = [];
        this._destroyed  = false;
    }

    // ─── Render HTML ──────────────────────────────────────────────────────────
    render() {
        return `
        <div id="cont-root" class="space-y-4">

            <!-- Cabecera -->
            <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <div>
                    <h1 class="text-2xl font-bold text-white">Contabilidad</h1>
                    <p class="text-sm text-slate-400 mt-0.5">Gestión de facturas y cobros</p>
                </div>
                <button id="cont-btn-nueva"
                    class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i class="fas fa-plus"></i> Nueva factura
                </button>
            </div>

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

        // ── Eventos del formulario ──
        document.getElementById('cont-btn-nueva')?.addEventListener('click', () => this._showForm(null));
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
    if (window.navigationManager) return; // El SPA lo gestiona
    const container = document.getElementById('cont-standalone');
    if (!container) return;
    const mgr = new ContabilidadManager(null);
    container.innerHTML = mgr.render();
    await mgr.setupListeners();
});
