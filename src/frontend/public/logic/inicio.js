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

// Poblar barra de usuario cuando navigation.js confirme la sesión
document.addEventListener('nodeUserReady', ({ detail }) => {
    const { profile } = detail;
    const name    = profile.displayName || profile.email || '—';
    const initial = name.charAt(0).toUpperCase();

    const avatarEl = document.getElementById('user-avatar');
    const nameEl   = document.getElementById('user-display-name');
    const emailEl  = document.getElementById('user-display-email');

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl)   nameEl.textContent   = name;
    // Segunda línea: email solo si ya se mostró el displayName en la primera
    if (emailEl)  emailEl.textContent  = profile.displayName ? profile.email : '';
});