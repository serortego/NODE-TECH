// ═══════════════════════════════════════════════════════════════════
// NAVIGATION.JS - Router Global + Todos los Managers
// Estructura: Cada Manager está en su propia sección, todo en UN archivo
// ═══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 1️⃣ NAVIGATION MANAGER - Router Principal
// ══════════════════════════════════════════════════════════════════

class NavigationManager {
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

    loadView(viewName) {
        // Destruir manager anterior
        if (this.currentManager && this.currentManager.destroy) {
            this.currentManager.destroy();
        }

        this.currentView = viewName;
        let content = '';

        switch(viewName) {
            case 'dashboard':
                content = this.renderDashboard();
                this.contentArea.innerHTML = content;
                setTimeout(() => this.setupDashboardListeners(), 0);
                return;
            case 'asistente':
                this.currentManager = new ChatbotManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            case 'agenda':
                this.currentManager = new AgendaManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            case 'finanzas':
                this.currentManager = new FinanzasManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            case 'empleados':
                this.currentManager = new EmpleadosManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            case 'clientes':
                this.currentManager = new ClientesManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            case 'contabilidad':
                this.currentManager = new ContabilidadManager(this);
                content = this.currentManager.render();
                setTimeout(() => this.currentManager.setupListeners(), 0);
                break;
            default:
                content = '<div class="text-center py-12"><p class="text-gray-500">Contenido no encontrado</p></div>';
        }

        this.contentArea.innerHTML = content;
    }

