// Authentication Module (MODO DEMO - Abierto)
// Este módulo está en modo demo, sin autenticación con Google
// Para versión producción, descomentar las funciones con Firebase

// import { auth } from "./firebase-config.js";
// import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// const provider = new GoogleAuthProvider();

// Modo Demo: Usuario público
const demoUser = {
    uid: "demo-public-user",
    displayName: "Visitante",
    email: "demo@node-app.local"
};

export function initAuth(onUserLogged, onUserLoggedOut) {
    // En modo demo, inicializar directamente
    console.log("📱 Modo DEMO activado - Sin autenticación de Google");
    onUserLogged(demoUser);
}

export function loginWithGoogle() {
    console.warn("⚠️ Google Login deshabilitado en modo DEMO");
    return Promise.resolve(demoUser);
}

export function getCurrentUser() {
    return demoUser;
}

export async function logout() {
    console.log("👋 Cerrando sesión demo...");
    return Promise.resolve();
}
