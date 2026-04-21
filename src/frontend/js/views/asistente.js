// Vista: Asistente (Chatbot)
import { procesarMensajeUsuario } from "../modules/command-processor.js";
import { db } from "../modules/firebase-config.js";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let chatHistory = null;

export function renderAsistente() {
    return `
        <div class="h-full flex flex-col max-h-[calc(100vh-200px)]">
            <!-- Header -->
            <div class="mb-6">
                <h1 class="text-3xl font-bold text-slate-900">🤖 Asistente NODE</h1>
                <p class="text-slate-500 mt-1">Tu asistente inteligente para gestión empresarial</p>
            </div>

            <!-- Chat Container -->
            <div class="flex-1 bg-white rounded-2xl shadow-sm p-6 mb-6 overflow-y-auto border border-slate-200">
                <div id="chat-history" class="space-y-4 flex flex-col">
                    <!-- Los mensajes se cargarán aquí -->
                </div>
            </div>

            <!-- Chat Form -->
            <form id="chat-form" class="flex gap-3 mb-4">
                <input 
                    id="chat-input" 
                    type="text" 
                    placeholder="Escribe qué necesitas... (ej: Crea una factura de 50€)"
                    class="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    autocomplete="off"
                >
                <button 
                    type="submit"
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <i class="fas fa-paper-plane"></i>
                    Enviar
                </button>
            </form>

            <!-- Sugerencias Rápidas -->
            <div id="sugerencias-rapidas" class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <!-- Se cargarán dinámicamente -->
            </div>
        </div>
    `;
}

export function initAsistente() {
    try {
        console.log('📱 Inicializando Asistente...');
        
        const chatForm = document.getElementById('chat-form');
        chatHistory = document.getElementById('chat-history');
        const chatInput = document.getElementById('chat-input');
        const sugerenciasContainer = document.getElementById('sugerencias-rapidas');

        if (!chatForm || !chatHistory || !chatInput) {
            console.error('❌ Elementos del chat no encontrados en el DOM');
            return;
        }

        console.log('✅ Elementos del chat encontrados');

        // Mensaje de bienvenida
        mostrarMensajeBot('🤖 ¡Hola! Soy el Asistente NODE. Cuéntame qué necesitas y te ayudaré.', [
            { texto: '💰 Crear factura', comando: 'crea una factura de 50' },
            { texto: '📅 Agendar cita', comando: 'agenda una cita' },
            { texto: '👤 Buscar cliente', comando: 'busca a un cliente' },
            { texto: '📊 Resumen del día', comando: 'resumen de hoy' }
        ]);

        // Cargar historial de chat
        try {
            onSnapshot(query(collection(db, "mensajes"), orderBy("timestamp", "asc")), (snapshot) => {
                // Solo mostrar últimos 20 mensajes
                const mensajes = snapshot.docs.slice(-20).map(doc => doc.data());
                
                // Limpiar y recargar si hay más de 5 mensajes nuevos
                if (mensajes.length > 0 && chatHistory.children.length < mensajes.length + 1) {
                    chatHistory.innerHTML = '';
                    
                    // Mostrar mensaje de bienvenida nuevamente
                    mostrarMensajeBot('🤖 ¡Hola! Soy el Asistente NODE. Cuéntame qué necesitas.', []);
                    
                    // Cargar historial
                    mensajes.forEach((data) => {
                        mostrarMensajeHistorico(data.texto, data.tipo);
                    });
                }
                
                // Scroll al final
                setTimeout(() => {
                    if (chatHistory) {
                        chatHistory.scrollTop = chatHistory.scrollHeight;
                    }
                }, 100);
            });
        } catch (firebaseError) {
            console.error('❌ Error con Firebase:', firebaseError);
        }

        // Manejar envío de mensaje
        chatForm.addEventListener('submit', async (e) => {
            try {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;

                console.log('💬 Mensaje usuario:', text);

                // Mostrar mensaje del usuario
                mostrarMensajeUsuario(text);
                chatInput.value = '';
                chatInput.focus();

                // Guardar en Firebase
                try {
                    await addDoc(collection(db, "mensajes"), {
                        texto: text,
                        tipo: 'user',
                        timestamp: serverTimestamp()
                    });
                    console.log('✅ Mensaje guardado en Firebase');
                } catch (saveError) {
                    console.error('❌ Error guardando mensaje en Firebase:', saveError);
                }

                // Procesar con el nuevo módulo de comandos
                setTimeout(async () => {
                    try {
                        console.log('🔄 Procesando comando...');
                        const respuesta = await procesarMensajeUsuario(text);
                        console.log('✅ Respuesta recibida:', respuesta);
                        
                        // Mostrar respuesta del asistente
                        mostrarMensajeBot(respuesta.mensaje, respuesta.sugerencias || []);

                        // Guardar respuesta en Firebase
                        try {
                            await addDoc(collection(db, "mensajes"), {
                                texto: respuesta.mensaje,
                                tipo: 'bot',
                                timestamp: serverTimestamp(),
                                tipo_respuesta: respuesta.tipo
                            });
                            console.log('✅ Respuesta guardada en Firebase');
                        } catch (saveError) {
                            console.error('❌ Error guardando respuesta:', saveError);
                        }
                    } catch (processError) {
                        console.error('❌ Error procesando comando:', processError);
                        mostrarMensajeBot('❌ Error: ' + (processError.message || 'No se pudo procesar tu mensaje'), []);
                    }
                }, 600);
            } catch (error) {
                console.error('❌ Error en el manejador del formulario:', error);
            }
        });

        // Cargar sugerencias iniciales
        cargarSugerenciasRapidas();
        console.log('✅ Asistente inicializado correctamente');
    } catch (error) {
        console.error('❌ Error fatal en initAsistente:', error);
    }
}

