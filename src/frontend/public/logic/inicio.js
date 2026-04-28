// ═══════════════════════════════════════════════════════════════════
// INICIO.JS — Inicializador del NavigationManager
// Se ejecuta tras la confirmación de auth (evento 'appReady')
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('appReady', () => {
    window.navManager = new NavigationManager();

    if (window.navManager?.setupFloatingChat) {
        window.navManager.setupFloatingChat();
    }
});
