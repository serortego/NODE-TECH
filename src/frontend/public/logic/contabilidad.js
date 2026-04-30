// contabilidad.js — Módulo de Caja y Gastos para NODE
// Clase: ContabilidadManager
// Gestiona movimientos de caja diarios y gastos fijos mensuales.
// Las facturas se gestionan en facturacion.js (FacturacionManager).
// Requiere: window.db, window.fs, window.firebaseUser (expuestos por auth.js)

class ContabilidadManager {
    constructor(navigationManager) {
        this.navManager     = navigationManager;
        this.transacciones  = [];
        this.gastosFijos    = [];
        this.tarifas        = [];
        this.editingTransId = null;
        this.editingGastoId = null;
        this._destroyed     = false;
        this._cajaTab       = "caja";
    }

    // ------- Render HTML -------
    render() {
        return `
        <div id="cont-root" class="space-y-4">

            <!-- Cabecera -->
            <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <div>
                    <h1 class="text-2xl font-bold text-white">Contabilidad</h1>
                    <p class="text-sm text-slate-400 mt-0.5">Caja, ingresos y gastos fijos</p>
                </div>
                <button id="cont-btn-nueva"
                    class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i class="fas fa-plus"></i> Nuevo movimiento
                </button>
            </div>

            <!-- KPIs resumen del mes -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Ingresos mes</p>
                    <p class="text-2xl font-bold text-emerald-400 mt-1" id="trans-stat-ingresos">--</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Gastos mes</p>
                    <p class="text-2xl font-bold text-red-400 mt-1" id="trans-stat-gastos">--</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift">
                    <p class="text-xs text-slate-400 font-medium uppercase">Gastos fijos/mes</p>
                    <p class="text-2xl font-bold text-amber-400 mt-1" id="trans-stat-fijos">--</p>
                </div>
                <div class="glass rounded-lg p-4 card-lift border-2 border-[rgba(43,147,166,0.3)]">
                    <p class="text-xs text-slate-400 font-medium uppercase">Balance</p>
                    <p class="text-2xl font-bold mt-1" id="trans-stat-balance">--</p>
                </div>
            </div>

            <!-- Sub-tabs -->
            <div class="flex gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl">
                <button id="caja-tab-btn-caja" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-[rgba(43,147,166,0.2)] text-[#38BDF8] transition">
                    <i class="fas fa-cash-register mr-1.5"></i>Caja del dia
                </button>
                <button id="caja-tab-btn-fijos" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                    <i class="fas fa-building mr-1.5"></i>Gastos fijos
                </button>
            </div>

            <!-- SUB-TAB: CAJA -->
            <div id="caja-subtab-caja" class="space-y-3">

                <!-- Botones rapidos de tarifa -->
                <div id="caja-atajos" class="flex flex-wrap gap-2">
                    <p class="text-xs text-slate-500 w-full">Añadir ingreso rapido:</p>
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
                                    + Ingreso
                                </button>
                                <button type="button" id="trans-tipo-gasto"
                                    class="flex-1 py-2 rounded-lg text-sm font-bold border-2 border-[rgba(255,255,255,0.1)] text-slate-500 transition">
                                    - Gasto
                                </button>
                            </div>
                            <input type="hidden" id="trans-tipo" value="ingreso">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Importe (EUR) *</label>
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

            </div>

            <!-- SUB-TAB: GASTOS FIJOS -->
            <div id="caja-subtab-fijos" class="hidden space-y-3">

                <div class="glass rounded-lg p-4 border border-amber-500/20 text-sm text-amber-200/70">
                    <i class="fas fa-info-circle mr-2"></i>Los gastos fijos son recurrentes (alquiler, luz, nominas...). Se usan para calcular el coste mensual automaticamente.
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
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Importe/mes (EUR) *</label>
                            <input type="number" id="fijo-importe" required placeholder="0.00" min="0" step="0.01"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                            <input type="text" id="fijo-categoria" placeholder="Ej: Local, Personal..." list="fijo-cat-list"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            <datalist id="fijo-cat-list">
                                <option value="Local"><option value="Suministros"><option value="Personal">
                                <option value="Seguros"><option value="Gestoria"><option value="Marketing"><option value="Otros">
                            </datalist>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Dia de pago</label>
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

            </div>

        </div>
        `;
    }

