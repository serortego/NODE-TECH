// firebase-config.js — Inicialización única de Firebase para toda la app
//
// PASOS NECESARIOS ANTES DE USAR:
// 1. Ve a Firebase Console → Configuración del proyecto → Tus apps → Web app
//    Si no has registrado ninguna app web todavía, créala ahí primero.
// 2. Copia los valores de "SDK setup and configuration" y pégalos abajo.
// 3. En Firebase Console activa:
//    - Authentication → Proveedores → Email/contraseña ✓ y Google ✓
//    - Firestore Database → Crear base de datos (modo producción)
//
// VERSIÓN DEL CDN: 10.14.1 (modular API)
// Si tu package.json usa una versión más nueva, actualiza el número en las
// importaciones de CDN de este archivo y de auth.js para que coincidan.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCTXHsgPldDXXL18QwLMJVRaaBrweFWKT0",           // ← REEMPLAZA con tu apiKey
  authDomain:        "node-tech.firebaseapp.com",
  projectId:         "node-tech",
  storageBucket:     "node-tech.firebasestorage.app",
  messagingSenderId: "44554000445",           // ← REEMPLAZA con tu messagingSenderId
  appId:             "1:44554000445:web:189ca0acafce6913c1b254"            // ← REEMPLAZA con tu appId
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
