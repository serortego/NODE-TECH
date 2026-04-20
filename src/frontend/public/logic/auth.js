// auth.js — Operaciones de autenticación y gestión de perfil de usuario
//
// Modelo de datos en Firestore (colección: users / documento: uid):
//   uid            : string
//   email          : string
//   displayName    : string | null
//   role           : "user" | "admin"    ← asigna "admin" manualmente desde Firestore Console
//   status         : "active" | "disabled"
//   createdAt      : Timestamp (serverTimestamp)
//   lastLoginAt    : Timestamp (serverTimestamp, actualizado en cada login)
//
// NOTA SOBRE ADMIN:
// El rol "admin" se asigna manualmente desde Firebase Console → Firestore → users/{uid}
// Para mayor seguridad en producción (Custom Claims via Admin SDK), ver:
// https://firebase.google.com/docs/auth/admin/custom-claims

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  getAdditionalUserInfo
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { auth, db } from './firebase-config.js';

export { auth, onAuthStateChanged };

const googleProvider = new GoogleAuthProvider();

// Registra un nuevo usuario con email y contraseña, y crea su perfil en Firestore.
export async function registerWithEmail(email, password, displayName = null) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await _createUserProfile(credential.user, displayName);
  return credential.user;
}

// Inicia sesión con email y contraseña. No crea perfil (debe existir previamente).
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await _updateLastLogin(credential.user.uid);
  return credential.user;
}

// Inicia sesión con Google. Crea perfil si es la primera vez.
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

// Cierra la sesión activa.
export async function logout() {
  await signOut(auth);
}

// Devuelve el perfil Firestore del usuario o null si no existe.
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// Crea el documento de perfil en Firestore. Role y status por defecto.
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
