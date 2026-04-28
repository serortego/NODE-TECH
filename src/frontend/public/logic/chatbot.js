/**
 * ChatbotManager v2 - Integrado con DataManager
 * 
 * ✨ Funcionalidades:
 * - Crear citas
 * - Crear clientes
 * - Buscar empleados, clientes
 * - Ver resumen del día
 * - Consultar información
 * 
 * 🧠 Inteligencia:
 * - Solo pregunta información ESENCIAL
 * - Mantiene contexto de conversación
 * - Aprende del contexto del mensaje
 */

class ChatbotManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.chatForm = null;
        this.chatInput = null;
        this.chatHistory = null;
        this.initialized = false;
        
        // 🧠 Contexto de conversación
        this.contexto = {
            accionPendiente: null,  // 'crearCliente', 'crearCita', etc.
            datosCliente: {},
            datoCita: {}
        };
    }

    render() {
        return `
            <div class="flex flex-col h-full gap-3">
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Asistente NODE</h2>
                        <p class="text-slate-400 mt-0.5 text-sm">Tu asistente inteligente de gestión empresarial</p>
                    </div>
                </div>

                <div class="glass rounded-2xl px-4 pt-4 pb-2 flex flex-col border border-[rgba(255,255,255,0.08)] flex-1 min-h-0">
                    <div id="chat-history" class="space-y-4 flex flex-col flex-1 overflow-y-auto pr-1">
                        <!-- Mensajes aquí -->
                    </div>
                </div>

                <form id="chat-form" class="flex gap-3 flex-shrink-0">
                    <input 
                        id="chat-input" 
                        type="text" 
                        placeholder="Escribe qué necesitas... (ej: pon una cita a María mañana a las 11:00)"
                        class="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B93A6] text-sm"
                        autocomplete="off"
                    >
                    <button 
                        type="submit"
                        class="btn-primary px-6 py-3 rounded-lg flex items-center gap-2"
                    >
                        <i class="fas fa-paper-plane"></i>
                        Enviar
                    </button>
                </form>

                <div id="sugerencias-rapidas" class="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
                    <!-- Sugerencias -->
                </div>
            </div>
        `;
    }

    async setupListeners() {
        if (this.initialized) return;
        this.initialized = true;

        this.chatForm = document.getElementById('chat-form');
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');

        if (!this.chatForm || !this.chatHistory || !this.chatInput) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }

        console.log('🤖 Chatbot v2 inicializado con DataManager');

        // Bienvenida
        this.agregarMensajeBot(
            '¡Hola! Soy tu asistente NODE.\n\n' +
            'Puedo ayudarte con:\n' +
            '📅 Citas: "Pon una cita a María mañana a las 11:00"\n' +
            '👤 Clientas: "Nueva clienta: Rosa Pérez"\n' +
            '👧 Equipo: "¿Cuántas empleadas tengo?"\n' +
            '💰 Caja: "¿Cuánto he ganado hoy?"\n' +
            '🔍 Buscar: "Busca a María García"'
        );

        // Listener del formulario
        this.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const texto = this.chatInput.value.trim();
            if (!texto) return;

            this.agregarMensajeUsuario(texto);
            this.chatInput.value = '';

            try {
                const respuesta = await this.procesarMensaje(texto);
                this.agregarMensajeBot(respuesta);
            } catch (error) {
                console.error('❌ Error:', error);
                this.agregarMensajeBot('❌ Error: ' + error.message);
            }
        });

        this.cargarSugerenciasRapidas();
    }

    /**
     * PROCESAR MENSAJE - Detecta intención y ejecuta acción
     */
    async procesarMensaje(texto) {
        const lower = texto.toLowerCase();
        
        // 🧠 Si hay una acción pendiente, continuar con el contexto
        if (this.contexto.accionPendiente) {
            return await this.continuarAccion(texto);
        }

        // ─── Detección de intención ampliada para lenguaje natural de peluquería ───

        // Crear cita: acepta pon/apunta/añade/agrega/mete/crear/agendar/quiero
        const intentCita = (lower.includes('cita') || lower.includes('cita')) &&
            (lower.match(/\b(pon|apunta|añade|agrega|mete|crea|agendar|quiero|necesito|ponme|apúntame)\b/));
        if (intentCita) {
            return await this.crearCita(texto);
        }

        // Nuevo cliente: "nuevo cliente", "añade una clienta", "alta de cliente"
        if (lower.match(/\b(nuevo|nueva|añade|alta)\b/) && lower.match(/\b(cliente|clienta)\b/)) {
            return await this.crearCliente(texto);
        }

        // Empleados
        if (lower.includes('empleado') || lower.match(/\bcuántas? (chica|persona|empleada)s?\b/)) {
            return await this.verEmpleados();
        }

        // Resumen / finanzas del día
        if (lower.match(/\b(resumen|hoy|gané|ganado|facturé|facturado|ingresos?|cuánto he)\b/)) {
            return await this.verResumen();
        }

        // Buscar cliente: "busca", "busca a", "dónde está", "info de"
        if (lower.match(/\b(busca|encuentra|dónde está|info de|ficha de)\b/) && lower.match(/\b(cliente|clienta|a )\b/)) {
            return await this.buscarCliente(texto);
        }
        
        return '😕 No entiendo bien. Puedes decirme, por ejemplo:\n'
             + '📅 "Pon una cita a María mañana a las 11:00"\n'
             + '👤 "Nueva clienta: Rosa Pérez"\n'
             + '👥 "¿Cuántas empleadas tengo?"\n'
             + '💰 "¿Cuánto he ganado hoy?"';
    }

    /**
     * 🧠 CONTINUAR ACCIÓN - Retoma lo que estaba haciendo
     */
    async continuarAccion(texto) {
        const accion = this.contexto.accionPendiente;
        this.contexto.accionPendiente = null;

        if (accion === 'crearCliente_nombre') {
            const nombre = texto.trim();
            if (!nombre) return '❓ Necesito un nombre válido. ¿Cómo se llama?';
            
            try {
                const cliente = await window.dataManager.crearCliente({
                    nombre,
                    email: '',
                    telefono: ''
                });
                return `✅ Cliente creado: ${cliente.nombre}`;
            } catch (error) {
                return '❌ Error: ' + error.message;
            }
        }

        if (accion === 'crearCita_cliente') {
            this.contexto.datoCita.cliente = texto.trim();
            return await this.pedirDatoCita_Fecha();
        }

        if (accion === 'crearCita_fecha') {
            this.contexto.datoCita.fecha = texto.trim();
            return await this.pedirDatoCita_Hora();
        }

        if (accion === 'crearCita_hora') {
            this.contexto.datoCita.hora = texto.trim();
            return await this.ejecutarCrearCita();
        }

        return '❌ Error al procesar. Intenta de nuevo.';
    }

    /**
     * CREAR CITA - Modo conversacional e inteligente
     */
    async crearCita(texto) {
        if (!window.dataManager) return '❌ DataManager no inicializado';

        try {
            // Extraer datos del texto
            const clienteMatch = texto.match(/(?:para|a)\s+([a-záéíóúñ\s]+?)(?:\s+mañana|\s+hoy|\s+a las|\s+el\s+|\s*$)/i);
            const horaMatch = texto.match(/(\d{1,2}):(\d{2})/);
            const fechaIndicador = texto.includes('mañana') ? 'mañana' : 
                                 texto.includes('hoy') ? 'hoy' : null;

            let cliente = null;
            let horaInicio = null;
            let fecha = null;

            // Buscar cliente si se especificó
            if (clienteMatch) {
                const nombreCliente = clienteMatch[1].trim();
                const clientes = await window.dataManager.obtenerClientes();
                cliente = clientes.find(c => c.nombre.toLowerCase().includes(nombreCliente.toLowerCase()));
                
                if (!cliente) {
                    cliente = await window.dataManager.crearCliente({
                        nombre: nombreCliente,
                        email: '',
                        telefono: ''
                    });
                }
                this.contexto.datoCita.cliente = cliente.nombre;
            }

            // Si hay hora
            if (horaMatch) {
                horaInicio = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`;
                this.contexto.datoCita.hora = horaInicio;
            }

            // Si hay fecha
            if (fechaIndicador) {
                fecha = fechaIndicador === 'mañana' 
                    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0];
                this.contexto.datoCita.fecha = fecha;
            }

            // ✅ Tenemos todo lo necesario
            if (cliente && horaInicio && fecha) {
                return await this.ejecutarCrearCita();
            }

            // ❓ Falta cliente
            if (!cliente) {
                this.contexto.accionPendiente = 'crearCita_cliente';
                return '👤 ¿Para quién es la cita? (nombre del cliente)';
            }

            // ❓ Falta fecha
            if (!fecha) {
                this.contexto.accionPendiente = 'crearCita_fecha';
                return '📅 ¿Cuándo? (ej: mañana, hoy)';
            }

            // ❓ Falta hora
            if (!horaInicio) {
                this.contexto.accionPendiente = 'crearCita_hora';
                return '🕐 ¿A qué hora? (ej: 10:00)';
            }

        } catch (error) {
            console.error('❌ Error:', error);
            return '❌ Error: ' + error.message;
        }
    }

    /**
     * CREAR CLIENTE - Modo conversacional
     */
    async crearCliente(texto) {
        if (!window.dataManager) return '❌ DataManager no inicializado';

        // Extraer nombre si está en el mensaje
        const nombreMatch = texto.match(/cliente:\s*([a-záéíóú\s]+?)(?:\s*$|[\.\,\?])/i);
        
        if (nombreMatch) {
            // ✅ Tenemos nombre, crear directamente
            const nombre = nombreMatch[1].trim();
            try {
                const cliente = await window.dataManager.crearCliente({
                    nombre,
                    email: '',
                    telefono: ''
                });
                return `✅ Cliente creado: ${cliente.nombre}`;
            } catch (error) {
                return '❌ Error: ' + error.message;
            }
        } else {
            // ❓ No tenemos nombre, preguntar
            this.contexto.accionPendiente = 'crearCliente_nombre';
            return '👤 ¿Cuál es el nombre del cliente?';
        }
    }

    /**
     * 🧠 Helper: Pedir fecha de cita
     */
    async pedirDatoCita_Fecha() {
        this.contexto.accionPendiente = 'crearCita_fecha';
        return `📅 ¿Cuándo quieres la cita? (ej: mañana, hoy)`;
    }

    /**
     * 🧠 Helper: Pedir hora de cita
     */
    async pedirDatoCita_Hora() {
        this.contexto.accionPendiente = 'crearCita_hora';
        return `🕐 ¿A qué hora? (ej: 10:00)`;
    }

    /**
     * ✅ EJECUTAR CREACIÓN DE CITA
     */
    async ejecutarCrearCita() {
        try {
            const datos = this.contexto.datoCita;
            
            if (!datos.cliente || !datos.fecha || !datos.hora) {
                throw new Error('Faltan datos de la cita');
            }

            // Buscar cliente por nombre
            const clientes = await window.dataManager.obtenerClientes();
            const cliente = clientes.find(c => c.nombre.toLowerCase().includes(datos.cliente.toLowerCase()));

            if (!cliente) throw new Error('Cliente no encontrado');

            // Obtener empleado disponible
            const empleados = await window.dataManager.obtenerEmpleados();
            if (empleados.length === 0) throw new Error('No hay empleados disponibles');

            // Obtener servicio
            const servicios = await window.dataManager.obtenerServicios();
            const servicio = servicios.length > 0 ? servicios[0] : { id: 'default', nombre: 'Servicio', precio: 0 };

            // Crear cita
            const cita = await window.dataManager.crearCita({
                clienteId: cliente.id,
                empleadoId: empleados[0].id,
                servicioId: servicio.id,
                fecha: datos.fecha,
                hora: datos.hora,
                duracion: 30,
                precio: servicio.precio || 0
            });

            // Limpiar contexto
            this.contexto.datoCita = {};
            this.contexto.accionPendiente = null;

            return `✅ ¡Cita creada!\n📅 ${cliente.nombre}\n🕐 ${datos.fecha} a las ${datos.hora}\n💼 ${empleados[0].nombre}`;
        } catch (error) {
            this.contexto.datoCita = {};
            this.contexto.accionPendiente = null;
            return '❌ Error: ' + error.message;
        }
    }

    /**
     * VER EMPLEADOS
     */
    async verEmpleados() {
        if (!window.dataManager) return '❌ DataManager no inicializado';

        try {
            const empleados = await window.dataManager.obtenerEmpleados();
            if (empleados.length === 0) return '📭 No hay empleados registrados';

            const listado = empleados
                .slice(0, 5)
                .map(e => `👤 ${e.nombre}${e.rol ? ` (${e.rol})` : ''}`)
                .join('\n');

            return `👥 EMPLEADOS (${empleados.length}):\n${listado}`;
        } catch (error) {
            return '❌ Error: ' + error.message;
        }
    }

    /**
     * VER RESUMEN DEL DÍA
     */
    async verResumen() {
        if (!window.dataManager) return '❌ DataManager no inicializado';

        try {
            const hoy = new Date().toISOString().split('T')[0];
            const resumen = await window.dataManager.obtenerResumenDia(hoy);

            if (!resumen) return '❌ No se pudo obtener el resumen';

            return `📊 RESUMEN DEL DÍA
━━━━━━━━━━━━━━━━━
📅 Citas: ${resumen.citasTotal} (✅ ${resumen.citasCompletadas} completadas)
💰 Ingresos: €${resumen.totalIngresos}
👥 Empleados: ${resumen.empleadosTrabajando}`;
        } catch (error) {
            return '❌ Error: ' + error.message;
        }
    }

    /**
     * BUSCAR CLIENTE
     */
    async buscarCliente(texto) {
        if (!window.dataManager) return '❌ DataManager no inicializado';

        try {
            const nombreMatch = texto.match(/busca.*?(?:cliente|a)\s+([a-záéíóú\s]+?)(?:\s*$|[\.\,\?])/i);
            if (!nombreMatch) {
                const clientes = await window.dataManager.obtenerClientes();
                return `📋 CLIENTES (${clientes.length}):\n${clientes.slice(0, 5).map(c => `👤 ${c.nombre}`).join('\n')}`;
            }

            const nombre = nombreMatch[1].trim();
            const resultados = await window.dataManager.buscarCliente(nombre);

            if (resultados.length === 0) return `❌ No encontré cliente "${nombre}"`;

            const cliente = resultados[0];
            return `👤 ${cliente.nombre}\n📧 ${cliente.email || '—'}\n📱 ${cliente.telefono || '—'}`;
        } catch (error) {
            return '❌ Error: ' + error.message;
        }
    }

    // ==================== UI ====================

    agregarMensajeUsuario(texto) {
        const html = `
            <div class="flex justify-end mb-4">
                <div class="bg-[#2B93A6] text-white p-3 rounded-lg max-w-[70%] text-sm rounded-br-none shadow-sm">
                    ${this.escapeHtml(texto)}
                </div>
            </div>
        `;
        this.chatHistory.insertAdjacentHTML('beforeend', html);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    agregarMensajeBot(texto) {
        const html = `
            <div class="flex justify-start mb-4">
                <div class="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-slate-200 p-3 rounded-lg max-w-[70%] text-sm rounded-bl-none">
                    <p class="whitespace-pre-wrap">${this.escapeHtml(texto)}</p>
                </div>
            </div>
        `;
        this.chatHistory.insertAdjacentHTML('beforeend', html);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    cargarSugerenciasRapidas() {
        const container = document.getElementById('sugerencias-rapidas');
        if (!container) return;

        const sugerencias = [
            { icono: '📅', texto: 'Nueva cita', comando: 'Pon una cita a María mañana a las 11:00' },
            { icono: '👤', texto: 'Nueva clienta', comando: 'nueva clienta: Rosa Pérez' },
            { icono: '👧', texto: 'Mis empleadas', comando: '¿Cuántas empleadas tengo?' },
            { icono: '💰', texto: 'Ingresos hoy', comando: '¿Cuánto he ganado hoy?' },
        ];

        container.innerHTML = sugerencias.map(s => `
            <button class="sugerencia-rapida glass hover:bg-[rgba(43,147,166,0.15)] border border-[rgba(43,147,166,0.3)] text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-medium transition flex flex-col items-center gap-1">
                <div class="text-lg">${s.icono}</div>
                <div>${s.texto}</div>
            </button>
        `).join('');

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