    // ------- Setup listeners + carga inicial -------
    async setupListeners() {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;

        if (!db || !uid) {
            const el = document.getElementById("trans-lista");
            if (el) el.innerHTML = "<p class=\"text-red-500 text-sm p-6 text-center\">Error: sin conexion a Firebase.</p>";
            return;
        }

        const { collection, getDocs, addDoc, updateDoc, deleteDoc,
                doc, query, orderBy, serverTimestamp } = window.fs;

        const colTrans  = () => collection(db, "users", uid, "caja");
        const colFijos  = () => collection(db, "users", uid, "gastosFijos");
        const colTarifa = () => collection(db, "users", uid, "tarifas");

        // Fecha de hoy por defecto
        const fechaTransEl = document.getElementById("trans-fecha");
        if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split("T")[0];

        // Sub-tabs
        const activarCajaTab = (tab) => {
            this._cajaTab = tab;
            ["caja", "fijos"].forEach(t => {
                document.getElementById(`caja-subtab-${t}`)?.classList.toggle("hidden", t !== tab);
                const btn = document.getElementById(`caja-tab-btn-${t}`);
                if (btn) {
                    btn.classList.toggle("bg-[rgba(43,147,166,0.2)]", t === tab);
                    btn.classList.toggle("text-[#38BDF8]", t === tab);
                    btn.classList.toggle("text-slate-400", t !== tab);
                }
            });
        };
        document.getElementById("caja-tab-btn-caja")?.addEventListener("click", () => activarCajaTab("caja"));
        document.getElementById("caja-tab-btn-fijos")?.addEventListener("click", () => activarCajaTab("fijos"));

        // Boton "Nuevo movimiento" abre el formulario de caja o fijos
        document.getElementById("cont-btn-nueva")?.addEventListener("click", () => {
            if (this._cajaTab === "fijos") {
                this._resetFijoForm();
                document.getElementById("fijo-form-wrapper")?.classList.remove("hidden");
            }
            // En caja el formulario ya esta visible por defecto
        });

        // Selector tipo ingreso/gasto
        const setTipoTrans = (tipo) => {
            document.getElementById("trans-tipo").value = tipo;
            const btnI = document.getElementById("trans-tipo-ingreso");
            const btnG = document.getElementById("trans-tipo-gasto");
            if (tipo === "ingreso") {
                btnI?.classList.add("border-emerald-500/60","bg-emerald-500/20","text-emerald-300");
                btnI?.classList.remove("border-[rgba(255,255,255,0.1)]","text-slate-500");
                btnG?.classList.remove("border-red-500/60","bg-red-500/20","text-red-300");
                btnG?.classList.add("border-[rgba(255,255,255,0.1)]","text-slate-500");
            } else {
                btnG?.classList.add("border-red-500/60","bg-red-500/20","text-red-300");
                btnG?.classList.remove("border-[rgba(255,255,255,0.1)]","text-slate-500");
                btnI?.classList.remove("border-emerald-500/60","bg-emerald-500/20","text-emerald-300");
                btnI?.classList.add("border-[rgba(255,255,255,0.1)]","text-slate-500");
            }
        };
        document.getElementById("trans-tipo-ingreso")?.addEventListener("click", () => setTipoTrans("ingreso"));
        document.getElementById("trans-tipo-gasto")?.addEventListener("click", () => setTipoTrans("gasto"));

        const loadTrans = async () => {
            try {
                const q = query(colTrans(), orderBy("fecha", "desc"));
                const snap = await getDocs(q);
                this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch {
                try { const snap = await getDocs(colTrans()); this.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() })); } catch { this.transacciones = []; }
            }
            this._rellenarFiltroMes();
            this._renderTransStats();
            this._renderTransLista({ deleteDoc, doc, db, uid, loadTrans });
        };

        document.getElementById("trans-filtro-mes")?.addEventListener("change", () => {
            this._renderTransStats();
            this._renderTransLista({ deleteDoc, doc, db, uid, loadTrans });
        });

        document.getElementById("trans-btn-cancelar")?.addEventListener("click", () => {
            document.getElementById("trans-form")?.reset();
            setTipoTrans("ingreso");
            if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split("T")[0];
            this.editingTransId = null;
            document.getElementById("trans-form-titulo").textContent = "Nuevo movimiento";
        });

        document.getElementById("trans-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const concepto = document.getElementById("trans-concepto").value.trim();
            const tipo     = document.getElementById("trans-tipo").value;
            const importe  = document.getElementById("trans-importe").value;
            if (!concepto || !tipo || !importe) return;
            const data = {
                concepto, tipo,
                importe:   parseFloat(importe),
                fecha:     document.getElementById("trans-fecha").value || new Date().toISOString().split("T")[0],
                updatedAt: serverTimestamp()
            };
            try {
                if (this.editingTransId) {
                    await updateDoc(doc(db, "users", uid, "caja", this.editingTransId), data);
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(colTrans(), data);
                }
                document.getElementById("trans-form")?.reset();
                setTipoTrans("ingreso");
                if (fechaTransEl) fechaTransEl.value = new Date().toISOString().split("T")[0];
                document.getElementById("trans-form-titulo").textContent = "Nuevo movimiento";
                this.editingTransId = null;
                await loadTrans();
                this.navManager?.showNotification("Movimiento guardado", "success");
            } catch (err) { alert("Error al guardar: " + err.message); }
        });

        // GASTOS FIJOS
        const loadFijos = async () => {
            try {
                const snap = await getDocs(colFijos());
                this.gastosFijos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { this.gastosFijos = []; }
            this._renderFijosLista({ deleteDoc, doc, db, uid, loadFijos });
            this._renderTransStats();
        };

        document.getElementById("fijo-btn-nuevo")?.addEventListener("click", () => {
            this._resetFijoForm();
            document.getElementById("fijo-form-wrapper")?.classList.remove("hidden");
        });
        document.getElementById("fijo-btn-cancelar")?.addEventListener("click", () => {
            document.getElementById("fijo-form-wrapper")?.classList.add("hidden");
            this.editingGastoId = null;
        });
        document.getElementById("fijo-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre  = document.getElementById("fijo-nombre").value.trim();
            const importe = parseFloat(document.getElementById("fijo-importe").value);
            if (!nombre || !importe) return;
            const data = {
                nombre, importe,
                categoria: document.getElementById("fijo-categoria").value.trim(),
                dia:       parseInt(document.getElementById("fijo-dia").value) || 1,
                updatedAt: serverTimestamp()
            };
            try {
                if (this.editingGastoId) {
                    await updateDoc(doc(db, "users", uid, "gastosFijos", this.editingGastoId), data);
                } else {
                    data.createdAt = serverTimestamp();
                    await addDoc(colFijos(), data);
                }
                document.getElementById("fijo-form-wrapper")?.classList.add("hidden");
                this.editingGastoId = null;
                await loadFijos();
                this.navManager?.showNotification("Gasto fijo guardado", "success");
            } catch (err) { alert("Error: " + err.message); }
        });

        // Cargar tarifas (solo lectura, para atajos de caja)
        const loadTarifas = async () => {
            try {
                const snap = await getDocs(colTarifa());
                this.tarifas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch { this.tarifas = []; }
            this._renderAtajos();
        };

        this._loadTrans = loadTrans;
        this._loadFijos = loadFijos;

        // Seed from DataManager cache if available
        if (window.dataManager?.cache) {
            if (window.dataManager.cache.finanzas?.length)    this.transacciones = [...window.dataManager.cache.finanzas];
            if (window.dataManager.cache.gastosFijos?.length) this.gastosFijos   = [...window.dataManager.cache.gastosFijos];
            if (window.dataManager.cache.tarifas?.length)     this.tarifas       = [...window.dataManager.cache.tarifas];
        }
        await Promise.all([loadTrans(), loadFijos(), loadTarifas()]);

        // Subscribe to DataManager for real-time updates
        if (window.dataManager) {
            this._unsubs = [
                window.dataManager.suscribirse('finanzas', data => {
                    if (this._destroyed) return;
                    this.transacciones = data;
                    this._rellenarFiltroMes();
                    this._renderTransStats();
                    this._renderTransLista({ deleteDoc, doc, db, uid, loadTrans });
                }),
                window.dataManager.suscribirse('gastosFijos', data => {
                    if (this._destroyed) return;
                    this.gastosFijos = data;
                    this._renderFijosLista({ deleteDoc, doc, db, uid, loadFijos });
                    this._renderTransStats();
                }),
                window.dataManager.suscribirse('tarifas', data => {
                    if (this._destroyed) return;
                    this.tarifas = data;
                    this._renderAtajos();
                }),
            ];
        }
    }

    destroy() {
        this._destroyed = true;
        (this._unsubs || []).forEach(u => u?.());
        this._unsubs = [];
    }

    // ------- Helpers privados -------

    _rellenarFiltroMes() {
        const sel = document.getElementById("trans-filtro-mes");
        if (!sel) return;
        const meses = new Set();
        this.transacciones.forEach(t => { if (t.fecha) meses.add(t.fecha.substring(0, 7)); });
        const sorted = [...meses].sort().reverse();
        const hoy = new Date().toISOString().substring(0, 7);
        sel.innerHTML = `<option value="">Todo</option>` + sorted.map(m => {
            const [y, mo] = m.split("-");
            const label = new Date(y, parseInt(mo) - 1).toLocaleString("es-ES", { month: "long", year: "numeric" });
            return `<option value="${m}" ${m === hoy ? "selected" : ""}>${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
        }).join("");
    }

    _renderAtajos() {
        const cont = document.getElementById("caja-atajos");
        if (!cont) return;
        const label = cont.querySelector("p");
        cont.innerHTML = "";
        if (label) cont.appendChild(label);
        this.tarifas.forEach(t => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgba(43,147,166,0.4)] text-[#38BDF8] bg-[rgba(43,147,166,0.08)] hover:bg-[rgba(43,147,166,0.2)] transition";
            btn.textContent = `${t.nombre} -- ${this._fmtEur(t.precio)}`;
            btn.addEventListener("click", () => {
                document.getElementById("trans-concepto").value = t.nombre;
                document.getElementById("trans-importe").value  = t.precio;
                document.getElementById("trans-tipo").value     = "ingreso";
                const btnI = document.getElementById("trans-tipo-ingreso");
                const btnG = document.getElementById("trans-tipo-gasto");
                btnI?.classList.add("border-emerald-500/60","bg-emerald-500/20","text-emerald-300");
                btnI?.classList.remove("border-[rgba(255,255,255,0.1)]","text-slate-500");
                btnG?.classList.remove("border-red-500/60","bg-red-500/20","text-red-300");
                btnG?.classList.add("border-[rgba(255,255,255,0.1)]","text-slate-500");
                document.getElementById("trans-importe")?.focus();
            });
            cont.appendChild(btn);
        });
        if (!this.tarifas.length) {
            const p = document.createElement("p");
            p.className = "text-xs text-slate-500";
            p.textContent = "Define tarifas en Mis Datos > Tarifas para acceder a ellas rapidamente.";
            cont.appendChild(p);
        }
    }

    _renderTransStats() {
        const filtroMes = document.getElementById("trans-filtro-mes")?.value || "";
        const trans = filtroMes
            ? this.transacciones.filter(t => (t.fecha || "").startsWith(filtroMes))
            : this.transacciones;
        let ingresos = 0, gastos = 0;
        trans.forEach(t => {
            const v = parseFloat(t.importe) || 0;
            if (t.tipo === "ingreso") ingresos += v; else gastos += v;
        });
        const totalFijos = this.gastosFijos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0);
        const balance    = ingresos - gastos - (filtroMes ? totalFijos : 0);
        const fmt        = n => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR";
        const el         = id => document.getElementById(id);
        if (el("trans-stat-ingresos")) el("trans-stat-ingresos").textContent = fmt(ingresos);
        if (el("trans-stat-gastos"))   el("trans-stat-gastos").textContent   = fmt(gastos);
        if (el("trans-stat-fijos"))    el("trans-stat-fijos").textContent    = fmt(totalFijos);
        if (el("trans-stat-balance")) {
            el("trans-stat-balance").textContent = fmt(Math.abs(balance));
            el("trans-stat-balance").className = "text-2xl font-bold mt-1 " + (balance >= 0 ? "text-emerald-400" : "text-red-400");
        }
    }

    _renderTransLista({ deleteDoc, doc, db, uid, loadTrans }) {
        const lista = document.getElementById("trans-lista");
        if (!lista) return;
        const filtroMes = document.getElementById("trans-filtro-mes")?.value || "";
        const trans = filtroMes
            ? this.transacciones.filter(t => (t.fecha || "").startsWith(filtroMes))
            : this.transacciones;
        if (!trans.length) {
            lista.innerHTML = "<p class=\"text-slate-500 text-sm p-6 text-center\">No hay movimientos en este periodo.</p>";
            return;
        }
        const fmt = n => (parseFloat(n)||0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR";
        lista.innerHTML = trans.map(t => {
            const esI = t.tipo === "ingreso";
            return `
            <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(43,147,166,0.04)] transition">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="text-lg">${esI ? "🟢" : "🔴"}</span>
                    <div class="min-w-0">
                        <p class="font-semibold text-white text-sm truncate">${this._escHtml(t.concepto||"--")}</p>
                        <p class="text-xs text-slate-500">${t.fecha||""}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <p class="text-base font-bold ${esI?"text-emerald-400":"text-red-400"}">${esI?"+":"-"}${fmt(t.importe)}</p>
                    <button data-trans-edit="${t.id}" class="text-xs border border-[rgba(43,147,166,0.3)] px-2 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">✏</button>
                    <button data-trans-del="${t.id}" class="text-xs border border-red-500/20 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">🗑</button>
                </div>
            </div>`;
        }).join("");

        lista.querySelectorAll("[data-trans-edit]").forEach(btn => {
            btn.addEventListener("click", () => {
                const t = this.transacciones.find(x => x.id === btn.dataset.transEdit);
                if (!t) return;
                this.editingTransId = t.id;
                document.getElementById("trans-form-titulo").textContent = "Editar movimiento";
                document.getElementById("trans-concepto").value = t.concepto || "";
                document.getElementById("trans-importe").value  = t.importe  || "";
                document.getElementById("trans-fecha").value    = t.fecha    || "";
                document.getElementById("trans-tipo").value     = t.tipo     || "ingreso";
                const btnI = document.getElementById("trans-tipo-ingreso");
                const btnG = document.getElementById("trans-tipo-gasto");
                if (t.tipo === "ingreso") {
                    btnI?.classList.add("border-emerald-500/60","bg-emerald-500/20","text-emerald-300");
                    btnI?.classList.remove("border-[rgba(255,255,255,0.1)]","text-slate-500");
                    btnG?.classList.remove("border-red-500/60","bg-red-500/20","text-red-300");
                    btnG?.classList.add("border-[rgba(255,255,255,0.1)]","text-slate-500");
                } else {
                    btnG?.classList.add("border-red-500/60","bg-red-500/20","text-red-300");
                    btnG?.classList.remove("border-[rgba(255,255,255,0.1)]","text-slate-500");
                    btnI?.classList.remove("border-emerald-500/60","bg-emerald-500/20","text-emerald-300");
                    btnI?.classList.add("border-[rgba(255,255,255,0.1)]","text-slate-500");
                }
                document.getElementById("trans-concepto")?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
        lista.querySelectorAll("[data-trans-del]").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Eliminar este movimiento?")) return;
                try {
                    await deleteDoc(doc(db, "users", uid, "caja", btn.dataset.transDel));
                    if (!window.dataManager) await loadTrans();
                    this.navManager?.showNotification("Movimiento eliminado", "info");
                } catch (err) { alert("Error al eliminar: " + err.message); }
            });
        });
    }

    _renderFijosLista({ deleteDoc, doc, db, uid, loadFijos }) {
        const lista = document.getElementById("fijos-lista");
        if (!lista) return;
        if (!this.gastosFijos.length) {
            lista.innerHTML = "<p class=\"text-slate-500 text-sm p-6 text-center\">No hay gastos fijos. Añade alquiler, luz, nominas...</p>";
            return;
        }
        const fmt   = n => (parseFloat(n)||0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR";
        const total = this.gastosFijos.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0);
        lista.innerHTML = this.gastosFijos.map(g => `
            <div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition">
                <div class="min-w-0">
                    <p class="font-semibold text-white text-sm">${this._escHtml(g.nombre||"--")}</p>
                    <p class="text-xs text-slate-500">${this._escHtml(g.categoria||"")}${g.dia ? " · Dia " + g.dia : ""}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <p class="text-base font-bold text-amber-400">${fmt(g.importe)}/mes</p>
                    <button data-fijo-edit="${g.id}" class="text-xs border border-[rgba(43,147,166,0.3)] px-2 py-1 rounded-md text-[#38BDF8] hover:bg-[rgba(43,147,166,0.15)] transition">✏</button>
                    <button data-fijo-del="${g.id}" class="text-xs border border-red-500/20 px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition">🗑</button>
                </div>
            </div>`).join("") +
            `<div class="flex justify-between items-center px-4 py-3 bg-[rgba(255,255,255,0.04)] border-t border-[rgba(255,255,255,0.06)]">
                <span class="text-sm font-bold text-slate-300">Total gastos fijos</span>
                <span class="text-lg font-black text-amber-400">${fmt(total)}/mes</span>
            </div>`;

        lista.querySelectorAll("[data-fijo-edit]").forEach(btn => {
            btn.addEventListener("click", () => {
                const g = this.gastosFijos.find(x => x.id === btn.dataset.fijoEdit);
                if (!g) return;
                this.editingGastoId = g.id;
                document.getElementById("fijo-form-titulo").textContent = "Editar gasto fijo";
                document.getElementById("fijo-edit-id").value   = g.id;
                document.getElementById("fijo-nombre").value    = g.nombre    || "";
                document.getElementById("fijo-importe").value   = g.importe   || "";
                document.getElementById("fijo-categoria").value = g.categoria || "";
                document.getElementById("fijo-dia").value       = g.dia       || "";
                document.getElementById("fijo-form-wrapper")?.classList.remove("hidden");
            });
        });
        lista.querySelectorAll("[data-fijo-del]").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Eliminar este gasto fijo?")) return;
                try {
                    await deleteDoc(doc(db, "users", uid, "gastosFijos", btn.dataset.fijoDel));
                    await loadFijos();
                    this.navManager?.showNotification("Gasto fijo eliminado", "info");
                } catch (err) { alert("Error: " + err.message); }
            });
        });
    }

    _resetFijoForm() {
        this.editingGastoId = null;
        document.getElementById("fijo-form-titulo").textContent = "Nuevo gasto fijo";
        document.getElementById("fijo-form")?.reset();
    }

    _fmtEur(n) {
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
    }
    _escHtml(str) {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}

// Auto-init para la pagina standalone contabilidad.html
document.addEventListener("appReady", async () => {
    if (window.navManager) return;
    const container = document.getElementById("cont-standalone");
    if (!container) return;
    const mgr = new ContabilidadManager(null);
    container.innerHTML = mgr.render();
    await mgr.setupListeners();
});
