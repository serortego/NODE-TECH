// sign_up.js — Lógica del formulario de registro e inicio de sesión
import {
  auth, onAuthStateChanged,
  registerWithEmail, loginWithEmail, loginWithGoogle,
  logout, getUserProfile
} from './auth.js';

// ── Redireccionar si ya hay sesión activa y válida ──────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const profile = await getUserProfile(user.uid);
    if (profile?.status === 'active') {
      window.location.href = 'inicio.html';
    } else if (profile?.status === 'disabled') {
      await logout();
      showError('Tu cuenta ha sido deshabilitada. Contacta con soporte.');
    }
  } catch {
    // Si Firestore no está configurado todavía, no bloquear la UI
  }
});

// ── Referencias al DOM ──────────────────────────────────────────────────────
const form        = document.getElementById('auth-form');
const submitBtn   = document.getElementById('submit-btn');
const googleBtn   = document.getElementById('google-btn');
const nameField   = document.getElementById('name-field');
const modeLabel   = document.getElementById('mode-label');
const toggleLink  = document.getElementById('toggle-mode');
const errorBox    = document.getElementById('auth-error');
const errorText   = document.getElementById('error-text');

// ── Estado del formulario ───────────────────────────────────────────────────
let isRegisterMode = false;

// ── Toggle login / registro ─────────────────────────────────────────────────
toggleLink?.addEventListener('click', (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  nameField?.classList.toggle('hidden', !isRegisterMode);
  submitBtn.textContent  = isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión';
  modeLabel.textContent  = isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
  toggleLink.textContent = isRegisterMode ? 'Inicia sesión' : 'Regístrate ahora';
  hideError();
});

// ── Envío del formulario ────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const name     = document.getElementById('display-name')?.value.trim() || null;

  if (!email || !password) {
    showError('Por favor completa todos los campos.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    if (isRegisterMode) {
      await registerWithEmail(email, password, name);
    } else {
      const user    = await loginWithEmail(email, password);
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        await logout();
        showError('No se encontró tu perfil. Contacta con soporte.');
        return;
      }
      if (profile.status !== 'active') {
        await logout();
        showError('Tu cuenta ha sido deshabilitada. Contacta con soporte.');
        return;
      }
    }
    window.location.href = 'inicio.html';
  } catch (err) {
    showError(translateError(err.code));
  } finally {
    setLoading(false);
  }
});

// ── Login con Google ────────────────────────────────────────────────────────
googleBtn?.addEventListener('click', async () => {
  setLoading(true);
  hideError();
  try {
    const user    = await loginWithGoogle();
    const profile = await getUserProfile(user.uid);
    if (profile?.status === 'disabled') {
      await logout();
      showError('Tu cuenta ha sido deshabilitada. Contacta con soporte.');
      return;
    }
    window.location.href = 'inicio.html';
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showError(translateError(err.code));
    }
  } finally {
    setLoading(false);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.disabled = on;
  if (googleBtn) googleBtn.disabled = on;
  submitBtn.textContent = on
    ? 'Un momento...'
    : (isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión');
}

function showError(msg) {
  if (errorText)  errorText.textContent = msg;
  errorBox?.classList.remove('hidden');
}

function hideError() {
  errorBox?.classList.add('hidden');
}

function translateError(code) {
  const map = {
    'auth/email-already-in-use':    'Este correo ya está registrado. Intenta iniciar sesión.',
    'auth/invalid-email':           'El formato del correo no es válido.',
    'auth/weak-password':           'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found':          'No existe una cuenta con este correo.',
    'auth/wrong-password':          'Contraseña incorrecta.',
    'auth/invalid-credential':      'Correo o contraseña incorrectos.',
    'auth/google-only-account':     'Esta cuenta fue creada con Google. Usa el botón "Continuar con Google" para iniciar sesión.',
    'auth/too-many-requests':       'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    'auth/network-request-failed':  'Error de red. Comprueba tu conexión a internet.',
    'auth/popup-blocked':           'El navegador bloqueó la ventana emergente. Permite popups para este sitio.',
    'auth/operation-not-allowed':   'Este método de inicio de sesión no está habilitado en Firebase Console.',
    'auth/unauthorized-domain':     'Este dominio no está autorizado en Firebase. Contacta al administrador.',
    'auth/cancelled-popup-request': 'Solicitud cancelada. Inténtalo de nuevo.',
  };
  return map[code] ?? 'Error inesperado. Inténtalo de nuevo.';
}
