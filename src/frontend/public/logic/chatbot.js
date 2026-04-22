// chatbot.js - Gestor del Asistente (Chatbot) integrado en el CRM

class ChatbotManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.chatHistory = null;
        this.chatInput = null;
        this.chatForm = null;
    }

    render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-900">🤖 Asistente NODE</h2>
                        <p class="text-slate-600 mt-1">Tu asistente inteligente para gestión empresarial</p>
                    </div>
                </div>

                <!-- Chat Container -->
                <div class="flex-1 bg-white rounded-2xl shadow-sm p-6 overflow-y-auto border border-slate-200 flex flex-col" style="height: 600px;">
                    <div id="chat-history" class="space-y-4 flex flex-col flex-1 overflow-y-auto">
                        <!-- Los mensajes se cargarán aquí -->
                    </div>
                </div>

                <!-- Chat Form -->
                <form id="chat-form" class="flex gap-3">
                    <input 
                        id="chat-input" 
                        type="text" 
                        placeholder="Escribe qué necesitas... (ej: Crea una cita para Cliente X mañana)"
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

    setupListeners() {
        console.log('📱 Inicializando Chatbot...');
        
        this.chatForm = document.getElementById('chat-form');
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');

        if (!this.chatForm || !this.chatHistory || !this.chatInput) {
            console.error('❌ Elementos del chat no encontrados en el DOM');
            return;
        }

        console.log('✅ Elementos del chat encontrados');

        // Mensaje de bienvenida
        this.mostrarMensajeBot('🤖 ¡Hola! Soy el Asistente NODE. Cuéntame qué necesitas y te ayudaré.', [
            { texto: '💰 Crear factura', comando: 'crea una factura de 50' },
            { texto: '📅 Agendar cita', comando: 'crea una cita para Cliente A mañana a las 10:00' },
            { texto: '👤 Buscar cliente', comando: 'busca a un cliente' },
            { texto: '📊 Resumen del día', comando: 'resumen de hoy' }
        ]);

        // Manejar envío de mensaje
        this.chatForm.addEventListener('submit', async (e) => {
            try {
                e.preventDefault();
                const text = this.chatInput.value.trim();
                if (!text) return;

                console.log('💬 Mensaje usuario:', text);

                // Mostrar mensaje del usuario
                this.mostrarMensajeUsuario(text);
                this.chatInput.value = '';
                this.chatInput.focus();

                // Procesar mensaje después de un delay
                setTimeout(async () => {
                    try {
                        console.log('🔄 Procesando comando...');
                        const respuesta = this.procesarMensaje(text);
                        console.log('✅ Respuesta recibida:', respuesta);
                        
                        // Mostrar respuesta del asistente
                        this.mostrarMensajeBot(respuesta.mensaje, respuesta.sugerencias || []);
                    } catch (processError) {
                        console.error('❌ Error procesando comando:', processError);
                        this.mostrarMensajeBot('❌ Error: ' + (processError.message || 'No se pudo procesar tu mensaje'), []);
                    }
                }, 600);
            } catch (error) {
                console.error('❌ Error en el manejador del formulario:', error);
            }
        });

        // Cargar sugerencias iniciales
        this.cargarSugerenciasRapidas();
        console.log('✅ Chatbot inicializado correctamente');
    }

    procesarMensaje(texto) {
        const lower = texto.toLowerCase();
        
        // Detectar intención
        if (lower.includes('cita') || lower.includes('agendar') || lower.includes('crea una cita')) {
            return this.manejarCreacionCita(texto);
        } else if (lower.includes('cliente')) {
            return { mensaje: '👥 He revisado datos del cliente y preparado la ficha en CRM.', sugerencias: [] };
        } else if (lower.includes('factura')) {
            return { mensaje: '🧾 He comenzado la creación de la factura. Revisa Finanzas.', sugerencias: [] };
        } else if (lower.includes('reporte') || lower.includes('resumen')) {
            return { mensaje: '📊 Generando reporte. Mira el Dashboard para el resumen.', sugerencias: [] };
        } else if (lower.includes('ayuda') || lower.includes('help')) {
            return this.getHelpMessage();
        } else {
            return { mensaje: '✅ Acción preparada. Revisa el módulo correspondiente para continuar.', sugerencias: [] };
        }
    }

    manejarCreacionCita(texto) {
        // Parsear cita del mensaje
        const clienteMatch = texto.match(/(?:para|cliente|cita para)\s+(.+?)(?:\s+(?:mañana|hoy|el|a las?))/i);
        const fechaMatch = texto.match(/(?:mañana|hoy|ayer|el|a)?\s+(.+?)(?:\s+a las?)?/i);
        const horaMatch = texto.match(/(?:a las?)\s+(\d{1,2}:\d{2})/i);
        const servicioMatch = texto.match(/(?:de|para|servicio|para un)\s+(.+?)(?:\s+(?:mañana|hoy|ayer|el))?/i);

        if (clienteMatch) {
            const cliente = clienteMatch[1].trim();
            const horaInicio = horaMatch ? horaMatch[1] : '09:00';
            
            // Calcular hora de fin (por defecto 1 hora después)
            const [h, m] = horaInicio.split(':').map(Number);
            const horaFin = String((h + 1) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            
            const fecha = this.parsearFecha(fechaMatch ? fechaMatch[1] : 'mañana');
            const servicio = servicioMatch ? servicioMatch[1].trim() : 'Reunión';

            // Crear cita usando el sistema centralizado
            const nuevaCita = {
                id: String(Math.max(...this.navManager.citas.map(c => parseInt(c.id) || 0), 0) + 1),
                cliente: cliente,
                servicio: servicio,
                fecha: fecha,
                hora: horaInicio,
                horaFin: horaFin,
                precio: '0',
                recurso: this.navManager.recursos?.[0] || 'Auto-asignado',
                notas: 'Creada desde Chatbot',
                estado: 'esperando'
            };

            this.navManager.createNewCita(nuevaCita);

            return {
                mensaje: `📅 ✅ Cita creada para ${cliente} el ${fecha} de ${horaInicio} a ${horaFin}. ¡Se agregó a tu agenda!`,
                sugerencias: [
                    { texto: '📅 Ver agenda', comando: 'Ver mis citas' },
                    { texto: '➕ Otra cita', comando: 'Crea otra cita' }
                ]
            };
        } else {
            return {
                mensaje: 'Para crear una cita, di algo como: "Crea una cita para Cliente X mañana a las 10:00".',
                sugerencias: []
            };
        }
    }

    parsearFecha(fechaStr) {
        if (fechaStr.includes('mañana')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        } else if (fechaStr.includes('hoy')) {
            return new Date().toISOString().split('T')[0];
        } else if (fechaStr.includes('ayer')) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        } else if (fechaStr.includes('/')) {
            const parts = fechaStr.split('/');
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return new Date().toISOString().split('T')[0];
    }

    getHelpMessage() {
        return {
            mensaje: `🤖 Puedo ayudarte con:
• Crear citas: "Crea una cita para Cliente X mañana a las 10:00"
• Ver clientes: "Mostrar información de Cliente Y"
• Generar facturas: "Crear factura para Cliente Z"
• Ver reportes: "Mostrar reporte de ventas"
• Más acciones en los módulos correspondientes.`,
            sugerencias: []
        };
    }

    mostrarMensajeUsuario(texto) {
        const html = `
            <div class="flex justify-end">
                <div class="bg-blue-600 text-white p-3 rounded-2xl max-w-[85%] shadow-sm text-sm rounded-br-none">
                    ${this.escapeHtml(texto)}
                </div>
            </div>`;
        this.chatHistory.insertAdjacentHTML('beforeend', html);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    mostrarMensajeBot(texto, sugerencias = []) {
        const html = `
            <div class="flex justify-start">
                <div class="bg-slate-100 text-slate-900 p-4 rounded-2xl max-w-[85%] shadow-sm rounded-bl-none">
                    <p class="text-sm whitespace-pre-wrap">${this.escapeHtml(texto)}</p>
                    ${sugerencias.length > 0 ? `
                        <div class="mt-3 flex flex-wrap gap-2">
                            ${sugerencias.map(s => `
                                <button class="suggestion-btn bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-blue-700 transition" data-comando="${this.escapeHtml(s.comando)}">
                                    ${this.escapeHtml(s.texto)}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>`;
        
        this.chatHistory.insertAdjacentHTML('beforeend', html);
        
        // Agregar event listeners a los botones de sugerencia
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.chatInput.value = btn.dataset.comando;
                this.chatInput.focus();
            });
        });
        
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    cargarSugerenciasRapidas() {
        const container = document.getElementById('sugerencias-rapidas');
        if (!container) return;

        const sugerencias = [
            { icono: '💰', texto: 'Factura 50€', comando: 'crea una factura de 50 euros' },
            { icono: '💰', texto: 'Factura 100€', comando: 'crea una factura de 100 euros' },
            { icono: '📅', texto: 'Agendar cita', comando: 'crea una cita para Cliente A mañana a las 10:00' },
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
                this.chatInput.value = sugerencias[idx].comando;
                this.chatInput.focus();
            });
        });
    }

    escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
}
