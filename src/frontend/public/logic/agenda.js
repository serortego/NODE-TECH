// agenda.js - Gestión completa de la agenda: vistas día, semana y mes

class AgendaManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this.agendaView = 'day'; // 'day', 'week', 'month'
        this.selectedDate = new Date();
        this.recursos = (window.dataManager?.cache?.empleados?.map(e => e.nombre).filter(Boolean)) 
                        || this.navManager.recursos
                        || ['Sin empleados'];
        this.tiempoGranularidad = 15; // minutos (15 o 30)
        this.sidebarVisible = true;
        this.citaStates = {
            'no-presentado': { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' },
            'esperando': { bg: '#FEF3C7', border: '#FBBF24', text: '#92400E' },
            'atendiendose': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
            'completado': { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }
        };
    }

    render() {
        const proximasCitas = this.navManager.getProximasCitas(5);
        const hoy = new Date().toISOString().split('T')[0];
        const citasHoy = this.navManager.citas.filter(c => c.fecha === hoy).length;

        return `
            <div class="space-y-2">
                <!-- Header COMPACTO - Una sola línea -->
                <div class="flex items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                    <!-- Título izquierda -->
                    <div class="flex items-center gap-2 min-w-fit">
                        <i class="fas fa-calendar-alt text-[#2B93A6] text-lg"></i>
                        <h2 class="text-xl font-bold text-white">Agenda</h2>
                    </div>

                    <!-- Vistas + Navegación centro -->
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex gap-1 bg-[rgba(255,255,255,0.06)] p-1 rounded-lg">
                            <button class="agenda-view-btn px-2.5 py-1 bg-[#2B93A6] text-white rounded text-xs font-semibold active" data-view="day">Día</button>
                            <button class="agenda-view-btn px-2.5 py-1 text-slate-400 text-xs font-semibold hover:bg-[rgba(255,255,255,0.08)]" data-view="week">Semana</button>
                            <button class="agenda-view-btn px-2.5 py-1 text-slate-400 text-xs font-semibold hover:bg-[rgba(255,255,255,0.08)]" data-view="month">Mes</button>
                        </div>
                        
                        <div class="flex items-center gap-1">
                            <button id="agenda-prev-btn" class="p-1.5 text-slate-400 hover:bg-[rgba(255,255,255,0.08)] rounded transition">
                                <i class="fas fa-chevron-left text-xs"></i>
                            </button>
                            <input type="date" id="agenda-date-input" value="${this.selectedDate.toISOString().split('T')[0]}" class="px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white rounded text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[#2B93A6]">
                            <button id="agenda-next-btn" class="p-1.5 text-slate-400 hover:bg-[rgba(255,255,255,0.08)] rounded transition">
                                <i class="fas fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Botones derecha -->
                    <div class="flex gap-2 min-w-fit">
                        <button id="btn-toggle-sidebar" class="px-2.5 py-1.5 bg-[rgba(255,255,255,0.06)] text-slate-400 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition font-semibold text-xs" title="Expandir/Contraer panel">
                            <i class="fas fa-bars"></i>
                        </button>
                        <button id="btn-nueva-cita" class="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs">
                            <i class="fas fa-plus"></i> Cita
                        </button>
                    </div>
                </div>

                <!-- Métricas rápidas del día -->
                <div class="flex gap-2 text-xs px-1">
                    <div class="flex items-center gap-1 px-3 py-1.5 bg-[rgba(43,147,166,0.15)] text-[#38BDF8] rounded font-semibold">
                        <i class="fas fa-calendar-check"></i>
                        <span>${citasHoy} citas</span>
                    </div>
                    <div class="flex items-center gap-1 px-3 py-1.5 bg-[rgba(251,146,60,0.12)] text-orange-300 rounded font-semibold">
                        <i class="fas fa-clock"></i>
                        <span>2 pendientes</span>
                    </div>
                    <div class="flex items-center gap-1 px-3 py-1.5 bg-[rgba(52,211,153,0.12)] text-emerald-300 rounded font-semibold">
                        <i class="fas fa-euro-sign"></i>
                        <span>350€ est.</span>
                    </div>
                </div>

                <!-- Contenido Principal -->
                <div class="flex gap-4">
                    <!-- Timeline/Calendario (flex-1) -->
                    <div id="agenda-content" class="flex-1 glass border border-[rgba(255,255,255,0.08)] rounded-lg overflow-y-auto relative">
                        ${this.renderContent()}
                    </div>

                    <!-- Sidebar (derecho) -->
                    <div id="agenda-sidebar" class="w-64 space-y-4 transition-all duration-300">
                        <!-- Calendario Mini -->
                        <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] p-4">
                            <div class="text-center mb-3">
                                <h4 class="font-bold text-white text-sm">Calendario</h4>
                            </div>
                            <div id="calendar-mini">
                                ${this.renderCalendarMini()}
                            </div>
                        </div>

                        <!-- Próximas Citas -->
                        <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] p-4">
                            <h4 class="font-bold text-white text-sm mb-3">Próximas citas</h4>
                            ${proximasCitas.length > 0 ? `
                                <div id="proximas-citas-container" class="space-y-2 max-h-80 overflow-y-auto">
                                    ${proximasCitas.slice(0, 5).map(cita => `
                                        <div class="p-2 border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[rgba(43,147,166,0.08)] transition cursor-pointer text-xs" data-cita-id="${cita.id}">
                                            <p class="font-bold text-white truncate">${cita.cliente}</p>
                                            <p class="text-slate-400 text-xs truncate">${cita.servicio}</p>
                                            <p class="text-slate-500 text-xs mt-1">${cita.hora}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <p class="text-xs text-slate-500 text-center py-4">Sin citas próximas</p>
                            `}
                        </div>

                        <!-- Leyenda -->
                        <div class="glass rounded-lg border border-[rgba(255,255,255,0.08)] p-4">
                            <h4 class="font-bold text-white text-sm mb-2">Estado</h4>
                            <div class="space-y-1 text-xs">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded" style="background-color: #9CA3AF;"></div>
                                    <span class="text-slate-400">No presentado</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded" style="background-color: #FBBF24;"></div>
                                    <span class="text-slate-400">Esperando</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded" style="background-color: #3B82F6;"></div>
                                    <span class="text-slate-400">En atención</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded" style="background-color: #22C55E;"></div>
                                    <span class="text-slate-400">Completado</span>
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
        const ahora = new Date();
        const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        const estaHoy = fechaStr === ahora.toISOString().split('T')[0];
        
        const colorMap = {
            'Corte': { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
            'Coloracion': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Peinado': { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' },
            'Tratamiento Capilar': { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
            'Reunion': { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' }
        };

        // Calcular slots de 15 minutos por hora
        const slotsPerHora = 60 / this.tiempoGranularidad;
        const pixelsPorHora = 96; // 4 slots * 24px = 96px por hora
        const pixelsPorSlot = pixelsPorHora / slotsPerHora; // 24px por slot

        let html = '<div class="relative w-full" style="overflow-x: auto;">';
        
        // Grid: hora | Maria | Juan | Pedro
        html += `<div class="grid" style="grid-template-columns: 70px repeat(${this.recursos.length}, 1fr); gap: 0;">`;
        
        // ===== HEADER CON NOMBRES DE RECURSOS =====
        html += '<div class="bg-[rgba(255,255,255,0.04)] border-b-2 border-[rgba(255,255,255,0.1)] p-3 font-bold text-xs text-slate-500 sticky top-0 z-10"></div>';
        this.recursos.forEach((recurso, idx) => {
            html += `<div class="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition border-b-2 border-[rgba(255,255,255,0.1)] p-3 font-bold text-xs text-white sticky top-0 z-10 ${idx > 0 ? 'border-l border-[rgba(255,255,255,0.06)]' : ''} text-center">${recurso}</div>`;
        });

        // ===== TIMELINE CON GRANULARIDAD =====
        horas.forEach((hora) => {
            const horaStr = String(hora).padStart(2, '0');
            
            // Para cada slot de 15/30 min
            for (let slot = 0; slot < slotsPerHora; slot++) {
                const minutos = slot * this.tiempoGranularidad;
                const tiempoStr = `${horaStr}:${String(minutos).padStart(2, '0')}`;
                const isMediaHora = minutos === 30;

                // Celda de hora (solo en el primer slot)
                if (slot === 0) {
                    html += `<div class="bg-[rgba(255,255,255,0.02)] border-r border-[rgba(255,255,255,0.06)] p-1 font-bold text-xs text-slate-500 text-right pr-2" style="grid-row: span ${slotsPerHora}; border-bottom: 1px solid rgba(255,255,255,0.06);">${horaStr}:00</div>`;
                }

                // Celdas de recursos para este slot - AISLADAS CON position: relative
                this.recursos.forEach((recurso) => {
                    const borderStyle = isMediaHora ? '1px dashed rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.06)';
                    const bgStyle = isMediaHora ? 'bg-[rgba(255,255,255,0.02)]' : '';
                    
                    html += `<div class="relative p-0.5 border-r ${bgStyle} cursor-pointer hover:bg-[rgba(43,147,166,0.08)] transition text-center text-xs border-l border-[rgba(255,255,255,0.04)]" 
                             style="border-bottom: ${borderStyle}; min-height: ${pixelsPorSlot}px; position: relative;" 
                             data-recurso="${recurso}" 
                             data-tiempo="${tiempoStr}" 
                             data-fecha="${fechaStr}">
                    </div>`;
                });
            }
        });

        html += '</div>'; // Cierra grid

        // ===== CITAS ABSOLUTAS - Contenedor wrapper con posicionamiento =====
        html = this.renderCitasOverlay(html, fechaStr, colorMap, pixelsPorHora);

        // ===== LÍNEA DE HORA ACTUAL (Current Time Indicator) =====
        if (estaHoy) {
            const horasDesdeInicio = ahora.getHours() - 9;
            const minutosEnHora = ahora.getMinutes();
            const topPx = 50 + (horasDesdeInicio * pixelsPorHora) + ((minutosEnHora / 60) * pixelsPorHora);
            
            if (topPx >= 50 && topPx <= (50 + pixelsPorHora * 10)) {
                html += `
                    <div class="absolute left-0 right-0 pointer-events-none z-40" style="top: ${topPx}px;">
                        <div class="h-1 bg-red-500 w-full shadow-lg" style="box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);"></div>
                        <div class="absolute left-1 -top-2.5 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded shadow-md">${horaActual}</div>
                    </div>
                `;
            }
        }

        html += '</div>'; // Cierra relative wrapper
        return html;
    }

    renderCitasOverlay(html, fechaStr, colorMap, pixelsPorHora) {
        // Renderizar las tarjetas de citas como overlay (absolute positioning dentro de la grilla)
        const citasDelDia = this.navManager.citas.filter(c => c.fecha === fechaStr);
        const hMin = 9;
        const hMax = 19;
        
        const citasHTML = citasDelDia.map((cita, idx) => {
            const colors = colorMap[cita.servicio] || { bg: '#F3F4F6', border: '#6B7280', text: '#374151' };
            const [citaHora, citaMin] = cita.hora.split(':').map(Number);
            
            // Validar que la cita esté dentro del rango de horas
            if (citaHora < hMin || citaHora > hMax) return '';
            
            // Calcular posición Y (en píxeles desde el inicio del timeline)
            const horasDesdeInicio = citaHora - hMin;
            const minutosEnHora = citaMin;
            const topPx = 50 + (horasDesdeInicio * pixelsPorHora) + ((minutosEnHora / 60) * pixelsPorHora);
            
            // Altura: calcular basada en horaFin si existe, si no usar 60 minutos
            let heightPx = pixelsPorHora; // DEFAULT: 1 hora
            if (cita.horaFin) {
                const [finHora, finMin] = cita.horaFin.split(':').map(Number);
                const minutosTotales = (finHora - citaHora) * 60 + (finMin - citaMin);
                heightPx = (minutosTotales / 60) * pixelsPorHora;
            }
            
            // Distribuir recursos: usar índice para distribuir entre columnas
            const resourceIndex = idx % this.recursos.length;
            const columnWidth = 100 / this.recursos.length;
            const leftPercent = columnWidth * resourceIndex;
            
            // Estado: por ahora "atendiendose" (en desarrollo puedes agregar campo 'estado' a cita)
            const estado = 'atendiendose';
            const estadoStyle = this.citaStates[estado] || this.citaStates['atendiendose'];

            return `
                <div class="absolute rounded-lg border-l-4 text-xs shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg transition z-20 overflow-hidden"
                     style="
                        background-color: ${estadoStyle.bg};
                        border-left-color: ${estadoStyle.border};
                        color: ${estadoStyle.text};
                        top: ${topPx}px;
                        left: calc(70px + (100% - 70px) * ${leftPercent / 100});
                        width: calc((100% - 70px) / ${this.recursos.length} - 10px);
                        height: ${heightPx}px;
                        min-height: 48px;
                        display: flex;
                        flex-direction: column;
                        padding: 8px;
                     "
                     draggable="true"
                     data-cita-id="${cita.id}">
                    <p class="font-bold text-xs truncate leading-tight">${cita.cliente}</p>
                    <p class="text-xs opacity-90 truncate leading-tight flex-1">${cita.servicio}</p>
                    <div class="flex justify-between items-center mt-auto pt-1 border-t" style="border-top-color: rgba(0,0,0,0.1);">
                        <span class="text-xs font-semibold">${cita.hora}${cita.horaFin ? ' - ' + cita.horaFin : ''}</span>
                        ${cita.precio ? `<span class="text-xs font-bold">€${parseInt(cita.precio)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Insertar cards justo antes del cierre de wrapper (<!-- CARDS_MARKER -->)
        return html + citasHTML;
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
        html += '<div class="bg-[rgba(255,255,255,0.04)] border-b border-[rgba(255,255,255,0.08)]"></div>';
        dias.forEach(dia => {
            const diaNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'][dia.getDay()];
            const isToday = dia.toDateString() === new Date().toDateString();
            html += `<div class="p-2 border-b border-[rgba(255,255,255,0.08)] text-center font-bold text-xs ${isToday ? 'bg-[rgba(43,147,166,0.15)] text-[#38BDF8]' : 'bg-[rgba(255,255,255,0.04)] text-white'}">${diaNombre} ${dia.getDate()}</div>`;
        });

        // Horas y citas
        horas.forEach(hora => {
            const horaStr = String(hora).padStart(2, '0') + ':00';
            html += `<div class="bg-[rgba(255,255,255,0.02)] border-r border-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.04)] text-xs font-semibold text-center text-slate-500 p-1">${horaStr}</div>`;
            
            dias.forEach(dia => {
                const fechaStr = dia.toISOString().split('T')[0];
                const citasHora = this.navManager.citas.filter(c => c.hora === horaStr && c.fecha === fechaStr);
                
                html += `<div class="border-r border-b border-[rgba(255,255,255,0.06)] p-1 h-20 overflow-y-auto text-xs space-y-0.5 hover:bg-[rgba(43,147,166,0.04)] transition">`;
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
            <div class="p-4">
                <h3 class="text-base font-bold text-white mb-3 text-center">${meses[month]} ${year}</h3>
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
            html += '<div class="p-2 bg-[rgba(255,255,255,0.02)] rounded"></div>';
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const citasDay = this.navManager.citas.filter(c => c.fecha === dateStr);
            const isToday = day === new Date().getDate() && month === new Date().getMonth();

            html += `
                <div class="p-2 border rounded-lg cursor-pointer hover:shadow-md transition min-h-14 text-xs ${isToday ? 'bg-[rgba(43,147,166,0.2)] border-[#2B93A6]' : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]'} hover:border-[rgba(43,147,166,0.4)]" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">
                    <p class="text-xs font-bold ${isToday ? 'text-[#38BDF8]' : 'text-slate-400'} mb-1">${day}</p>
                    ${citasDay.length > 0 ? `<p class="font-semibold text-[#38BDF8] text-xs">${citasDay.length} cita${citasDay.length > 1 ? 's' : ''}</p>` : ''}
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
            <div class="text-center mb-2">
                <p class="text-xs font-bold text-white">${meses[month]} ${year}</p>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center mb-2">
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
                html += `<div class="h-8 w-8 mx-auto rounded-full bg-[#2B93A6] text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-[#38BDF8]" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else if (isSelected) {
                html += `<div class="h-8 w-8 mx-auto rounded text-xs font-bold text-[#38BDF8] flex items-center justify-center border-2 border-[#2B93A6] cursor-pointer" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else if (hasCita) {
                html += `<div class="h-8 w-8 mx-auto text-xs text-[#38BDF8] flex items-center justify-center cursor-pointer font-bold hover:bg-[rgba(43,147,166,0.15)] rounded" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            } else {
                html += `<div class="h-8 w-8 mx-auto text-xs text-slate-500 flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.08)] rounded" onclick="document.getElementById('agenda-date-input').value='${dateStr}'; document.getElementById('agenda-date-input').dispatchEvent(new Event('change'));">${day}</div>`;
            }
        }

        html += '</div>';
        return html;
    }

    setupListeners() {
        // Guardar referencia global
        window.agendaManagerInstance = this;

        // ===== TOGGLE SIDEBAR =====
        const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        const sidebar = document.getElementById('agenda-sidebar');
        if (btnToggleSidebar && sidebar) {
            btnToggleSidebar.addEventListener('click', () => {
                this.sidebarVisible = !this.sidebarVisible;
                if (this.sidebarVisible) {
                    sidebar.classList.remove('hidden', 'w-0');
                    sidebar.classList.add('w-64');
                    btnToggleSidebar.innerHTML = '<i class="fas fa-chevron-right"></i>';
                } else {
                    sidebar.classList.add('hidden');
                    btnToggleSidebar.innerHTML = '<i class="fas fa-chevron-left"></i>';
                }
            });
        }

        // ===== VISTA BUTTONS =====
        document.querySelectorAll('.agenda-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.agenda-view-btn').forEach(b => {
                    b.classList.remove('bg-white', 'text-gray-900');
                    b.classList.add('text-gray-600');
                });
                btn.classList.add('bg-white', 'text-gray-900');
                btn.classList.remove('text-gray-600');
                
                this.agendaView = btn.getAttribute('data-view');
                const agendaContent = document.getElementById('agenda-content');
                if (agendaContent) {
                    agendaContent.innerHTML = this.renderContent();
                    this.attachCitaListeners();
                    this.setupClickToAdd();
                    this.setupDragDrop();
                }
            });
        });

        // ===== BOTONES ANTERIOR/SIGUIENTE =====
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

        // ===== NUEVA CITA =====
        const btnNueva = document.getElementById('btn-nueva-cita');
        if (btnNueva) {
            btnNueva.addEventListener('click', () => {
                this.navManager.showNewCitaModal({
                    fecha: this.selectedDate.toISOString().split('T')[0]
                });
            });
        }

        // ===== CLICK-TO-ADD Y DRAG-DROP =====
        this.setupClickToAdd();
        this.setupDragDrop();
        this.attachCitaListeners();
    }

    setupClickToAdd() {
        // Hacer clickeables las celdas vacías para crear citas rápidamente
        document.querySelectorAll('[data-recurso][data-tiempo][data-fecha]').forEach(celda => {
            celda.addEventListener('click', (e) => {
                if (e.target === celda || e.target.closest('[data-recurso]')) {
                    const recurso = celda.getAttribute('data-recurso');
                    const tiempo = celda.getAttribute('data-tiempo');
                    const fecha = celda.getAttribute('data-fecha');
                    
                    // Abrir modal con pre-rellenado
                    this.navManager.showNewCitaModal({
                        fecha: fecha,
                        hora: tiempo,
                        recurso: recurso
                    });
                }
            });
        });
    }

    setupDragDrop() {
        const citas = document.querySelectorAll('[data-cita-id][draggable="true"]');
        
        citas.forEach(cita => {
            cita.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', cita.getAttribute('data-cita-id'));
            });
        });

        const recursos = document.querySelectorAll('[data-recurso][data-tiempo][data-fecha]');
        recursos.forEach(recurso => {
            recurso.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                recurso.classList.add('bg-blue-100');
            });

            recurso.addEventListener('dragleave', (e) => {
                recurso.classList.remove('bg-blue-100');
            });

            recurso.addEventListener('drop', (e) => {
                e.preventDefault();
                recurso.classList.remove('bg-blue-100');
                
                const citaId = e.dataTransfer.getData('text/plain');
                const cita = this.navManager.citas.find(c => c.id === citaId);
                
                if (cita) {
                    const nuevoTiempo = recurso.getAttribute('data-tiempo');
                    const nuevaFecha = recurso.getAttribute('data-fecha');
                    
                    cita.hora = nuevoTiempo;
                    cita.fecha = nuevaFecha;
                    
                    this.navManager.saveCita(cita);
                    this.refresh();
                }
            });
        });
    }

    mostrarDetallesCita(cita) {
        const detalles = `
            <div class="space-y-3">
                <div class="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                        ${cita.cliente.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p class="text-base font-bold text-gray-900">${cita.cliente}</p>
                        <p class="text-xs text-gray-600">${cita.servicio}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p class="uppercase font-bold text-gray-500 mb-1 text-xs">Fecha</p>
                        <p class="font-semibold text-gray-900">${new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', {weekday: 'short', month: 'short', day: 'numeric'})}</p>
                    </div>
                    <div>
                        <p class="uppercase font-bold text-gray-500 mb-1 text-xs">Hora</p>
                        <p class="font-semibold text-gray-900">${cita.hora}</p>
                    </div>
                </div>

                <div>
                    <p class="uppercase font-bold text-gray-500 mb-1 text-xs">Servicio</p>
                    <p class="font-semibold text-gray-900 text-sm">${cita.servicio}</p>
                </div>

                ${cita.precio ? `
                    <div>
                        <p class="uppercase font-bold text-gray-500 mb-1 text-xs">Precio</p>
                        <p class="text-lg font-bold text-blue-600">€${parseFloat(cita.precio).toFixed(2)}</p>
                    </div>
                ` : ''}

                <div class="flex gap-2 pt-3 border-t border-gray-200">
                    <button onclick="
                        const modal = document.getElementById('modal-cita');
                        document.getElementById('cita-id').value = '${cita.id}';
                        document.getElementById('cita-cliente').value = '${cita.cliente.replace(/'/g, "\\'")}';
                        document.getElementById('cita-servicio').value = '${cita.servicio.replace(/'/g, "\\'")}';
                        document.getElementById('cita-fecha').value = '${cita.fecha}';
                        document.getElementById('cita-hora').value = '${cita.hora}';
                        document.getElementById('cita-precio').value = '${cita.precio || ''}';
                        document.getElementById('modal-title').textContent = 'Editar Cita';
                        modal.classList.remove('hidden');
                        document.getElementById('modal-detalles-cita').remove();
                    " class="flex-1 px-3 py-2 bg-blue-600 text-white font-bold rounded text-sm hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-1"></i> Editar
                    </button>
                    <button onclick="
                        if (confirm('¿Eliminar esta cita?')) {
                            window.agendaManagerInstance.navManager.deleteCita('${cita.id}');
                            document.getElementById('modal-detalles-cita').remove();
                        }
                    " class="flex-1 px-3 py-2 border border-red-500 text-red-600 font-bold rounded text-sm hover:bg-red-50 transition">
                        <i class="fas fa-trash mr-1"></i> Eliminar
                    </button>
                </div>
            </div>
        `;

        // Mostrar modal con detalles
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.id = 'modal-detalles-cita';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
                <div class="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 class="text-lg font-bold text-gray-900">Detalles de la cita</h3>
                    <button onclick="document.getElementById('modal-detalles-cita').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>
                <div class="p-4">
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
        // Edit y delete en las tarjetas de citas (overlay)
        document.querySelectorAll('[data-cita-id]').forEach(card => {
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const id = card.getAttribute('data-cita-id');
                const cita = this.navManager.citas.find(c => c.id === id);
                if (cita) {
                    this.mostrarMenuContextual(cita, e.clientX, e.clientY);
                }
            });

            // Click para ver detalles
            card.addEventListener('click', (e) => {
                if (e.button === 0 && !card.dragging) { // Click izquierdo
                    const id = card.getAttribute('data-cita-id');
                    const cita = this.navManager.citas.find(c => c.id === id);
                    if (cita) {
                        this.mostrarDetallesCita(cita);
                    }
                }
            });
        });
    }

    mostrarMenuContextual(cita, x, y) {
        const menu = document.createElement('div');
        menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1';
        menu.style.top = y + 'px';
        menu.style.left = x + 'px';
        menu.innerHTML = `
            <button onclick="window.agendaManagerInstance.navManager.openModal(this.closest('[data-cita-id]')); this.closest('[class*=fixed]').remove();" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 block text-gray-900 font-medium">
                <i class="fas fa-edit mr-2"></i> Editar
            </button>
            <button onclick="if (confirm('¿Eliminar cita?')) { window.agendaManagerInstance.navManager.deleteCita('${cita.id}'); } this.closest('[class*=fixed]').remove();" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 block text-red-600 font-medium">
                <i class="fas fa-trash mr-2"></i> Eliminar
            </button>
        `;
        
        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (e.target !== menu && !menu.contains(e.target)) {
                    menu.remove();
                }
            }, { once: true });
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
        
        this.setupClickToAdd();
        this.setupDragDrop();
        this.attachCitaListeners();
    }
}
(function () {
  const STORAGE_KEY = 'crm-appointments';

  const state = {
    monthCursor: new Date(),
    selectedDate: toISODate(new Date()),
    appointments: []
  };

  const el = {
    currentMonth: document.getElementById('current-month'),
    calendarDays: document.getElementById('calendar-days'),
    selectedDateTitle: document.getElementById('selected-date-title'),
    appointmentsList: document.getElementById('appointments-list'),
    form: document.getElementById('appointment-form'),
    id: document.getElementById('appointment-id'),
    client: document.getElementById('client-name'),
    date: document.getElementById('appointment-date'),
    time: document.getElementById('appointment-time'),
    description: document.getElementById('appointment-description'),
    cancelEdit: document.getElementById('cancel-edit'),
    addBtn: document.getElementById('add-appointment'),
    prevMonth: document.getElementById('prev-month'),
    nextMonth: document.getElementById('next-month'),
    total: document.getElementById('total-appointments'),
    today: document.getElementById('today-appointments'),
    upcoming: document.getElementById('upcoming-appointments'),
    exportBtn: document.getElementById('export-excel'),
    horaFin: document.getElementById('appointment-hora-fin'),
    prioridad: document.getElementById('appointment-prioridad'),
    estado: document.getElementById('appointment-estado'),
    modal: document.getElementById('event-detail-modal'),
    modalContent: document.getElementById('modal-content'),
    modalClose: document.getElementById('modal-close'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalEditBtn: document.getElementById('modal-edit-btn'),
    modalDeleteBtn: document.getElementById('modal-delete-btn'),
    dayPreview: document.getElementById('day-preview')
  };

  function toISODate(d) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function loadAppointments() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      state.appointments = Array.isArray(parsed) ? parsed : [];
    } catch {
      state.appointments = [];
    }
  }

  function saveAppointments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.appointments));
  }

  function timeToMinutes(time) {
    const parts = (time || '00:00').split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  }

  function getEventClass(a) {
    const estado = a.estado || 'pendiente';
    const prioridad = a.prioridad || 'normal';
    if (estado === 'completada') return 'event-completed';
    if (prioridad === 'importante') return 'event-important';
    return 'event-normal';
  }

  function getDotClass(a) {
    return getEventClass(a).replace('event-', 'dot-');
  }

  function assignEventLayout(items) {
    const events = items.map(function(a) {
      const start = timeToMinutes(a.hora || '00:00');
      const end = a.horaFin ? timeToMinutes(a.horaFin) : start + 60;
      return Object.assign({}, a, { _start: start, _end: Math.max(end, start + 30), _col: 0, _totalCols: 1 });
    });

    for (let i = 0; i < events.length; i++) {
      const usedCols = new Set();
      for (let j = 0; j < i; j++) {
        if (events[i]._start < events[j]._end && events[i]._end > events[j]._start) {
          usedCols.add(events[j]._col);
        }
      }
      let col = 0;
      while (usedCols.has(col)) col++;
      events[i]._col = col;
    }

    for (let i = 0; i < events.length; i++) {
      let maxCol = events[i]._col;
      for (let j = 0; j < events.length; j++) {
        if (i !== j && events[i]._start < events[j]._end && events[i]._end > events[j]._start) {
          maxCol = Math.max(maxCol, events[j]._col);
        }
      }
      events[i]._totalCols = maxCol + 1;
    }

    return events;
  }

  function renderMonth() {
    const year = state.monthCursor.getFullYear();
    const month = state.monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    el.currentMonth.textContent = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const mondayIndex = (first.getDay() + 6) % 7;
    const totalCells = mondayIndex + last.getDate();
    const rows = Math.ceil(totalCells / 7);
    const maxCells = rows * 7;

    let html = '';
    for (let i = 0; i < maxCells; i += 1) {
      const dayNum = i - mondayIndex + 1;
      if (dayNum < 1 || dayNum > last.getDate()) {
        html += '<div class="h-12 rounded-xl bg-slate-100"></div>';
        continue;
      }

      const dayDate = new Date(year, month, dayNum);
      const iso = toISODate(dayDate);
      const isSelected = iso === state.selectedDate;
      const dayApps = state.appointments.filter(function(a) { return a.fecha === iso; });
      const hasAppointments = dayApps.length > 0;
      const dotClasses = [...new Set(dayApps.map(function(a) { return getDotClass(a); }))];

      const classes = [
        'cal-day-cell rounded-xl flex flex-col items-center justify-center cursor-pointer transition border text-sm font-semibold py-1',
        isSelected ? 'selected-day border-blue-600' : 'bg-white border-slate-200 hover:bg-slate-50',
        !isSelected && hasAppointments ? 'day-with-appointments' : ''
      ].join(' ');

      html += '<button type="button" class="' + classes + '" data-date="' + iso + '">';
      html += '<span>' + dayNum + '</span>';
      if (dotClasses.length) {
        html += '<div class="flex gap-0.5 mt-0.5">';
        dotClasses.slice(0, 3).forEach(function(dc) { html += '<span class="day-dot ' + dc + '"></span>'; });
        html += '</div>';
      }
      html += '</button>';
    }

    el.calendarDays.innerHTML = html;
  }

  function getSelectedDayAppointments() {
    return state.appointments
      .filter(a => a.fecha === state.selectedDate)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }

  function updateStats() {
    const todayIso = toISODate(new Date());
    const now = new Date();

    const upcoming = state.appointments.filter(a => {
      if (!a.fecha || !a.hora) return false;
      const when = new Date(a.fecha + 'T' + a.hora + ':00');
      return !Number.isNaN(when.getTime()) && when >= now;
    }).length;

    el.total.textContent = String(state.appointments.length);
    el.today.textContent = String(state.appointments.filter(a => a.fecha === todayIso).length);
    el.upcoming.textContent = String(upcoming);
  }

  function showEventDetail(id) {
    const a = state.appointments.find(function(item) { return item.id === id; });
    if (!a) return;
    const cls = getEventClass(a);
    const badgeCls = cls.replace('event-', 'badge-');
    const prioLabels = { normal: 'Normal', importante: 'Importante' };
    const estadoLabels = { pendiente: 'Pendiente', en_curso: 'En curso', completada: 'Completada' };
    const prioLabel = prioLabels[a.prioridad || 'normal'] || 'Normal';
    const estadoLabel = estadoLabels[a.estado || 'pendiente'] || 'Pendiente';

    const rows = [
      ['Cliente', escapeHtml(a.cliente || '—')],
      ['Hora inicio', escapeHtml(a.hora || '—')],
      ['Hora fin', escapeHtml(a.horaFin || '—')],
      ['Descripción', escapeHtml(a.descripcion || a.servicio || '—')],
      ['Estado', '<span class="badge ' + badgeCls + '">' + estadoLabel + '</span>'],
      ['Prioridad', '<span class="badge ' + badgeCls + '">' + prioLabel + '</span>']
    ];

    el.modalContent.innerHTML = rows.map(function(row) {
      return '<div class="flex flex-col gap-0.5"><span class="text-xs font-semibold uppercase tracking-wider text-slate-400">' + row[0] + '</span><span class="text-sm text-slate-800">' + row[1] + '</span></div>';
    }).join('');

    el.modal.dataset.editId = id;
    el.modal.style.display = 'flex';
  }

  function renderDayList() {
    const d = new Date(state.selectedDate + 'T00:00:00');
    el.selectedDateTitle.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const items = getSelectedDayAppointments();

    if (!items.length) {
      el.appointmentsList.innerHTML = '<p class="text-slate-500 view-fade">No hay citas para este día.</p>';
      return;
    }

    const HOUR_START = 7;
    const HOUR_END = 21;
    const HOUR_HEIGHT = 60;
    const gridHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

    const laid = assignEventLayout(items);

    let hoursHtml = '';
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      hoursHtml += '<div class="timeline-hour-label">' + String(h).padStart(2, '0') + ':00</div>';
    }

    let slotsHtml = '';
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      slotsHtml += '<div class="timeline-slot"></div>';
    }

    let eventsHtml = '';
    laid.forEach(function(a) {
      const clampedStart = Math.max(a._start, HOUR_START * 60);
      const topOffset = clampedStart - HOUR_START * 60;
      const height = Math.max(((a._end - a._start) / 60) * HOUR_HEIGHT, 28);
      const cls = getEventClass(a);
      const colWidth = 100 / a._totalCols;
      const leftPct = a._col * colWidth;
      const style = 'top:' + topOffset + 'px;height:' + height + 'px;left:calc(' + leftPct + '% + 3px);width:calc(' + colWidth + '% - 6px);';
      const label = escapeHtml(a.descripcion || a.servicio || 'Cita');
      const timeLabel = escapeHtml(a.hora || '--:--') + (a.horaFin ? ' – ' + escapeHtml(a.horaFin) : '');

      eventsHtml += '<div class="event-block ' + cls + '" style="' + style + '" data-action="detail" data-id="' + a.id + '">';
      eventsHtml += '<div class="font-semibold truncate">' + escapeHtml(a.cliente || 'Cliente') + '</div>';
      eventsHtml += '<div class="truncate" style="opacity:0.75">' + label + '</div>';
      eventsHtml += '<div style="opacity:0.6;font-size:10px">' + timeLabel + '</div>';
      eventsHtml += '</div>';
    });

    el.appointmentsList.innerHTML = [
      '<div class="timeline-container view-fade">',
      '<div class="timeline-hours">' + hoursHtml + '</div>',
      '<div class="timeline-grid" style="min-height:' + gridHeight + 'px;">' + slotsHtml + eventsHtml + '</div>',
      '</div>'
    ].join('');
  }

  function resetForm() {
    el.id.value = '';
    el.client.value = '';
    el.date.value = state.selectedDate;
    el.time.value = '';
    el.horaFin.value = '';
    el.description.value = '';
    el.prioridad.value = 'normal';
    el.estado.value = 'pendiente';
  }

  function upsertAppointment(payload) {
    const idx = state.appointments.findIndex(a => a.id === payload.id);
    if (idx >= 0) {
      state.appointments[idx] = payload;
    } else {
      state.appointments.push(payload);
    }
    saveAppointments();
    refresh();
  }

  function removeAppointment(id) {
    state.appointments = state.appointments.filter(a => a.id !== id);
    saveAppointments();
    refresh();
  }

  function editAppointment(id) {
    const a = state.appointments.find(function(item) { return item.id === id; });
    if (!a) return;
    el.id.value = a.id;
    el.client.value = a.cliente || '';
    el.date.value = a.fecha || state.selectedDate;
    el.time.value = a.hora || '';
    el.horaFin.value = a.horaFin || '';
    el.description.value = a.descripcion || a.servicio || '';
    el.prioridad.value = a.prioridad || 'normal';
    el.estado.value = a.estado || 'pendiente';
    state.selectedDate = a.fecha || state.selectedDate;
    renderMonth();
    renderDayList();
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('No se pudo cargar la librería de exportación.');
      return;
    }

    const rows = state.appointments.map(function(a) { return {
      ID: a.id,
      Cliente: a.cliente || '',
      Fecha: a.fecha || '',
      Hora: a.hora || '',
      HoraFin: a.horaFin || '',
      Descripcion: a.descripcion || a.servicio || '',
      Prioridad: a.prioridad || 'normal',
      Estado: a.estado || 'pendiente'
    }; });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
    XLSX.writeFile(wb, 'agenda-node.xlsx');
  }

  function refresh() {
    renderMonth();
    renderDayList();
    updateStats();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!el.date) return;
    state.monthCursor = startOfMonth(new Date());
    loadAppointments();
    el.date.value = state.selectedDate;

    el.prevMonth.addEventListener('click', () => {
      state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() - 1, 1);
      renderMonth();
    });

    el.nextMonth.addEventListener('click', () => {
      state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + 1, 1);
      renderMonth();
    });

    el.calendarDays.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-date]');
      if (!btn) return;
      state.selectedDate = btn.getAttribute('data-date');
      el.date.value = state.selectedDate;
      renderMonth();
      renderDayList();
    });

    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cliente = el.client.value.trim();
      const fecha = el.date.value;
      const hora = el.time.value;
      const descripcion = el.description.value.trim();

      if (!cliente || !fecha || !hora) {
        alert('Completa cliente, fecha y hora.');
        return;
      }

      const horaFin = el.horaFin.value;
      const prioridad = el.prioridad.value || 'normal';
      const estado = el.estado.value || 'pendiente';
      const id = el.id.value || String(Date.now());
      upsertAppointment({
        id,
        cliente,
        fecha,
        hora,
        horaFin,
        descripcion,
        prioridad,
        estado,
        servicio: descripcion || 'Cita'
      });

      state.selectedDate = fecha;
      resetForm();
    });

    el.cancelEdit.addEventListener('click', () => resetForm());

    el.addBtn.addEventListener('click', () => {
      resetForm();
      el.client.focus();
    });

    el.appointmentsList.addEventListener('click', function(e) {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;
      const id = actionBtn.getAttribute('data-id');
      const action = actionBtn.getAttribute('data-action');
      if (action === 'detail') { showEventDetail(id); return; }
      if (action === 'edit') editAppointment(id);
      if (action === 'delete' && confirm('\u00bfEliminar cita?')) removeAppointment(id);
    });

    el.exportBtn.addEventListener('click', exportExcel);

    // Day preview on hover
    el.calendarDays.addEventListener('mouseover', function(e) {
      const btn = e.target.closest('[data-date]');
      if (!btn) { el.dayPreview.style.display = 'none'; return; }
      const iso = btn.getAttribute('data-date');
      const apps = state.appointments
        .filter(function(a) { return a.fecha === iso; })
        .sort(function(a, b) { return (a.hora || '').localeCompare(b.hora || ''); });
      if (!apps.length) { el.dayPreview.style.display = 'none'; return; }
      const rect = btn.getBoundingClientRect();
      el.dayPreview.style.top = (rect.bottom + 6 + window.scrollY) + 'px';
      el.dayPreview.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 230) + 'px';
      el.dayPreview.innerHTML = '<div style="font-weight:600;color:#1e293b;margin-bottom:6px">' + apps.length + ' cita(s)</div>' +
        apps.slice(0, 3).map(function(a) {
          const dc = getDotClass(a);
          return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="day-dot ' + dc + '"></span><span style="color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(a.hora || '--') + ' \u00b7 ' + escapeHtml(a.cliente || 'Cliente') + '</span></div>';
        }).join('') +
        (apps.length > 3 ? '<div style="color:#94a3b8;font-size:10px;margin-top:2px">+' + (apps.length - 3) + ' m\u00e1s</div>' : '');
      el.dayPreview.style.display = 'block';
    });

    el.calendarDays.addEventListener('mouseleave', function() {
      el.dayPreview.style.display = 'none';
    });

    // Modal controls
    el.modalClose.addEventListener('click', function() { el.modal.style.display = 'none'; });
    el.modalCloseBtn.addEventListener('click', function() { el.modal.style.display = 'none'; });
    el.modal.addEventListener('click', function(e) {
      if (e.target === el.modal) el.modal.style.display = 'none';
    });
    el.modalEditBtn.addEventListener('click', function() {
      const id = el.modal.dataset.editId;
      el.modal.style.display = 'none';
      if (id) { editAppointment(id); el.client.focus(); }
    });
    el.modalDeleteBtn.addEventListener('click', function() {
      const id = el.modal.dataset.editId;
      el.modal.style.display = 'none';
      if (id && confirm('\u00bfEliminar esta cita?')) removeAppointment(id);
    });

    refresh();
  });
})();