/**
 * Mostrar mensaje del usuario en el chat
 */
function mostrarMensajeUsuario(texto) {
    const html = `
        <div class="flex justify-end">
            <div class="bg-blue-600 text-white p-3 rounded-2xl max-w-[85%] shadow-sm text-sm rounded-br-none">
                ${escapeHtml(texto)}
            </div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', html);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Mostrar mensaje del bot con sugerencias
 */
function mostrarMensajeBot(texto, sugerencias = []) {
    const html = `
        <div class="flex justify-start">
            <div class="bg-slate-100 text-slate-900 p-4 rounded-2xl max-w-[85%] shadow-sm rounded-bl-none">
                <p class="text-sm whitespace-pre-wrap">${escapeHtml(texto)}</p>
                ${sugerencias.length > 0 ? `
                    <div class="mt-3 flex flex-wrap gap-2">
                        ${sugerencias.map(s => `
                            <button class="suggestion-btn bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-blue-700 transition" data-comando="${escapeHtml(s.comando)}">
                                ${escapeHtml(s.texto)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>`;
    
    chatHistory.insertAdjacentHTML('beforeend', html);
    
    // Agregar event listeners a los botones de sugerencia
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chatInput = document.getElementById('chat-input');
            chatInput.value = btn.dataset.comando;
            chatInput.focus();
        });
    });
    
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Mostrar mensaje del historial (sin sugerencias)
 */
function mostrarMensajeHistorico(texto, tipo) {
    const isUser = tipo === 'user';
    const html = `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
            <div class="${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'} p-3 rounded-2xl max-w-[85%] shadow-sm text-sm">
                ${escapeHtml(texto)}
            </div>
        </div>`;
    chatHistory.insertAdjacentHTML('beforeend', html);
}

/**
 * Cargar sugerencias rápidas
 */
function cargarSugerenciasRapidas() {
    const container = document.getElementById('sugerencias-rapidas');
    if (!container) return;

    const sugerencias = [
        { icono: '💰', texto: 'Factura 50€', comando: 'crea una factura de 50 euros' },
        { icono: '💰', texto: 'Factura 100€', comando: 'crea una factura de 100 euros' },
        { icono: '📅', texto: 'Agendar cita', comando: 'agenda una cita' },
        { icono: '👤', texto: 'Buscar cliente', comando: 'busca a un cliente' },
        { icono: '📊', texto: 'Ver resumen', comando: 'resumen de hoy' },
        { icono: '❓', texto: 'Ayuda', comando: 'ayuda' },
    ];

    container.innerHTML = sugerencias.map(s => `
        <button class="sugerencia-rapida bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-slate-900 border border-blue-200 px-4 py-2 rounded-lg text-xs font-medium transition transform hover:scale-105 active:scale-95">
            <span class="text-lg">${s.icono}</span><br>
            <span class="text-xs">${s.texto}</span>
        </button>
    `).join('');

    // Agregar event listeners
    document.querySelectorAll('.sugerencia-rapida').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            const chatInput = document.getElementById('chat-input');
            chatInput.value = sugerencias[idx].comando;
            chatInput.focus();
        });
    });
}

/**
 * Escaper para HTML
 */
function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}
