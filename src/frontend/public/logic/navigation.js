// ═══════════════════════════════════════════════════════════════════
// NAVIGATION.JS — Router principal + todos los managers
// Firebase-first: lee de DataManager / window.BCONFIG
// ═══════════════════════════════════════════════════════════════════

class NavigationManager {

    // ── Servicios dinámicos desde BCONFIG ──────────────────────────
    static get SERVICIOS() {
        const dm = window.dataManager?.cache?.tarifas;
        if (dm?.length) return dm.map(t => t.nombre);
        const cfg = window.BCONFIG;
        if (cfg?.servicios) return cfg.servicios.flatMap(g => g.items);
        return ['Servicio general'];
    }

    static get PRECIOS() {
        const dm = window.dataManager?.cache?.tarifas;
        if (dm?.length) return Object.fromEntries(dm.map(t => [t.nombre, t.precio]));
        return {};
    }

    static get QUICK_ACTIONS_CATALOG() {
        const cfg = window.BCONFIG || {};
        return [
            { id: 'cita-express',  icon: 'fa-bolt',                label: 'Cita express',                   color: 'text-[#38BDF8]'   },
            { id: 'cobro-rapido',  icon: 'fa-cash-register',       label: 'Cobro rápido',                   color: 'text-emerald-400' },
            { id: 'urgencia',      icon: 'fa-exclamation-circle',  label: 'Urgencia',                       color: 'text-red-400'     },
            { id: 'nueva-cita',    icon: 'fa-calendar-plus',       label: cfg.nuevaCita || 'Nueva cita',    color: 'text-purple-400'  },
            { id: 'ver-agenda',    icon: 'fa-calendar-alt',        label: 'Ver agenda',                     color: 'text-amber-400'   },
            { id: 'clientes',      icon: 'fa-users',               label: cfg.clientePlural  || 'Clientes',  color: 'text-teal-400'    },
            { id: 'contabilidad',  icon: 'fa-file-invoice-dollar', label: 'Contabilidad',                   color: 'text-green-400'   },
            { id: 'empleados',     icon: 'fa-user-tie',            label: cfg.empleadoPlural || 'Equipo',    color: 'text-blue-400'    },
        ];
    }

    // ── Acciones rápidas personalizables ───────────────────────────
    _renderQuickActionButtons() {
        const active  = this._getQuickActions();
        const catalog = NavigationManager.QUICK_ACTIONS_CATALOG;
        return active.map(id => {
            const a = catalog.find(c => c.id === id);
            if (!a) return '';
            return `
                <button class="btn-quick-action glass-bright rounded-xl px-2 py-3 text-xs font-bold transition
                    hover:border-[rgba(43,147,166,0.4)] flex flex-col items-center gap-1.5 card-lift h-[68px]"
                    data-action="${a.id}">
                    <i class="fas ${a.icon} text-base ${a.color}"></i>
                    <span class="text-slate-300 text-[11px] leading-tight text-center">${a.label}</span>
                </button>`;
        }).join('');
    }

    _getQuickActions() {
        const saved = localStorage.getItem('node-quick-actions');
        if (saved) { try { return JSON.parse(saved); } catch (_) {} }
        return ['cita-express', 'cobro-rapido', 'urgencia', 'nueva-cita'];
    }

    _saveQuickActions(ids) {
        localStorage.setItem('node-quick-actions', JSON.stringify(ids));
    }

    constructor() {
        this.currentView = null;
        this.currentManager = null;
        this.contentArea = document.getElementById('content-area');
        this.navItems = document.querySelectorAll('.nav-item');
        
        // Estado global compartido
        this.citas = [];
        this.usuario = null;
        this.recursos = []; // Se cargan desde Firebase vía DataManager
        
        this.loadCitas();
        this.init();
        this._syncRecursosDesdeFirebase();
    }

    _syncRecursosDesdeFirebase() {
        const actualizar = (empleados) => {
            if (empleados && empleados.length > 0) {
                this.recursos = empleados.map(e => e.nombre).filter(Boolean);
            }
        };

        // Cargar inmediatamente si DataManager ya tiene datos
        if (window.dataManager) {
            actualizar(window.dataManager.cache.empleados);
            window.dataManager.suscribirse('empleados', actualizar);
        } else {
            // Esperar a que DataManager esté listo
            document.addEventListener('appReady', () => {
                if (window.dataManager) {
                    actualizar(window.dataManager.cache.empleados);
                    window.dataManager.suscribirse('empleados', actualizar);
                }
            });
        }
    }

    init() {
        this.setupNavigation();
        const hash = window.location.hash.replace('#', '');
        const defaultView = hash || document.body.dataset.defaultView || 'dashboard';
        if (hash) history.replaceState(null, '', window.location.pathname);
        this.loadView(defaultView);
    }

