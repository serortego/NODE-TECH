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
            <div class="flex items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Contabilidad</h1>
                    <p class="text-sm text-gray-500 mt-0.5">Gestión de facturas y cobros</p>
                </div>
                <button id="cont-btn-nueva"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                    <i class="fas fa-plus"></i> Nueva factura
                </button>
            </div>

            <!-- KPIs -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p class="text-xs text-gray-500 font-medium uppercase">Total facturas</p>
                    <p class="text-2xl font-bold text-gray-900 mt-1" id="cont-stat-total">—</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p class="text-xs text-gray-500 font-medium uppercase">Pendiente</p>
                    <p class="text-2xl font-bold text-blue-600 mt-1" id="cont-stat-pendiente">—</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p class="text-xs text-gray-500 font-medium uppercase">Cobrado</p>
                    <p class="text-2xl font-bold text-green-600 mt-1" id="cont-stat-cobrado">—</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p class="text-xs text-gray-500 font-medium uppercase">Vencidas</p>
                    <p class="text-2xl font-bold text-red-500 mt-1" id="cont-stat-vencidas">—</p>
                </div>
            </div>

            <!-- Formulario nueva/editar factura (oculto por defecto) -->
            <div id="cont-form-wrapper" class="hidden bg-white rounded-lg p-5 border border-blue-200 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base font-bold text-gray-800" id="cont-form-titulo">Nueva factura</h2>
                    <button id="cont-btn-cancelar"
                        class="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                        <i class="fas fa-times mr-1"></i> Cancelar
                    </button>
                </div>

                <!-- Datos cliente -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Cliente *</label>
                        <input type="text" id="cont-f-cliente-nombre" placeholder="Nombre o empresa"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Email cliente</label>
                        <input type="email" id="cont-f-cliente-email" placeholder="cliente@empresa.com"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">NIF / CIF</label>
                        <input type="text" id="cont-f-cliente-nif" placeholder="B12345678"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
                        <input type="text" id="cont-f-cliente-dir" placeholder="Calle, número, ciudad"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <!-- Fechas y estado -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Fecha emisión *</label>
                        <input type="date" id="cont-f-fecha-emision"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Fecha vencimiento</label>
                        <input type="date" id="cont-f-fecha-vencimiento"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Estado</label>
                        <select id="cont-f-estado"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="borrador">Borrador</option>
                            <option value="emitida">Emitida</option>
                            <option value="pagada">Pagada</option>
                            <option value="vencida">Vencida</option>
                        </select>
                    </div>
                </div>

                <!-- Conceptos -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-semibold text-gray-700 uppercase">Conceptos *</label>
                        <button id="cont-btn-add-concepto" type="button"
                            class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-semibold transition">
                            <i class="fas fa-plus mr-1"></i> Añadir línea
                        </button>
                    </div>
                    <div class="overflow-x-auto rounded-lg border border-gray-200">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
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
                        <label class="text-sm font-semibold text-gray-600">IVA (%)</label>
                        <input type="number" id="cont-f-iva" min="0" max="100" value="21"
                            class="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 w-64 space-y-1 text-sm">
                        <div class="flex justify-between text-gray-600">
                            <span>Base imponible</span><span id="cont-t-base">0,00 €</span>
                        </div>
                        <div class="flex justify-between text-gray-600">
                            <span id="cont-t-iva-label">IVA (21%)</span><span id="cont-t-iva">0,00 €</span>
                        </div>
                        <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                            <span>Total</span><span id="cont-t-total">0,00 €</span>
                        </div>
                    </div>
                </div>

                <!-- Notas -->
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
                    <textarea id="cont-f-notas" rows="2"
                        placeholder="Condiciones de pago, información adicional..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>

                <!-- Acciones -->
                <div class="flex gap-2 flex-wrap">
                    <button id="cont-btn-guardar"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-save"></i> Guardar borrador
                    </button>
                    <button id="cont-btn-guardar-emitir"
                        class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-paper-plane"></i> Guardar y emitir
                    </button>
                    <button id="cont-btn-pdf" disabled
                        class="border border-gray-300 bg-white text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
                        <i class="fas fa-file-pdf text-red-500"></i> Exportar PDF
                    </button>
                </div>
            </div>

            <!-- Filtro + lista -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
                    <h2 class="text-base font-bold text-gray-800">Historial de facturas</h2>
                    <select id="cont-filtro-estado"
                        class="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Todos los estados</option>
                        <option value="borrador">Borrador</option>
                        <option value="emitida">Emitida</option>
                        <option value="pagada">Pagada</option>
                        <option value="vencida">Vencida</option>
                    </select>
                </div>
                <div id="cont-facturas-lista">
                    <p class="text-gray-400 text-sm p-6 text-center">
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
            tr.className = 'border-t border-gray-100';
            tr.innerHTML = `
              <td class="px-3 py-2">
                <input type="text" value="${this._esc(c.descripcion)}" data-i="${i}" data-f="descripcion"
                  placeholder="Descripción" class="w-full px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500">
              </td>
              <td class="px-3 py-2">
                <input type="number" value="${c.cantidad}" min="1" data-i="${i}" data-f="cantidad"
                  class="w-16 px-2 py-1 border border-gray-200 rounded-md text-sm text-right focus:outline-none focus:border-blue-500">
              </td>
              <td class="px-3 py-2">
                <input type="number" value="${c.precioUnitario}" min="0" step="0.01" data-i="${i}" data-f="precioUnitario"
                  class="w-24 px-2 py-1 border border-gray-200 rounded-md text-sm text-right focus:outline-none focus:border-blue-500">
              </td>
              <td class="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap" data-subtotal="${i}">${this._fmtEur(c.subtotal)}</td>
              <td class="px-3 py-2 text-center">
                <button type="button" data-del="${i}" class="text-red-400 hover:text-red-600 text-sm px-1">
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
            borrador: 'bg-gray-100 text-gray-600',
            emitida:  'bg-blue-100 text-blue-700',
            pagada:   'bg-green-100 text-green-700',
            vencida:  'bg-red-100 text-red-600'
        };

        if (!filtered.length) {
            container.innerHTML = `
              <div class="flex flex-col items-center gap-2 py-10 text-gray-400">
                <i class="fas fa-file-invoice text-4xl"></i>
                <p class="text-sm">${filtro ? 'No hay facturas con este estado.' : '¡Sin facturas todavía! Crea la primera.'}</p>
              </div>`;
            return;
        }

        container.innerHTML = filtered.map(f => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition last:border-0">
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-bold text-blue-700">${this._escHtml(f.numero || '—')}</span>
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${estadoClasses[f.estado] || 'bg-gray-100 text-gray-600'}">${f.estado}</span>
              </div>
              <p class="text-sm font-semibold text-gray-900 truncate">${this._escHtml(f.cliente?.nombre || '—')}</p>
              <p class="text-xs text-gray-400">${f.fechaEmision || '—'}${f.fechaVencimiento ? ' · Vence: ' + f.fechaVencimiento : ''}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-base font-bold text-gray-900">${this._fmtEur(f.total || 0)}</span>
              <div class="flex gap-1">
                <button onclick="window._contMgr._showForm(window._contMgr.facturas.find(x=>x.id==='${f.id}'))"
                  class="border border-gray-200 bg-white px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                  <i class="fas fa-pencil-alt mr-1"></i> Editar
                </button>
                <button onclick="window._contMgr._generatePDF(window._contMgr.facturas.find(x=>x.id==='${f.id}'))"
                  class="border border-red-100 bg-red-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-100 transition">
                  <i class="fas fa-file-pdf mr-1"></i> PDF
                </button>
                <button onclick="window._contMgr._deleteFactura('${f.id}')"
                  class="border border-gray-200 bg-white px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition">
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

// ─── Estado ───────────────────────────────────────────────────────────────────
let uid = null;
let facturas = [];
let editingId = null;
let conceptos = [];

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const listaEl           = document.getElementById('lista-facturas');
const formEl            = document.getElementById('form-factura');
const facturasContainer = document.getElementById('facturas-container');
const btnNueva          = document.getElementById('btn-nueva-factura');
const btnCancelar       = document.getElementById('btn-cancelar');
const btnGuardar        = document.getElementById('btn-guardar');
const btnGuardarEmitir  = document.getElementById('btn-guardar-emitir');
const btnPdf            = document.getElementById('btn-pdf-preview');
const btnAddConcepto    = document.getElementById('btn-add-concepto');
const conceptosBody     = document.getElementById('conceptos-body');
const filtroEstado      = document.getElementById('filtro-estado');
const editingIdEl       = document.getElementById('editing-id');

// Form fields
const fClienteNombre    = document.getElementById('f-cliente-nombre');
const fClienteEmail     = document.getElementById('f-cliente-email');
const fClienteNif       = document.getElementById('f-cliente-nif');
const fClienteDir       = document.getElementById('f-cliente-dir');
const fFechaEmision     = document.getElementById('f-fecha-emision');
const fFechaVencimiento = document.getElementById('f-fecha-vencimiento');
const fEstado           = document.getElementById('f-estado');
const fIva              = document.getElementById('f-iva');
const fNotas            = document.getElementById('f-notas');

// Stats
const statTotal         = document.getElementById('stat-total');
const statPendiente     = document.getElementById('stat-pendiente');
const statCobrado       = document.getElementById('stat-cobrado');
const statVencidas      = document.getElementById('stat-vencidas');

// Totales
const tBase             = document.getElementById('t-base');
const tIvaLabel         = document.getElementById('t-iva-label');
const tIva              = document.getElementById('t-iva');
const tTotal            = document.getElementById('t-total');

// ─── Firestore helpers ────────────────────────────────────────────────────────
function facturasCol() {
  return collection(db, 'users', uid, 'facturas');
}

async function fetchFacturas() {
  try {
    const q = query(facturasCol(), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    facturas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    facturas = [];
  }
  renderLista();
  renderStats();
}

async function generateNumero() {
  const year = new Date().getFullYear();
  const snap = await getDocs(facturasCol());
  const count = snap.size + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
}

async function saveFactura(estado) {
  const data = buildFacturaData(estado);
  if (!data) return;

  try {
    if (editingId) {
      const ref = doc(db, 'users', uid, 'facturas', editingId);
      await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
    } else {
      const numero = await generateNumero();
      await addDoc(facturasCol(), {
        ...data,
        numero,
        userId: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    await fetchFacturas();
    hideForm();
  } catch (err) {
    alert('Error al guardar la factura. Inténtalo de nuevo.');
    console.error(err);
  }
}

async function deleteFactura(id) {
  if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'facturas', id));
    await fetchFacturas();
  } catch {
    alert('Error al eliminar la factura.');
  }
}

// ─── Build data ───────────────────────────────────────────────────────────────
function buildFacturaData(estado) {
  const nombre = fClienteNombre.value.trim();
  if (!nombre) {
    alert('El nombre del cliente es obligatorio.');
    fClienteNombre.focus();
    return null;
  }
  if (conceptos.length === 0) {
    alert('Añade al menos un concepto antes de guardar.');
    return null;
  }

  const iva = parseFloat(fIva.value) || 0;
  const base = conceptos.reduce((sum, c) => sum + c.subtotal, 0);
  const ivaAmount = base * (iva / 100);
  const total = base + ivaAmount;

  return {
    estado,
    cliente: {
      nombre,
      email: fClienteEmail.value.trim(),
      nif:   fClienteNif.value.trim(),
      direccion: fClienteDir.value.trim()
    },
    fechaEmision:     fFechaEmision.value,
    fechaVencimiento: fFechaVencimiento.value,
    conceptos:        conceptos.map(c => ({ ...c })),
    subtotal: base,
    impuesto: iva,
    total,
    notas: fNotas.value.trim()
  };
}

// ─── Conceptos (line items) ───────────────────────────────────────────────────
function addConcepto(desc = '', qty = 1, precio = 0) {
  conceptos.push({
    descripcion:    desc,
    cantidad:       qty,
    precioUnitario: precio,
    subtotal:       qty * precio
  });
  renderConceptos();
}

function removeConcepto(index) {
  conceptos.splice(index, 1);
  renderConceptos();
}

function updateConcepto(index, field, value) {
  if (field === 'descripcion') {
    conceptos[index][field] = value;
  } else {
    conceptos[index][field] = parseFloat(value) || 0;
  }
  conceptos[index].subtotal = conceptos[index].cantidad * conceptos[index].precioUnitario;
  // Re-render only totals (no need to re-render full table on every keystroke)
  updateTotals();
}

function renderConceptos() {
  conceptosBody.innerHTML = '';
  conceptos.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-100';
    tr.innerHTML = `
      <td class="px-4 py-2">
        <input type="text" value="${escapeAttr(c.descripcion)}" data-i="${i}" data-f="descripcion"
          placeholder="Descripción del servicio"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2">
        <input type="number" value="${c.cantidad}" min="1" data-i="${i}" data-f="cantidad"
          class="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2">
        <input type="number" value="${c.precioUnitario}" min="0" step="0.01" data-i="${i}" data-f="precioUnitario"
          class="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2 text-right font-semibold text-slate-900 whitespace-nowrap" data-subtotal="${i}">${fmtEur(c.subtotal)}</td>
      <td class="px-4 py-2 text-center">
        <button type="button" data-del="${i}" class="text-red-400 hover:text-red-600 transition text-sm px-1">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    conceptosBody.appendChild(tr);
  });
  updateTotals();
}

