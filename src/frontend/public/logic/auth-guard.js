// auth-guard.js — Guard de autenticación para todas las páginas privadas
//
// Uso: <script type="module" src="../logic/auth-guard.js"></script>
// Requiere: <style id="auth-loading">body{visibility:hidden!important}</style> en el <head>
//
// Expone como globales para scripts no-module:
//   window.db             — Firestore instance
//   window.firebaseUser   — Auth user
//   window.firebaseProfile — Perfil de Firestore
//   window.firebaseSignOut — () => Promise<void>
//   window.fs             — { collection, addDoc, getDocs, getDoc, updateDoc,
//                             deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp }
//
// Dispara el evento 'appReady' en document cuando auth está confirmada.

import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getDoc, doc,
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Exponer funciones de Firestore como globales para scripts no-module
window.fs = {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, Timestamp
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace('sign_up.html');
    return;
  }

  // Obtener perfil del usuario desde Firestore
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

  // Exponer globales
  window.db             = db;
  window.firebaseUser   = user;
  window.firebaseProfile = profile;
  window.firebaseSignOut = () => signOut(auth);

  // Actualizar nombre/rol en el sidebar si existen esos elementos
  const name = profile.displayName || user.email || 'Usuario';
  const role = profile.role === 'admin' ? 'Administrador' : 'Propietario';
  document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = name);
  document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = role);

  // Mostrar la página (eliminar el estilo de carga)
  const authStyle = document.getElementById('auth-loading');
  if (authStyle) authStyle.remove();
  document.body.style.visibility = '';

  // Notificar a inicio.js que todo está listo para inicializar la app
  document.dispatchEvent(new CustomEvent('appReady', {
    detail: { user, profile, db }
  }));
});
