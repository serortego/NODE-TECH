// Vista: Ayuda
export function renderAyuda() {
    return `
        <div class="space-y-6 max-w-4xl">
            <!-- Header -->
            <div>
                <h1 class="text-3xl font-bold text-slate-900">Centro de Ayuda</h1>
                <p class="text-slate-500 mt-1">Encuentra respuestas a tus preguntas</p>
            </div>

            <!-- Búsqueda -->
            <div class="bg-white rounded-2xl p-6 shadow-sm">
                <input 
                    type="text" 
                    placeholder="Busca una pregunta..." 
                    class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
            </div>

            <!-- FAQs -->
            <div class="space-y-4">
                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Cómo creo una nueva factura?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>Para crear una nueva factura, ve a la sección de <strong>Finanzas</strong> y haz clic en el botón "+ Nueva factura". Completa los detalles del cliente, monto y descripción del servicio.</p>
                    </div>
                </details>

                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Cómo agendo una cita?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>En la sección <strong>Agenda</strong>, haz clic en "+ Nueva cita". Selecciona la fecha, hora, cliente y tipo de servicio. El asistente NODE también puede ayudarte escribiendo "Nueva cita para [nombre]".</p>
                    </div>
                </details>

                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Cómo uso el Asistente NODE?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>El Asistente NODE es tu IA personal. Puedes usar comandos como:</p>
                        <ul class="list-disc list-inside mt-2 space-y-1">
                            <li>Crea una factura de 50€</li>
                            <li>Nueva cita para Juan</li>
                            <li>Buscar cliente Ana</li>
                        </ul>
                    </div>
                </details>

                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Cómo gestiono mis empleados?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>En la sección <strong>Empleados</strong> puedes ver todos tus empleados, agregar nuevos miembros al equipo, actualizar sus datos o eliminarlos. Cada empleado tendrá su perfil con información de contacto y horario.</p>
                    </div>
                </details>

                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Cómo exporto un reporte?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>En cualquier sección con tablas (Finanzas, Clientes), encontrarás un botón "Descargar" para exportar los datos en formato PDF o Excel.</p>
                    </div>
                </details>

                <!-- FAQ Item -->
                <details class="bg-white rounded-2xl shadow-sm overflow-hidden group">
                    <summary class="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition flex items-center justify-between">
                        <span>¿Mis datos están seguros?</span>
                        <i class="fas fa-chevron-down text-slate-600 group-open:rotate-180 transition-transform"></i>
                    </summary>
                    <div class="px-6 pb-4 text-slate-600 border-t border-slate-100">
                        <p>Sí, NODE utiliza Firebase con encriptación end-to-end. Todos tus datos están protegidos y respaldados automáticamente en servidores seguros.</p>
                    </div>
                </details>
            </div>

            <!-- Contacto -->
            <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-8">
                <h2 class="font-bold text-slate-900 mb-3">¿Necesitas ayuda adicional?</h2>
                <p class="text-slate-600 mb-4">Estamos aquí para ayudarte. Contáctanos a través de:</p>
                <div class="space-y-2">
                    <p class="text-slate-700"><strong>📧 Email:</strong> soporte@node-tech.com</p>
                    <p class="text-slate-700"><strong>💬 Chat:</strong> Disponible en la esquina inferior derecha</p>
                    <p class="text-slate-700"><strong>📱 Teléfono:</strong> +34 123 456 789</p>
                </div>
            </div>
        </div>
    `;
}