    setupDashboardListeners() {
        // ===== CENTRO DE MANDOS - ASISTENTE =====
        const asistenteInput = document.getElementById('asistente-input');
        const btnEnviar = document.getElementById('btn-enviar-asistente');
        const btnVoice = document.getElementById('btn-voice');

        if (asistenteInput && btnEnviar) {
            btnEnviar.addEventListener('click', () => {
                const comando = asistenteInput.value.trim();
                if (comando) {
                    this.showNotification(`📝 Comando registrado: "${comando}"`, 'info');
                    asistenteInput.value = '';
                    // Aquí irá la lógica del chatbot real
                }
            });

            asistenteInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    btnEnviar.click();
                }
            });
        }

        if (btnVoice) {
            btnVoice.addEventListener('click', () => {
                this.showNotification('🎤 Entrada por voz - En desarrollo', 'warning');
            });
        }

        // ===== BOTONERA ANALÓGICA =====
        
        // Nueva Cita
        const btnNuevaCita = document.getElementById('btn-nueva-cita-dash');
        if (btnNuevaCita) {
            btnNuevaCita.addEventListener('click', () => {
                this.showNewCitaModal({ fecha: new Date().toISOString().split('T')[0] });
            });
        }

        // Botones de Cobrar en próximas citas → registrar en finanzas
        document.querySelectorAll('button[title="Cobrar"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const precio = parseFloat(btn.dataset.citaPrecio || 0);
                const cliente = btn.dataset.citaCliente || 'Cliente';
                const citaId = btn.dataset.citaId;

                if (precio <= 0) {
                    // Sin precio: abrir modal de cobro rápido con campo de importe
                    this._mostrarModalCobroRapido(cliente, citaId);
                    return;
                }

                // Registrar cobro en Firestore via DataManager
                if (window.dataManager) {
                    try {
                        await window.dataManager.crearIngreso({
                            concepto: `Servicio a ${cliente}`,
                            tipo: 'ingreso',
                            importe: precio,
                            fecha: new Date().toISOString().split('T')[0],
                            categoria: 'Servicios',
                            cita: citaId
                        });
                        this.showNotification(`✅ Cobro de €${precio} registrado para ${cliente}`, 'success');
                        // Actualizar caja
                        const cajaEl = document.querySelector('.text-emerald-900.font-black');
                        if (cajaEl) {
                            const actual = parseInt(cajaEl.textContent.replace('€','')) || 0;
                            cajaEl.textContent = '€' + (actual + precio);
                        }
                    } catch (err) {
                        this.showNotification('❌ Error al registrar cobro: ' + err.message, 'error');
                    }
                } else {
                    this.showNotification(`✅ Cobro de €${precio} anotado para ${cliente}`, 'success');
                }
            });
        });

        document.querySelectorAll('button[title="Ver ficha"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cliente = btn.dataset.citaCliente;
                if (cliente) {
                    this.setActiveNav(document.querySelector('[data-view="clientes"]'));
                    this.loadView('clientes');
                    this.showNotification(`🔍 Buscando ficha de ${cliente}...`, 'info');
                }
            });
        });

        // Botón cobro rápido de la botonera
        const btnCobroRapido = document.getElementById('btn-cobro-rapido');
        if (btnCobroRapido) {
            btnCobroRapido.addEventListener('click', () => {
                this._mostrarModalCobroRapido();
            });
        }

        // Botón nuevo cliente de la botonera
        const btnNuevoClienteDash = document.getElementById('btn-nuevo-cliente-dash');
        if (btnNuevoClienteDash) {
            btnNuevoClienteDash.addEventListener('click', () => {
                this.setActiveNav(document.querySelector('[data-view="clientes"]'));
                this.loadView('clientes');
                setTimeout(() => document.getElementById('btn-nuevo-cliente')?.click(), 300);
            });
        }
    }

    renderDashboard() {
        const hoy = new Date().toISOString().split('T')[0];
        const citasHoy = this.getCitasHoy();
        const proximasCitas = this.getProximasCitas(4);
        
        // ===== CALCULAR MÉTRICAS =====
        const totalCajaHoy = citasHoy.reduce((sum, c) => sum + parseInt(c.precio || 0), 0);
        const citasCompletadas = citasHoy.filter(c => c.estado === 'completada').length;
        // Alertas reales: citas de hoy sin precio asignado
        const citasSinPrecio = citasHoy.filter(c => !c.precio || parseInt(c.precio) === 0).length;
        const alertasCount = citasSinPrecio;
        
        // Placeholder dinámico para el buscador
        const placeholders = [
            'Ej: Cobra 25€ a Laura en efectivo...',
            'Ej: Pásame la cita de las 12 a mañana...',
            'Ej: ¿Cuánto he facturado esta semana?',
            'Ej: Nueva cita para Juan el viernes a las 14:00...',
            'Ej: ¿Qué clientes vinieron esta semana?',
            'Ej: Registra un gasto de 50€ en productos...'
        ];
        const placeholderActual = placeholders[Math.floor(Date.now() / 5000) % placeholders.length];
        
        return `
            <div class="space-y-2 pb-2">
                
                <!-- ═══════════════════════════════════════════ -->
                <!-- 1. CENTRO DE MANDOS - ASISTENTE IA        -->
                <!-- ═══════════════════════════════════════════ -->
                <div class="flex items-center gap-2 glass rounded-lg border-[rgba(255,255,255,0.08)] mb-3">
                    <input 
                        type="text" 
                        id="asistente-input" 
                        placeholder="${placeholderActual}"
                        class="flex-1 px-4 py-3 bg-transparent text-white text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[#2B93A6] rounded-lg placeholder-slate-500"
                    >
                    <button id="btn-voice" class="p-2 bg-[#2B93A6] hover:bg-[#38BDF8] text-white rounded-lg transition" title="Entrada por voz">
                        <i class="fas fa-microphone text-sm"></i>
                    </button>
                    <button id="btn-enviar-asistente" class="p-2 mr-1 bg-[#2B93A6] hover:bg-[#38BDF8] text-white rounded-lg transition" title="Enviar comando">
                        <i class="fas fa-arrow-right text-sm"></i>
                    </button>
                </div>

                <!-- ═══════════════════════════════════════════ -->
                <!-- 2. EL PULSO DEL DÍA - MÉTRICAS           -->
                <!-- ═══════════════════════════════════════════ -->
                <div class="grid grid-cols-3 gap-1">
                    
                    <!-- CAJA DE HOY -->
                    <div class="glass rounded-lg p-3 border border-[rgba(43,147,166,0.25)] shadow-sm card-lift">
                        <div class="text-xs font-bold text-[#38BDF8] uppercase tracking-wider">💰 Caja</div>
                        <div class="text-2xl font-black text-white mt-1">€${totalCajaHoy}</div>
                        <div class="text-xs text-[#2B93A6] mt-1">+15%</div>
                    </div>

                    <!-- TRÁFICO DE CLIENTES -->
                    <div class="glass rounded-lg p-3 border border-[rgba(255,255,255,0.08)] shadow-sm card-lift">
                        <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">👥 Tráfico</div>
                        <div class="text-2xl font-black text-white mt-1">${citasCompletadas}/${citasHoy.length}</div>
                        <div class="text-xs text-slate-400 mt-1">completadas</div>
                    </div>

                    <!-- ALERTAS -->
                    <div class="glass rounded-lg p-3 border ${alertasCount > 0 ? 'border-red-500/30' : 'border-[rgba(255,255,255,0.08)]'} shadow-sm card-lift">
                        <div class="text-xs font-bold ${alertasCount > 0 ? 'text-red-400' : 'text-slate-400'} uppercase tracking-wider">⚠️ Alertas</div>
                        <div class="text-2xl font-black ${alertasCount > 0 ? 'text-red-300' : 'text-slate-500'} mt-1">${alertasCount}</div>
                        <div class="text-xs ${alertasCount > 0 ? 'text-red-400' : 'text-slate-500'} mt-1">${alertasCount > 0 ? 'citas sin precio' : 'todo en orden'}</div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════ -->
                <!-- 3. LO QUE VIENE AHORA - EL RADAR           -->
                <!-- ═══════════════════════════════════════════ -->
                <div class="glass rounded-xl border border-[rgba(255,255,255,0.08)] shadow-lg overflow-hidden">
                    <div class="bg-[rgba(43,147,166,0.12)] px-3 py-2 border-b border-[rgba(43,147,166,0.2)]">
                        <div class="text-xs font-bold text-[#38BDF8] flex items-center gap-2">
                            <i class="fas fa-calendar-alt text-[#2B93A6] text-sm"></i>
                            Próximas Citas
                        </div>
                    </div>

                    <div class="divide-y divide-[rgba(255,255,255,0.06)] max-h-96 overflow-y-auto">
                        ${proximasCitas.length > 0 ? proximasCitas.map((cita, idx) => {
                            const horaInicio = cita.hora;
                            const [h, m] = horaInicio.split(':');
                            const ahora = new Date();
                            const citaTime = new Date();
                            citaTime.setHours(parseInt(h), parseInt(m));
                            const minutosFalta = Math.max(0, Math.floor((citaTime - ahora) / 60000));
                            const urgencia = minutosFalta < 15 ? 'text-red-400 font-bold' : minutosFalta < 30 ? 'text-orange-400 font-semibold' : 'text-slate-400';
                            
            return `
                                <div class="p-3 hover:bg-[rgba(43,147,166,0.08)] transition flex items-center justify-between gap-2">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-baseline gap-2 mb-1">
                                            <div class="text-sm font-bold text-white">${horaInicio}</div>
                                            <div class="text-xs font-bold ${urgencia}">
                                                ${minutosFalta < 60 ? minutosFalta + ' min' : '⏰ HOY'}
                                            </div>
                                            ${cita.recurso ? `<div class="text-xs text-[#2B93A6] font-medium truncate">· ${cita.recurso.split(' ')[0]}</div>` : ''}
                                        </div>
                                        <div class="font-semibold text-sm text-white truncate">${cita.cliente}</div>
                                        <div class="text-xs text-slate-400 truncate">${cita.servicio}${cita.horaFin ? ' · ' + cita.horaFin : ''}${cita.precio && parseInt(cita.precio) > 0 ? ' · <span class="font-bold text-emerald-400">€' + parseInt(cita.precio) + '</span>' : ''}</div>
                                    </div>
                                    <div class="flex gap-1">
                                        <button class="bg-emerald-500 hover:bg-emerald-400 text-white rounded px-2 py-1 font-semibold text-xs transition whitespace-nowrap" title="Cobrar" data-cita-id="${cita.id}" data-cita-precio="${cita.precio || 0}" data-cita-cliente="${cita.cliente}">
                                            <i class="fas fa-euro-sign mr-1"></i>${cita.precio && parseInt(cita.precio) > 0 ? parseInt(cita.precio) + '€' : 'Cobrar'}
                                        </button>
                                        <button class="bg-[#2B93A6] hover:bg-[#38BDF8] text-white rounded px-2 py-1 font-semibold text-xs transition" title="Ver ficha" data-cita-cliente="${cita.cliente}">
                                            <i class="fas fa-user-circle"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div class="p-6 text-center">
                                <i class="fas fa-calendar-check text-3xl text-slate-600 mb-2"></i>
                                <p class="text-slate-500 text-sm font-medium">Sin citas próximas</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════ -->
                <!-- 4. BOTONERA ANALÓGICA - PLAN B             -->
                <!-- ═══════════════════════════════════════════ -->
                <div class="grid grid-cols-3 gap-2 mt-2">
                    <button id="btn-cobro-rapido" class="btn-primary rounded-lg px-3 py-3 text-xs shadow-sm transition flex items-center justify-center gap-1 h-14">
                        <i class="fas fa-credit-card"></i>
                        <span>Cobro rápido</span>
                    </button>

                    <button id="btn-nueva-cita-dash" class="btn-primary rounded-lg px-3 py-3 text-xs shadow-sm transition flex items-center justify-center gap-1 h-14">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Nueva cita</span>
                    </button>

                    <button id="btn-nuevo-cliente-dash" class="btn-primary rounded-lg px-3 py-3 text-xs shadow-sm transition flex items-center justify-center gap-1 h-14">
                        <i class="fas fa-user-plus"></i>
                        <span>Nuevo cliente</span>
                    </button>
                </div>

            </div>
        `;
    }

    // ========== ESTADO GLOBAL ==========

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

    loadCitas() {
        const saved = localStorage.getItem('crm-appointments');
        if (saved) {
            this.citas = JSON.parse(saved);
        } else {
            const hoy = new Date();
            const mañana = new Date(hoy);
            mañana.setDate(mañana.getDate() + 1);
            const pasado = new Date(hoy);
            pasado.setDate(pasado.getDate() - 1);
            
            const hoyStr = hoy.toISOString().split('T')[0];
            const mañanaStr = mañana.toISOString().split('T')[0];
            const pasadoStr = pasado.toISOString().split('T')[0];

            this.citas = [
                { id: '1', cliente: 'María López', servicio: 'Corte', fecha: hoyStr, hora: '09:00', horaFin: '09:45', precio: '25' },
                { id: '2', cliente: 'Carmen Ruiz', servicio: 'Coloracion', fecha: hoyStr, hora: '09:00', horaFin: '10:30', precio: '45' },
                { id: '3', cliente: 'Ana Martínez', servicio: 'Peinado', fecha: hoyStr, hora: '10:00', horaFin: '11:00', precio: '35' },
                { id: '4', cliente: 'Laura Sánchez', servicio: 'Tratamiento Capilar', fecha: hoyStr, hora: '11:00', horaFin: '12:15', precio: '55' },
                { id: '5', cliente: 'Sofia García', servicio: 'Corte', fecha: hoyStr, hora: '12:00', horaFin: '12:45', precio: '25' },
                { id: '6', cliente: 'Patricia Diaz', servicio: 'Coloracion', fecha: hoyStr, hora: '12:00', horaFin: '13:30', precio: '45' },
                { id: '7', cliente: 'Marta Fernández', servicio: 'Peinado', fecha: hoyStr, hora: '13:00', horaFin: '14:00', precio: '35' },
                { id: '8', cliente: 'Rosa Pérez', servicio: 'Corte', fecha: hoyStr, hora: '14:00', horaFin: '14:45', precio: '25' },
                { id: '9', cliente: 'Lucia Moreno', servicio: 'Tratamiento Capilar', fecha: hoyStr, hora: '14:00', horaFin: '15:15', precio: '55' },
                { id: '10', cliente: 'Elena Vázquez', servicio: 'Reunion', fecha: hoyStr, hora: '15:00', horaFin: '16:00', precio: '0' },
                { id: '11', cliente: 'Julio Castillo', servicio: 'Corte', fecha: hoyStr, hora: '15:30', horaFin: '16:15', precio: '25' },
                { id: '12', cliente: 'Roberto Silva', servicio: 'Coloracion', fecha: hoyStr, hora: '16:00', horaFin: '17:30', precio: '45' },
                { id: '13', cliente: 'Fernando López', servicio: 'Peinado', fecha: hoyStr, hora: '16:30', horaFin: '17:30', precio: '35' },
                { id: '14', cliente: 'Alejandra Torres', servicio: 'Corte', fecha: mañanaStr, hora: '09:30', horaFin: '10:15', precio: '25' },
                { id: '15', cliente: 'Catalina Morales', servicio: 'Coloracion', fecha: mañanaStr, hora: '10:00', horaFin: '11:30', precio: '45' },
                { id: '16', cliente: 'Daniela Cruz', servicio: 'Peinado', fecha: mañanaStr, hora: '11:00', horaFin: '12:00', precio: '35' },
                { id: '17', cliente: 'Ernesto Ramírez', servicio: 'Tratamiento Capilar', fecha: mañanaStr, hora: '12:00', horaFin: '13:15', precio: '55' },
                { id: '18', cliente: 'Francisco Javier', servicio: 'Corte', fecha: mañanaStr, hora: '13:00', horaFin: '13:45', precio: '25' },
                { id: '19', cliente: 'Guillermo Torres', servicio: 'Coloracion', fecha: mañanaStr, hora: '14:00', horaFin: '15:30', precio: '45' },
                { id: '20', cliente: 'Herminia Ruiz', servicio: 'Peinado', fecha: mañanaStr, hora: '15:00', horaFin: '16:00', precio: '35' },
                { id: '21', cliente: 'Ignacio Molina', servicio: 'Corte', fecha: pasadoStr, hora: '10:00', horaFin: '10:45', precio: '25' },
                { id: '22', cliente: 'Juana Hermosa', servicio: 'Coloracion', fecha: pasadoStr, hora: '11:00', horaFin: '12:30', precio: '45' },
                { id: '23', cliente: 'Kevin Nichols', servicio: 'Peinado', fecha: pasadoStr, hora: '12:00', horaFin: '13:00', precio: '35' }
            ];
            
            this.saveCitas();
        }
    }

    saveCitas() {
        localStorage.setItem('crm-appointments', JSON.stringify(this.citas));
    }

    saveCita(cita) {
        // Persistir en Firestore a través de DataManager si está disponible
        if (window.dataManager && cita.id) {
            window.dataManager.actualizarCita(cita.id, { hora: cita.hora, fecha: cita.fecha })
                .catch(err => console.error('❌ Error guardando cita en Firestore:', err));
        }
        // Actualizar caché local
        const idx = this.citas.findIndex(c => c.id === cita.id);
        if (idx > -1) {
            this.citas[idx] = { ...this.citas[idx], ...cita };
            this.saveCitas();
        }
    }

    deleteCita(citaId) {
        this.citas = this.citas.filter(c => c.id !== citaId);
        this.saveCitas();
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

    // ========== CREACIÓN DE CITAS ==========
    showNewCitaModal(predatos = {}) {
        const servicios = ['Corte', 'Coloracion', 'Peinado', 'Tratamiento Capilar', 'Reunion'];
        const precios = { 'Corte': 25, 'Coloracion': 45, 'Peinado': 35, 'Tratamiento Capilar': 55, 'Reunion': 0 };
        
        // Modal HTML
        const modalHTML = `
            <div id="modal-cita" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-6 border-b border-gray-200">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-calendar-plus text-node-teal text-lg"></i>
                            <h3 class="text-lg font-bold text-gray-900">Nueva cita</h3>
                        </div>
                        <button id="modal-close" class="text-gray-500 hover:text-gray-700 transition">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <!-- Formulario -->
                    <form id="form-nueva-cita" class="space-y-4 p-6">
                        <!-- Cliente -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Cliente *</label>
                            <input type="text" id="cita-cliente" placeholder="Nombre del cliente" value="${predatos.cliente || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal" required>
                        </div>

                        <!-- Servicio -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Servicio *</label>
                            <select id="cita-servicio" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal" required>
                                <option value="">Selecciona un servicio</option>
                                ${servicios.map(s => `<option value="${s}" ${predatos.servicio === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Fecha -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Fecha *</label>
                            <input type="date" id="cita-fecha" value="${predatos.fecha || new Date().toISOString().split('T')[0]}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal" required>
                        </div>

                        <!-- Hora -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Hora inicio *</label>
                            <input type="time" id="cita-hora" value="${predatos.hora || '09:00'}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal" required>
                        </div>

                        <!-- Hora Fin -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Hora fin *</label>
                            <input type="time" id="cita-horaFin" value="${predatos.horaFin || '10:00'}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal" required>
                        </div>

                        <!-- Precio -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Precio (€)</label>
                            <input type="number" id="cita-precio" placeholder="0" value="${predatos.precio || ''}" min="0" step="5"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal">
                        </div>

                        <!-- Recursos (Asignar a trabajador) -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Asignar a</label>
                            <select id="cita-recurso" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal">
                                <option value="">Auto-asignar</option>
                                ${this.recursos.map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Notas -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Notas</label>
                            <textarea id="cita-notas" placeholder="Detalles adicionales..." rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-node-teal focus:ring-1 focus:ring-node-teal resize-none"></textarea>
                        </div>

                        <!-- Botones -->
                        <div class="flex gap-2 pt-4 border-t border-gray-200">
                            <button type="button" id="modal-cancel" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition">
                                Cancelar
                            </button>
                            <button type="submit" class="flex-1 px-4 py-2 bg-node-teal text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition">
                                Guardar cita
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Insertar modal
        const existingModal = document.getElementById('modal-cita');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Configurar listeners
        const modal = document.getElementById('modal-cita');
        const form = document.getElementById('form-nueva-cita');
        const servicioSelect = document.getElementById('cita-servicio');
        const precioInput = document.getElementById('cita-precio');

        // Auto-rellenar precio según servicio
        servicioSelect.addEventListener('change', (e) => {
            const precioAuto = precios[e.target.value] || 0;
            if (!precioInput.value) {
                precioInput.value = precioAuto;
            }
        });

        // Cerrar modal
        const closeModal = () => modal.remove();
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Enviar formulario
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const horaInicio = document.getElementById('cita-hora').value;
            const horaFin = document.getElementById('cita-horaFin').value;

            // Validar que hora fin sea después de hora inicio
            if (horaFin <= horaInicio) {
                alert('La hora de fin debe ser posterior a la hora de inicio');
                return;
            }
            
            const nuevaCita = {
                id: String(Math.max(...this.citas.map(c => parseInt(c.id) || 0), 0) + 1),
                cliente: document.getElementById('cita-cliente').value.trim(),
                servicio: document.getElementById('cita-servicio').value,
                fecha: document.getElementById('cita-fecha').value,
                hora: horaInicio,
                horaFin: horaFin,
                precio: document.getElementById('cita-precio').value || '0',
                recurso: document.getElementById('cita-recurso').value || this.recursos[0],
                notas: document.getElementById('cita-notas').value,
                estado: 'esperando'
            };

            if (!nuevaCita.cliente || !nuevaCita.servicio || !nuevaCita.fecha || !nuevaCita.hora || !nuevaCita.horaFin) {
                alert('Por favor, completa todos los campos requeridos');
                return;
            }

            this.createNewCita(nuevaCita);
            closeModal();
        });
    }

    createNewCita(citaData) {
        // Agregar a array
        this.citas.push(citaData);
        this.saveCitas();
        
        // Notificar éxito
        this.showNotification(`✓ Cita creada para ${citaData.cliente}`, 'success');
        
        // Si estamos en agenda, actualizar vista
        if (this.currentManager && this.currentManager.render) {
            this.contentArea.innerHTML = this.currentManager.render();
            this.currentManager.setupListeners();
        }
    }

    _mostrarModalCobroRapido(clienteNombre = '', citaId = '') {
        const modalId = 'modal-cobro-rapido';
        document.getElementById(modalId)?.remove();
        const html = `
            <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
                <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                    <h2 class="text-lg font-bold text-gray-900 mb-4"><i class="fas fa-euro-sign text-emerald-600 mr-2"></i>Registrar cobro</h2>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                            <input type="text" id="cobro-rapido-cliente" value="${clienteNombre}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre de la clienta">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Importe (€) *</label>
                            <input type="number" id="cobro-rapido-importe" min="0" step="0.50"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right" placeholder="0,00">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Concepto</label>
                            <input type="text" id="cobro-rapido-concepto" value="${clienteNombre ? 'Servicio a ' + clienteNombre : ''}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Corte, tinte, peinado...">
                        </div>
                    </div>
                    <div class="flex gap-2 mt-5">
                        <button id="cobro-rapido-cancelar"
                            class="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50 transition">
                            Cancelar
                        </button>
                        <button id="cobro-rapido-confirmar"
                            class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold transition">
                            <i class="fas fa-check mr-1"></i> Cobrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const cerrar = () => document.getElementById(modalId)?.remove();

        document.getElementById('cobro-rapido-cancelar').addEventListener('click', cerrar);
        document.getElementById(modalId).addEventListener('click', e => { if (e.target.id === modalId) cerrar(); });

        document.getElementById('cobro-rapido-confirmar').addEventListener('click', async () => {
            const importe = parseFloat(document.getElementById('cobro-rapido-importe').value);
            const cliente = document.getElementById('cobro-rapido-cliente').value.trim();
            const concepto = document.getElementById('cobro-rapido-concepto').value.trim() || `Servicio a ${cliente}`;

            if (!importe || importe <= 0) {
                document.getElementById('cobro-rapido-importe').focus();
                document.getElementById('cobro-rapido-importe').classList.add('border-red-500');
                return;
            }

            if (window.dataManager) {
                try {
                    await window.dataManager.crearIngreso({
                        concepto,
                        tipo: 'ingreso',
                        importe,
                        fecha: new Date().toISOString().split('T')[0],
                        categoria: 'Servicios',
                        ...(citaId && { cita: citaId })
                    });
                    cerrar();
                    this.showNotification(`✅ Cobro de €${importe.toFixed(2)} registrado`, 'success');
                } catch (err) {
                    this.showNotification('❌ Error al guardar cobro', 'error');
                }
            } else {
                cerrar();
                this.showNotification(`✅ Cobro de €${importe.toFixed(2)} anotado`, 'success');
            }
        });
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
// 4️⃣ CLIENTES MANAGER - Gestión de Clientes (Usada desde clientes.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 5️⃣ FINANZAS MANAGER - Análisis Financiero (Usada desde finanzas.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 6️⃣ CHATBOT MANAGER - Asistente IA (Usada desde chatbot.js)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════════

// La inicialización de NavigationManager se realiza en inicio.js
// tras la confirmación de autenticación (evento 'appReady').
