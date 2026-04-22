// inicio.js - Inicialización del SPA: espera a que auth-guard.js confirme auth
document.addEventListener('appReady', () => {
    if (typeof NavigationManager !== 'undefined') {
        window.navManager = new NavigationManager();
    }
});