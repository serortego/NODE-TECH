// App.js - Sistema de Routing y Control Principal
import { initAuth, loginWithGoogle, logout, getCurrentUser } from './modules/auth.js';
import { renderInicio, initInicio } from './views/inicio.js';
import { renderAsistente, initAsistente } from './views/asistente.js';
import { renderAgenda, initAgenda } from './views/agenda.js';
import { renderFinanzas, initFinanzas } from './views/finanzas.js';
import { renderEmpleados, initEmpleados } from './views/empleados.js';
import { renderClientes, initClientes } from './views/clientes.js';
import { renderAyuda } from './views/ayuda.js';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const btnLogin = document.getElementById('btn-login');
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const logoutBtn = document.getElementById('logout-btn');
const userInitial = document.getElementById('user-initial');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');

// Vista activa
let currentView = 'inicio';

// Vistas disponibles
const views = {
    inicio: {
        render: renderInicio,
        init: initInicio
    },
    asistente: {
        render: renderAsistente,
        init: initAsistente
    },
    agenda: {
        render: renderAgenda,
        init: initAgenda
    },
    finanzas: {
        render: renderFinanzas,
        init: initFinanzas
    },
    empleados: {
        render: renderEmpleados,
        init: initEmpleados
    },
    clientes: {
        render: renderClientes,
        init: initClientes
    },
    ayuda: {
        render: renderAyuda,
        init: null
    }
};

// ==================== AUTENTICACIÓN (MODO DEMO - SIN LOGIN) ====================
// En modo de prueba/demo, no se requiere autenticación
// El dashboard está abierto para cualquier visitante

// Simular usuario demo
const demoUser = {
    displayName: "Demo NODE",
    email: "modo@prueba",
    uid: "demo-user-001"
};

// Inicializar directamente sin esperar login
console.log('🎉 NODE en MODO DEMO - Dashboard abierto al público');

try {
    onUserLogged(demoUser);
} catch (error) {
    console.error('Error al inicializar:', error);
}

function onUserLogged(user) {
    try {
        console.log('✅ Usuario autenticado:', user.displayName);
        
        // Actualizar datos del usuario en el header
        if (userName) userName.textContent = user.displayName || 'Usuario';
        if (userEmail) userEmail.textContent = user.email;
        
        // Obtener inicial del nombre
        const initial = user.displayName?.charAt(0).toUpperCase() || 'U';
        if (userInitial) userInitial.textContent = initial;
        
        // Mostrar dashboard
        if (authScreen) {
            authScreen.classList.remove('show');
            setTimeout(() => {
                authScreen.style.display = 'none';
            }, 300);
        }

        // Cargar vista inicial
        loadView('inicio');
    } catch (error) {
        console.error('❌ Error en onUserLogged:', error);
    }
}

function onUserLoggedOut() {
    console.log('Usuario desconectado');
    if (authScreen) {
        authScreen.classList.add('show');
        authScreen.style.display = 'flex';
    }
}

// ==================== LOGIN (DESHABILITADO EN MODO DEMO) ====================
// En modo demo, no se necesita login
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        console.log('Login deshabilitado en modo demo');
        alert('El dashboard está en modo público. No se requiere login.');
    });
}

// ==================== LOGOUT (MODO DEMO) ====================
logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // En modo demo, solo mostrar mensaje
    alert('🔄 La sesión de demo se reiniciará.');
    location.reload();
});

// ==================== NAVEGACIÓN ====================
function loadView(viewName) {
    // Validar que la vista existe
    if (!views[viewName]) {
        console.error('Vista no encontrada:', viewName);
        return;
    }

    currentView = viewName;

    // Actualizar UI de navegación
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });

    // Renderizar vista
    const view = views[viewName];
    contentArea.innerHTML = view.render();

    // Cerrar sidebar en móvil
    if (window.innerWidth < 640) {
        sidebar.classList.remove('show');
    }

    // Ejecutar inicializaciones específicas de la vista
    if (view.init) {
        setTimeout(() => {
            view.init();
        }, 100);
    }

    // Scroll al inicio
    contentArea.scrollTop = 0;
}

// Event listeners para navegación
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = item.dataset.view;
        if (viewName) {
            loadView(viewName);
        }
    });
});

// ==================== HASH NAVIGATION ====================
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'inicio';
    loadView(hash);
});

// ==================== RESPONSIVE ====================
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// Cerrar sidebar al hacer click fuera
document.addEventListener('click', (e) => {
    if (window.innerWidth < 640 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('show');
    }
});

// Actualizar visibilidad del botón de menú según tamaño de pantalla
function updateResponsive() {
    if (window.innerWidth < 640) {
        menuToggle.style.display = 'block';
    } else {
        menuToggle.style.display = 'none';
        sidebar.classList.remove('show');
    }
}

window.addEventListener('resize', updateResponsive);
updateResponsive();

// ==================== INICIALIZACIÓN ====================
console.log('🚀 APP iniciando...');
console.log('✅ APP cargada correctamente');
console.log('📝 Funciones disponibles: loadView(), onUserLogged(), onUserLoggedOut()');
console.log('💡 Para debuggear:');
console.log('  - Abre la consola (F12)');
console.log('  - Navega a #asistente');
console.log('  - Escribe un mensaje en el chat');
