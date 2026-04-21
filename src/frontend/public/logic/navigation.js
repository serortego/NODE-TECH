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