function updateTotals() {
  const iva  = parseFloat(fIva.value) || 0;
  const base = conceptos.reduce((sum, c) => sum + c.subtotal, 0);
  const ivaAmount = base * (iva / 100);

  // Update subtotal cells without full re-render
  conceptos.forEach((c, i) => {
    const cell = conceptosBody.querySelector(`[data-subtotal="${i}"]`);
    if (cell) cell.textContent = fmtEur(c.subtotal);
  });

  tBase.textContent     = fmtEur(base);
  tIvaLabel.textContent = `IVA (${iva}%)`;
  tIva.textContent      = fmtEur(ivaAmount);
  tTotal.textContent    = fmtEur(base + ivaAmount);
}

// ─── Render lista ─────────────────────────────────────────────────────────────
function renderLista() {
  const filtro   = filtroEstado.value;
  const filtered = filtro ? facturas.filter(f => f.estado === filtro) : facturas;

  if (!filtered.length) {
    facturasContainer.innerHTML = `
      <div class="flex flex-col items-center gap-3 py-14 text-slate-400">
        <i class="fas fa-file-invoice text-4xl"></i>
        <p class="text-sm">${filtro ? 'No hay facturas con este estado.' : 'Sin facturas todavía. ¡Crea la primera!'}</p>
      </div>`;
    return;
  }

  facturasContainer.innerHTML = filtered.map(f => `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 hover:bg-blue-50 transition group">
      <div class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="font-mono text-sm font-bold text-blue-700">${escapeHtml(f.numero || '—')}</span>
          <span class="estado-${f.estado} rounded-full px-3 py-0.5 text-xs font-semibold capitalize">${f.estado}</span>
        </div>
        <p class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(f.cliente?.nombre || '—')}</p>
        <p class="text-xs text-slate-500">${f.fechaEmision || '—'}${f.fechaVencimiento ? ' · Vence: ' + f.fechaVencimiento : ''}</p>
      </div>
      <div class="flex items-center gap-4 flex-shrink-0">
        <span class="text-lg font-extrabold text-slate-900">${fmtEur(f.total || 0)}</span>
        <div class="flex gap-2">
          <button onclick="window._cont.edit('${f.id}')" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
            <i class="fas fa-pencil-alt mr-1"></i> Editar
          </button>
          <button onclick="window._cont.pdf('${f.id}')" class="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
            <i class="fas fa-file-pdf mr-1"></i> PDF
          </button>
          <button onclick="window._cont.del('${f.id}')" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderStats() {
  const emitidas = facturas.filter(f => f.estado === 'emitida');
  const pagadas  = facturas.filter(f => f.estado === 'pagada');
  const vencidas = facturas.filter(f => f.estado === 'vencida');

  statTotal.textContent     = facturas.length;
  statPendiente.textContent = fmtEur(emitidas.reduce((s, f) => s + (f.total || 0), 0));
  statCobrado.textContent   = fmtEur(pagadas.reduce((s, f) => s + (f.total || 0), 0));
  statVencidas.textContent  = vencidas.length;
}

// ─── Control del formulario ───────────────────────────────────────────────────
function showForm(factura = null) {
  editingId = factura ? factura.id : null;
  editingIdEl.value = editingId || '';

  const today = new Date().toISOString().split('T')[0];
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  if (factura) {
    document.getElementById('form-titulo').textContent = 'Editar ' + (factura.numero || 'factura');
    fClienteNombre.value    = factura.cliente?.nombre   || '';
    fClienteEmail.value     = factura.cliente?.email    || '';
    fClienteNif.value       = factura.cliente?.nif      || '';
    fClienteDir.value       = factura.cliente?.direccion || '';
    fFechaEmision.value     = factura.fechaEmision      || today;
    fFechaVencimiento.value = factura.fechaVencimiento  || in30;
    fEstado.value           = factura.estado            || 'borrador';
    fIva.value              = factura.impuesto          ?? 21;
    fNotas.value            = factura.notas             || '';
    conceptos               = (factura.conceptos || []).map(c => ({ ...c }));
    btnPdf.disabled         = false;
  } else {
    document.getElementById('form-titulo').textContent = 'Nueva factura';
    fClienteNombre.value    = '';
    fClienteEmail.value     = '';
    fClienteNif.value       = '';
    fClienteDir.value       = '';
    fFechaEmision.value     = today;
    fFechaVencimiento.value = in30;
    fEstado.value           = 'borrador';
    fIva.value              = 21;
    fNotas.value            = '';
    conceptos               = [];
    btnPdf.disabled         = true;
  }

  renderConceptos();
  formEl.classList.add('visible');
  listaEl.style.display = 'none';
  formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  formEl.classList.remove('visible');
  listaEl.style.display = '';
  editingId = null;
  conceptos = [];
}

// ─── Generación de PDF ────────────────────────────────────────────────────────
function generatePDF(factura) {
  if (!window.jspdf) { alert('La librería PDF no está disponible. Recarga la página.'); return; }
  const { jsPDF } = window.jspdf;
  const pdfdoc = new jsPDF({ unit: 'mm', format: 'a4' });

  const blue = [37, 99, 235];
  const dark = [15, 23, 42];
  const gray = [100, 116, 139];
  const light = [241, 245, 249];

  // Cabecera azul
  pdfdoc.setFillColor(...blue);
  pdfdoc.rect(0, 0, 210, 36, 'F');

  pdfdoc.setTextColor(255, 255, 255);
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(24);
  pdfdoc.text('NODE', 15, 20);

  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(10);
  pdfdoc.text('Gestión empresarial', 15, 28);

  // Número y estado
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(14);
  pdfdoc.text(factura.numero || 'FACTURA', 195, 16, { align: 'right' });
  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(9);
  pdfdoc.text('Estado: ' + (factura.estado || '').toUpperCase(), 195, 24, { align: 'right' });

  // Fechas
  pdfdoc.setTextColor(...dark);
  pdfdoc.setFontSize(9);
  pdfdoc.text('Fecha emisión: ' + (factura.fechaEmision || '—'), 195, 46, { align: 'right' });
  if (factura.fechaVencimiento) {
    pdfdoc.text('Vencimiento: ' + factura.fechaVencimiento, 195, 52, { align: 'right' });
  }

  // Datos del cliente
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text('CLIENTE', 15, 46);

  pdfdoc.setTextColor(...dark);
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(11);
  pdfdoc.text(factura.cliente?.nombre || '—', 15, 53);

  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(9);
  pdfdoc.setTextColor(...gray);
  let cy = 59;
  if (factura.cliente?.nif)       { pdfdoc.text('NIF/CIF: ' + factura.cliente.nif, 15, cy); cy += 5; }
  if (factura.cliente?.email)     { pdfdoc.text(factura.cliente.email, 15, cy); cy += 5; }
  if (factura.cliente?.direccion) { pdfdoc.text(factura.cliente.direccion, 15, cy); cy += 5; }

  // Separador
  pdfdoc.setDrawColor(226, 232, 240);
  pdfdoc.line(15, 78, 195, 78);

  // Cabecera tabla
  let y = 86;
  pdfdoc.setFillColor(...light);
  pdfdoc.rect(15, y - 5, 180, 9, 'F');
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text('DESCRIPCIÓN', 18, y);
  pdfdoc.text('CANT.', 118, y, { align: 'right' });
  pdfdoc.text('PRECIO UNIT.', 155, y, { align: 'right' });
  pdfdoc.text('SUBTOTAL', 193, y, { align: 'right' });

  y += 7;
  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setTextColor(...dark);

  (factura.conceptos || []).forEach((c, idx) => {
    if (y > 255) {
      pdfdoc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      pdfdoc.setFillColor(248, 250, 252);
      pdfdoc.rect(15, y - 5, 180, 8, 'F');
    }
    pdfdoc.setFontSize(9);
    const descLines = pdfdoc.splitTextToSize(c.descripcion || '—', 95);
    pdfdoc.text(descLines, 18, y);
    pdfdoc.text(String(c.cantidad), 118, y, { align: 'right' });
    pdfdoc.text(fmtEur(c.precioUnitario), 155, y, { align: 'right' });
    pdfdoc.text(fmtEur(c.subtotal), 193, y, { align: 'right' });
    y += Math.max(8, descLines.length * 5);
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
  pdfdoc.text(fmtEur(factura.subtotal || 0), 193, y, { align: 'right' });
  y += 7;

  pdfdoc.setTextColor(...gray);
  pdfdoc.text(`IVA (${iva}%):`, 132, y);
  pdfdoc.setTextColor(...dark);
  pdfdoc.text(fmtEur(ivaAmount), 193, y, { align: 'right' });
  y += 3;

  pdfdoc.setDrawColor(226, 232, 240);
  pdfdoc.line(130, y, 195, y);
  y += 6;

  pdfdoc.setFillColor(...blue);
  pdfdoc.rect(130, y - 5, 65, 11, 'F');
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor(255, 255, 255);
  pdfdoc.text('TOTAL', 133, y + 2);
  pdfdoc.text(fmtEur(factura.total || 0), 193, y + 2, { align: 'right' });

  // Notas
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
    const notaLines = pdfdoc.splitTextToSize(factura.notas, 170);
    pdfdoc.text(notaLines, 15, y);
  }

  // Pie de página
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text(
    'Generado por NODE · ' + new Date().toLocaleDateString('es-ES'),
    105, 288, { align: 'center' }
  );

  pdfdoc.save(`${factura.numero || 'factura'}.pdf`);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function fmtEur(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
btnNueva.addEventListener('click', () => showForm(null));
btnCancelar.addEventListener('click', hideForm);
btnAddConcepto.addEventListener('click', () => addConcepto());
filtroEstado.addEventListener('change', renderLista);

btnGuardar.addEventListener('click', () => saveFactura(fEstado.value));

btnGuardarEmitir.addEventListener('click', () => {
  fEstado.value = 'emitida';
  saveFactura('emitida');
});

btnPdf.addEventListener('click', () => {
  if (!editingId) return;
  const f = facturas.find(x => x.id === editingId);
  if (f) generatePDF(f);
});

fIva.addEventListener('input', updateTotals);

// Delegación de eventos para la tabla de conceptos
conceptosBody.addEventListener('input', e => {
  const el = e.target;
  const i  = parseInt(el.dataset.i);
  if (isNaN(i)) return;
  updateConcepto(i, el.dataset.f, el.value);
});

conceptosBody.addEventListener('click', e => {
  const btn = e.target.closest('[data-del]');
  if (btn) removeConcepto(parseInt(btn.dataset.del));
});

// ─── API pública (usada por onclick en el HTML renderizado) ───────────────────
window._cont = {
  edit: (id) => {
    const f = facturas.find(x => x.id === id);
    if (f) showForm(f);
  },
  del: deleteFactura,
  pdf: (id) => {
    const f = facturas.find(x => x.id === id);
    if (f) generatePDF(f);
  }
};

// ─── Inicialización tras autenticación ───────────────────────────────────────
document.addEventListener('appReady', async ({ detail }) => {
  uid = detail.user.uid;

  const name     = detail.profile?.displayName || detail.profile?.email || '?';
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-display-name');
  const emailEl  = document.getElementById('user-display-email');

  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = detail.profile?.displayName ? detail.user.email : '';

  await fetchFacturas();

  // Soporte para redirección desde el chatbot (?nuevo=true&cliente=X)
  const params  = new URLSearchParams(window.location.search);
  if (params.get('nuevo') === 'true') {
    showForm(null);
    const cliente = params.get('cliente');
    if (cliente) fClienteNombre.value = decodeURIComponent(cliente);
  }
});
