<<<<<<< Updated upstream
// navigation.js — Guarda de autenticación + navegación global
//
// Páginas privadas: deben incluir en <head>:
//   <style id="auth-loading">body{visibility:hidden!important}</style>
// Este módulo elimina ese estilo una vez que la autenticación queda confirmada,
// evitando que el usuario vea contenido protegido antes de la verificación.

import { auth, onAuthStateChanged, getUserProfile, logout } from './auth.js';

const PUBLIC_PAGES = ['index.html', 'welcome_page.html', 'sign_up.html', ''];

function pageName() {
  return window.location.pathname.split('/').pop() || '';
}

function isPublicPage() {
  return PUBLIC_PAGES.includes(pageName());
}

function revealPage() {
  document.getElementById('auth-loading')?.remove();
}

// ── Guarda de autenticación ──────────────────────────────────────────────────
// Fallback: si Firebase no responde en 6 s, redirigir al login
const authTimeout = isPublicPage() ? null : setTimeout(() => {
  window.location.href = 'sign_up.html';
}, 6000);

onAuthStateChanged(auth, async (user) => {
  if (authTimeout) clearTimeout(authTimeout);

  if (isPublicPage()) {
    revealPage();
    return;
  }

  // Página privada sin sesión → login
  if (!user) {
    window.location.href = 'sign_up.html';
    return;
  }

  try {
    const profile = await getUserProfile(user.uid);

    if (!profile || profile.status !== 'active') {
      await logout();
      window.location.href = 'sign_up.html';
      return;
    }

    // Exponer datos del usuario para otros scripts de la página
    window.currentUser = { user, profile };
    document.dispatchEvent(new CustomEvent('nodeUserReady', { detail: { user, profile } }));
    revealPage();

  } catch (err) {
    console.error('[auth-guard]', err);
    window.location.href = 'sign_up.html';
  }
});

// ── NavigationManager (UI, scroll, menú) ────────────────────────────────────
class NavigationManager {
  constructor() {
    this.setupGlobalNavigation();
    this.setupPageSpecificEvents();
  }

  setupGlobalNavigation() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
      e.preventDefault();
      this.navigateTo(href);
    });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el) this.executeAction(el.getAttribute('data-action'));
    });
  }

  navigateTo(page) {
    document.body.style.opacity = '0.5';
    setTimeout(() => { window.location.href = page; }, 200);
  }

  executeAction(action) {
    switch (action) {
      case 'logout':        this.logout();                     break;
      case 'back':          this.goBack();                     break;
      case 'home':          this.navigateTo('inicio.html');    break;
      case 'scroll-to-chat':this.scrollTo('#chat');           break;
      case 'toggle-menu':   this.toggleMobileMenu();           break;
    }
  }

  async logout() {
    if (confirm('¿Deseas cerrar sesión?')) {
      await logout();
      window.location.href = 'sign_up.html';
    }
  }

  goBack() {
    window.history.length > 1 ? window.history.back() : this.navigateTo('inicio.html');
  }

  scrollTo(selector) {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleMobileMenu() {
    document.querySelector('[data-mobile-menu]')?.classList.toggle('hidden');
  }

  setupPageSpecificEvents() {
    const page = pageName();
    if (page === 'welcome_page.html') this.setupWelcomePage();
  }

  setupWelcomePage() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollTo(link.getAttribute('href'));
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.navigationManager = new NavigationManager();
});

// Acceso global para compatibilidad con código inline
window.navigateTo = (page) => window.navigationManager?.navigateTo(page) ?? (window.location.href = page);
window.goBack     = ()     => window.navigationManager?.goBack()          ?? window.history.back();
window.logout     = async () => window.navigationManager?.logout();
=======
// navigation.js - Manejo centralizado de navegación, vistas y eventos globales

class NavigationManager {
    constructor() {
        this.currentView = 'dashboard';
        this.contentArea = document.getElementById('content-area');
        this.navItems = document.querySelectorAll('.nav-item');
        this.modal = document.getElementById('modal-cita');
        this.form = document.getElementById('form-cita');
        this.closeModalBtn = document.getElementById('close-modal');
        this.cancelModalBtn = document.getElementById('btn-cancelar-modal');
        
        this.citas = [];
        this.agendaManager = null;
        this.chatbotManager = null;
        this.loadCitas();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupModal();
        this.loadView('dashboard');
    }

