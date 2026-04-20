// inicio.js - Lógica de navegación y activación de menú en la página de inicio
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop();
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        if (href === page || (href === 'inicio.html' && page === 'inicio.html')) {
            link.classList.add('active');
        }
    });
});