// ═══════════════════════════════════════════════════════════════════
// NAVIGATION.JS — Router principal + todos los managers
// Firebase-first: lee de DataManager / window.BCONFIG
// ═══════════════════════════════════════════════════════════════════

class NavigationManager {

    // ── Servicios dinámicos desde BCONFIG ──────────────────────────
    static get SERVICIOS() {
        const cfg = window.BCONFIG;
        if (cfg?.servicios) return cfg.servicios.flatMap(g => g.items);
        return ['Servicio general'];
    }

    static get PRECIOS() { return {}; }

    static get QUICK_ACTIONS_CATALOG() {
        const cfg = window.BCONFIG || {};
        return [
            { id: 'cita-express',  icon: 'fa-bolt',                label: 'Cita express',                   color: 'text-[#38BDF8]'   },
            { id: 'cobro-rapido',  icon: 'fa-cash-register',       label: 'Cobro rápido',                   color: 'text-emerald-400' },
            { id: 'urgencia',      icon: 'fa-exclamation-circle',  label: 'Urgencia',                       color: 'text-red-400'     },
            { id: 'nueva-cita',    icon: 'fa-calendar-plus',       label: cfg.nuevaCita || 'Nueva cita',    color: 'text-purple-400'  },
            { id: 'ver-agenda',    icon: 'fa-calendar-alt',        label: 'Ver agenda',                     color: 'text-amber-400'   },
            { id: 'clientes',      icon: 'fa-user-injured',        label: cfg.clientePlural || 'Clientes',  color: 'text-teal-400'    },
            { id: 'contabilidad',  icon: 'fa-file-invoice-dollar', label: 'Contabilidad',                   color: 'text-green-400'   },
            { id: 'empleados',     icon: 'fa-user-md',             label: cfg.empleadoPlural || 'Equipo',   color: 'text-blue-400'    },
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
        const saved = localStorage.getItem('node-quick-actions-' + (localStorage.getItem('businessType') || 'general'));
        if (saved) { try { return JSON.parse(saved); } catch (_) {} }
        return ['cita-express', 'cobro-rapido', 'urgencia', 'nueva-cita'];
    }

    _saveQuickActions(ids) {
        localStorage.setItem('node-quick-actions-' + (localStorage.getItem('businessType') || 'general'), JSON.stringify(ids));
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
    }

    setActiveNav(clickedItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });
        if (clickedItem) {
            clickedItem.classList.add('active');
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
        this.currentView = viewName;

        switch (viewName) {
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

            case 'pacientes':
            case 'clientes':
                this.contentArea.innerHTML = this.renderPacientes();
                setTimeout(() => this._setupPacientesListeners(), 0);
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

            default:
                this.contentArea.innerHTML = '<div class="text-center py-12"><p class="text-slate-500">Sección en desarrollo</p></div>';
        }
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
        const hoy      = new Date().toISOString().split('T')[0];
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

    // ── Helpers de estado ─────────────────────────────────────────
    getCitasHoy() {
        const hoy = new Date().toISOString().split('T')[0];
        return this.citas.filter(c => c.fecha === hoy);
    }

    getProximaCita() {
        const ahora = new Date();
        const hoy = ahora.toISOString().split('T')[0];
        
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
        const hoy = ahora.toISOString().split('T')[0];
        
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
            window.dataManager.actualizarCita(cita.id, { hora: cita.hora, fecha: cita.fecha })
                .catch(err => console.error('❌ Error guardando cita en Firestore:', err));
        }
        const idx = this.citas.findIndex(c => c.id === cita.id);
        if (idx > -1) this.citas[idx] = { ...this.citas[idx], ...cita };
    }

    deleteCita(citaId) {
        this.citas = this.citas.filter(c => c.id !== citaId);
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

    // ── Vista de clientes ─────────────────────────────────────────
    renderPacientes() {
        const mapa = {};
        this.citas.forEach(c => {
            if (!mapa[c.cliente]) {
                mapa[c.cliente] = { nombre: c.cliente, ultimaVisita: c.fecha, ultimoTratamiento: c.servicio, totalVisitas: 0, totalFacturado: 0 };
            }
            if (c.fecha > mapa[c.cliente].ultimaVisita) {
                mapa[c.cliente].ultimaVisita      = c.fecha;
                mapa[c.cliente].ultimoTratamiento = c.servicio;
            }
            mapa[c.cliente].totalVisitas++;
            mapa[c.cliente].totalFacturado += parseInt(c.precio || 0);
        });
        const pacientes = Object.values(mapa).sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita));

        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.08)]">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-users text-[#2B93A6] text-lg"></i>
                        <h2 class="text-xl font-bold text-white">${window.BCONFIG?.clientePlural || 'Clientes'}</h2>
                        <span class="text-xs text-slate-500">(${pacientes.length} registrados)</span>
                    </div>
                    <button id="btn-nuevo-paciente" class="btn-primary rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1">
                        <i class="fas fa-user-plus"></i> ${window.BCONFIG?.nuevaCita || 'Nueva cita'}
                    </button>
                </div>
                <input type="text" id="pacientes-search" placeholder="Buscar por nombre o ${window.BCONFIG?.servicioSingular?.toLowerCase() || 'servicio'}..."
                    class="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B93A6] text-sm">
                <div class="glass rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden" id="pacientes-list">
                    ${pacientes.length > 0 ? pacientes.map(p => `
                        <div class="paciente-row p-3 flex items-center justify-between hover:bg-[rgba(43,147,166,0.08)] border-b border-[rgba(255,255,255,0.06)] transition">
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
                                <button class="btn-cita-paciente px-2 py-1 text-xs bg-[rgba(43,147,166,0.15)] text-[#38BDF8] rounded hover:bg-[rgba(43,147,166,0.3)] transition" data-nombre="${p.nombre}" title="Nueva cita">
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

    _setupPacientesListeners() {
        const search = document.getElementById('pacientes-search');
        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.toLowerCase();
                document.querySelectorAll('.paciente-row').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }
        document.querySelectorAll('.btn-cita-paciente').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showNewCitaModal({ cliente: btn.dataset.nombre, fecha: new Date().toISOString().split('T')[0] });
            });
        });
        document.getElementById('btn-nuevo-paciente')?.addEventListener('click', () => {
            this.showNewCitaModal({ fecha: new Date().toISOString().split('T')[0] });
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
            case 'empleados':
            case 'dentistas':      this.loadView('empleados'); break;
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
