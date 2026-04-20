// navigation.js - Manejo centralizado de navegación y eventos globales

class NavigationManager {
    constructor() {
        this.currentPage = this.detectCurrentPage();
        this.init();
    }

    // Detectar la página actual basada en el HTML actual
    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('inicio.html')) return 'inicio';
        if (path.includes('crm_calendar.html')) return 'crm_calendar';
        if (path.includes('sign_up.html')) return 'login';
        if (path.includes('welcome_page.html')) return 'welcome';
        return 'index';
    }

    init() {
        this.setupGlobalNavigation();
        this.setupPageSpecificEvents();
        this.checkAuthentication();
    }

    // ==================== NAVEGACIÓN GLOBAL ====================

    setupGlobalNavigation() {
        // Interceptar todos los enlaces internos
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            
            // Ignorar enlaces externos, hashes y navegación especial
            if (!href || href.startsWith('http') || href.startsWith('#')) return;

            // Prevenir comportamiento por defecto y navegar
            e.preventDefault();
            this.navigateTo(href);
        });

        // Botones con data-action
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]');
            if (!action) return;
            
            const actionType = action.getAttribute('data-action');
            this.executeAction(actionType);
        });
    }

    // Navegar a una página
    navigateTo(page) {
        // Agregar animación de transición
        document.body.style.opacity = '0.5';
        setTimeout(() => {
            window.location.href = page;
        }, 200);
    }

    // Ejecutar acciones globales
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
            case 'scroll-to-chat':
                this.scrollToElement('#chat');
                break;
            case 'toggle-menu':
                this.toggleMobileMenu();
                break;
            default:
                console.log('Acción desconocida:', action);
        }
    }

    // Logout
    logout() {
        if (confirm('¿Deseas cerrar sesión?')) {
            localStorage.removeItem('user-session');
            sessionStorage.clear();
            this.navigateTo('sign_up.html');
        }
    }

    // Navegar hacia atrás
    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('menu.html');
        }
    }

    // Scroll a un elemento
    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Toggle menú móvil
    toggleMobileMenu() {
        const menu = document.querySelector('[data-mobile-menu]');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    // ==================== AUTENTICACIÓN ====================

    checkAuthentication() {
        const publicPages = ['welcome_page.html', 'sign_up.html', 'index.html', 'login.html'];
        const currentPageName = window.location.pathname.split('/').pop() || 'index.html';
        
        const isPublicPage = publicPages.some(page => currentPageName.includes(page));
        const isLoggedIn = localStorage.getItem('user-session') || sessionStorage.getItem('user-session');

        // Si no está en página pública y no está autenticado, redirigir a login
        if (!isPublicPage && !isLoggedIn) {
            this.navigateTo('sign_up.html');
        }

        // Si está en login y ya está autenticado, redirigir a menu
        if (isPublicPage && isLoggedIn && currentPageName.includes('sign_up.html')) {
            this.navigateTo('inicio.html');
        }
    }

    // ==================== EVENTOS ESPECÍFICOS POR PÁGINA ====================

    setupPageSpecificEvents() {
        switch(this.currentPage) {
            case 'inicio':
                this.setupMenuPage();
                break;
            case 'crm_calendar':
                this.setupCalendarPage();
                break;
            case 'login':
                this.setupLoginPage();
                break;
            case 'welcome':
                this.setupWelcomePage();
                break;
        }
    }

    // ==================== PÁGINA: MENU ====================

    setupMenuPage() {
        // Enlace "Abrir chat" con scroll suave
        const chatButton = document.querySelector('a[href="#chat"]');
        if (chatButton) {
            chatButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToElement('#chat');
            });
        }

        // Enlace "Cerrar sesión" en header
        const logoutLink = document.querySelector('a[href="welcome_page.html"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Setup para módulos que aún no tienen página
        const placeholderModules = document.querySelectorAll('a[href="#"]');
        placeholderModules.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Este módulo aún está en desarrollo.');
            });
        });
    }

    // ==================== PÁGINA: LOGIN ====================

    setupLoginPage() {
        // Formulario de login
        const form = document.querySelector('form');
        if (form) {
            // Botón "Iniciar sesión" 
            const loginButton = form.querySelector('a[href="inicio.html"]');
            if (loginButton) {
                loginButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email')?.value;
                    const password = document.getElementById('password')?.value;

                    if (email && password) {
                        // Simulación de login - en producción usar Firebase
                        localStorage.setItem('user-session', JSON.stringify({ 
                            email, 
                            timestamp: Date.now() 
                        }));
                        this.navigateTo('inicio.html');
                    } else {
                        alert('Por favor completa los campos requeridos.');
                    }
                });
            }

            // Botón de Google
            const googleButton = form.querySelector('button[type="button"]');
            if (googleButton) {
                googleButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('La autenticación con Google será implementada con Firebase.');
                });
            }
        }

        // Link "Volver a la página principal"
        const backLink = document.querySelector('a[href="welcome_page.html"]');
        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('welcome_page.html');
            });
        }
    }

    // ==================== PÁGINA: WELCOME ====================

    setupWelcomePage() {
        // Los enlaces de "Solicitar demo" y "Entrar" simplemente navegan normalmente
        // El navegador manejará el href naturalmente

        // Smooth scroll para enlaces internos
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href');
                this.scrollToElement(target);
            });
        });
    }

    // ==================== PÁGINA: CALENDARIO CRM ====================

    setupCalendarPage() {
        // El calendario tiene su propia lógica en calendar.js
        // Aquí solo manejamos navegación

        // Botón para volver al menú (si existe)
        const backButton = document.querySelector('[data-action="back-to-menu"]');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.navigateTo('menu.html');
            });
        }
    }
}

// ==================== INICIALIZACIÓN ====================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Funciones globales para acceso rápido (compatibilidad)
window.navigateTo = (page) => {
    if (window.navigationManager) {
        window.navigationManager.navigateTo(page);
    } else {
        window.location.href = page;
    }
};

window.goBack = () => {
    if (window.navigationManager) {
        window.navigationManager.goBack();
    } else {
        window.history.back();
    }
};

window.logout = () => {
    if (window.navigationManager) {
        window.navigationManager.logout();
    }
};
