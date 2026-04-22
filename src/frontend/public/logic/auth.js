// auth.js — Autenticación + guard para NODE
//
// USO EN PÁGINAS PROTEGIDAS:
//   <style id="auth-loading">body{visibility:hidden!important}</style>  ← en <head>
//   <script type="module" src="../logic/auth.js"></script>
//
// USO DESDE OTROS MÓDULOS ES:
//   import { auth, onAuthStateChanged, registerWithEmail, ... } from './auth.js';
//
// GLOBALES expuestos en páginas protegidas (NO en sign_up.html):
//   window.db, window.firebaseUser, window.firebaseProfile,
//   window.firebaseSignOut, window.fs
// EVENTO: dispara 'appReady' en document cuando la auth está confirmada.
//
// Modelo Firestore (users/{uid}):
//   uid, email, displayName, role ("user"|"admin"), status ("active"|"disabled"),
//   createdAt, lastLoginAt

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  fetchSignInMethodsForEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
  collection, addDoc, getDocs, deleteDoc,
  query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { auth, db } from './firebase-config.js';

export { auth, onAuthStateChanged };

const googleProvider = new GoogleAuthProvider();

// ─── Funciones de autenticación exportables ───────────────────────────────────

export async function registerWithEmail(email, password, displayName = null) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await _createUserProfile(credential.user, displayName);
  return credential.user;
}

export async function loginWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await _updateLastLogin(credential.user.uid);
    return credential.user;
  } catch (err) {
    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/user-not-found'
    ) {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes('google.com') && !methods.includes('password')) {
          const googleErr = new Error('google-only-account');
          googleErr.code = 'auth/google-only-account';
          throw googleErr;
        }
      } catch (innerErr) {
        if (innerErr.code === 'auth/google-only-account') throw innerErr;
      }
    }
    throw err;
  }
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const info = getAdditionalUserInfo(credential);
  if (info?.isNewUser) {
    await _createUserProfile(credential.user);
  } else {
    const profile = await getUserProfile(credential.user.uid);
    if (!profile) {
      await _createUserProfile(credential.user);
    } else {
      await _updateLastLogin(credential.user.uid);
    }
  }
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

async function _createUserProfile(user, displayName = null) {
  await setDoc(doc(db, 'users', user.uid), {
    uid:         user.uid,
    email:       user.email,
    displayName: displayName || user.displayName || null,
    role:        'user',
    status:      'active',
    createdAt:   serverTimestamp(),
    lastLoginAt: serverTimestamp()
  });
}

async function _updateLastLogin(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { lastLoginAt: serverTimestamp() });
  } catch {
    // Silencioso: si falla no bloquea el login
  }
}

// ─── Guard de autenticación (solo en páginas protegidas) ─────────────────────
// Se omite en sign_up.html para evitar redirección circular.

if (!window.location.pathname.endsWith('sign_up.html')) {

  // Exponer helpers de Firestore como globales para scripts no-module
  window.fs = {
    collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
    doc, query, orderBy, serverTimestamp, Timestamp
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace('sign_up.html');
      return;
    }

    let profile = {};
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        profile = snap.data();
        if (profile.status === 'disabled') {
          await signOut(auth);
          window.location.replace('sign_up.html');
          return;
        }
      }
    } catch {
      // No bloqueamos si Firestore no responde temporalmente
    }

    // Exponer globales para scripts no-module
    window.db              = db;
    window.firebaseUser    = user;
    window.firebaseProfile = profile;
    window.firebaseSignOut = () => signOut(auth);

    // Rellenar nombre/rol en el sidebar
    const name = profile.displayName || user.email || 'Usuario';
    const role = profile.role === 'admin' ? 'Administrador' : 'Propietario';
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = role);

    // Mostrar la página
    const authStyle = document.getElementById('auth-loading');
    if (authStyle) authStyle.remove();
    document.body.style.visibility = '';

    // Notificar a los módulos que la app está lista
    document.dispatchEvent(new CustomEvent('appReady', {
      detail: { user, profile, db }
    }));
  });
}
