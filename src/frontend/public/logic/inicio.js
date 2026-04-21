// inicio.js - Lógica de inicialización para el dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia del NavigationManager cuando el DOM está listo
    if (typeof NavigationManager !== 'undefined') {
        window.navManager = new NavigationManager();
    }
});