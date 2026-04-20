// agenda.js - Gestión completa de la agenda: vistas día, semana y mes

class AgendaManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.agendaView = 'day'; // 'day', 'week', 'month'
        this.selectedDate = new Date();
    }

    render() {
        const proximasCitas = this.navManager.getProximasCitas(5);

        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <i class="fas fa-calendar-alt text-node-teal text-2xl"></i>
                            <h2 class="text-3xl font-bold text-node">Agenda</h2>
                        </div>
                        <p class="text-sm text-slate-600">Gestiona tus citas y horarios</p>
                    </div>
                    <button id="btn-nueva-cita" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700">
                        <i class="fas fa-plus"></i> Nueva cita
                    </button>
                </div>

                <!-- Navegación -->
                <div class="flex items-center gap-3 pb-4 border-b border-subtle flex-wrap">
                    <button id="agenda-prev-btn" class="text-slate-600 hover:text-node-teal transition p-2">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-700 text-sm">Fecha:</span>
                        <input type="date" id="agenda-date-input" value="${this.selectedDate.toISOString().split('T')[0]}" class="px-3 py-1 border border-subtle rounded-lg text-sm">
                    </div>
                    <button id="agenda-next-btn" class="text-slate-600 hover:text-node-teal transition p-2">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="ml-auto flex gap-2">
                        <button class="agenda-view-btn px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold active" data-view="day">Día</button>
                        <button class="agenda-view-btn px-4 py-2 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50" data-view="week">Semana</button>
                        <button class="agenda-view-btn px-4 py-2 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50" data-view="month">Mes</button>
                    </div>
                </div>

                <!-- Contenido Principal -->
                <div class="grid gap-6 lg:grid-cols-[2.5fr_1fr]">
                    <!-- Timeline/Calendario -->
                    <div id="agenda-content" class="bg-white border border-subtle rounded-xl shadow-sm overflow-hidden">
                        ${this.renderContent()}
                    </div>

                    <!-- Sidebar -->
                    <div class="space-y-6">
                        <!-- Calendario Mini -->
                        <div class="bg-white rounded-xl border border-subtle shadow-sm p-5">
                            <div class="text-center mb-4">
                                <h4 class="font-bold text-node text-sm">Calendario</h4>
                            </div>
                            <div id="calendar-mini">
                                ${this.renderCalendarMini()}
                            </div>
                        </div>

                        <!-- Próximas Citas -->
                        <div class="bg-white rounded-xl border border-subtle shadow-sm p-5">
                            <h4 class="font-bold text-node text-sm mb-4">Próximas citas</h4>
                            ${proximasCitas.length > 0 ? `
                                <div id="proximas-citas-container" class="space-y-3 max-h-80 overflow-y-auto">
                                    ${proximasCitas.map(cita => `
                                        <div class="p-3 border border-subtle rounded-lg hover:bg-slate-50 transition cursor-pointer" data-cita-id="${cita.id}">
                                            <div class="flex items-start justify-between mb-2">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                                        ${cita.cliente.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-bold text-node">${cita.cliente}</p>
                                                        <p class="text-xs text-slate-600">${cita.servicio}</p>
                                                    </div>
                                                </div>
                                                <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                    ${new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', {month: 'short', day: 'numeric'})} ${cita.hora}
                                                </span>
                                            </div>
                                            <button class="btn-ver-detalles w-full px-3 py-1 border border-blue-600 text-blue-600 rounded text-xs font-bold hover:bg-blue-50 transition" data-cita-id="${cita.id}">
                                                Ver detalles
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p class="text-sm text-slate-500 text-center py-6">No hay citas próximas</p>
                            `}
                        </div>

                        <!-- Leyenda -->
                        <div class="bg-white rounded-xl border border-subtle shadow-sm p-5">
                            <h4 class="font-bold text-node text-sm mb-3">Servicios</h4>
                            <div class="space-y-2 text-xs">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: #3B82F6;"></div>
                                    <span class="text-slate-600">Corte</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: #10B981;"></div>
                                    <span class="text-slate-600">Coloración</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: #8B5CF6;"></div>
                                    <span class="text-slate-600">Peinado</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: #F59E0B;"></div>
                                    <span class="text-slate-600">Reunión</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderContent() {
        if (this.agendaView === 'day') {
            return this.renderTimelineCompleto();
        } else if (this.agendaView === 'week') {
            return this.renderWeekView();
        } else {
            return this.renderMonthView();
        }
    }

    renderTimelineCompleto() {
        const horas = Array.from({ length: 10 }, (_, i) => 9 + i);
        const fechaStr = this.selectedDate.toISOString().split('T')[0];
        
        const colorMap = {
            'Corte': { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
            'Coloracion': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Peinado': { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' },
            'Tratamiento Capilar': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Reunion': { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' }
        };

        let html = '<div class="grid grid-cols-12 gap-0">';
        
        // Columna de horas
        html += '<div class="col-span-2 border-r border-subtle bg-slate-50 p-2">';
        horas.forEach(hora => {
            html += `
                <div class="h-24 flex items-start justify-center pt-2 border-b border-subtle text-xs font-semibold text-slate-600">
                    ${String(hora).padStart(2, '0')}:00
                </div>
            `;
        });
        html += '</div>';

        // Columna de citas
        html += '<div class="col-span-10 relative">';
        
        horas.forEach((hora) => {
            const horaStr = String(hora).padStart(2, '0') + ':00';
            const citasHora = this.navManager.citas.filter(c => c.hora === horaStr && c.fecha === fechaStr);
            
            html += `<div class="h-24 border-b border-subtle p-2 relative" style="display: grid; grid-template-columns: repeat(${Math.max(citasHora.length, 1)}, 1fr); gap: 2px;">`;
            
            if (citasHora.length > 0) {
                citasHora.forEach(cita => {
                    const colors = colorMap[cita.servicio] || { bg: '#F3F4F6', border: '#6B7280', text: '#374151' };
                    html += `
                        <div class="rounded-lg p-2 h-full border-l-4 overflow-hidden cursor-pointer hover:shadow-md transition text-xs" 
                             style="background-color: ${colors.bg}; border-left-color: ${colors.border}; color: ${colors.text};">
                            <p class="font-bold leading-tight truncate">${cita.cliente}</p>
                            <p class="opacity-75 leading-tight truncate text-xs">${cita.servicio}</p>
                            ${cita.precio ? `<p class="font-semibold text-xs mt-0.5">€${parseFloat(cita.precio).toFixed(0)}</p>` : ''}
                            <div class="flex gap-1 mt-1 text-xs">
                                <button class="btn-edit-cita opacity-60 hover:opacity-100" data-id="${cita.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-delete-cita opacity-60 hover:opacity-100" data-id="${cita.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += '</div>';
        });

        html += '</div></div>';
        return html;
    }

    renderWeekView() {
        const semanaInicio = new Date(this.selectedDate);
        semanaInicio.setDate(semanaInicio.getDate() - semanaInicio.getDay() + 1);
        
        const dias = [];
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(semanaInicio);
            fecha.setDate(fecha.getDate() + i);
            dias.push(fecha);
        }

        const horas = Array.from({ length: 10 }, (_, i) => 9 + i);
        const colorMap = {
            'Corte': { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
            'Coloracion': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Peinado': { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' },
            'Tratamiento Capilar': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Reunion': { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' }
        };

        let html = '<div class="overflow-x-auto"><div class="grid" style="grid-template-columns: 60px repeat(7, 1fr); gap: 0;">';
        
        // Header días
        html += '<div class="bg-slate-50 border-b border-subtle"></div>';
        dias.forEach(dia => {
            const diaNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'][dia.getDay()];
            const isToday = dia.toDateString() === new Date().toDateString();
            html += `<div class="p-2 border-b border-subtle text-center font-bold text-xs ${isToday ? 'bg-blue-50 text-blue-600' : 'bg-slate-50'}">${diaNombre} ${dia.getDate()}</div>`;
        });

        // Horas y citas
        horas.forEach(hora => {
            const horaStr = String(hora).padStart(2, '0') + ':00';
            html += `<div class="bg-slate-50 border-r border-subtle border-b text-xs font-semibold text-center text-slate-600 p-1">${horaStr}</div>`;
            
            dias.forEach(dia => {
                const fechaStr = dia.toISOString().split('T')[0];
                const citasHora = this.navManager.citas.filter(c => c.hora === horaStr && c.fecha === fechaStr);
                
                html += `<div class="border-r border-b border-subtle p-1 h-20 overflow-y-auto text-xs space-y-0.5">`;
                citasHora.forEach(cita => {
                    const colors = colorMap[cita.servicio] || { bg: '#F3F4F6', border: '#6B7280', text: '#374151' };
                    html += `
                        <div class="p-1 rounded border-l-2 truncate cursor-pointer hover:shadow-sm" 
                             style="background-color: ${colors.bg}; border-left-color: ${colors.border}; color: ${colors.text}; font-weight: 500;">
                            ${cita.cliente}
                        </div>
                    `;
                });
                html += '</div>';
            });
        });

        html += '</div></div>';
        return html;
    }

    renderMonthView() {
        const year = this.selectedDate.getFullYear();
        const month = this.selectedDate.getMonth();
        
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        let html = `
            <div class="p-6">
                <h3 class="text-lg font-bold text-node mb-4 text-center">${meses[month]} ${year}</h3>
                <div class="grid grid-cols-7 gap-1">
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">L</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">M</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">X</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">J</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">V</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">S</div>
                    <div class="text-xs font-bold text-slate-500 p-2 text-center">D</div>
        `;

        // Días vacíos
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="p-2 bg-slate-50 rounded"></div>';
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const citasDay = this.navManager.citas.filter(c => c.fecha === dateStr);
            const isToday = day === new Date().getDate() && month === new Date().getMonth();

            html += `
                <div class="p-3 border rounded-lg cursor-pointer hover:shadow-md transition min-h-16 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-subtle'}" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">
                    <p class="text-xs font-bold text-slate-600 mb-1">${day}</p>
                    ${citasDay.length > 0 ? `<div class="text-xs"><p class="font-semibold text-blue-600">${citasDay.length} cita${citasDay.length > 1 ? 's' : ''}</p></div>` : ''}
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    renderCalendarMini() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        let html = `
            <div class="text-center mb-3">
                <p class="text-sm font-bold text-node">${meses[month]} ${year}</p>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center mb-3">
                <div class="text-xs font-bold text-slate-500">L</div>
                <div class="text-xs font-bold text-slate-500">M</div>
                <div class="text-xs font-bold text-slate-500">X</div>
                <div class="text-xs font-bold text-slate-500">J</div>
                <div class="text-xs font-bold text-slate-500">V</div>
                <div class="text-xs font-bold text-slate-500">S</div>
                <div class="text-xs font-bold text-slate-500">D</div>
        `;

        // Días vacíos
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="h-8"></div>';
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasCita = this.navManager.citas.some(c => c.fecha === dateStr);
            const isToday = day === today.getDate() && month === today.getMonth();
            const isSelected = day === this.selectedDate.getDate() && month === this.selectedDate.getMonth() && year === this.selectedDate.getFullYear();

            if (isToday) {
                html += `<div class="h-8 w-8 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold cursor-pointer" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else if (isSelected) {
                html += `<div class="h-8 w-8 mx-auto rounded text-xs font-bold text-blue-600 flex items-center justify-center border-2 border-blue-600 cursor-pointer" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else if (hasCita) {
                html += `<div class="h-8 w-8 mx-auto text-xs text-blue-600 flex items-center justify-center cursor-pointer font-bold" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else {
                html += `<div class="h-8 w-8 mx-auto text-xs text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            }
        }

        html += '</div>';
        return html;
    }

    setupListeners() {
        // Guardar referencia global para usar en modales
        window.agendaManagerInstance = this;

        // Vista buttons
        document.querySelectorAll('.agenda-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.agenda-view-btn').forEach(b => {
                    b.classList.remove('bg-blue-50', 'text-blue-600');
                    b.classList.add('text-slate-600');
                });
                btn.classList.add('bg-blue-50', 'text-blue-600');
                btn.classList.remove('text-slate-600');
                
                this.agendaView = btn.getAttribute('data-view');
                const agendaContent = document.getElementById('agenda-content');
                if (agendaContent) {
                    agendaContent.innerHTML = this.renderContent();
                    this.attachCitaListeners();
                }
            });
        });

        // Botones anterior/siguiente
        const prevBtn = document.getElementById('agenda-prev-btn');
        const nextBtn = document.getElementById('agenda-next-btn');
        const dateInput = document.getElementById('agenda-date-input');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.selectedDate.setDate(this.selectedDate.getDate() - 1);
                dateInput.value = this.selectedDate.toISOString().split('T')[0];
                this.refresh();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.selectedDate.setDate(this.selectedDate.getDate() + 1);
                dateInput.value = this.selectedDate.toISOString().split('T')[0];
                this.refresh();
            });
        }

        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.selectedDate = new Date(e.target.value + 'T00:00:00');
                this.refresh();
            });
        }

        // Nueva cita
        const btnNueva = document.getElementById('btn-nueva-cita');
        if (btnNueva) {
            btnNueva.addEventListener('click', () => {
                const citaForm = document.getElementById('cita-fecha');
                if (citaForm) {
                    citaForm.value = this.selectedDate.toISOString().split('T')[0];
                }
                this.navManager.openModal();
            });
        }

        // Ver detalles de cita próxima
        document.querySelectorAll('.btn-ver-detalles').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const citaId = btn.getAttribute('data-cita-id');
                const cita = this.navManager.citas.find(c => c.id === citaId);
                if (cita) {
                    this.mostrarDetallesCita(cita);
                }
            });
        });

        // Hacer las citas próximas clickeables para ver detalles
        document.querySelectorAll('#proximas-citas-container > div[data-cita-id]').forEach(div => {
            div.addEventListener('click', (e) => {
                // No ejecutar si ya se hizo click en el botón
                if (!e.target.closest('.btn-ver-detalles')) {
                    const citaId = div.getAttribute('data-cita-id');
                    const cita = this.navManager.citas.find(c => c.id === citaId);
                    if (cita) {
                        this.mostrarDetallesCita(cita);
                    }
                }
            });
        });
        
        // Edit y delete
        this.attachCitaListeners();
    }

    mostrarDetallesCita(cita) {
        const detalles = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 pb-4 border-b border-subtle">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                        ${cita.cliente.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p class="text-lg font-bold text-node">${cita.cliente}</p>
                        <p class="text-sm text-slate-600">${cita.servicio}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs uppercase font-bold text-slate-500 mb-1">Fecha</p>
                        <p class="text-sm font-semibold text-node">${new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                    </div>
                    <div>
                        <p class="text-xs uppercase font-bold text-slate-500 mb-1">Hora</p>
                        <p class="text-sm font-semibold text-node">${cita.hora}</p>
                    </div>
                </div>

                <div>
                    <p class="text-xs uppercase font-bold text-slate-500 mb-1">Servicio</p>
                    <p class="text-sm font-semibold text-node">${cita.servicio}</p>
                </div>

                ${cita.precio ? `
                    <div>
                        <p class="text-xs uppercase font-bold text-slate-500 mb-1">Precio</p>
                        <p class="text-lg font-bold text-blue-600">€${parseFloat(cita.precio).toFixed(2)}</p>
                    </div>
                ` : ''}

                <div class="flex gap-2 pt-4 border-t border-subtle">
                    <button onclick="document.getElementById('cita-id').value = '${cita.id}'; document.getElementById('cita-cliente').value = '${cita.cliente}'; document.getElementById('cita-servicio').value = '${cita.servicio}'; document.getElementById('cita-fecha').value = '${cita.fecha}'; document.getElementById('cita-hora').value = '${cita.hora}'; document.getElementById('cita-precio').value = '${cita.precio || ''}'; document.getElementById('modal-title').textContent = 'Editar Cita'; document.getElementById('modal-cita').classList.remove('hidden');" class="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
                        Editar
                    </button>
                    <button onclick="if (confirm('¿Eliminar cita?')) { const currentView = document.querySelector('[data-view].active'); const agendaManager = window.agendaManagerInstance; if (agendaManager) agendaManager.navManager.deleteCita('${cita.id}'); }" class="flex-1 px-4 py-2 border border-red-500 text-red-500 font-bold rounded-lg hover:bg-red-50 transition">
                        Eliminar
                    </button>
                </div>
            </div>
        `;

        // Mostrar modal con detalles
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.id = 'modal-detalles-cita';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
                <div class="flex items-center justify-between p-6 border-b border-subtle">
                    <h3 class="text-xl font-bold text-node">Detalles de la cita</h3>
                    <button onclick="document.getElementById('modal-detalles-cita').remove()" class="text-slate-400 hover:text-slate-600 text-2xl">
                        ×
                    </button>
                </div>
                <div class="p-6">
                    ${detalles}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    attachCitaListeners() {
        document.querySelectorAll('.btn-edit-cita').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const cita = this.navManager.citas.find(c => c.id === id);
                if (cita) this.navManager.openModal(cita);
            });
        });

        document.querySelectorAll('.btn-delete-cita').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('¿Eliminar cita?')) {
                    this.navManager.deleteCita(id);
                }
            });
        });
    }

    refresh() {
        const agendaContent = document.getElementById('agenda-content');
        const calendarMini = document.getElementById('calendar-mini');
        
        if (agendaContent) {
            agendaContent.innerHTML = this.renderContent();
        }
        if (calendarMini) {
            calendarMini.innerHTML = this.renderCalendarMini();
        }
        
        this.attachCitaListeners();
    }
}
