// chatbot.js - Funcionalidad del asistente de chat
class ChatBot {
    constructor() {
        this.chatForm = null;
        this.chatInput = null;
        this.chatMessages = null;
        this.init();
    }

    init() {
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatMessages = document.getElementById('chat-messages');
        
        if (this.chatForm) {
            this.setupEventListeners();
            this.showWelcomeMessage();
        }
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleUserMessage();
        });
    }

    handleUserMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;
        
        this.addMessage(text, 'user');
        this.chatInput.value = '';
        
        // Procesar el mensaje después de un pequeño delay
        setTimeout(() => {
            const response = this.processMessage(text);
            this.addMessage(response, 'bot');
        }, 700);
    }

    processMessage(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('cita') || lower.includes('agenda')) {
            return this.handleAppointmentCreation(text);
        } else if (lower.includes('cliente')) {
            return '👥 He revisado datos del cliente y preparado la ficha en CRM.';
        } else if (lower.includes('factura')) {
            return '🧾 He comenzado la creación de la factura. Revisa Facturación.';
        } else if (lower.includes('reporte') || lower.includes('informe')) {
            return '📊 Generando reporte. Mira Reportes para el resumen.';
        } else if (lower.includes('ayuda') || lower.includes('help')) {
            return this.getHelpMessage();
        } else {
            return '✅ Acción preparada. Revisa el módulo correspondiente para continuar.';
        }
    }

    handleAppointmentCreation(text) {
        // Parsear cita del mensaje
        const clientMatch = text.match(/(?:cita|cliente)\s+(.+?)(?:\s+(?:el|para|en|a las?|mañana|ayer|hoy))/i);
        const dateMatch = text.match(/(?:el|para|en)\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} de \w+|\d{4}-\d{2}-\d{2}|mañana|hoy|ayer)/i);
        const timeMatch = text.match(/(?:a las?)\s+(\d{1,2}:\d{2})/i);
        const descMatch = text.match(/(?:para|de)\s+(.+)/i);

        if (clientMatch && dateMatch) {
            const client = clientMatch[1].trim();
            let date = dateMatch[1];
            const time = timeMatch ? timeMatch[1] : '09:00';
            const description = descMatch ? descMatch[1] : 'Cita creada desde chatbot';

            // Convertir fechas relativas
            date = this.parseDate(date);

            // Guardar en localStorage
            this.saveAppointment({ client, date, time, description });

            return `📅 Cita creada para ${client} el ${date} a las ${time}. Revisa el módulo CRM para más detalles.`;
        } else {
            return 'Para crear una cita, di algo como: "Crear cita para Cliente X el 23/04/2026 a las 10:00 para reunión".';
        }
    }

    parseDate(dateStr) {
        if (dateStr === 'mañana') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        } else if (dateStr === 'hoy') {
            return new Date().toISOString().split('T')[0];
        } else if (dateStr === 'ayer') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (dateStr.includes(' de ')) {
            // Simple conversion for "23 de abril" - assuming current year
            const monthMap = { 
                enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
                julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' 
            };
            const parts = dateStr.split(' de ');
            const month = monthMap[parts[1].toLowerCase()];
            if (month) {
                return `${new Date().getFullYear()}-${month}-${parts[0].padStart(2, '0')}`;
            }
        }
        return dateStr;
    }

    saveAppointment(appointment) {
        let appointments = JSON.parse(localStorage.getItem('crm-appointments')) || [];
        const id = Date.now().toString();
        appointments.push({ id, ...appointment });
        localStorage.setItem('crm-appointments', JSON.stringify(appointments));
    }

    getHelpMessage() {
        return `🤖 Puedo ayudarte con:
• Crear citas: "Crear cita para Cliente X mañana a las 10:00"
• Ver clientes: "Mostrar información de Cliente Y"
• Generar facturas: "Crear factura para Cliente Z"
• Ver reportes: "Mostrar reporte de ventas"
• Más acciones en los módulos correspondientes.`;
    }

    addMessage(text, sender) {
        const wrapper = document.createElement('div');
        wrapper.className = sender === 'user' ? 'flex justify-end' : 'flex justify-start';
        wrapper.innerHTML = `
            <div class="max-w-[85%] rounded-3xl px-4 py-3 text-sm ${sender === 'user' ? 'bg-node text-white' : 'bg-white text-slate-900 border border-slate-200'} shadow-sm">
                ${text}
            </div>`;
        this.chatMessages.appendChild(wrapper);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showWelcomeMessage() {
        const message = 'Hola, soy tu asistente NODE. Puedo crear citas automáticamente, solo di algo como "Crear cita para Cliente X mañana a las 10:00".';
        setTimeout(() => {
            this.addMessage(message, 'bot');
        }, 1000);
    }

    // Función para atajos rápidos
    addQuickMessage(text) {
        if (this.chatInput) {
            this.chatInput.value = text;
            this.chatInput.focus();
        }
    }
}

// Funciones globales para compatibilidad
function addQuick(text) {
    if (window.chatBot) {
        window.chatBot.addQuickMessage(text);
    }
}

// Inicializar chatbot cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.chatBot = new ChatBot();
});
