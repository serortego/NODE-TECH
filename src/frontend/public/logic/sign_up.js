// sign_up.js — Lógica del formulario de registro e inicio de sesión
import {
  auth, onAuthStateChanged,
  registerWithEmail, loginWithEmail, loginWithGoogle,
  logout, getUserProfile, updateUserBusinessType
} from './auth.js';

// ── Redireccionar si ya hay sesión activa y válida ──────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const profile = await getUserProfile(user.uid);
    // Solo redirigir si el perfil está completo (tiene businessType)
    // Si no tiene businessType, dejar que el flujo de Google lo pida
    if (profile?.status === 'active' && profile?.businessType) {
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
const form          = document.getElementById('auth-form');
const submitBtn     = document.getElementById('submit-btn');
const googleBtn     = document.getElementById('google-btn');
const nameField     = document.getElementById('name-field');
const businessField = document.getElementById('business-field');
const businessInput = document.getElementById('business-type');
const businessError = document.getElementById('business-error');
const modeLabel     = document.getElementById('mode-label');
const toggleLink    = document.getElementById('toggle-mode');
const errorBox      = document.getElementById('auth-error');
const errorText     = document.getElementById('error-text');

// ── Estado del formulario ───────────────────────────────────────────────────
let isRegisterMode = false;

// ── Selección de tipo de negocio ────────────────────────────────────────────
document.querySelectorAll('.business-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.business-type-btn').forEach(b => {
      b.classList.remove('border-blue-500', 'bg-blue-50');
      b.classList.add('border-slate-200', 'bg-white');
    });
    btn.classList.add('border-blue-500', 'bg-blue-50');
    btn.classList.remove('border-slate-200', 'bg-white');
    if (businessInput) businessInput.value = btn.dataset.type;
    businessError?.classList.add('hidden');
  });
});

// ── Toggle login / registro ─────────────────────────────────────────────────
toggleLink?.addEventListener('click', (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  nameField?.classList.toggle('hidden', !isRegisterMode);
  businessField?.classList.toggle('hidden', !isRegisterMode);
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
      const businessType = businessInput?.value;
      if (!businessType) {
        businessError?.classList.remove('hidden');
        setLoading(false);
        return;
      }
      await registerWithEmail(email, password, name, businessType);
      localStorage.setItem('businessType', businessType);
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
    // Si es usuario nuevo de Google (sin businessType), pedir tipo de negocio
    if (!profile?.businessType) {
      setLoading(false);
      const bType = await showBusinessTypeModal();
      if (!bType) return; // canceló
      // Guardar en Firestore y localStorage
      await updateUserBusinessType(user.uid, bType);
      localStorage.setItem('businessType', bType);
      window.location.href = 'inicio.html';
      return;
    }
    localStorage.setItem('businessType', profile.businessType);
    window.location.href = 'inicio.html';
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showError(translateError(err.code));
    }
  } finally {
    setLoading(false);
  }
});

// ── Modal selector de tipo de negocio (para Google nuevos usuarios) ─────────
function showBusinessTypeModal() {
  return new Promise((resolve) => {
    const options = [
      { type: 'dental',     icon: '🦷', label: 'Clínica Dental' },
      { type: 'medica',     icon: '🏥', label: 'Clínica Médica' },
      { type: 'taller',     icon: '🔧', label: 'Taller' },
      { type: 'peluqueria', icon: '✂️', label: 'Peluquería' },
      { type: 'otros',      icon: '🏢', label: 'Otro negocio' },
    ];

    const modal = document.createElement('div');
    modal.id = 'business-modal-overlay';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <h2 class="text-xl font-bold text-slate-800 mb-2 text-center">¿Qué tipo de negocio tienes?</h2>
        <p class="text-sm text-slate-500 text-center mb-6">Selecciona para personalizar la app</p>
        <div class="grid grid-cols-2 gap-3" id="bm-options">
          ${options.map(o => `
            <button type="button"
              class="bm-btn flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition font-semibold text-slate-700 text-sm"
              data-type="${o.type}">
              <span class="text-3xl">${o.icon}</span>
              ${o.label}
            </button>
          `).join('')}
        </div>
        <p id="bm-error" class="text-red-500 text-xs text-center mt-3 hidden">Selecciona una opción para continuar</p>
      </div>
    `;

    document.body.appendChild(modal);

    let selected = null;
    modal.querySelectorAll('.bm-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.bm-btn').forEach(b => {
          b.classList.remove('border-blue-500', 'bg-blue-100');
          b.classList.add('border-slate-200');
        });
        btn.classList.add('border-blue-500', 'bg-blue-100');
        btn.classList.remove('border-slate-200');
        selected = btn.dataset.type;

        // Auto-confirmar tras selección con pequeño delay
        setTimeout(() => {
          modal.remove();
          resolve(selected);
        }, 300);
      });
    });
  });
}

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
