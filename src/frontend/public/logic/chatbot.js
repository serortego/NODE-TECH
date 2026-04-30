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

        // Bienvenida simple
        this.agregarMensajeBot('¡Hola! Soy tu asistente inteligente. ¿En qué puedo ayudarte hoy?');

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
    }

    /**
     * PROCESAR MENSAJE - Detecta intención y ejecuta acción vía Ollama Local
     */
    async procesarMensaje(texto) {
        // Inicializar memoria si no existe
        if (!this.chatHistoryMemory) {
            this.chatHistoryMemory = [];
        }
        
        // Añadir mensaje del usuario a la memoria
        this.chatHistoryMemory.push({ role: 'user', content: texto });
        
        return await this.enviarABackend();
    }

    async enviarABackend() {
        try {
            // Extraer contexto del usuario para personalizar la respuesta
            let userContext = "";
            try {
                const nombreDr = document.querySelector('.sidebar-user-name')?.textContent || 'Doctor/a';
                const rolDr = document.querySelector('.sidebar-user-role')?.textContent || 'Profesional';
                const clinica = 'el negocio';
                userContext = `Te estás dirigiendo a ${nombreDr} (${rolDr}) de ${clinica}.`;
            } catch(e) {}

            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: this.chatHistoryMemory,
                    user_context: userContext
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            // Añadir respuesta de Ollama a la memoria
            this.chatHistoryMemory.push(data); 

            // Si hay tool calls, ejecutar las acciones en el frontend
            if (data.tool_calls && data.tool_calls.length > 0) {
                // Notificar al usuario temporalmente
                this.agregarMensajeBot('⏳ Ejecutando acción en el sistema...');

                for (const tool of data.tool_calls) {
                    const funcName = tool.function.name;
                    const args = tool.function.arguments;
                    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                    
                    let result = '';
                    try {
                        result = await this.ejecutarTool(funcName, parsedArgs);
                    } catch(err) {
                        result = "Error al ejecutar: " + err.message;
                    }

                    // Enviar el resultado de vuelta a la memoria para Ollama
                    this.chatHistoryMemory.push({
                        role: 'tool',
                        content: result,
                        name: funcName
                    });
                }
                
                // Llamar de nuevo al backend con el resultado para que Ollama genere la respuesta final
                return await this.enviarABackend();
            }

            return data.content || "Hecho.";

        } catch (error) {
            console.error('Error enviando a backend:', error);
            return '❌ Chatbot no disponible';
        }
    }

    async ejecutarTool(nombre, args) {
        if (!window.dataManager) return "DataManager no inicializado";

        try {
            switch(nombre) {
                case 'crearCita': {
                    if (!args.cliente || !args.fecha || !args.hora || !args.motivo || !args.duracion) {
                        return "Error: Faltan datos obligatorios (cliente, fecha, hora, motivo o duración). Pide al usuario que los proporcione en lugar de inventarlos.";
                    }
                    const clientes = await window.dataManager.obtenerClientes();
                    let cliente = clientes.find(c => c.nombre.toLowerCase().includes(args.cliente.toLowerCase()));
                    if (!cliente) {
                        cliente = await window.dataManager.crearCliente({nombre: args.cliente, email:'', telefono:''});
                    }
                    
                    let empleados = await window.dataManager.obtenerEmpleados();
                    if (empleados.length === 0) {
                        await window.dataManager.crearEmpleado({nombre: 'Dr. Principal', rol: 'Odontólogo', email: '', telefono: ''});
                        empleados = await window.dataManager.obtenerEmpleados();
                    }
                    
                    // Helper para obtener fecha local correcta evitando desfases de huso horario
                    const getLocalISODate = (daysOffset = 0) => {
                        const d = new Date();
                        d.setDate(d.getDate() + daysOffset);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}`;
                    };
                    
                    let fechaAUsar = args.fecha.toLowerCase().trim();
                    if (fechaAUsar === 'hoy') fechaAUsar = getLocalISODate(0);
                    else if (fechaAUsar === 'mañana' || fechaAUsar === 'manana') fechaAUsar = getLocalISODate(1);

                    let horaAUsar = args.hora.trim();
                    if (!horaAUsar.includes(':')) horaAUsar += ':00'; // normalizar "10" a "10:00"

                    const cita = await window.dataManager.crearCita({
                        clienteId: cliente.id,
                        empleadoId: empleados[0].id,
                        servicioId: 'custom',
                        notas: `Motivo: ${args.motivo}`,
                        fecha: fechaAUsar,
                        hora: horaAUsar,
                        duracion: parseInt(args.duracion) || 30,
                        precio: 0
                    });
                    return `Cita creada con éxito para ${cliente.nombre} el día ${fechaAUsar} a las ${horaAUsar} con el empleado ${empleados[0].nombre}. Motivo: ${args.motivo}. Duración: ${args.duracion} min.`;
                }

                case 'verCitas': {
                    if (!args.fecha) return "Error: Falta la fecha. Pregunta al usuario para qué día quiere ver las citas.";
                    const citas = await window.dataManager.obtenerCitas();
                    
                    const getLocalISODate = (daysOffset = 0) => {
                        const d = new Date();
                        d.setDate(d.getDate() + daysOffset);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}`;
                    };
                    
                    let fechaBuscar = args.fecha.toLowerCase().trim();
                    if (fechaBuscar === 'hoy') fechaBuscar = getLocalISODate(0);
                    else if (fechaBuscar === 'mañana' || fechaBuscar === 'manana') fechaBuscar = getLocalISODate(1);
                    
                    const citasFecha = citas.filter(c => c.fecha === fechaBuscar);
                    if (citasFecha.length === 0) return `No hay citas programadas para la fecha ${fechaBuscar}.`;
                    
                    const todosClientes = await window.dataManager.obtenerClientes();
                    const resumenCitas = citasFecha.map(cita => {
                        const cli = todosClientes.find(c => c.id === cita.clienteId);
                        const nombreCli = cli ? cli.nombre : 'Cliente Desconocido';
                        const estadoStr = cita.estado ? `(${cita.estado})` : '';
                        return `- ${cita.hora}: ${nombreCli} ${estadoStr}`;
                    }).join('\n');
                    
                    return `Citas encontradas para el ${fechaBuscar}:\n${resumenCitas}`;
                }

                case 'cancelarCita': {
                    if (!args.cliente) return "Error: Falta el nombre del cliente. Pregunta al usuario de quién es la cita a cancelar.";
                    const allCitas = await window.dataManager.obtenerCitas();
                    const allClientes = await window.dataManager.obtenerClientes();
                    
                    const clienteTarget = allClientes.find(c => c.nombre.toLowerCase().includes(args.cliente.toLowerCase()));
                    if (!clienteTarget) return `Error: No se encontró a ningún cliente llamado ${args.cliente} en la base de datos.`;
                    
                    const hoyStr = new Date().toISOString().split('T')[0];
                    const citasCliente = allCitas.filter(c => c.clienteId === clienteTarget.id && c.fecha >= hoyStr && c.estado !== 'cancelada');
                    
                    if (citasCliente.length === 0) return `Error: El cliente ${clienteTarget.nombre} no tiene citas pendientes para cancelar desde hoy en adelante.`;
                    
                    await window.dataManager.cancelarCita(citasCliente[0].id);
                    return `Se ha cancelado correctamente la cita de ${clienteTarget.nombre} que estaba programada para el ${citasCliente[0].fecha} a las ${citasCliente[0].hora}.`;
                }

                default:
                    return `Error: La herramienta ${nombre} no existe.`;
            }
        } catch (error) {
            console.error(`Error interno en tool ${nombre}:`, error);
            return `Error interno al ejecutar la herramienta: ${error.message}`;
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


    escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
}