    setupNavigation() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.getAttribute('data-view');
                if (view) {
                    this.setActiveNav(item);
                    this.loadView(view);
                }
            });
        });
    }

    setupModal() {
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelModalBtn.addEventListener('click', () => this.closeModal());
        this.form.addEventListener('submit', (e) => this.handleSaveCita(e));
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    setActiveNav(clickedItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active', 'bg-node-teal', 'text-white');
            item.classList.add('text-slate-700');
        });
        clickedItem.classList.add('active', 'bg-node-teal', 'text-white');
        clickedItem.classList.remove('text-slate-700');
    }

    loadView(viewName) {
        this.currentView = viewName;
        let content = '';
        
        switch(viewName) {
            case 'dashboard':
                content = this.renderDashboard();
                break;
            case 'asistente':
                // Crear instancia de ChatbotManager si no existe
                if (!this.chatbotManager) {
                    this.chatbotManager = new ChatbotManager(this);
                }
                content = this.chatbotManager.render();
                // Configurar listeners después de renderizar
                setTimeout(() => this.chatbotManager.setupListeners(), 0);
                break;
            case 'agenda':
                // Crear instancia de AgendaManager si no existe
                if (!this.agendaManager) {
                    this.agendaManager = new AgendaManager(this);
                }
                content = this.agendaManager.render();
                // Configurar listeners después de renderizar
                setTimeout(() => this.agendaManager.setupListeners(), 0);
                break;
            case 'finanzas':
                content = this.renderFinanzas();
                break;
            case 'empleados':
                content = this.renderEmpleados();
                break;
            case 'clientes':
                content = this.renderClientes();
                break;
            default:
                content = '<div class="text-center py-12"><p class="text-gray-500">Contenido no encontrado</p></div>';
        }
        
        this.contentArea.innerHTML = content;
    }

    renderDashboard() {
        return `
            <div class="space-y-6">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-node">Dashboard</h2>
                        <p class="text-sm text-slate-600 mt-1">Resumen de tu negocio</p>
                    </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div class="rounded-xl bg-white p-5 border border-subtle shadow-sm hover:shadow-md transition">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ingresos</p>
                                <p class="mt-2 text-2xl font-bold text-node">€2,450</p>
                                <p class="mt-1 text-xs font-medium text-emerald-600">+12.5%</p>
                            </div>
                            <div class="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-chart-line text-lg text-emerald-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl bg-white p-5 border border-subtle shadow-sm hover:shadow-md transition">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Citas</p>
                                <p class="mt-2 text-2xl font-bold text-node">${this.citas.length}</p>
                                <p class="mt-1 text-xs font-medium text-blue-600">${this.getCitasHoy().length} hoy</p>
                            </div>
                            <div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-calendar-check text-lg text-blue-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl bg-white p-5 border border-subtle shadow-sm hover:shadow-md transition">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clientes</p>
                                <p class="mt-2 text-2xl font-bold text-node">28</p>
                                <p class="mt-1 text-xs font-medium text-purple-600">+3 nuevos</p>
                            </div>
                            <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-users text-lg text-purple-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl bg-white p-5 border border-subtle shadow-sm hover:shadow-md transition">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Conversión</p>
                                <p class="mt-2 text-2xl font-bold text-node">32%</p>
                                <p class="mt-1 text-xs font-medium text-amber-600">-2%</p>
                            </div>
                            <div class="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-percent text-lg text-amber-600"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr_0.8fr]">
                    <div class="rounded-xl bg-white p-5 border border-subtle shadow-sm">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ingresos</p>
                                <p class="text-sm font-bold text-node mt-1">Tendencia</p>
                            </div>
                            <span class="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">+12.5%</span>
                        </div>
                        <svg class="w-full h-32" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="20,80 60,60 100,50 140,65 180,40 220,55 280,25" fill="none" stroke="#2B93A6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polygon points="20,80 60,60 100,50 140,65 180,40 220,55 280,25 280,120 20,120" fill="#2B93A6" opacity="0.1"/>
                        </svg>
                    </div>

                    <div class="rounded-xl bg-white border border-subtle shadow-sm overflow-hidden">
                        <div class="p-5 border-b border-subtle bg-slate-50">
                            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Últimas Transacciones</p>
                        </div>
                        <div class="divide-y divide-subtle max-h-40 overflow-y-auto">
                            <div class="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-bold text-node">Cliente A Ltd</p>
                                    <p class="text-xs text-slate-600">Factura #001</p>
                                </div>
                                <div class="text-right flex-shrink-0">
                                    <p class="text-sm font-bold text-emerald-600">€1,200</p>
                                    <span class="inline-flex text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Pagado</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl bg-white border border-subtle shadow-sm overflow-hidden">
                        <div class="p-5 border-b border-subtle bg-slate-50">
                            <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Alertas</p>
                        </div>
                        <div class="space-y-0 max-h-40 overflow-y-auto divide-y divide-subtle">
                            <div class="p-4 hover:bg-red-50/50 transition border-l-3 border-red-500 bg-red-50/30">
                                <p class="text-xs font-bold text-red-700">Factura vencida</p>
                                <p class="text-xs text-red-600 mt-0.5">Tech Solutions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFinanzas() {
        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-3xl font-bold text-node">Finanzas</h1>
                    <p class="text-slate-600 mt-2">Análisis financiero y reportes</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Ingresos Totales</p>
                        <p class="text-3xl font-bold text-emerald-600">45.2K</p>
                        <p class="text-emerald-600 text-sm mt-2">+12% vs mes anterior</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Gastos</p>
                        <p class="text-3xl font-bold text-red-600">12.8K</p>
                        <p class="text-red-600 text-sm mt-2">+5% vs mes anterior</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Ganancia Neta</p>
                        <p class="text-3xl font-bold text-node-teal">32.4K</p>
                        <p class="text-node-teal text-sm mt-2">+15% vs mes anterior</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmpleados() {
        return `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-node">Empleados</h1>
                        <p class="text-slate-600 mt-2">Gestión de personal y nómina</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Total de Empleados</p>
                        <p class="text-3xl font-bold text-node">12</p>
                        <p class="text-slate-500 text-sm mt-2">Activos</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Nómina Total</p>
                        <p class="text-3xl font-bold text-node">32.5K</p>
                        <p class="text-slate-500 text-sm mt-2">Este mes</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Promedio Salario</p>
                        <p class="text-3xl font-bold text-node">2.7K</p>
                        <p class="text-slate-500 text-sm mt-2">Por empleado</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderClientes() {
        return `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-node">Clientes</h1>
                        <p class="text-slate-600 mt-2">Directorio y gestión de clientes</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Total Clientes</p>
                        <p class="text-3xl font-bold text-node">28</p>
                        <p class="text-slate-500 text-sm mt-2">Activos</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Clientes Nuevos</p>
                        <p class="text-3xl font-bold text-node">3</p>
                        <p class="text-slate-500 text-sm mt-2">Este mes</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-subtle shadow-sm">
                        <p class="text-slate-600 text-sm mb-2">Tasa Retención</p>
                        <p class="text-3xl font-bold text-node">95%</p>
                        <p class="text-slate-500 text-sm mt-2">Promedio</p>
                    </div>
                </div>
            </div>
        `;
    }

    openModal(cita = null) {
        const form = document.getElementById('form-cita');
        const title = document.getElementById('modal-title');
        
        form.reset();
        
        if (cita) {
            title.textContent = 'Editar Cita';
            document.getElementById('cita-id').value = cita.id;
            document.getElementById('cita-cliente').value = cita.cliente;
            document.getElementById('cita-servicio').value = cita.servicio;
            document.getElementById('cita-fecha').value = cita.fecha;
            document.getElementById('cita-hora').value = cita.hora;
            document.getElementById('cita-precio').value = cita.precio || '';
        } else {
            title.textContent = 'Nueva Cita';
            document.getElementById('cita-id').value = '';
        }
        
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }

    handleSaveCita(e) {
        e.preventDefault();
        
        const id = document.getElementById('cita-id').value;
        const cliente = document.getElementById('cita-cliente').value;
        const servicio = document.getElementById('cita-servicio').value;
        const fecha = document.getElementById('cita-fecha').value;
        const hora = document.getElementById('cita-hora').value;
        const precio = document.getElementById('cita-precio').value;
        
        if (id) {
            const index = this.citas.findIndex(c => c.id === id);
            if (index !== -1) {
                this.citas[index] = { id, cliente, servicio, fecha, hora, precio };
            }
        } else {
            this.citas.push({
                id: Date.now().toString(),
                cliente,
                servicio,
                fecha,
                hora,
                precio
            });
        }
        
        this.saveCitas();
        this.closeModal();
        this.loadView('agenda');
    }

    deleteCita(id) {
        this.citas = this.citas.filter(c => c.id !== id);
        this.saveCitas();
        this.loadView('agenda');
    }

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
            // Cargar datos de ejemplo la primera vez
            const hoy = new Date();
            const mañana = new Date(hoy);
            mañana.setDate(mañana.getDate() + 1);
            const pasado = new Date(hoy);
            pasado.setDate(pasado.getDate() - 1);
            
            const hoyStr = hoy.toISOString().split('T')[0];
            const mañanaStr = mañana.toISOString().split('T')[0];
            const pasadoStr = pasado.toISOString().split('T')[0];

            this.citas = [
                // Hoy
                { id: '1', cliente: 'María López', servicio: 'Corte', fecha: hoyStr, hora: '09:00', precio: '25' },
                { id: '2', cliente: 'Carmen Ruiz', servicio: 'Coloracion', fecha: hoyStr, hora: '09:00', precio: '45' },
                { id: '3', cliente: 'Ana Martínez', servicio: 'Peinado', fecha: hoyStr, hora: '10:00', precio: '35' },
                { id: '4', cliente: 'Laura Sánchez', servicio: 'Tratamiento Capilar', fecha: hoyStr, hora: '11:00', precio: '55' },
                { id: '5', cliente: 'Sofia García', servicio: 'Corte', fecha: hoyStr, hora: '12:00', precio: '25' },
                { id: '6', cliente: 'Patricia Diaz', servicio: 'Coloracion', fecha: hoyStr, hora: '12:00', precio: '45' },
                { id: '7', cliente: 'Marta Fernández', servicio: 'Peinado', fecha: hoyStr, hora: '13:00', precio: '35' },
                { id: '8', cliente: 'Rosa Pérez', servicio: 'Corte', fecha: hoyStr, hora: '14:00', precio: '25' },
                { id: '9', cliente: 'Lucia Moreno', servicio: 'Tratamiento Capilar', fecha: hoyStr, hora: '14:00', precio: '55' },
                { id: '10', cliente: 'Elena Vázquez', servicio: 'Reunion', fecha: hoyStr, hora: '15:00', precio: '0' },
                { id: '11', cliente: 'Julio Castillo', servicio: 'Corte', fecha: hoyStr, hora: '15:30', precio: '25' },
                { id: '12', cliente: 'Roberto Silva', servicio: 'Coloracion', fecha: hoyStr, hora: '16:00', precio: '45' },
                { id: '13', cliente: 'Fernando López', servicio: 'Peinado', fecha: hoyStr, hora: '16:30', precio: '35' },
                
                // Mañana
                { id: '14', cliente: 'Alejandra Torres', servicio: 'Corte', fecha: mañanaStr, hora: '09:30', precio: '25' },
                { id: '15', cliente: 'Catalina Morales', servicio: 'Coloracion', fecha: mañanaStr, hora: '10:00', precio: '45' },
                { id: '16', cliente: 'Daniela Cruz', servicio: 'Peinado', fecha: mañanaStr, hora: '11:00', precio: '35' },
                { id: '17', cliente: 'Ernesto Ramírez', servicio: 'Tratamiento Capilar', fecha: mañanaStr, hora: '12:00', precio: '55' },
                { id: '18', cliente: 'Francisco Javier', servicio: 'Corte', fecha: mañanaStr, hora: '13:00', precio: '25' },
                { id: '19', cliente: 'Guillermo Torres', servicio: 'Coloracion', fecha: mañanaStr, hora: '14:00', precio: '45' },
                { id: '20', cliente: 'Herminia Ruiz', servicio: 'Peinado', fecha: mañanaStr, hora: '15:00', precio: '35' },
                
                // Ayer
                { id: '21', cliente: 'Ignacio Molina', servicio: 'Corte', fecha: pasadoStr, hora: '10:00', precio: '25' },
                { id: '22', cliente: 'Juana Hermosa', servicio: 'Coloracion', fecha: pasadoStr, hora: '11:00', precio: '45' },
                { id: '23', cliente: 'Kevin Nichols', servicio: 'Peinado', fecha: pasadoStr, hora: '12:00', precio: '35' }
            ];
            
            this.saveCitas();
        }
    }

    saveCitas() {
        localStorage.setItem('crm-appointments', JSON.stringify(this.citas));
    }

    navigateTo(page) {
        document.body.style.opacity = '0.5';
        setTimeout(() => {
            window.location.href = page;
        }, 200);
    }

    executeAction(action) {
        switch(action) {
            case 'logout':
                this.logout();
                break;
            case 'back':
                this.goBack();
                break;
            case 'home':
                this.navigateTo('menu.html');
                break;
            default:
                console.log('Acción desconocida:', action);
        }
    }

    logout() {
        if (confirm('¿Deseas cerrar sesión?')) {
            localStorage.removeItem('user-session');
            sessionStorage.clear();
            this.navigateTo('sign_up.html');
        }
    }

    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('menu.html');
        }
    }

    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    toggleMobileMenu() {
        const menu = document.querySelector('[data-mobile-menu]');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    checkAuthentication() {
        const publicPages = ['welcome_page.html', 'sign_up.html', 'index.html', 'login.html'];
        const currentPageName = window.location.pathname.split('/').pop() || 'index.html';
        
        const isPublicPage = publicPages.some(page => currentPageName.includes(page));
        const isLoggedIn = localStorage.getItem('user-session') || sessionStorage.getItem('user-session');

        if (!isPublicPage && !isLoggedIn) {
            this.navigateTo('sign_up.html');
        }

        if (isPublicPage && isLoggedIn && currentPageName.includes('sign_up.html')) {
            this.navigateTo('inicio.html');
        }
    }
}

// Instanciar NavigationManager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
});
>>>>>>> Stashed changes
