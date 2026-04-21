// 1. IMPORTACIONES (Añadimos Auth)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTXHsgPLdDXXL18QwLMJVRaaBrweFWKT0",
    authDomain: "node-tech.firebaseapp.com",
    projectId: "node-tech",
    storageBucket: "node-tech.firebasestorage.app",
    messagingSenderId: "44554000445",
    appId: "1:44554000445:web:189ca0acafce6913c1b254"
};

// 2. INICIALIZACIÓN
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Inicializa el portero
const provider = new GoogleAuthProvider();

// Elementos de la interfaz
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatHistory = document.getElementById('chat-history');
const tableBody = document.getElementById('table-body');
const authScreen = document.getElementById('auth-screen');
const btnLogin = document.getElementById('btn-login');

// --- NUEVA LÓGICA DE SEGURIDAD ---

// Al hacer clic en el botón, abrir Google
btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => console.error("Error:", err));
});

// El vigilante: Decide si quita o pone la pantalla de bloqueo
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si hay usuario, escondemos el bloqueo
        authScreen.style.opacity = "0";
        setTimeout(() => authScreen.style.display = "none", 500);
    } else {
        // Si no hay usuario, mostramos el bloqueo
        authScreen.style.display = "flex";
        authScreen.style.opacity = "1";
    }
});

// --- TU LÓGICA DE FACTURAS (Mantenida) ---

onSnapshot(query(collection(db, "facturas"), orderBy("timestamp", "desc")), (snapshot) => {
    tableBody.innerHTML = '';
    let totalVentas = 0;
    snapshot.forEach((doc) => {
        const data = doc.data();
        totalVentas += parseFloat(data.monto || 0);
        tableBody.innerHTML += `
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm">${data.cliente}</td>
                <td class="py-3 px-4 text-sm font-semibold">${data.monto}€</td>
                <td class="py-3 px-4 text-center"><span class="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold">PAGADO</span></td>
            </tr>`;
    });
    document.getElementById('ventas-total').innerText = `${totalVentas}€`;
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    chatInput.value = '';

    setTimeout(async () => {
        const input = text.toLowerCase();
        if (input.includes("factura") || input.includes("cobra")) {
            const montoMatch = text.match(/\d+/);
            const monto = montoMatch ? montoMatch[0] : "0";
            
            await addDoc(collection(db, "facturas"), {
                cliente: "Cliente Nuevo",
                monto: monto,
                timestamp: serverTimestamp()
            });
            appendMessage(`✅ He generado la factura de ${monto}€ y la he añadido a tu panel.`, 'bot');
        } else {
            appendMessage("Prueba con: 'Crea una factura de 50€'.", 'bot');
        }
    }, 800);
});

function appendMessage(text, sender) {
    const isUser = sender === 'user';
    const html = `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
            <div class="${isUser ? 'bg-slate-800' : 'bg-blue-600'} text-white p-3 rounded-2xl max-w-[85%] shadow-sm text-xs">
                ${text}
            </div>
        </div>`;
    chatHistory.innerHTML += html;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

chatHistory.innerHTML += `<div class="text-center text-sm text-gray-500 py-4">✅ Chat cargado. Comienza a escribir comandos.</div>`;