    setupNavigation() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) {
                    this.setActiveNav(item);
                    this.loadView(view);
                }
            });
        });

        // Arbol expandible (nav-tree)
        document.querySelectorAll('.nav-tree-parent').forEach(parent => {
            parent.addEventListener('click', () => {
                const childrenId = parent.id + '-children';
                const children = document.getElementById(childrenId);
                const wasOpen = parent.classList.contains('open');

                // Cerrar todos los demás árboles
                document.querySelectorAll('.nav-tree-parent').forEach(p => {
                    if (p !== parent) {
                        p.classList.remove('open');
                        const c = document.getElementById(p.id + '-children');
                        if (c) c.classList.remove('open');
                    }
                });

                // Abrir/cerrar el actual
                parent.classList.toggle('open', !wasOpen);
                if (children) children.classList.toggle('open', !wasOpen);

                // Al abrir, navegar al primer hijo
                if (!wasOpen) {
                    const firstChild = children?.querySelector('.nav-tree-child[data-view]');
                    if (firstChild) {
                        const view = firstChild.getAttribute('data-view');
                        if (view) {
                            this.setActiveNav(firstChild);
                            this.loadView(view);
                        }
                    }
                }
            });
        });

        document.querySelectorAll('.nav-tree-child').forEach(child => {
            child.addEventListener('click', (e) => {
                e.preventDefault();
                const view = child.getAttribute('data-view');
                if (view) {
                    this.setActiveNav(child);
                    this.loadView(view);
                }
            });
        });

        // Perfil de usuario (footer)
        document.getElementById('sidebar-perfil-btn')?.addEventListener('click', () => {
            this.loadView('perfil');
        });

        // Configuración (footer)
        document.getElementById('sidebar-config-btn')?.addEventListener('click', () => {
            this.loadView('configuracion');
        });
    }

    setActiveNav(clickedItem) {
        this.navItems.forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.nav-tree-child').forEach(c => c.classList.remove('active'));
        if (clickedItem) clickedItem.classList.add('active');

        // Si el item activo es un nav-tree-child, marcar el padre como open
        if (clickedItem && clickedItem.classList.contains('nav-tree-child')) {
            const children = clickedItem.closest('.nav-tree-children');
            if (children) {
                children.classList.add('open');
                const parentId = children.id.replace('-children', '');
                const parent = document.getElementById(parentId);
                if (parent) parent.classList.add('open');
            }
        }
    }

    // ── Guarda cita en Firebase y actualiza caché local ────────────
    async _guardarCitaFirebase(datos) {
        try {
            if (window.fs && window.db && window.firebaseUser) {
                const { addDoc, collection, serverTimestamp } = window.fs;
                const { id: _localId, ...datosSinId } = datos;
                const docRef = await addDoc(
                    collection(window.db, 'users', window.firebaseUser.uid, 'citas'),
                    { ...datosSinId, createdAt: serverTimestamp() }
                );
                datos.id = docRef.id;
                return docRef.id;
            }
        } catch (err) {
            console.error('Error guardando cita:', err);
        }
        this.citas.push(datos);
        return null;
    }

    // ── Router principal (Firebase-aware) ─────────────────────────
    loadView(viewName) {
        if (this.currentManager && this.currentManager.destroy) {
            this.currentManager.destroy();
        }
        // Limpiar suscripción de estadísticas si se sale de esa vista
        if (this._estadUnsub) { this._estadUnsub(); this._estadUnsub = null; }
        this._destroyStatsCharts();
        this.currentView = viewName;

        switch (viewName) {
            case 'inicio':
                this.contentArea.innerHTML = this._renderInicioShell('dashboard');
                setTimeout(() => this._setupInicioListeners(), 0);
                return;

            case 'estadisticas':
                this.contentArea.innerHTML = this._renderEstadisticasView();
                setTimeout(() => this._setupEstadisticasListeners(), 0);
                return;

            case 'tutorial':
                this.contentArea.innerHTML = this._renderTutorialView();
                return;

            case 'dashboard':
                this.contentArea.innerHTML = this.renderDashboard();
                setTimeout(() => this.setupDashboardListeners(), 0);
                return;

            case 'agenda':
                if (typeof AgendaManager !== 'undefined') {
                    this.currentManager = new AgendaManager(this);
                }
                if (this.currentManager) {
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'agenda-stats':
                if (typeof AgendaManager !== 'undefined') {
                    this.currentManager = new AgendaManager(this);
                    this.currentManager.agendaView = 'analytics';
                }
                if (this.currentManager) {
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'pacientes':
            case 'clientes':
                if (typeof ClientesManager !== 'undefined') {
                    this.currentManager = new ClientesManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'odontograma':
                this.contentArea.innerHTML = this.renderOdontogramaHub();
                return;

            case 'empleados': {
                const empLabel  = window.BCONFIG?.empleadoPlural  || 'Empleados';
                const empSing   = window.BCONFIG?.empleadoSingular || 'Empleado';
                const salaLabel = window.BCONFIG?.salaSingular     || 'Sala';
                if (typeof EmpleadosManager !== 'undefined') {
                    this.currentManager = new EmpleadosManager(this);
                    this.contentArea.innerHTML = this.currentManager.render()
                        .replace(/>Empleados</g, `>${empLabel}<`)
                        .replace(/>Empleado</g, `>${empSing}<`)
                        .replace(/>Nuevo Empleado</g, `>Nuevo ${empSing}<`)
                        .replace(/Gestión de personal/g, `Gestión de ${empLabel.toLowerCase()}`)
                        .replace(/placeholder="Nombre del empleado"/g, `placeholder="Nombre del ${empSing.toLowerCase()}"`)
                        .replace(/placeholder="Puesto o especialidad"/g, `placeholder="${salaLabel} o especialidad"`);
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;
            }

            case 'asistente':
                if (typeof ChatbotManager !== 'undefined') {
                    this.currentManager = new ChatbotManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'contabilidad':
                if (typeof ContabilidadManager !== 'undefined') {
                    this.currentManager = new ContabilidadManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'facturacion':
                if (typeof FacturacionManager !== 'undefined') {
                    this.currentManager = new FacturacionManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'tarifas':
                if (typeof TarifasManager !== 'undefined') {
                    this.currentManager = new TarifasManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'impuestos':
                if (typeof ImpuestosManager !== 'undefined') {
                    this.currentManager = new ImpuestosManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'importexport':
                if (typeof ImportExportManager !== 'undefined') {
                    this.currentManager = new ImportExportManager(this);
                    this.contentArea.innerHTML = this.currentManager.render();
                    setTimeout(() => this.currentManager.setupListeners(), 0);
                }
                return;

            case 'perfil':
                this.contentArea.innerHTML = this._renderPerfilView();
                setTimeout(() => this._setupPerfilListeners(), 0);
                return;

            case 'configuracion':
                this.contentArea.innerHTML = this._renderConfiguracionView();
                setTimeout(() => this._setupConfiguracionListeners(), 0);
                return;

            default:
                this.contentArea.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Sección en desarrollo</p></div>';
        }
    }

    // ── Listeners Perfil ──────────────────────────────────────────
    _setupPerfilListeners() {
        document.getElementById('perfil-btn-password')?.addEventListener('click', () => {
            this._enviarResetPassword();
        });
    }

    // ── Listeners Configuración ───────────────────────────────────
    _setupConfiguracionListeners() {
        document.getElementById('cfg-btn-password')?.addEventListener('click', () => {
            this._enviarResetPassword();
        });

        document.getElementById('cfg-guardar-negocio')?.addEventListener('click', () => {
            const datos = {
                nombreNegocio: document.getElementById('cfg-nombre-negocio')?.value.trim(),
                cif:           document.getElementById('cfg-cif')?.value.trim(),
                telefono:      document.getElementById('cfg-telefono')?.value.trim(),
                direccion:     document.getElementById('cfg-direccion')?.value.trim(),
            };
            if (!window.BCONFIG) window.BCONFIG = {};
            Object.assign(window.BCONFIG, datos);
            // Persistir en Firestore si está disponible
            if (window.fs && window.db && window.firebaseUser) {
                const { doc, setDoc } = window.fs;
                setDoc(
                    doc(window.db, 'users', window.firebaseUser.uid, 'config', 'negocio'),
                    datos, { merge: true }
                ).catch(e => console.error('Error guardando config:', e));
            }
            this.showNotification('Datos guardados', 'success');
        });
    }

    _enviarResetPassword() {
        const email = window.firebaseUser?.email;
        if (!email) { this.showNotification('No hay email de cuenta', 'error'); return; }
        if (window.firebaseAuth && typeof window.firebaseAuth.sendPasswordResetEmail === 'function') {
            window.firebaseAuth.sendPasswordResetEmail(email)
                .then(() => this.showNotification('Email de reset enviado a ' + email, 'success'))
                .catch(() => this.showNotification('Error al enviar email', 'error'));
        } else {
            this.showNotification('Email enviado a ' + email, 'info');
        }
    }

    // ── Vista Inicio con pestañas ─────────────────────────────────
    _renderInicioShell(activeTab = 'dashboard') {
        const tabs = [
            { id: 'dashboard',    label: 'Dashboard',    icon: 'fa-tachometer-alt' },
            { id: 'estadisticas', label: 'Estadísticas', icon: 'fa-chart-pie' },
            { id: 'tutorial',     label: 'Tutorial',     icon: 'fa-graduation-cap' },
        ];
        return `
        <div class="flex flex-col h-full gap-4">
            <!-- Tab bar -->
            <div class="flex gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl flex-shrink-0">
                ${tabs.map(t => `
                <button data-tab="${t.id}" class="inicio-tab flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition
                    ${t.id === activeTab ? 'bg-[rgba(43,147,166,0.2)] text-[#38BDF8]' : 'text-slate-400 hover:text-white'}">
                    <i class="fas ${t.icon} mr-1.5"></i>${t.label}
                </button>`).join('')}
            </div>
            <!-- Contenido de la pestaña activa -->
            <div id="inicio-tab-content" class="flex-1 overflow-y-auto min-h-0">
                ${this._renderInicioTabContent(activeTab)}
            </div>
        </div>`;
    }

    _renderInicioTabContent(tab) {
        if (tab === 'dashboard')    return this.renderDashboard();
        if (tab === 'estadisticas') return this._renderEstadisticasView();
        if (tab === 'tutorial')     return this._renderTutorialView();
        return '';
    }

    _setupInicioListeners() {
        // Listeners del tab activo por defecto (dashboard)
        this.setupDashboardListeners();

        document.querySelectorAll('.inicio-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;

                // Limpiar suscripción de estadísticas si se sale de esa tab
                if (this._estadUnsub) { this._estadUnsub(); this._estadUnsub = null; }
                this._destroyStatsCharts();

                // Actualizar estilos de pestañas
                document.querySelectorAll('.inicio-tab').forEach(b => {
                    b.classList.remove('bg-[rgba(43,147,166,0.2)]', 'text-[#38BDF8]');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('bg-[rgba(43,147,166,0.2)]', 'text-[#38BDF8]');
                btn.classList.remove('text-slate-400');

                // Cambiar contenido
                const content = document.getElementById('inicio-tab-content');
                if (content) content.innerHTML = this._renderInicioTabContent(tab);

                // Re-setup listeners según la tab
                if (tab === 'dashboard')    this.setupDashboardListeners();
                if (tab === 'estadisticas') this._setupEstadisticasListeners();
            });
        });
    }

    // ── Vista Estadísticas — Dashboard rico con gráficos ─────────
    _renderEstadisticasView() {
        const cache     = window.dataManager?.cache || {};
        const citas     = cache.citas     || [];
        const clientes  = cache.clientes  || [];
        const empleados = cache.empleados || [];
        const tarifas   = cache.tarifas   || [];
        const caja      = cache.caja      || [];

        const hoy     = this._hoyStr();
        const mesStr  = hoy.substring(0, 7);
        const hoyDate = new Date(hoy + 'T00:00:00');

        // ── KPIs ──────────────────────────────────────────────────
        const citasHoy    = citas.filter(c => c.fecha === hoy);
        const citasMes    = citas.filter(c => (c.fecha || '').startsWith(mesStr));
        const cobradoHoy  = citasHoy.filter(c => c.cobrado).reduce((s, c) => s + parseFloat(c.precio || 0), 0);
        const cobradoMes  = citasMes.filter(c => c.cobrado).reduce((s, c) => s + parseFloat(c.precio || 0), 0);
        const ingresosMes = caja.filter(t => t.tipo === 'ingreso' && (t.fecha || '').startsWith(mesStr))
            .reduce((s, t) => s + parseFloat(t.importe || t.cantidad || 0), 0);
        const gastosMes   = caja.filter(t => t.tipo === 'gasto' && (t.fecha || '').startsWith(mesStr))
            .reduce((s, t) => s + parseFloat(t.importe || t.cantidad || 0), 0);
        const balance     = ingresosMes - gastosMes;
        const totalNoCan  = citasMes.filter(c => c.estado !== 'cancelado').length;
        const tasaCobro   = totalNoCan ? Math.round((citasMes.filter(c => c.cobrado).length / totalNoCan) * 100) : 0;

        // ── Top servicios (por ingresos) ───────────────────────────
        const PALETTE  = ['#2B93A6', '#38BDF8', '#6366f1', '#a78bfa', '#f59e0b', '#10b981', '#f43f5e'];
        const servRev  = {};
        citasMes.filter(c => c.cobrado && c.servicio).forEach(c => {
            servRev[c.servicio] = (servRev[c.servicio] || 0) + parseFloat(c.precio || 0);
        });
        const topServs    = Object.entries(servRev).sort((a, b) => b[1] - a[1]).slice(0, 7);

        // ── Top clientes ───────────────────────────────────────────
        const cliCount    = {};
        citas.filter(c => c.cobrado && c.cliente).forEach(c => {
            cliCount[c.cliente] = (cliCount[c.cliente] || 0) + 1;
        });
        const topClientes = Object.entries(cliCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // ── Citas de hoy ───────────────────────────────────────────
        const citasHoySort = [...citasHoy].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

        // ── Datos para gráficos ────────────────────────────────────
        const labels30 = [], ing30 = [];
        for (let i = 29; i >= 0; i--) {
            const d  = new Date(hoyDate); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            labels30.push(i % 5 === 0 || i === 0 ? d.getDate() + '/' + (d.getMonth() + 1) : '');
            ing30.push(citas.filter(c => c.cobrado && c.fecha === ds).reduce((s, c) => s + parseFloat(c.precio || 0), 0));
        }
        const m6L = [], m6I = [], m6G = [];
        for (let i = 5; i >= 0; i--) {
            const d  = new Date(hoyDate.getFullYear(), hoyDate.getMonth() - i, 1);
            const ms = d.toISOString().split('T')[0].substring(0, 7);
            m6L.push(d.toLocaleDateString('es-ES', { month: 'short' }));
            m6I.push(caja.filter(t => t.tipo === 'ingreso' && (t.fecha || '').startsWith(ms)).reduce((s, t) => s + parseFloat(t.importe || t.cantidad || 0), 0));
            m6G.push(caja.filter(t => t.tipo === 'gasto'   && (t.fecha || '').startsWith(ms)).reduce((s, t) => s + parseFloat(t.importe || t.cantidad || 0), 0));
        }
        this._estadChartData = {
            ing30: { labels: labels30, data: ing30 },
            servs: { labels: topServs.map(s => s[0]), data: topServs.map(s => Math.round(s[1])), colors: PALETTE.slice(0, topServs.length) },
            bal6m: { labels: m6L, ing: m6I, gas: m6G },
        };

        // ── Widget system ──────────────────────────────────────────
        const hidden   = JSON.parse(localStorage.getItem('nt_stats_hidden') || '[]');
        const vis      = id => hidden.includes(id) ? 'hidden' : '';
        const mesLabel = new Date(mesStr + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const WIDGETS  = [
            { id: 'kpis',      label: 'KPIs principales',   icon: 'fa-tachometer-alt' },
            { id: 'linea',     label: 'Ingresos 30 días',    icon: 'fa-chart-line' },
            { id: 'servicios', label: 'Top servicios',       icon: 'fa-chart-pie' },
            { id: 'balance',   label: 'Balance mensual',     icon: 'fa-balance-scale' },
            { id: 'citas',     label: 'Citas de hoy',        icon: 'fa-calendar-day' },
            { id: 'clientes',  label: 'Clientes frecuentes', icon: 'fa-star' },
            { id: 'bd',        label: 'Base de datos',       icon: 'fa-database' },
        ];
        const savedOrder = JSON.parse(localStorage.getItem('nt_stats_order') || '[]');
        const allIds     = WIDGETS.map(w => w.id);
        const wOrder     = savedOrder.length
            ? [...new Set([...savedOrder, ...allIds.filter(id => !savedOrder.includes(id))])]
            : allIds;

        // Widget wrapper with drag handle
        const W = (id, span, html) =>
            `<div data-widget-id="${id}" draggable="true"
                class="stats-widget ${span} ${vis(id)} glass border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden relative">
                <div class="stats-drag-handle absolute top-2 right-2 z-10 cursor-grab px-1 py-0.5 rounded text-slate-700 hover:text-slate-400 transition select-none">
                    <i class="fas fa-grip-vertical text-[10px]"></i></div>
                ${html}</div>`;

        // Pre-computed substrings to avoid deeply nested template literals
        const balColor = balance >= 0 ? 'text-emerald-400' : 'text-red-400';
        const balBg    = balance >= 0 ? 'rgba(16,185,129,0.1)'  : 'rgba(239,68,68,0.08)';
        const balBrd   = balance >= 0 ? 'rgba(16,185,129,0.2)'  : 'rgba(239,68,68,0.18)';
        const tcColor  = tasaCobro >= 80 ? 'text-emerald-400' : tasaCobro >= 50 ? 'text-amber-400' : 'text-red-400';
        const ing30Total = Math.round(ing30.reduce((a, b) => a + b, 0));
        const servTotal  = Math.round(topServs.reduce((s, e) => s + e[1], 0));

        const kpisHTML = `
            <div class="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div class="rounded-xl border p-3" style="background:rgba(43,147,166,0.12);border-color:rgba(43,147,166,0.25)">
                    <p class="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider mb-1">Cobrado hoy</p>
                    <p class="text-2xl font-black text-white">€${Math.round(cobradoHoy)}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">${citasHoy.filter(c => c.cobrado).length} pagos</p>
                </div>
                <div class="rounded-xl border p-3" style="background:rgba(43,147,166,0.08);border-color:rgba(43,147,166,0.2)">
                    <p class="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider mb-1">Cobrado mes</p>
                    <p class="text-2xl font-black text-white">€${Math.round(cobradoMes)}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">${citasMes.filter(c => c.cobrado).length} citas</p>
                </div>
                <div class="rounded-xl border p-3" style="background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.2)">
                    <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Ingresos caja</p>
                    <p class="text-2xl font-black text-white">€${Math.round(ingresosMes)}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">este mes</p>
                </div>
                <div class="rounded-xl border p-3" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.18)">
                    <p class="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Gastos</p>
                    <p class="text-2xl font-black text-white">€${Math.round(gastosMes)}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">este mes</p>
                </div>
                <div class="rounded-xl border p-3" style="background:${balBg};border-color:${balBrd}">
                    <p class="text-[10px] font-bold ${balColor} uppercase tracking-wider mb-1">Balance</p>
                    <p class="text-2xl font-black ${balColor}">${balance >= 0 ? '+' : ''}€${Math.round(balance)}</p>
                    <p class="text-[11px] mt-0.5"><span class="font-bold ${tcColor}">${tasaCobro}%</span> <span class="text-slate-400">cobrado</span></p>
                </div>
            </div>`;

        const servLegend = topServs.map((e, i) =>
            `<div class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${PALETTE[i]}"></span>
                <span class="text-slate-300 truncate">${e[0]}</span>
                <span class="text-white font-bold ml-auto flex-shrink-0">€${Math.round(e[1])}</span>
            </div>`).join('');

        const servDonut = topServs.length
            ? `<div class="p-4 flex items-center gap-4">
                <div style="position:relative;height:150px;width:150px;flex-shrink:0">
                    <canvas id="chart-serv-donut"></canvas>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
                        <p class="text-[10px] text-slate-500">Total</p>
                        <p class="text-base font-black text-white">€${servTotal}</p>
                    </div>
                </div>
                <div class="space-y-1.5 flex-1 min-w-0">${servLegend}</div>
            </div>`
            : '<p class="text-xs text-slate-500 text-center py-10">Sin citas cobradas este mes</p>';

        const citasHoyRows = citasHoySort.length
            ? citasHoySort.map(c => {
                const ec = { pendiente: 'text-amber-400 bg-amber-400/10', confirmado: 'text-sky-400 bg-sky-400/10', completado: 'text-emerald-400 bg-emerald-400/10', cancelado: 'text-red-400 bg-red-400/10' }[c.estado] || 'text-slate-400 bg-slate-400/10';
                return `<div class="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition">
                    <div>
                        <p class="text-xs font-semibold text-white">${c.hora || '?:??'} · ${c.cliente || 'Sin nombre'}</p>
                        <p class="text-[10px] text-slate-500">${c.servicio || ''}${c.precio ? ' · €' + c.precio : ''}</p>
                    </div>
                    <span class="text-[10px] font-bold ${ec} px-2 py-0.5 rounded-full capitalize">${c.estado || 'pendiente'}</span>
                </div>`;
            }).join('')
            : '<p class="text-xs text-slate-500 text-center py-8">No hay citas para hoy</p>';

        const cliRows = topClientes.length
            ? topClientes.map(([nombre, cnt], i) => {
                const pct    = Math.round((cnt / topClientes[0][1]) * 100);
                const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
                return `<div class="px-1 py-1.5">
                    <div class="flex items-center justify-between mb-0.5">
                        <div class="flex items-center gap-1.5">
                            <span class="text-sm w-5 text-center">${medals[i]}</span>
                            <span class="text-xs text-slate-300 truncate max-w-[120px]">${nombre}</span>
                        </div>
                        <span class="text-[11px] font-bold text-[#38BDF8]">${cnt} visitas</span>
                    </div>
                    <div class="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-1">
                        <div class="h-1 rounded-full bg-gradient-to-r from-[#2B93A6] to-[#38BDF8]" style="width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('')
            : '<p class="text-xs text-slate-500 text-center py-6">Sin datos todavía</p>';

        const bdGrid = [
            ['fa-users',       'text-teal-400',   'Clientes',  clientes.length],
            ['fa-user-tie',    'text-blue-400',   'Empleados', empleados.length],
            ['fa-tags',        'text-amber-400',  'Servicios', tarifas.length],
            ['fa-calendar-day','text-purple-400', 'Citas',     citas.length],
        ].map(([ico, col, label, val]) =>
            `<div class="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3 flex items-center gap-2">
                <i class="fas ${ico} ${col} text-sm"></i>
                <div><p class="text-[10px] text-slate-500">${label}</p><p class="text-base font-black text-white">${val}</p></div>
            </div>`).join('');

        const widgetHTML = {
            kpis:     W('kpis', 'col-span-2', kpisHTML),
            linea:    W('linea', 'col-span-2',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <i class="fas fa-chart-area text-[#38BDF8] text-sm"></i>
                    <p class="text-sm font-bold text-white">Ingresos últimos 30 días</p>
                    <span class="text-xs text-slate-500 ml-1">€${ing30Total} total</span>
                </div>
                <div class="p-4" style="height:190px"><canvas id="chart-ing30d"></canvas></div>`),
            servicios: W('servicios', 'col-span-1',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <i class="fas fa-chart-pie text-purple-400 text-sm"></i>
                    <p class="text-sm font-bold text-white">Servicios este mes</p>
                </div>${servDonut}`),
            balance:  W('balance', 'col-span-1',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <i class="fas fa-balance-scale text-amber-400 text-sm"></i>
                    <p class="text-sm font-bold text-white">Ingresos vs Gastos</p>
                    <span class="text-xs text-slate-500">6 meses</span>
                </div>
                <div class="p-4" style="height:200px"><canvas id="chart-bal6m"></canvas></div>`),
            citas:    W('citas', 'col-span-1',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-calendar-day text-[#38BDF8] text-sm"></i>
                        <p class="text-sm font-bold text-white">Citas de hoy</p>
                    </div>
                    <span class="text-xs font-bold text-slate-400 bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full">${citasHoySort.length}</span>
                </div>
                <div class="divide-y divide-[rgba(255,255,255,0.05)] max-h-52 overflow-y-auto">${citasHoyRows}</div>`),
            clientes: W('clientes', 'col-span-1',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <i class="fas fa-star text-amber-400 text-sm"></i>
                    <p class="text-sm font-bold text-white">Clientes frecuentes</p>
                </div>
                <div class="p-3 space-y-1">${cliRows}</div>`),
            bd:       W('bd', 'col-span-1',
                `<div class="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <i class="fas fa-database text-slate-400 text-sm"></i>
                    <p class="text-sm font-bold text-white">Base de datos</p>
                </div>
                <div class="grid grid-cols-2 gap-2 p-3">${bdGrid}</div>`),
        };

        const renderedWidgets = wOrder.filter(id => widgetHTML[id]).map(id => widgetHTML[id]).join('');

        return `
        <style>
            .stats-widget { transition: opacity .15s, box-shadow .15s; }
            .stats-widget.stats-dragging { opacity: .35; }
            .stats-widget.stats-drag-over { box-shadow: 0 0 0 2px #2B93A6 !important; }
        </style>
        <div class="space-y-3 pb-4">
            <div class="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <div class="flex items-center gap-3">
                    <h1 class="text-2xl font-bold text-white"><i class="fas fa-chart-pie text-[#2B93A6] mr-2"></i>Estadísticas</h1>
                    <span class="text-xs text-slate-500 capitalize">${mesLabel}</span>
                </div>
                <button id="stats-personalizar-btn" class="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition">
                    <i class="fas fa-sliders-h text-[#38BDF8]"></i> Personalizar
                </button>
            </div>
            <div id="stats-personalizar-panel" class="hidden glass border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                <p class="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <i class="fas fa-eye text-[#38BDF8]"></i> Mostrar / ocultar · arrastra <i class="fas fa-grip-vertical mx-0.5"></i> para reordenar
                </p>
                <div class="flex flex-wrap gap-2">
                    ${WIDGETS.map(w =>
                        `<label class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition hover:bg-[rgba(255,255,255,0.04)] select-none ${hidden.includes(w.id) ? 'border-[rgba(255,255,255,0.07)] text-slate-500' : 'border-[rgba(43,147,166,0.3)] text-slate-300'}">
                            <input type="checkbox" data-widget-toggle="${w.id}" class="accent-[#2B93A6]" ${hidden.includes(w.id) ? '' : 'checked'}>
                            <i class="fas ${w.icon} text-xs ${hidden.includes(w.id) ? 'text-slate-600' : 'text-[#38BDF8]'}"></i>
                            <span class="text-xs">${w.label}</span>
                        </label>`).join('')}
                </div>
            </div>
            <div id="stats-grid" class="grid grid-cols-2 gap-4">
                ${renderedWidgets}
            </div>
        </div>`;
    }

    _setupEstadisticasListeners() {
        // Personalizar panel toggle
        document.getElementById('stats-personalizar-btn')?.addEventListener('click', () => {
            document.getElementById('stats-personalizar-panel')?.classList.toggle('hidden');
        });

        // Widget visibility toggles
        document.querySelectorAll('[data-widget-toggle]').forEach(chk => {
            chk.addEventListener('change', () => {
                const id   = chk.dataset.widgetToggle;
                const list = JSON.parse(localStorage.getItem('nt_stats_hidden') || '[]');
                if (chk.checked) { const i = list.indexOf(id); if (i > -1) list.splice(i, 1); }
                else if (!list.includes(id)) list.push(id);
                localStorage.setItem('nt_stats_hidden', JSON.stringify(list));
                document.querySelector(`[data-widget-id="${id}"]`)?.classList.toggle('hidden', !chk.checked);
            });
        });

        // Drag & drop reorder
        this._setupStatsDrag();

        // Init Chart.js after DOM settles
        setTimeout(() => this._initStatsCharts(), 50);

        // DataManager live refresh
        if (window.dataManager) {
            this._estadUnsub = window.dataManager.suscribirse('citas', () => {
                if (!document.getElementById('stats-grid')) return;
                this._destroyStatsCharts();
                const content = document.getElementById('inicio-tab-content') || this.contentArea;
                if (content) { content.innerHTML = this._renderEstadisticasView(); setTimeout(() => this._setupEstadisticasListeners(), 0); }
            });
        }
    }

    _setupStatsDrag() {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;
        let dragSrc = null;
        grid.querySelectorAll('.stats-widget').forEach(widget => {
            widget.addEventListener('dragstart', e => {
                dragSrc = widget;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => widget.classList.add('stats-dragging'), 0);
            });
            widget.addEventListener('dragend', () => {
                widget.classList.remove('stats-dragging');
                grid.querySelectorAll('.stats-widget').forEach(w => w.classList.remove('stats-drag-over'));
                dragSrc = null;
                localStorage.setItem('nt_stats_order',
                    JSON.stringify([...grid.querySelectorAll('.stats-widget')].map(w => w.dataset.widgetId)));
            });
            widget.addEventListener('dragover', e => {
                e.preventDefault();
                if (dragSrc && dragSrc !== widget) {
                    grid.querySelectorAll('.stats-widget').forEach(w => w.classList.remove('stats-drag-over'));
                    widget.classList.add('stats-drag-over');
                }
            });
            widget.addEventListener('dragleave', () => widget.classList.remove('stats-drag-over'));
            widget.addEventListener('drop', e => {
                e.preventDefault();
                widget.classList.remove('stats-drag-over');
                if (dragSrc && dragSrc !== widget) {
                    const all = [...grid.querySelectorAll('.stats-widget')];
                    all.indexOf(dragSrc) < all.indexOf(widget) ? widget.after(dragSrc) : widget.before(dragSrc);
                }
            });
        });
    }

    _initStatsCharts() {
        if (typeof Chart === 'undefined') return;
        const d = this._estadChartData;
        if (!d) return;
        this._stats_charts = [];
        const darkGrid = 'rgba(255,255,255,0.04)';
        Chart.defaults.color     = '#94a3b8';
        Chart.defaults.font.size = 11;

        // 1. Line chart — ingresos 30 días
        const c1 = document.getElementById('chart-ing30d');
        if (c1) this._stats_charts.push(new Chart(c1, {
            type: 'line',
            data: { labels: d.ing30.labels, datasets: [{
                label: 'Ingresos', data: d.ing30.data,
                borderColor: '#2B93A6', backgroundColor: 'rgba(43,147,166,0.12)',
                fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2,
            }]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' €' + Math.round(ctx.raw) } } },
                scales: {
                    x: { grid: { color: darkGrid }, ticks: { maxTicksLimit: 10 } },
                    y: { grid: { color: darkGrid }, ticks: { callback: v => '€' + v }, beginAtZero: true },
                },
            },
        }));

        // 2. Doughnut — servicios
        const c2 = document.getElementById('chart-serv-donut');
        if (c2 && d.servs.data.length) this._stats_charts.push(new Chart(c2, {
            type: 'doughnut',
            data: { labels: d.servs.labels, datasets: [{ data: d.servs.data, backgroundColor: d.servs.colors, borderWidth: 0, hoverOffset: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' €' + ctx.raw } } },
                cutout: '68%',
            },
        }));

        // 3. Bar — balance 6 meses
        const c3 = document.getElementById('chart-bal6m');
        if (c3) this._stats_charts.push(new Chart(c3, {
            type: 'bar',
            data: { labels: d.bal6m.labels, datasets: [
                { label: 'Ingresos', data: d.bal6m.ing, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 4 },
                { label: 'Gastos',   data: d.bal6m.gas, backgroundColor: 'rgba(239,68,68,0.7)',   borderRadius: 4 },
            ]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, padding: 12 } },
                    tooltip: { callbacks: { label: ctx => ' €' + Math.round(ctx.raw) } },
                },
                scales: {
                    x: { grid: { color: darkGrid } },
                    y: { grid: { color: darkGrid }, ticks: { callback: v => '€' + v }, beginAtZero: true },
                },
            },
        }));
    }

    _destroyStatsCharts() {
        (this._stats_charts || []).forEach(c => { try { c?.destroy(); } catch (_) {} });
        this._stats_charts = [];
    }

    // ── Vista Tutorial ────────────────────────────────────────────
    _renderTutorialView() {
        const pasos = [
            {
                n: '1', icon: 'fa-store', color: 'text-[#38BDF8]', border: 'border-[rgba(43,147,166,0.3)]',
                titulo: 'Configura tu negocio',
                desc: 'Ve a <strong>Configuración</strong> (icono engranaje abajo) y rellena el nombre, CIF y datos de tu empresa. Estos datos aparecerán en tus facturas.',
            },
            {
                n: '2', icon: 'fa-tags', color: 'text-amber-400', border: 'border-amber-500/20',
                titulo: 'Añade tus servicios y tarifas',
                desc: 'En <strong>Mis Datos → Tarifas</strong> crea tus servicios con precio. Luego aparecerán automáticamente al crear citas y facturas.',
            },
            {
                n: '3', icon: 'fa-user-tie', color: 'text-blue-400', border: 'border-blue-500/20',
                titulo: 'Da de alta a tu equipo',
                desc: 'En <strong>Mis Datos → Equipo</strong> añade empleados. Luego podrás asignarles citas y filtrar la agenda por persona.',
            },
            {
                n: '4', icon: 'fa-users', color: 'text-teal-400', border: 'border-teal-500/20',
                titulo: 'Importa tus clientes',
                desc: 'Si tienes clientes en Excel, ve a <strong>Mis Datos → Importar / Exportar</strong>. Descarga la plantilla, rellénala y súbela. Listo en segundos.',
            },
            {
                n: '5', icon: 'fa-calendar-day', color: 'text-purple-400', border: 'border-purple-500/20',
                titulo: 'Crea tu primera cita',
                desc: 'En el <strong>Dashboard</strong> pulsa el botón <em>Cita express</em>: cliente + servicio + hora. O ve a <strong>Planificación → Agenda</strong> para una vista completa del día.',
            },
            {
                n: '6', icon: 'fa-cash-register', color: 'text-emerald-400', border: 'border-emerald-500/20',
                titulo: 'Registra cobros y gastos',
                desc: 'Cuando un cliente paga, pulsa el botón <i class="fas fa-euro-sign"></i> en la cita o ve a <strong>Contabilidad → Caja y gastos</strong>. Eso alimenta las estadísticas automáticamente.',
            },
            {
                n: '7', icon: 'fa-robot', color: 'text-[#38BDF8]', border: 'border-[rgba(43,147,166,0.3)]',
                titulo: 'Usa el Asistente IA',
                desc: 'Pulsa <strong>Ctrl+Espacio</strong> o ve a <strong>Asistente IA</strong> para crear citas con voz, consultar tu agenda o pedir resúmenes del día con lenguaje natural.',
            },
        ];

        return `
        <div class="space-y-5 max-w-2xl">
            <div class="flex items-center gap-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <h1 class="text-2xl font-bold text-white"><i class="fas fa-graduation-cap text-[#2B93A6] mr-2"></i>Bienvenido a NodeTech</h1>
            </div>
            <p class="text-sm text-slate-400">Sigue estos pasos para tener tu negocio funcionando en menos de 10 minutos.</p>

            <div class="space-y-3">
                ${pasos.map(p => `
                <div class="glass border ${p.border} rounded-xl p-4 flex gap-4 hover:bg-[rgba(255,255,255,0.02)] transition">
                    <div class="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center flex-shrink-0">
                        <i class="fas ${p.icon} ${p.color} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-white mb-0.5">
                            <span class="text-xs text-slate-500 mr-1.5 font-normal">Paso ${p.n}</span>${p.titulo}
                        </p>
                        <p class="text-xs text-slate-400 leading-relaxed">${p.desc}</p>
                    </div>
                </div>`).join('')}
            </div>

            <div class="glass border border-[rgba(43,147,166,0.3)] rounded-xl p-4 flex items-start gap-3">
                <i class="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0"></i>
                <p class="text-xs text-slate-400">
                    <strong class="text-white">Consejo:</strong> NodeTech guarda todo automáticamente en la nube. Puedes abrirlo desde cualquier dispositivo con tu cuenta.
                </p>
            </div>
        </div>`;
    }

    // ── Vista Perfil de cuenta ─────────────────────────────────────
    _renderPerfilView() {
        const user = window.firebaseUser;
        const nombre = user?.displayName || document.querySelector('.sidebar-user-name')?.textContent || 'Usuario';
        const email  = user?.email || '—';
        const foto   = user?.photoURL;
        return `
        <div class="max-w-lg mx-auto space-y-5">
            <div class="flex items-center gap-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <h1 class="text-2xl font-bold text-white"><i class="fas fa-user-circle text-[#2B93A6] mr-2"></i>Mi cuenta</h1>
            </div>
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-5">
                <!-- Avatar -->
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-[rgba(43,147,166,0.2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        ${foto ? `<img src="${foto}" class="w-full h-full object-cover">` : '<i class="fas fa-user text-[#38BDF8] text-2xl"></i>'}
                    </div>
                    <div>
                        <p class="text-lg font-bold text-white">${nombre}</p>
                        <p class="text-sm text-[#38BDF8]">${email}</p>
                        <p class="text-xs text-slate-500 mt-0.5">Propietario · Plan Free</p>
                    </div>
                </div>
                <!-- Datos -->
                <div class="space-y-3 pt-2 border-t border-[rgba(255,255,255,0.07)]">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">Nombre</label>
                        <p class="text-sm text-white bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2">${nombre}</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">Email</label>
                        <p class="text-sm text-white bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2">${email}</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">UID de cuenta</label>
                        <p class="text-xs text-slate-500 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 font-mono break-all">${user?.uid || '—'}</p>
                    </div>
                </div>
                <!-- Acciones -->
                <div class="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.07)]">
                    <button id="perfil-btn-password" class="btn-secondary flex-1 px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                        <i class="fas fa-key"></i> Cambiar contraseña
                    </button>
                </div>
            </div>
        </div>`;
    }

    // ── Vista Configuración ───────────────────────────────────────
    _renderConfiguracionView() {
        const cfg = window.BCONFIG || {};
        return `
        <div class="max-w-2xl mx-auto space-y-5">
            <div class="flex items-center gap-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <h1 class="text-2xl font-bold text-white"><i class="fas fa-cog text-[#2B93A6] mr-2"></i>Configuración</h1>
            </div>

            <!-- Datos del negocio -->
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                <div class="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
                    <i class="fas fa-store text-[#38BDF8] text-sm"></i>
                    <span class="font-bold text-white text-sm">Datos del negocio</span>
                </div>
                <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 mb-1">Nombre del negocio</label>
                        <input type="text" id="cfg-nombre-negocio" value="${cfg.nombreNegocio || ''}" placeholder="Ej: Clínica Dental Martínez"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">CIF / NIF</label>
                        <input type="text" id="cfg-cif" value="${cfg.cif || ''}" placeholder="B12345678"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1">Teléfono</label>
                        <input type="text" id="cfg-telefono" value="${cfg.telefono || ''}" placeholder="+34 600 000 000"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 mb-1">Dirección fiscal</label>
                        <input type="text" id="cfg-direccion" value="${cfg.direccion || ''}" placeholder="Calle, número, ciudad"
                            class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                    </div>
                    <div class="sm:col-span-2 flex justify-end">
                        <button id="cfg-guardar-negocio" class="btn-primary px-5 py-2 rounded-lg text-sm flex items-center gap-2">
                            <i class="fas fa-save"></i> Guardar cambios
                        </button>
                    </div>
                </div>
            </div>

            <!-- Notificaciones -->
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                <div class="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
                    <i class="fas fa-bell text-[#38BDF8] text-sm"></i>
                    <span class="font-bold text-white text-sm">Notificaciones</span>
                    <span class="ml-auto text-xs text-slate-500">Próximamente</span>
                </div>
                <div class="p-5 space-y-3">
                    ${[['Recordatorio de cita 24h antes', true], ['Resumen diario por email', false], ['Alerta de factura sin cobrar', true]].map(([label, on]) => `
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-slate-300">${label}</span>
                        <div class="w-10 h-5 rounded-full flex items-center px-0.5 transition opacity-50 cursor-not-allowed ${on ? 'bg-[#2B93A6] justify-end' : 'bg-[rgba(255,255,255,0.1)] justify-start'}">
                            <div class="w-4 h-4 rounded-full bg-white shadow"></div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Seguridad -->
            <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                <div class="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
                    <i class="fas fa-shield-alt text-[#38BDF8] text-sm"></i>
                    <span class="font-bold text-white text-sm">Seguridad</span>
                </div>
                <div class="p-5 flex gap-3">
                    <button id="cfg-btn-password" class="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                        <i class="fas fa-key"></i> Cambiar contraseña
                    </button>
                </div>
            </div>
        </div>`;
    }

    // ── Listeners del dashboard ────────────────────────────────────
    setupDashboardListeners() {
        document.querySelectorAll('.btn-quick-action').forEach(btn => {
            btn.addEventListener('click', () => this._handleQuickAction(btn.dataset.action));
        });

        document.getElementById('btn-edit-actions')?.addEventListener('click', () => this.showQuickActionsEditor());

        // Delegación en timeline: cambio de estado + cobrar
        if (this._estadoClickHandler) {
            document.removeEventListener('click', this._estadoClickHandler);
        }
        document.addEventListener('click', this._estadoClickHandler = (e) => {
            const btnEstado = e.target.closest('.btn-estado-cita');
            if (btnEstado) {
                const id   = btnEstado.dataset.citaId;
                const cita = this.citas.find(c => c.id === id);
                const ciclo = ['pendiente', 'sala-espera', 'en-sillon', 'completado'];
                if (cita) {
                    const siguiente = ciclo[(ciclo.indexOf(cita.estado || 'pendiente') + 1) % ciclo.length];
                    this.cambiarEstadoCita(id, siguiente);
                }
                return;
            }
            const btnCobrar = e.target.closest('.btn-cobrar-cita');
            if (btnCobrar) this.showCobroModal(btnCobrar.dataset.citaId);
        });
    }

    // ── Dashboard con KPIs + timeline ─────────────────────────────
    renderDashboard() {
        const hoy      = this._hoyStr();
        const ahora    = new Date();
        const citasHoy = this.citas
            .filter(c => c.fecha === hoy)
            .sort((a, b) => a.hora.localeCompare(b.hora));

        const cfg           = window.BCONFIG || {};
        const enSillonLabel = cfg.salaSingular ? `En ${cfg.salaSingular.toLowerCase()}` : 'En sala';
        const completadas   = citasHoy.filter(c => c.estado === 'completado').length;
        const enEspera      = citasHoy.filter(c => c.estado === 'sala-espera').length;
        const enSillon      = citasHoy.filter(c => c.estado === 'en-sillon').length;
        const cobradas      = citasHoy.filter(c => c.cobrado);
        const facturado     = cobradas.reduce((s, c) => s + parseInt(c.precio || 0), 0);
        const pendFact      = citasHoy
            .filter(c => c.estado === 'completado' && !c.cobrado)
            .reduce((s, c) => s + parseInt(c.precio || 0), 0);

        const ESTADOS = {
            'pendiente':   { label: 'Pendiente',   icon: 'fa-circle-dot',     cls: 'bg-slate-700/60 text-slate-300' },
            'sala-espera': { label: 'Sala espera',  icon: 'fa-hourglass-half', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
            'en-sillon':   { label: enSillonLabel,  icon: 'fa-bolt',           cls: 'bg-blue-500/20 text-blue-300 border border-blue-400/30' },
            'completado':  { label: 'Completado',   icon: 'fa-check-circle',   cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
        };

        const renderCitaRow = (cita) => {
            const estado   = cita.estado || 'pendiente';
            const ecfg     = ESTADOS[estado] || ESTADOS['pendiente'];
            const colors   = window.agendaManager?._buildColorMap?.()?.[cita.servicio] || { border: '#6B7280' };
            const [h, m]   = cita.hora.split(':');
            const citaTime = new Date(ahora); citaTime.setHours(parseInt(h), parseInt(m), 0, 0);
            const pasada   = citaTime < ahora && estado !== 'completado' && estado !== 'en-sillon';
            const proxima  = !pasada && (citaTime - ahora) < 20 * 60 * 1000 && (citaTime - ahora) > 0;
            return `
                <div class="flex items-center gap-2 px-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(43,147,166,0.06)] transition group ${pasada ? 'opacity-50' : ''}">
                    <div class="w-10 text-xs font-bold ${proxima ? 'text-orange-400' : 'text-slate-500'} flex-shrink-0 text-right tabular-nums">${cita.hora}</div>
                    <div class="w-0.5 h-8 rounded-full flex-shrink-0" style="background:${colors.border}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-white leading-tight truncate">${cita.cliente}</p>
                        <p class="text-xs text-slate-400 truncate">${cita.servicio}${cita.recurso ? ' · <span class=\'text-[#38BDF8]\'>' + cita.recurso.split(' ').slice(0, 2).join(' ') + '</span>' : ''}</p>
                    </div>
                    ${cita.precio && parseInt(cita.precio) > 0
                        ? `<div class="text-xs font-bold ${cita.cobrado ? 'text-emerald-500/50 line-through' : 'text-emerald-300'} flex-shrink-0">€${parseInt(cita.precio)}</div>`
                        : ''}
                    <button class="btn-estado-cita flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition flex-shrink-0 cursor-pointer ${ecfg.cls}"
                            data-cita-id="${cita.id}" title="Clic para cambiar estado">
                        <i class="fas ${ecfg.icon} text-xs"></i>
                        <span class="hidden md:inline">${ecfg.label}</span>
                    </button>
                    ${!cita.cobrado
                        ? `<button class="btn-cobrar-cita opacity-0 group-hover:opacity-100 transition px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex-shrink-0" data-cita-id="${cita.id}" title="Cobrar"><i class="fas fa-euro-sign"></i></button>`
                        : `<span class="text-emerald-500 flex-shrink-0 text-xs" title="Cobrado"><i class="fas fa-check-double"></i></span>`
                    }
                </div>
            `;
        };

        return `
            <div class="flex flex-col gap-2 h-full">

                <!-- KPIs -->
                <div class="grid grid-cols-4 gap-1 flex-shrink-0">
                    <div class="glass rounded-lg p-2.5 border border-[rgba(43,147,166,0.25)]">
                        <div class="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">💰 Cobrado</div>
                        <div class="text-lg font-black text-white mt-0.5">€${facturado}</div>
                        <div class="text-[10px] text-[#2B93A6]">${cobradas.length} pago${cobradas.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="glass rounded-lg p-2.5 border border-[rgba(255,255,255,0.08)]">
                        <div class="text-[10px] font-bold text-slate-300 uppercase tracking-wider">⚡ ${cfg.clientePlural || 'Atendidos'}</div>
                        <div class="text-lg font-black text-white mt-0.5">${completadas + enSillon}/${citasHoy.length}</div>
                        <div class="text-[10px] text-slate-400">${completadas} completos</div>
                    </div>
                    <div class="glass rounded-lg p-2.5 border border-amber-500/20">
                        <div class="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⏳ En espera</div>
                        <div class="text-lg font-black text-white mt-0.5">${enEspera}</div>
                        <div class="text-[10px] text-amber-400">${enSillon} ${cfg.salaSingular ? `en ${cfg.salaSingular.toLowerCase()}` : 'en sala'}</div>
                    </div>
                    <div class="glass rounded-lg p-2.5 border ${pendFact > 0 ? 'border-orange-500/20' : 'border-[rgba(255,255,255,0.08)]'}">
                        <div class="text-[10px] font-bold ${pendFact > 0 ? 'text-orange-400' : 'text-slate-500'} uppercase tracking-wider">💳 Pendiente</div>
                        <div class="text-lg font-black ${pendFact > 0 ? 'text-orange-300' : 'text-slate-500'} mt-0.5">€${pendFact}</div>
                        <div class="text-[10px] ${pendFact > 0 ? 'text-orange-400' : 'text-slate-500'}">por cobrar</div>
                    </div>
                </div>

                <!-- Acciones rápidas personalizables -->
                <div class="flex-shrink-0">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones rápidas</span>
                        <button id="btn-edit-actions" class="text-[10px] text-slate-500 hover:text-[#38BDF8] transition flex items-center gap-1">
                            <i class="fas fa-pen text-[10px]"></i> Personalizar
                        </button>
                    </div>
                    <div class="grid grid-cols-4 gap-2" id="quick-actions-grid">
                        ${this._renderQuickActionButtons()}
                    </div>
                </div>

                <!-- Timeline de hoy -->
                <div class="glass rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden flex flex-col flex-1 min-h-0">
                    <div class="flex items-center justify-between bg-[rgba(43,147,166,0.1)] px-3 py-2 border-b border-[rgba(43,147,166,0.2)] flex-shrink-0">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-calendar-day text-[#2B93A6] text-sm"></i>
                            <span class="text-xs font-bold text-[#38BDF8]">Hoy — ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div class="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block"></span>Pendiente</span>
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>Espera</span>
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>Sillón</span>
                            <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>Listo</span>
                        </div>
                    </div>
                    <div class="overflow-y-auto flex-1" id="timeline-hoy">
                        ${citasHoy.length > 0
                            ? citasHoy.map(c => renderCitaRow(c)).join('')
                            : `<div class="p-8 text-center"><i class="fas fa-calendar-check text-3xl text-slate-700 mb-2 block"></i><p class="text-slate-500 text-sm">Sin citas para hoy</p></div>`
                        }
                    </div>
                </div>

            </div>
        `;
    }

    // ── Helpers fecha local (sin UTC) ─────────────────────────────
    _hoyStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    // ── Helpers de estado ─────────────────────────────────────────
    getCitasHoy() {
        const hoy = this._hoyStr();
        return this.citas.filter(c => c.fecha === hoy);
    }

    getProximaCita() {
        const ahora = new Date();
        const hoy = this._hoyStr();
        const citasProximas = this.citas
            .filter(c => {
                if (c.fecha > hoy) return true;
                if (c.fecha === hoy && c.hora > ahora.toTimeString().substring(0, 5)) return true;
                return false;
            })
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return new Date(a.fecha) - new Date(b.fecha);
                return a.hora.localeCompare(b.hora);
            });
        return citasProximas[0] || null;
    }

    getProximasCitas(limite = 5) {
        const ahora = new Date();
        const hoy = this._hoyStr();
        const citasProximas = this.citas
            .filter(c => {
                if (c.fecha > hoy) return true;
                if (c.fecha === hoy && c.hora > ahora.toTimeString().substring(0, 5)) return true;
                return false;
            })
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return new Date(a.fecha) - new Date(b.fecha);
                return a.hora.localeCompare(b.hora);
            });
        return citasProximas.slice(0, limite);
    }

    // ── Carga citas desde Firebase (DataManager) ───────────────────
    loadCitas() {
        if (window.dataManager?.cache?.citas) {
            this.citas = window.dataManager.cache.citas;
        } else {
            this.citas = [];
        }
        if (window.dataManager) {
            window.dataManager.suscribirse('citas', (citas) => {
                this.citas = citas;
                if (this.currentView === 'dashboard' || this.currentView === 'agenda') {
                    this.loadView(this.currentView);
                }
            });
        }
    }

    // Firebase gestiona la persistencia; this.citas es caché local
    saveCitas() {}

    saveCita(cita) {
        if (window.dataManager && cita.id) {
            window.dataManager.actualizarCita(cita.id, { hora: cita.hora, fecha: cita.fecha, recurso: cita.recurso || '' })
                .catch(err => console.error('❌ Error guardando cita en Firestore:', err));
        }
        const idx = this.citas.findIndex(c => c.id === cita.id);
        if (idx > -1) this.citas[idx] = { ...this.citas[idx], ...cita };
    }

    deleteCita(citaId) {
        this.citas = this.citas.filter(c => c.id !== citaId);
        // Eliminar de Firestore
        if (window.dataManager && typeof window.dataManager.actualizarCita === 'function') {
            // DataManager no tiene eliminarCita, usamos deleteDoc directamente
            if (window.fs && window.db && window.firebaseUser) {
                window.fs.deleteDoc(
                    window.fs.doc(window.db, 'users', window.firebaseUser.uid, 'citas', citaId)
                ).catch(err => console.error('❌ Error eliminando cita:', err));
            } else if (window.db && window.firebaseUser) {
                import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
                    .then(({ deleteDoc, doc }) => deleteDoc(doc(window.db, 'users', window.firebaseUser.uid, 'citas', citaId)))
                    .catch(err => console.error('❌ Error eliminando cita:', err));
            }
        }
        this.loadView('agenda');
    }

    // ========== MÉTODOS GLOBALES ==========
    navigateTo(page) {
        document.body.style.opacity = '0.5';
        setTimeout(() => {
            window.location.href = page;
        }, 200);
    }

    logout() {
        if (confirm('¿Deseas cerrar sesión?')) {
            const doLogout = async () => {
                try {
                    if (window.firebaseSignOut) await window.firebaseSignOut();
                } catch { /* ignorar errores de signOut */ }
                window.location.replace('sign_up.html');
            };
            doLogout();
        }
    }

    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('inicio.html');
        }
    }

    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ── Modal nueva cita ──────────────────────────────────────────
    showNewCitaModal(predatos = {}) {
        const SERVICIOS = NavigationManager.SERVICIOS;
        const PRECIOS   = NavigationManager.PRECIOS;
        const cfg       = window.BCONFIG || {};

        const modalHTML = `
            <div id="modal-cita" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                <div class="bg-[#0f1e35] border border-[rgba(43,147,166,0.25)] rounded-xl shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
                    <div class="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-calendar-plus text-[#2B93A6] text-lg"></i>
                            <h3 class="text-lg font-bold text-white">Nueva cita</h3>
                        </div>
                        <button id="modal-close" class="text-slate-400 hover:text-white transition">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <form id="form-nueva-cita" class="space-y-4 p-5">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">${cfg.clienteSingular || 'Cliente'} *</label>
                            <input type="text" id="cita-cliente"
                                placeholder="${cfg.placeholderCliente || 'Nombre del cliente'}"
                                value="${predatos.cliente || ''}"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">${cfg.servicioSingular || 'Servicio'} *</label>
                            <select id="cita-servicio"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                                <option value="" class="bg-[#0f1e35]">${cfg.placeholderServicio || 'Selecciona un servicio'}</option>
                                ${SERVICIOS.map(s => `<option value="${s}" class="bg-[#0f1e35]" ${predatos.servicio === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Fecha *</label>
                            <input type="date" id="cita-fecha"
                                value="${predatos.fecha || new Date().toISOString().split('T')[0]}"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 mb-1">Hora inicio *</label>
                                <input type="time" id="cita-hora" value="${predatos.hora || '09:00'}"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-300 mb-1">Hora fin *</label>
                                <input type="time" id="cita-horaFin" value="${predatos.horaFin || '10:00'}"
                                    class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Duracion (min)</label>
                            <input type="number" id="cita-duracion" value="${predatos.duracion || 60}" min="15" step="15"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Precio (€)</label>
                            <input type="number" id="cita-precio"
                                placeholder="0" value="${predatos.precio || ''}" min="0" step="5"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">${cfg.empleadoSingular || 'Empleado'} / ${cfg.salaSingular || 'Sala'}</label>
                            <select id="cita-recurso"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                                <option value="" class="bg-[#0f1e35]">Auto-asignar</option>
                                ${this.recursos.map(r => `<option value="${r}" class="bg-[#0f1e35]" ${predatos.recurso === r ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Notas</label>
                            <textarea id="cita-notas" placeholder="Observaciones, indicaciones..." rows="2"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6] resize-none">${predatos.notas || ''}</textarea>
                        </div>
                        <div class="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                            <button type="button" id="modal-cancel"
                                class="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.06)] text-slate-300 rounded-lg font-semibold text-sm hover:bg-[rgba(255,255,255,0.1)] transition">
                                Cancelar
                            </button>
                            <button type="submit" class="flex-1 px-4 py-2 btn-primary rounded-lg font-semibold text-sm">
                                Guardar cita
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modal-cita')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const selectServicio = document.getElementById('cita-servicio');
        const inputPrecio    = document.getElementById('cita-precio');
        if (selectServicio && inputPrecio) {
            selectServicio.addEventListener('change', () => {
                const precio = PRECIOS[selectServicio.value];
                if (precio !== undefined && !inputPrecio.value) inputPrecio.value = precio;
            });
        }

        document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('modal-cita')?.remove());
        document.getElementById('modal-cancel')?.addEventListener('click', () => document.getElementById('modal-cita')?.remove());

        document.getElementById('form-nueva-cita')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const nueva = {
                id:       'c' + Date.now(),
                cliente:  document.getElementById('cita-cliente').value.trim(),
                servicio: document.getElementById('cita-servicio').value,
                fecha:    document.getElementById('cita-fecha').value,
                hora:     document.getElementById('cita-hora').value,
                horaFin:  document.getElementById('cita-horaFin')?.value || '',
                precio:   document.getElementById('cita-precio').value || '0',
                recurso:  document.getElementById('cita-recurso')?.value || '',
                notas:    document.getElementById('cita-notas')?.value || '',
                duracion: parseInt(document.getElementById('cita-duracion')?.value || 60),
            };
            if (nueva.cliente && nueva.servicio && nueva.fecha && nueva.hora) {
                this._guardarCitaFirebase(nueva).then(id => {
                    if (id) nueva.id = id;
                    document.getElementById('modal-cita')?.remove();
                    this.showNotification(`✅ Cita de ${nueva.servicio} para ${nueva.cliente} guardada`, 'success');
                    if (this.currentView === 'agenda' && this.currentManager) {
                        this.currentManager.refresh?.();
                    } else if (this.currentView === 'dashboard') {
                        this.loadView('dashboard');
                    }
                });
            }
        });
    }

    // ── Cambia estado de cita en Firebase ─────────────────────────
    cambiarEstadoCita(id, nuevoEstado) {
        const cita = this.citas.find(c => c.id === id);
        if (!cita) return;
        cita.estado = nuevoEstado;
        const cfg           = window.BCONFIG || {};
        const enSillonLabel = cfg.salaSingular ? `En ${cfg.salaSingular.toLowerCase()}` : 'En sala';
        if (window.dataManager && typeof window.dataManager.actualizarCita === 'function') {
            window.dataManager.actualizarCita(id, { estado: nuevoEstado }).catch(() => {});
        } else if (window.fs && window.db && window.firebaseUser) {
            window.fs.updateDoc(window.fs.doc(window.db, 'users', window.firebaseUser.uid, 'citas', id), { estado: nuevoEstado }).catch(() => {});
        }
        const ICONS = { 'pendiente': '○', 'sala-espera': '⏳', 'en-sillon': '⚡', 'completado': '✅' };
        const ETIQ  = { 'pendiente': 'Pendiente', 'sala-espera': 'En sala de espera', 'en-sillon': enSillonLabel, 'completado': 'Completado' };
        this.showNotification(`${ICONS[nuevoEstado]} ${cita.cliente} → ${ETIQ[nuevoEstado]}`, 'success');
        if (this.currentView === 'dashboard') this.loadView('dashboard');
    }

    // ── Modal cobro con método de pago ────────────────────────────
    showCobroModal(citaId) {
        const cita   = citaId ? this.citas.find(c => c.id === citaId) : null;
        const nombre = (cita?.cliente || '').replace(/"/g, '&quot;');
        const precio = cita?.precio  || '';

        const modalHTML = `
            <div id="modal-cobro" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div class="bg-[#0f1e35] border border-[rgba(43,147,166,0.3)] rounded-xl shadow-2xl w-full max-w-sm">
                    <div class="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-cash-register text-emerald-400 text-lg"></i>
                            <h3 class="text-base font-bold text-white">Registrar cobro</h3>
                        </div>
                        <button id="cobro-close" class="text-slate-400 hover:text-white transition"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="form-cobro" class="p-5 space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">${window.BCONFIG?.clienteSingular || 'Cliente'}</label>
                            <input type="text" id="cobro-paciente" value="${nombre}" placeholder="${window.BCONFIG?.placeholderCliente || 'Nombre del cliente'}"
                                class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Importe (€)</label>
                            <input type="number" id="cobro-importe" value="${precio}" placeholder="0" min="0" step="5"
                                class="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-2xl font-black focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2">Método de pago</label>
                            <div class="grid grid-cols-3 gap-2" id="cobro-metodos">
                                <button type="button" class="cobro-metodo py-2.5 rounded-lg text-xs font-bold border-2 border-emerald-500 text-emerald-300 bg-emerald-500/10 transition" data-metodo="Efectivo">
                                    <i class="fas fa-money-bill-wave block text-lg mb-1"></i>Efectivo
                                </button>
                                <button type="button" class="cobro-metodo py-2.5 rounded-lg text-xs font-bold border-2 border-[rgba(255,255,255,0.1)] text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition" data-metodo="Tarjeta">
                                    <i class="fas fa-credit-card block text-lg mb-1"></i>Tarjeta
                                </button>
                                <button type="button" class="cobro-metodo py-2.5 rounded-lg text-xs font-bold border-2 border-[rgba(255,255,255,0.1)] text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition" data-metodo="Transferencia">
                                    <i class="fas fa-university block text-lg mb-1"></i>Transfer.
                                </button>
                            </div>
                            <input type="hidden" id="cobro-metodo-val" value="Efectivo">
                        </div>
                        <button type="submit" class="w-full py-3 btn-primary rounded-xl font-bold text-sm">
                            <i class="fas fa-check mr-2"></i>Cobrar y completar
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modal-cobro')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.querySelectorAll('.cobro-metodo').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cobro-metodo').forEach(b => {
                    b.classList.remove('border-emerald-500', 'text-emerald-300', 'bg-emerald-500/10');
                    b.classList.add('border-[rgba(255,255,255,0.1)]', 'text-slate-300');
                });
                btn.classList.add('border-emerald-500', 'text-emerald-300', 'bg-emerald-500/10');
                btn.classList.remove('border-[rgba(255,255,255,0.1)]', 'text-slate-300');
                document.getElementById('cobro-metodo-val').value = btn.dataset.metodo;
            });
        });

        document.getElementById('cobro-close')?.addEventListener('click', () => document.getElementById('modal-cobro')?.remove());

        document.getElementById('form-cobro')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const paciente = document.getElementById('cobro-paciente').value.trim() || (window.BCONFIG?.clienteSingular || 'Cliente');
            const importe  = parseFloat(document.getElementById('cobro-importe').value) || 0;
            const metodo   = document.getElementById('cobro-metodo-val').value;

            if (cita) {
                cita.cobrado    = true;
                cita.metodoPago = metodo;
                cita.estado     = 'completado';
                if (window.dataManager && typeof window.dataManager.actualizarCita === 'function') {
                    window.dataManager.actualizarCita(citaId, { cobrado: true, metodoPago: metodo, estado: 'completado' }).catch(() => {});
                } else if (window.fs && window.db && window.firebaseUser) {
                    window.fs.updateDoc(window.fs.doc(window.db, 'users', window.firebaseUser.uid, 'citas', citaId), { cobrado: true, metodoPago: metodo, estado: 'completado' }).catch(() => {});
                }
            }

            if (window.dataManager) {
                try {
                    await window.dataManager.crearIngreso({
                        concepto:   `${window.BCONFIG?.servicioSingular || 'Servicio'} · ${paciente}`,
                        tipo:       'ingreso',
                        importe,
                        fecha:      new Date().toISOString().split('T')[0],
                        categoria:  'Tratamientos',
                        metodoPago: metodo,
                        citaId:     citaId || null,
                    });
                } catch (_) {}
            }

            document.getElementById('modal-cobro')?.remove();
            this.showNotification(`✅ €${importe} cobrados a ${paciente} (${metodo})`, 'success');
            if (this.currentView === 'dashboard') this.loadView('dashboard');
        });
    }

    // ── Cita express (3 clicks, misma jornada) ────────────────────
    showQuickCitaModal() {
        const SERVICIOS  = NavigationManager.SERVICIOS;
        const PRECIOS    = NavigationManager.PRECIOS;
        const cfg        = window.BCONFIG || {};
        const horaActual = `${new Date().getHours().toString().padStart(2, '0')}:00`;

        const modalHTML = `
            <div id="modal-express" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div class="bg-[#0f1e35] border border-[rgba(43,147,166,0.3)] rounded-xl shadow-2xl w-full max-w-sm">
                    <div class="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-bolt text-[#38BDF8] text-lg"></i>
                            <h3 class="text-base font-bold text-white">Cita express</h3>
                            <span class="text-xs text-slate-500 bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">HOY</span>
                        </div>
                        <button id="express-close" class="text-slate-400 hover:text-white transition"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="form-express" class="p-5 space-y-4">
                        <input type="text" id="exp-cliente" placeholder="${cfg.placeholderCliente || 'Nombre del cliente'}" autofocus
                            class="w-full px-3 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                        <div>
                            <div class="text-xs font-bold text-slate-400 mb-2">${cfg.servicioSingular || 'Servicio'}</div>
                            <div class="flex flex-wrap gap-1.5" id="exp-chips">
                                ${SERVICIOS.map(s => `
                                    <button type="button" class="exp-servicio px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[rgba(255,255,255,0.12)] text-slate-300 hover:border-[#2B93A6] hover:text-white transition"
                                            data-servicio="${s}" data-precio="${PRECIOS[s] || 0}">${s}</button>
                                `).join('')}
                            </div>
                            <input type="hidden" id="exp-servicio-val">
                        </div>
                        <div class="flex gap-3">
                            <div class="flex-1">
                                <label class="block text-xs font-bold text-slate-400 mb-1">Hora</label>
                                <input type="time" id="exp-hora" value="${horaActual}"
                                    class="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" required>
                            </div>
                            <div class="flex-1">
                                <label class="block text-xs font-bold text-slate-400 mb-1">Precio €</label>
                                <input type="number" id="exp-precio" placeholder="auto"
                                    class="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2B93A6]" min="0" step="5">
                            </div>
                        </div>
                        <button type="submit" id="btn-express-submit" disabled
                            class="w-full py-3 bg-[rgba(43,147,166,0.2)] text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed transition">
                            ${cfg.placeholderServicio || 'Selecciona un servicio'}
                        </button>
                        <p class="text-center">
                            <button type="button" id="btn-mas-opciones" class="text-xs text-slate-500 underline hover:text-slate-300 transition">Más opciones</button>
                        </p>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modal-express')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        let servicioSel = '';

        document.querySelectorAll('.exp-servicio').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.exp-servicio').forEach(b => b.classList.remove('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.2)]', 'text-white'));
                btn.classList.add('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.2)]', 'text-white');
                servicioSel = btn.dataset.servicio;
                document.getElementById('exp-servicio-val').value = servicioSel;
                const precioInput = document.getElementById('exp-precio');
                if (!precioInput.value) precioInput.value = btn.dataset.precio;
                const btnSubmit = document.getElementById('btn-express-submit');
                btnSubmit.disabled = false;
                btnSubmit.className = 'w-full py-3 btn-primary rounded-xl font-bold text-sm transition';
                btnSubmit.textContent = `Añadir · ${servicioSel}`;
            });
        });

        document.getElementById('express-close')?.addEventListener('click', () => document.getElementById('modal-express')?.remove());

        document.getElementById('btn-mas-opciones')?.addEventListener('click', () => {
            const predatos = {
                cliente:  document.getElementById('exp-cliente').value,
                servicio: servicioSel,
                hora:     document.getElementById('exp-hora').value,
                precio:   document.getElementById('exp-precio').value,
                fecha:    new Date().toISOString().split('T')[0],
            };
            document.getElementById('modal-express')?.remove();
            this.showNewCitaModal(predatos);
        });

        document.getElementById('form-express')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const nueva = {
                id:       'e' + Date.now(),
                cliente:  document.getElementById('exp-cliente').value.trim(),
                servicio: servicioSel,
                fecha:    new Date().toISOString().split('T')[0],
                hora:     document.getElementById('exp-hora').value,
                precio:   document.getElementById('exp-precio').value || '0',
                estado:   'pendiente',
            };
            if (nueva.cliente && nueva.servicio && nueva.hora) {
                this._guardarCitaFirebase(nueva).then(() => {
                    document.getElementById('modal-express')?.remove();
                    this.showNotification(`⚡ ${nueva.servicio} para ${nueva.cliente} a las ${nueva.hora}`, 'success');
                    if (this.currentView === 'dashboard') this.loadView('dashboard');
                });
            }
        });
    }

    // ── Vista historial de cliente ─────────────────────────────────
    renderOdontogramaHub() {
        const clientes = [...new Set(this.citas.map(c => c.cliente))].sort();
        const label    = window.BCONFIG?.clienteSingular?.toLowerCase() || 'cliente';
        return `
            <div class="space-y-4">
                <div class="flex items-center gap-2 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                    <i class="fas fa-folder-open text-[#2B93A6] text-lg"></i>
                    <h2 class="text-xl font-bold text-white">Historial de ${label}</h2>
                </div>
                <div class="glass rounded-xl border border-[rgba(43,147,166,0.2)] p-5">
                    <p class="text-sm font-semibold text-slate-300 mb-3">Selecciona un ${label} para ver su historial</p>
                    <div class="flex gap-3">
                        <select id="odon-paciente-select"
                            class="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">
                            <option value="" class="bg-[#0f1e35]">-- Selecciona ${label} --</option>
                            ${clientes.map(p => `<option value="${p}" class="bg-[#0f1e35]">${p}</option>`).join('')}
                        </select>
                        <button id="odon-abrir-btn" class="btn-primary rounded-lg px-4 py-2 text-sm">
                            <i class="fas fa-folder-open mr-1"></i> Ver historial
                        </button>
                    </div>
                </div>
                <div id="odon-display" class="glass rounded-xl border border-[rgba(255,255,255,0.08)] p-6">
                    <p class="text-center text-slate-500 text-sm py-8">
                        <i class="fas fa-folder-open text-4xl text-slate-700 block mb-3"></i>
                        Selecciona un ${label} para cargar su historial
                    </p>
                </div>
            </div>
        `;
    }

    // ── Dispatcher de acciones rápidas ────────────────────────────
    _handleQuickAction(id) {
        const hoy = new Date().toISOString().split('T')[0];
        switch (id) {
            case 'cita-express':   this.showQuickCitaModal(); break;
            case 'cobro-rapido':   this.showCobroModal(null); break;
            case 'nueva-cita':     this.showNewCitaModal(); break;
            case 'ver-agenda':     this.loadView('agenda'); break;
            case 'clientes':
            case 'pacientes':      this.loadView('pacientes'); break;
            case 'contabilidad':   this.loadView('contabilidad'); break;
            case 'empleados':      this.loadView('empleados'); break;
            case 'urgencia': {
                const hora = `${new Date().getHours().toString().padStart(2, '0')}:00`;
                const urgServicio = window.BCONFIG?.servicios?.at(-1)?.items?.at(-1) || 'Urgencia';
                this._guardarCitaFirebase({ cliente: '(Urgencia)', servicio: urgServicio, fecha: hoy, hora, precio: '50', estado: 'sala-espera' }).then(() => {
                    this.showNotification('🚨 Urgencia añadida al timeline', 'warning');
                    if (this.currentView === 'dashboard') this.loadView('dashboard');
                });
                break;
            }
        }
    }

    // ── Editor de acciones rápidas ────────────────────────────────
    showQuickActionsEditor() {
        const catalog = NavigationManager.QUICK_ACTIONS_CATALOG;
        const active  = this._getQuickActions();

        const modalHTML = `
            <div id="modal-quick-edit" class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
                <div class="bg-[#0f1e35] border border-[rgba(43,147,166,0.25)] rounded-xl shadow-2xl w-full max-w-sm">
                    <div class="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-sliders-h text-[#2B93A6]"></i>
                            <h3 class="font-bold text-white text-sm">Personalizar acciones rápidas</h3>
                        </div>
                        <button id="quick-edit-close" class="text-slate-400 hover:text-white transition"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="p-4">
                        <p class="text-xs text-slate-400 mb-3">Selecciona hasta 4 acciones para mostrar en tu inicio</p>
                        <div class="grid grid-cols-2 gap-2" id="quick-edit-grid">
                            ${catalog.map(a => `
                                <button type="button" class="quick-edit-item flex items-center gap-3 p-3 rounded-lg border-2 transition
                                    ${active.includes(a.id) ? 'border-[#2B93A6] bg-[rgba(43,147,166,0.15)] text-white' : 'border-[rgba(255,255,255,0.1)] text-slate-300 hover:border-[rgba(43,147,166,0.4)]'}"
                                    data-id="${a.id}">
                                    <i class="fas ${a.icon} ${a.color} text-base w-5 text-center flex-shrink-0"></i>
                                    <span class="text-xs font-semibold flex-1 text-left">${a.label}</span>
                                    <i class="fas fa-check text-xs text-[#38BDF8] transition ${active.includes(a.id) ? '' : 'opacity-0'}"></i>
                                </button>
                            `).join('')}
                        </div>
                        <button id="quick-edit-save" class="w-full mt-4 py-2.5 btn-primary rounded-xl text-sm font-bold">
                            <i class="fas fa-save mr-1"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modal-quick-edit')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        let selected = [...active];

        document.querySelectorAll('.quick-edit-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (selected.includes(id)) {
                    selected = selected.filter(s => s !== id);
                    btn.classList.remove('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.15)]', 'text-white');
                    btn.classList.add('border-[rgba(255,255,255,0.1)]', 'text-slate-300');
                    btn.querySelector('.fa-check').classList.add('opacity-0');
                } else if (selected.length < 4) {
                    selected.push(id);
                    btn.classList.add('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.15)]', 'text-white');
                    btn.classList.remove('border-[rgba(255,255,255,0.1)]', 'text-slate-300');
                    btn.querySelector('.fa-check').classList.remove('opacity-0');
                } else {
                    this.showNotification('Máximo 4 acciones permitidas', 'warning');
                }
            });
        });

        document.getElementById('quick-edit-close')?.addEventListener('click',
            () => document.getElementById('modal-quick-edit')?.remove());

        document.getElementById('quick-edit-save')?.addEventListener('click', () => {
            this._saveQuickActions(selected);
            document.getElementById('modal-quick-edit')?.remove();
            this.showNotification('✅ Acciones rápidas actualizadas', 'success');
            if (this.currentView === 'dashboard') this.loadView('dashboard');
        });
    }

    // ── Widget de chat flotante ────────────────────────────────────
    setupFloatingChat() {
        const btn   = document.getElementById('chat-widget-btn');
        const panel = document.getElementById('chat-widget-panel');
        const msgs  = document.getElementById('chat-widget-messages');
        const chips = document.getElementById('chat-widget-chips');
        const input = document.getElementById('chat-widget-input');
        const send  = document.getElementById('chat-widget-send');
        const close = document.getElementById('chat-widget-close');

        if (!btn || !panel) return;

        this._addChatMessage('ai', '¡Hola! Soy tu asistente. ¿En qué puedo ayudarte hoy?', msgs);
        this._updateChatChips(chips);

        const togglePanel = (forceClose = false) => {
            const isOpen = panel.classList.contains('open');
            const icon   = document.getElementById('chat-widget-icon');
            if (forceClose || isOpen) {
                panel.classList.remove('open');
                btn.classList.remove('active');
                if (icon) icon.className = 'fas fa-robot text-white text-lg';
            } else {
                panel.classList.add('open');
                btn.classList.add('active');
                if (icon) icon.className = 'fas fa-times text-white text-lg';
                setTimeout(() => input?.focus(), 200);
            }
        };

        btn.addEventListener('click', () => togglePanel());
        close?.addEventListener('click', () => togglePanel(true));

        const handleSend = () => {
            const text = input.value.trim();
            if (!text) return;
            this._addChatMessage('user', text, msgs);
            input.value = '';
            this._processChatCommand(text, msgs);
        };

        send?.addEventListener('click', handleSend);
        input?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
    }

    _addChatMessage(from, text, container) {
        if (!container) return;
        const anchor = container.querySelector('#chat-anchor');
        const div    = document.createElement('div');
        div.className   = from === 'user' ? 'chat-msg-user' : 'chat-msg-ai';
        div.textContent = text;
        if (anchor) container.insertBefore(div, anchor);
        else container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    _updateChatChips(container) {
        if (!container) return;
        const commands = [
            { label: '📅 Crear Cita',  cmd: 'Quiero crear una cita' },
            { label: '👀 Ver Agenda',  cmd: 'Muéstrame las citas de hoy' },
            { label: '❌ Cancelar',   cmd: 'Quiero cancelar una cita' },
        ];
        container.innerHTML = commands.map(c =>
            `<button type="button" class="chat-chip px-2 py-1 text-[11px] font-semibold text-slate-300
                bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-full
                hover:border-[#2B93A6] hover:text-white transition" data-cmd="${c.cmd}">${c.label}</button>`
        ).join('');
        container.querySelectorAll('.chat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const msgs = document.getElementById('chat-widget-messages');
                this._addChatMessage('user', chip.textContent.trim(), msgs);
                this._processChatCommand(chip.dataset.cmd, msgs);
            });
        });
    }

    async _processChatCommand(text, msgs) {
        // Inicializar la instancia del Chatbot para el widget flotante si no existe
        if (!this.floatingChatbot) {
            this.floatingChatbot = new ChatbotManager(this);
            // Sobrescribimos los métodos de UI para que pinte en la burbuja con el estilo correcto
            this.floatingChatbot.agregarMensajeBot = (texto) => {
                this._addChatMessage('ai', texto, msgs);
            };
            this.floatingChatbot.agregarMensajeUsuario = (texto) => {
                // No necesitamos que lo pinte porque handleSend ya lo hace, pero lo definimos por si acaso
            };
        }

        try {
            // Procesar el mensaje usando Ollama (igual que la pantalla principal)
            const respuesta = await this.floatingChatbot.procesarMensaje(text);
            this._addChatMessage('ai', respuesta, msgs);
        } catch (error) {
            console.error('Error en widget flotante:', error);
            this._addChatMessage('ai', '❌ Error de conexión con el Asistente.', msgs);
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            'success': 'bg-green-500 text-white',
            'error': 'bg-red-500 text-white',
            'info': 'bg-blue-500 text-white',
            'warning': 'bg-orange-500 text-white'
        };

        const notificationId = `notif-${Date.now()}`;
        const notificationHTML = `
            <div id="${notificationId}" class="fixed top-4 right-4 px-4 py-3 rounded-lg ${colors[type]} shadow-lg z-50" style="animation: slideIn 0.3s ease-out;">
                ${message}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', notificationHTML);
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            const notif = document.getElementById(notificationId);
            if (notif) {
                notif.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notif.remove(), 300);
            }
        }, 3000);
    }
}

// ══════════════════════════════════════════════════════════════════
// 2️⃣ AGENDA MANAGER - Gestión de Citas y Calendario (Usada desde agenda.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 3️⃣ EMPLEADOS MANAGER - Gestión de Personal (Usada desde empleados.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 4️⃣ CHATBOT MANAGER - Asistente IA (Usada desde chatbot.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════════

// La inicialización de NavigationManager se realiza en inicio.js
// tras la confirmación de autenticación (evento 'appReady').
