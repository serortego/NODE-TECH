// agenda.js — AgendaManager v2.0 — NodeTech dark theme
// Gestión completa de agenda: vistas día/semana/mes, drag&drop,
// panel de detalle lateral, cambio de estado en hover, solapamientos.

class AgendaManager {
    constructor(navigationManager) {
        this.navManager      = navigationManager;
        this.agendaView      = 'day';
        this.selectedDate    = new Date();
        this.recursos        = this._loadRecursos();
        this.granularidad    = 15;
        this.horaInicio      = 8;
        this.horaFin         = 20;
        this.pxPorHora       = 80;
        this.sidebarVisible  = true;
        this._timeInterval   = null;
        this.bloques         = JSON.parse(localStorage.getItem('nodetech_bloques') || '[]');

        this.citaStates = {
            'pendiente':     { bg: 'rgba(100,116,139,0.22)', border: '#64748B', text: '#94a3b8',  label: 'Pendiente',      icon: 'o'  },
            'no-presentado': { bg: 'rgba(100,116,139,0.22)', border: '#64748B', text: '#94a3b8',  label: 'No presentado',  icon: 'x'  },
            'esperando':     { bg: 'rgba(251,191,36,0.18)',  border: '#FBBF24', text: '#FDE68A',  label: 'Esperando',      icon: '?'  },
            'atendiendose':  { bg: 'rgba(59,130,246,0.20)',  border: '#60A5FA', text: '#BFDBFE',  label: 'En atencion',    icon: '*'  },
            'completado':    { bg: 'rgba(34,197,94,0.18)',   border: '#4ADE80', text: '#BBF7D0',  label: 'Completado',     icon: 'v'  },
        };

        this._servicioColors = [
            { bg: 'rgba(59,130,246,0.18)',  border: '#60A5FA', text: '#BFDBFE' },
            { bg: 'rgba(16,185,129,0.18)',  border: '#34D399', text: '#A7F3D0' },
            { bg: 'rgba(139,92,246,0.18)',  border: '#A78BFA', text: '#DDD6FE' },
            { bg: 'rgba(245,158,11,0.18)',  border: '#FCD34D', text: '#FEF3C7' },
            { bg: 'rgba(239,68,68,0.18)',   border: '#F87171', text: '#FECACA' },
            { bg: 'rgba(6,182,212,0.18)',   border: '#22D3EE', text: '#CFFAFE' },
            { bg: 'rgba(249,115,22,0.18)',  border: '#FB923C', text: '#FED7AA' },
            { bg: 'rgba(236,72,153,0.18)',  border: '#F472B6', text: '#FBCFE8' },
            { bg: 'rgba(20,184,166,0.18)',  border: '#2DD4BF', text: '#CCFBF1' },
            { bg: 'rgba(168,85,247,0.18)',  border: '#C084FC', text: '#F3E8FF' },
        ];
    }

    _loadRecursos() {
        const fromCache = window.dataManager?.cache?.empleados?.map(e => e.nombre).filter(Boolean);
        if (fromCache && fromCache.length > 0) return fromCache;
        if (this.navManager?.recursos?.length > 0) return this.navManager.recursos;
        return ['General'];
    }

    _buildColorMap() {
        const cfg = window.BCONFIG || {};
        const servicios = [];
        if (cfg.servicios) cfg.servicios.forEach(g => { if (g.items) servicios.push(...g.items); });
        const map = {};
        servicios.forEach((s, i) => { map[s] = this._servicioColors[i % this._servicioColors.length]; });
        return map;
    }

    _dateStr(date) {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }

    _toMinutes(horaStr) {
        const [h, m] = (horaStr || '0:0').split(':').map(Number);
        return h * 60 + (m || 0);
    }

    _detectarSolapamientos(citas) {
        const overlapping = new Set();
        const groups = {};
        citas.forEach(c => {
            const key = c.fecha + '__' + (c.recurso || 'sin-recurso');
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        Object.values(groups).forEach(grupo => {
            for (let i = 0; i < grupo.length; i++) {
                for (let j = i + 1; j < grupo.length; j++) {
                    const a = grupo[i], b = grupo[j];
                    const aStart = this._toMinutes(a.hora);
                    const aEnd   = aStart + (a.duracion || 60);
                    const bStart = this._toMinutes(b.hora);
                    const bEnd   = bStart + (b.duracion || 60);
                    if (aStart < bEnd && aEnd > bStart) {
                        overlapping.add(a.id);
                        overlapping.add(b.id);
                    }
                }
            }
        });
        return overlapping;
    }

    render() {
        this.recursos = this._loadRecursos();
        const fechaStr    = this._dateStr(this.selectedDate);
        const citasArr    = this.navManager.citas.filter(c => c.fecha === fechaStr);
        const citasHoy    = citasArr.length;
        const pendientes  = citasArr.filter(c => !c.estado || c.estado === 'pendiente' || c.estado === 'esperando' || c.estado === 'no-presentado').length;
        const completados = citasArr.filter(c => c.estado === 'completado').length;
        const estimado    = citasArr.reduce((s, c) => s + parseInt(c.precio || 0), 0);
        const proximas    = this.navManager.getProximasCitas(8);
        const fechaLabel  = this._buildFechaLabel();

        return `
        <div class="agenda-root flex flex-col gap-2 h-full" style="min-height:0">

            <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                    <i class="fas ${this.agendaView === 'analytics' ? 'fa-chart-bar' : 'fa-calendar-alt'} text-[#2B93A6]"></i>
                    <h2 class="text-lg font-bold text-white">${this.agendaView === 'analytics' ? 'Estad\u00edsticas' : 'Agenda'}</h2>
                </div>

                ${this.agendaView !== 'analytics' ? `
                <div class="flex bg-[rgba(255,255,255,0.06)] p-0.5 rounded-lg">
                    <button class="agenda-view-btn px-3 py-1 rounded-md text-xs font-semibold transition ${this.agendaView === 'day'   ? 'bg-[#2B93A6] text-white' : 'text-slate-400 hover:text-white'}" data-view="day">Dia</button>
                    <button class="agenda-view-btn px-3 py-1 rounded-md text-xs font-semibold transition ${this.agendaView === 'week'  ? 'bg-[#2B93A6] text-white' : 'text-slate-400 hover:text-white'}" data-view="week">Semana</button>
                    <button class="agenda-view-btn px-3 py-1 rounded-md text-xs font-semibold transition ${this.agendaView === 'month' ? 'bg-[#2B93A6] text-white' : 'text-slate-400 hover:text-white'}" data-view="month">Mes</button>
                </div>` : ''}

                ${this.agendaView !== 'analytics' ? `
                <div class="flex items-center gap-1">
                    <button id="agenda-prev-btn" class="p-1.5 text-slate-400 hover:bg-[rgba(255,255,255,0.08)] rounded transition"><i class="fas fa-chevron-left text-xs"></i></button>
                    <button id="agenda-hoy-btn" class="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded transition">Hoy</button>
                    <button id="agenda-next-btn" class="p-1.5 text-slate-400 hover:bg-[rgba(255,255,255,0.08)] rounded transition"><i class="fas fa-chevron-right text-xs"></i></button>
                    <span id="agenda-fecha-label" class="text-sm font-semibold text-white ml-1 capitalize">${fechaLabel}</span>
                    <input type="date" id="agenda-date-input" value="${fechaStr}" class="opacity-0 absolute w-0 h-0 pointer-events-none">
                </div>` : ''}

                ${this.agendaView !== 'analytics' ? `
                <div class="flex-1 max-w-48 relative">
                    <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"></i>
                    <input type="text" id="agenda-search" placeholder="Buscar cliente..."
                        class="w-full pl-7 pr-3 py-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2B93A6]">
                </div>` : ''}

                <div class="flex gap-2 ml-auto">
                    ${this.agendaView !== 'analytics' ? `
                    <button id="btn-toggle-sidebar" class="p-1.5 text-slate-400 hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition" title="Panel lateral">
                        <i class="fas fa-columns text-xs"></i>
                    </button>
                    <button id="btn-bloquear" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-[rgba(100,116,139,0.4)] text-slate-400 hover:text-white hover:border-[rgba(100,116,139,0.7)] transition">
                        <i class="fas fa-ban"></i> Bloquear
                    </button>
                    <button id="btn-nueva-cita" class="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold">
                        <i class="fas fa-plus"></i> Nueva cita
                    </button>` : ''}
                </div>
            </div>

            ${this.agendaView !== 'analytics' ? `
            <div class="flex gap-2 text-xs flex-wrap">
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold" style="background:rgba(43,147,166,0.15);color:#38BDF8">
                    <i class="fas fa-calendar-check"></i>${citasHoy} cita${citasHoy !== 1 ? 's' : ''}
                </div>
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold" style="background:rgba(251,191,36,0.12);color:#FDE68A">
                    <i class="fas fa-clock"></i>${pendientes} pendiente${pendientes !== 1 ? 's' : ''}
                </div>
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold" style="background:rgba(34,197,94,0.12);color:#86EFAC">
                    <i class="fas fa-check-circle"></i>${completados} completada${completados !== 1 ? 's' : ''}
                </div>
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold" style="background:rgba(16,185,129,0.12);color:#6EE7B7">
                    <i class="fas fa-euro-sign"></i>€${estimado} est.
                </div>
            </div>` : ''}

            <div class="flex gap-3 flex-1 min-h-0">
                <div id="agenda-content"
                    class="flex-1 min-w-0 glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-y-auto relative">
                    ${this.renderContent()}
                </div>

                ${this.agendaView !== 'analytics' ? `
                <div id="agenda-sidebar" class="w-56 flex-shrink-0 flex flex-col gap-3 overflow-y-auto transition-all duration-300">
                    <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-3">
                        <div id="calendar-mini">${this.renderCalendarMini()}</div>
                    </div>

                    <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex-1 min-h-0">
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Proximas</p>
                        <div class="space-y-1 overflow-y-auto" style="max-height:260px">
                            ${proximas.length > 0 ? proximas.map(cita => {
                                const st = this.citaStates[cita.estado] || this.citaStates['pendiente'];
                                return '<div class="proxima-cita-item flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] cursor-pointer transition" data-cita-id="' + cita.id + '">'
                                    + '<div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs" style="background:rgba(43,147,166,0.3)">' + (cita.cliente || '?').charAt(0).toUpperCase() + '</div>'
                                    + '<div class="min-w-0 flex-1"><p class="text-xs font-semibold text-white truncate">' + cita.cliente + '</p><p class="text-xs text-slate-500 truncate">' + cita.servicio + ' - ' + cita.hora + '</p></div>'
                                    + '<div class="w-2 h-2 rounded-full flex-shrink-0" style="background:' + st.border + '" title="' + st.label + '"></div>'
                                    + '</div>';
                            }).join('') : '<p class="text-xs text-slate-600 text-center py-4">Sin citas proximas</p>'}
                        </div>
                    </div>

                    <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-3">
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estados</p>
                        <div class="space-y-1.5">
                            ${Object.entries(this.citaStates).map(([, v]) =>
                                '<div class="flex items-center gap-2 text-xs"><div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:' + v.border + '"></div><span class="text-slate-400">' + v.label + '</span></div>'
                            ).join('')}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        </div>`;
    }

    renderContent() {
        if (this.agendaView === 'analytics') return this.renderAnalytics();
        if (this.agendaView === 'week')  return this.renderWeekView();
        if (this.agendaView === 'month') return this.renderMonthView();
        return this.renderDayView();
    }

    renderDayView() {
        const fechaStr    = this._dateStr(this.selectedDate);
        const ahora       = new Date();
        const estaHoy     = fechaStr === this._dateStr(ahora);
        const colorMap    = this._buildColorMap();
        const slotsPerH   = 60 / this.granularidad;
        const pxPerSlot   = this.pxPorHora / slotsPerH;
        const headerH     = 40;
        const citasDia    = this.navManager.citas.filter(c => c.fecha === fechaStr);
        const overlapping = this._detectarSolapamientos(citasDia);
        const numR        = this.recursos.length;

        let html = '<div class="relative select-none" style="min-width:' + (70 + numR * 110) + 'px">';

        html += '<div class="grid sticky top-0 z-20" style="grid-template-columns:70px repeat(' + numR + ',1fr)">';
        html += '<div class="border-b border-r border-[rgba(255,255,255,0.08)] bg-[#0B1628]" style="height:' + headerH + 'px"></div>';
        this.recursos.forEach(r => {
            html += '<div class="border-b border-r border-[rgba(255,255,255,0.08)] bg-[#0B1628] flex items-center justify-center px-2" style="height:' + headerH + 'px"><span class="text-xs font-bold text-white truncate">' + r + '</span></div>';
        });
        html += '</div>';

        html += '<div class="grid" id="agenda-day-grid" style="grid-template-columns:70px repeat(' + numR + ',1fr)">';
        for (let h = this.horaInicio; h < this.horaFin; h++) {
            const horaStr = String(h).padStart(2, '0');
            for (let s = 0; s < slotsPerH; s++) {
                const min     = s * this.granularidad;
                const tStr    = horaStr + ':' + String(min).padStart(2, '0');
                const isMedH  = min === 30;
                const borderB = isMedH ? '1px dashed rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.07)';
                if (s === 0) {
                    html += '<div class="border-r border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.01)] flex items-start justify-end pr-2 pt-0.5" style="grid-row:span ' + slotsPerH + ';border-bottom:' + borderB + ';min-height:' + this.pxPorHora + 'px"><span class="text-xs font-semibold text-slate-600">' + horaStr + ':00</span></div>';
                }
                this.recursos.forEach(recurso => {
                    html += '<div class="agenda-cell border-r border-[rgba(255,255,255,0.04)] hover:bg-[rgba(43,147,166,0.07)] transition cursor-pointer" style="border-bottom:' + borderB + ';min-height:' + pxPerSlot + 'px" data-recurso="' + recurso + '" data-tiempo="' + tStr + '" data-fecha="' + fechaStr + '"></div>';
                });
            }
        }
        html += '</div>';

        html += this._renderCitasDay(citasDia, colorMap, overlapping, headerH);
        html += this._renderBloquesDay(fechaStr, headerH, numR);
        if (estaHoy) html += this._renderTimeIndicator(ahora, headerH);
        html += '</div>';
        return html;
    }

    _renderCitasDay(citas, colorMap, overlapping, headerH) {
        const numR = this.recursos.length;
        const colW = 'calc((100% - 70px) / ' + numR + ')';
        return citas.map(cita => {
            const [ch, cm] = (cita.hora || '0:0').split(':').map(Number);
            if (ch < this.horaInicio || ch >= this.horaFin) return '';
            const duracion   = cita.duracion || 60;
            const topPx      = headerH + (ch - this.horaInicio) * this.pxPorHora + (cm / 60) * this.pxPorHora;
            const heightPx   = Math.max(duracion / 60 * this.pxPorHora, 28);
            const recursoIdx = this.recursos.indexOf(cita.recurso);
            const colIdx     = recursoIdx >= 0 ? recursoIdx : 0;
            const leftCalc   = 'calc(70px + ' + colIdx + ' * ' + colW + ')';
            const estado     = cita.estado || 'pendiente';
            const st         = this.citaStates[estado] || this.citaStates['pendiente'];
            const esOverlap  = overlapping.has(cita.id);
            const cobBadge   = cita.cobrado ? '<span class="absolute top-0.5 right-4 text-xs" title="Cobrada">€v</span>' : '';
            const overlapBadge = esOverlap ? '<span class="absolute top-0.5 right-1 text-xs" title="Solapamiento">!</span>' : '';
            const overlapStyle = esOverlap ? 'animation:overlap-pulse 2s infinite;box-shadow:0 0 0 2px rgba(239,68,68,0.5);' : '';

            return '<div class="agenda-cita-card absolute rounded-lg border-l-4 overflow-hidden cursor-pointer transition-all duration-150 group z-10"'
                + ' style="top:' + topPx + 'px;left:' + leftCalc + ';width:calc(' + colW + ' - 8px);height:' + heightPx + 'px;'
                + 'background:' + st.bg + ';border-left-color:' + st.border + ';'
                + 'border-top:1px solid ' + st.border + '33;border-right:1px solid ' + st.border + '22;border-bottom:1px solid ' + st.border + '22;' + overlapStyle + '"'
                + ' draggable="true" data-cita-id="' + cita.id + '">'
                + '<div class="px-1.5 py-1 flex flex-col h-full pointer-events-none">'
                + '<p class="text-xs font-bold truncate leading-tight" style="color:' + st.text + '">' + cita.cliente + '</p>'
                + (heightPx > 40 ? '<p class="text-xs opacity-80 truncate leading-tight" style="color:' + st.text + '">' + cita.servicio + '</p>' : '')
                + (heightPx > 56 ? '<p class="text-xs mt-auto font-semibold opacity-60" style="color:' + st.text + '">' + cita.hora + (cita.precio ? ' - €' + parseInt(cita.precio) : '') + '</p>' : '')
                + overlapBadge + cobBadge
                + '</div>'
                + '<div class="agenda-state-overlay absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style="background:rgba(11,22,40,0.88);backdrop-filter:blur(2px);border-radius:inherit">'
                + '<div class="flex gap-1">'
                + '<button class="quick-estado px-2 py-1 rounded text-xs font-bold border" style="border-color:rgba(251,191,36,0.5);color:#FDE68A;background:rgba(251,191,36,0.1)" data-estado="esperando" data-cita-id="' + cita.id + '" title="Esperando">Esp</button>'
                + '<button class="quick-estado px-2 py-1 rounded text-xs font-bold border" style="border-color:rgba(96,165,250,0.5);color:#BFDBFE;background:rgba(59,130,246,0.1)" data-estado="atendiendose" data-cita-id="' + cita.id + '" title="En atencion">Ate</button>'
                + '<button class="quick-estado px-2 py-1 rounded text-xs font-bold border" style="border-color:rgba(74,222,128,0.5);color:#BBF7D0;background:rgba(34,197,94,0.1)" data-estado="completado" data-cita-id="' + cita.id + '" title="Completado">Fin</button>'
                + '<button class="quick-estado px-2 py-1 rounded text-xs font-bold border" style="border-color:rgba(100,116,139,0.5);color:#94a3b8;background:rgba(100,116,139,0.1)" data-estado="no-presentado" data-cita-id="' + cita.id + '" title="No presentado">NP</button>'
                + '</div>'
                + '<button class="open-detail px-3 py-1 rounded-lg text-xs font-semibold text-white" style="background:rgba(43,147,166,0.4);border:1px solid rgba(43,147,166,0.5)" data-cita-id="' + cita.id + '">Ver detalle</button>'
                + '</div>'
                + '</div>';
        }).join('');
    }

    _renderTimeIndicator(ahora, headerH) {
        const h = ahora.getHours(), m = ahora.getMinutes();
        if (h < this.horaInicio || h >= this.horaFin) return '';
        const topPx = headerH + (h - this.horaInicio) * this.pxPorHora + (m / 60) * this.pxPorHora;
        const label = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        return '<div class="pointer-events-none absolute left-0 right-0 z-30" id="time-indicator-line" style="top:' + topPx + 'px">'
            + '<div class="absolute left-14 right-0 h-px" style="background:#EF4444;box-shadow:0 0 6px rgba(239,68,68,0.6)"></div>'
            + '<div class="absolute left-14 -top-1.5 w-3 h-3 rounded-full border-2 border-white" style="background:#EF4444;box-shadow:0 0 6px rgba(239,68,68,0.8)"></div>'
            + '<div class="absolute left-1 -top-2.5 text-xs font-bold text-white px-1.5 py-0.5 rounded" style="background:#EF4444">' + label + '</div>'
            + '</div>';
    }

    renderWeekView() {
        const lunes = new Date(this.selectedDate);
        const dow   = lunes.getDay();
        lunes.setDate(lunes.getDate() - (dow === 0 ? 6 : dow - 1));
        const dias = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(lunes); d.setDate(d.getDate() + i); return d;
        });
        const hoy    = this._dateStr(new Date());
        const horas  = Array.from({ length: this.horaFin - this.horaInicio }, (_, i) => this.horaInicio + i);
        const pxPerH = 64, headerH = 44;

        let html = '<div class="relative" style="min-width:500px">';
        html += '<div class="grid sticky top-0 z-20 border-b border-[rgba(255,255,255,0.08)] bg-[#0B1628]" style="grid-template-columns:60px repeat(7,1fr)">';
        html += '<div style="height:' + headerH + 'px"></div>';
        dias.forEach(dia => {
            const dStr    = this._dateStr(dia);
            const isToday = dStr === hoy;
            const nombre  = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][dia.getDay()];
            html += '<div class="flex flex-col items-center justify-center border-l border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[rgba(43,147,166,0.07)] transition" style="height:' + headerH + 'px;' + (isToday ? 'border-bottom:2px solid #2B93A6' : '') + '" onclick="window.agendaManagerInstance&&window.agendaManagerInstance.jumpToDate(\'' + dStr + '\')">'
                + '<span class="text-xs font-bold ' + (isToday ? 'text-[#38BDF8]' : 'text-slate-400') + '">' + nombre + '</span>'
                + '<span class="text-sm font-black leading-tight ' + (isToday ? 'text-white bg-[#2B93A6] w-6 h-6 rounded-full flex items-center justify-center' : 'text-white') + '">' + dia.getDate() + '</span>'
                + '</div>';
        });
        html += '</div>';
        html += '<div class="grid" style="grid-template-columns:60px repeat(7,1fr)">';
        horas.forEach(h => {
            const horaStr = String(h).padStart(2,'0') + ':00';
            html += '<div class="border-r border-b border-[rgba(255,255,255,0.07)] text-right pr-2 pt-0.5" style="height:' + pxPerH + 'px"><span class="text-xs font-semibold text-slate-600">' + horaStr + '</span></div>';
            dias.forEach(dia => {
                const dStr      = this._dateStr(dia);
                const isToday   = dStr === hoy;
                const citasHora = this.navManager.citas.filter(c => c.fecha === dStr && (c.hora || '').startsWith(String(h).padStart(2,'0')));
                html += '<div class="week-cell border-r border-b border-[rgba(255,255,255,0.06)] p-0.5 overflow-hidden hover:bg-[rgba(43,147,166,0.05)] transition cursor-pointer ' + (isToday ? 'bg-[rgba(43,147,166,0.04)]' : '') + '" style="height:' + pxPerH + 'px" data-recurso="auto" data-tiempo="' + horaStr + '" data-fecha="' + dStr + '">'
                    + citasHora.map(cita => {
                        const st = this.citaStates[cita.estado || 'pendiente'] || this.citaStates['pendiente'];
                        return '<div class="agenda-cita-card week-cita-chip rounded px-1 py-0.5 text-xs font-semibold truncate cursor-pointer border-l-2 mb-0.5" style="background:' + st.bg + ';border-left-color:' + st.border + ';color:' + st.text + '" draggable="true" data-cita-id="' + cita.id + '">' + cita.cliente + '</div>';
                    }).join('')
                    + '</div>';
            });
        });
        html += '</div></div>';
        return html;
    }

    renderMonthView() {
        const year    = this.selectedDate.getFullYear();
        const month   = this.selectedDate.getMonth();
        const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const firstDay   = new Date(year, month, 1);
        const lastDay    = new Date(year, month + 1, 0);
        const startDow   = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const hoy        = this._dateStr(new Date());
        const selStr     = this._dateStr(this.selectedDate);

        let html = '<div class="p-3"><h3 class="text-sm font-bold text-white mb-3 text-center">' + MESES[month] + ' ' + year + '</h3>'
            + '<div class="grid grid-cols-7 gap-1 mb-1">' + ['L','M','X','J','V','S','D'].map(d => '<div class="text-xs font-bold text-slate-500 text-center py-1">' + d + '</div>').join('') + '</div>'
            + '<div class="grid grid-cols-7 gap-1">';
        for (let i = 0; i < startDow; i++) html += '<div></div>';
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr  = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
            const n        = this.navManager.citas.filter(c => c.fecha === dateStr).length;
            const isToday  = dateStr === hoy;
            const isSel    = dateStr === selStr;
            const dotColor = n === 0 ? '' : n <= 2 ? '#4ADE80' : n <= 5 ? '#FCD34D' : '#F87171';
            html += '<div class="rounded-lg p-1.5 text-center cursor-pointer transition border hover:border-[rgba(43,147,166,0.5)] '
                + (isToday ? 'bg-[rgba(43,147,166,0.2)] border-[#2B93A6]' : isSel ? 'bg-[rgba(43,147,166,0.1)] border-[rgba(43,147,166,0.4)]' : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)]') + '"'
                + ' onclick="window.agendaManagerInstance&&window.agendaManagerInstance.jumpToDate(\'' + dateStr + '\')">'
                + '<p class="text-xs font-bold ' + (isToday ? 'text-[#38BDF8]' : 'text-slate-300') + '">' + day + '</p>'
                + '<div class="flex justify-center gap-0.5 mt-0.5 min-h-[6px]">'
                + (dotColor ? '<div class="w-1.5 h-1.5 rounded-full" style="background:' + dotColor + '"></div>' : '')
                + (n > 2 ? '<div class="w-1.5 h-1.5 rounded-full" style="background:' + dotColor + '"></div>' : '')
                + (n > 5 ? '<div class="w-1.5 h-1.5 rounded-full" style="background:' + dotColor + '"></div>' : '')
                + '</div></div>';
        }
        html += '</div></div>';
        return html;
    }

    renderCalendarMini() {
        const year   = this.selectedDate.getFullYear();
        const month  = this.selectedDate.getMonth();
        const MESES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const firstDay = new Date(year, month, 1);
        const lastDay  = new Date(year, month + 1, 0);
        const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const today    = new Date();
        const selStr   = this._dateStr(this.selectedDate);

        let html = '<div class="flex items-center justify-between mb-2">'
            + '<button id="mini-cal-prev" class="text-slate-500 hover:text-white p-1 rounded transition"><i class="fas fa-chevron-left text-xs"></i></button>'
            + '<span class="text-xs font-bold text-white">' + MESES[month] + ' ' + year + '</span>'
            + '<button id="mini-cal-next" class="text-slate-500 hover:text-white p-1 rounded transition"><i class="fas fa-chevron-right text-xs"></i></button>'
            + '</div>'
            + '<div class="grid grid-cols-7 gap-0.5 text-center mb-1">'
            + ['L','M','X','J','V','S','D'].map(d => '<div class="text-xs text-slate-600 font-bold">' + d + '</div>').join('')
            + '</div>'
            + '<div class="grid grid-cols-7 gap-0.5 text-center">';

        for (let i = 0; i < startDow; i++) html += '<div></div>';
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr  = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
            const n        = this.navManager.citas.filter(c => c.fecha === dateStr).length;
            const isToday  = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSel    = dateStr === selStr;
            const dotColor = n === 0 ? '' : n <= 2 ? '#4ADE80' : n <= 5 ? '#FCD34D' : '#F87171';
            html += '<div class="flex flex-col items-center cursor-pointer py-0.5 rounded hover:bg-[rgba(255,255,255,0.06)] transition '
                + (isToday ? 'bg-[#2B93A6] rounded-full' : '') + (isSel && !isToday ? 'border border-[#2B93A6]' : '') + '"'
                + ' onclick="window.agendaManagerInstance&&window.agendaManagerInstance.jumpToDate(\'' + dateStr + '\')">'
                + '<span class="text-xs leading-tight ' + (isToday ? 'text-white font-black' : 'text-slate-400') + '">' + day + '</span>'
                + '<div class="w-1 h-1 rounded-full" style="' + (dotColor ? 'background:' + dotColor : '') + '"></div>'
                + '</div>';
        }
        html += '</div>';
        return html;
    }

    mostrarDetalleCita(cita) {
        document.getElementById('agenda-detail-panel') && document.getElementById('agenda-detail-panel').remove();
        const st     = this.citaStates[cita.estado || 'pendiente'] || this.citaStates['pendiente'];
        const fecha  = new Date((cita.fecha || '') + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const duracion = cita.duracion || 60;

        const panel = document.createElement('div');
        panel.id = 'agenda-detail-panel';
        panel.style.cssText = 'position:fixed;right:0;top:0;height:100%;width:280px;z-index:40;display:flex;flex-direction:column;background:#0f1e35;border-left:1px solid rgba(43,147,166,0.25);box-shadow:-8px 0 32px rgba(0,0,0,0.45);transform:translateX(100%);transition:transform 0.22s cubic-bezier(0.4,0,0.2,1)';

        const estadoBtns = Object.entries(this.citaStates).map(([k, v]) =>
            '<button class="detail-estado-btn py-1.5 px-2 rounded-lg text-xs font-semibold transition" style="border:1px solid ' + v.border + '66;color:' + (cita.estado === k ? '#fff' : v.text) + ';background:' + (cita.estado === k ? v.bg : 'transparent') + '" data-estado="' + k + '" data-cita-id="' + cita.id + '">' + v.label + '</button>'
        ).join('');

        panel.innerHTML = '<div class="flex items-center justify-between px-4 py-3 flex-shrink-0" style="border-bottom:1px solid rgba(255,255,255,0.08)">'
            + '<div class="flex items-center gap-2 min-w-0">'
            + '<div class="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0" style="background:rgba(43,147,166,0.35)">' + (cita.cliente || '?').charAt(0).toUpperCase() + '</div>'
            + '<div class="min-w-0"><p class="text-sm font-bold text-white truncate">' + (cita.cliente || '---') + '</p><p class="text-xs font-semibold" style="color:' + st.border + '">' + st.label + '</p></div>'
            + '</div>'
            + '<button id="detail-close" class="text-slate-500 hover:text-white p-1 transition flex-shrink-0"><i class="fas fa-times text-sm"></i></button>'
            + '</div>'
            + '<div class="flex-1 overflow-y-auto p-4 space-y-3">'
            + '<div class="grid grid-cols-2 gap-2 text-xs">'
            + '<div class="rounded-lg p-2.5" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold text-xs mb-1">Fecha</p><p class="text-white font-semibold capitalize leading-tight" style="font-size:11px">' + fecha + '</p></div>'
            + '<div class="rounded-lg p-2.5" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold text-xs mb-1">Hora</p><p class="text-white font-black text-base">' + (cita.hora || '---') + '</p></div>'
            + '<div class="rounded-lg p-2.5" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold text-xs mb-1">Duracion</p><p class="text-white font-semibold text-xs">' + duracion + ' min</p></div>'
            + '<div class="rounded-lg p-2.5" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold text-xs mb-1">Importe</p><p class="font-black text-base" style="color:#6EE7B7">€' + parseInt(cita.precio || 0) + '</p></div>'
            + '</div>'
            + '<div class="rounded-lg p-2.5 text-xs" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold mb-1">Servicio</p><p class="text-white font-semibold">' + (cita.servicio || '---') + '</p></div>'
            + (cita.recurso ? '<div class="rounded-lg p-2.5 text-xs" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold mb-1">Empleado</p><p class="text-white font-semibold">' + cita.recurso + '</p></div>' : '')
            + (cita.notas ? '<div class="rounded-lg p-2.5 text-xs" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)"><p class="text-slate-500 uppercase font-bold mb-1">Notas</p><p style="color:#cbd5e1">' + cita.notas + '</p></div>' : '')
            + '<div><p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cambiar estado</p><div class="grid grid-cols-2 gap-1.5">' + estadoBtns + '</div></div>'
            + '</div>'
            + '<div class="p-4 flex-shrink-0 space-y-2" style="border-top:1px solid rgba(255,255,255,0.08)">'
            + (!cita.cobrado
                ? '<button id="detail-cobrar" class="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:brightness-125" style="background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4)" data-cita-id="' + cita.id + '"><i class="fas fa-cash-register"></i> Cobrar cita</button>'
                : '<div class="w-full py-2.5 rounded-xl text-sm font-bold text-center" style="color:#6EE7B7;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)"><i class="fas fa-check-circle mr-2"></i>Cobrada</div>')
            + '<div class="flex gap-2">'
            + '<button id="detail-editar" class="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition hover:brightness-125" style="background:rgba(43,147,166,0.2);border:1px solid rgba(43,147,166,0.35)" data-cita-id="' + cita.id + '"><i class="fas fa-edit mr-1"></i>Editar</button>'
            + '<button id="detail-eliminar" class="flex-1 py-2 rounded-lg text-xs font-semibold transition hover:brightness-125" style="color:#FCA5A5;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3)" data-cita-id="' + cita.id + '"><i class="fas fa-trash mr-1"></i>Eliminar</button>'
            + '</div></div>';

        document.body.appendChild(panel);
        requestAnimationFrame(() => { panel.style.transform = 'translateX(0)'; });

        const cerrar = () => { panel.style.transform = 'translateX(100%)'; setTimeout(() => panel.remove(), 220); };
        panel.querySelector('#detail-close').addEventListener('click', cerrar);

        panel.querySelectorAll('.detail-estado-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navManager.cambiarEstadoCita(btn.dataset.citaId, btn.dataset.estado);
                cerrar(); setTimeout(() => this.refresh(), 300);
            });
        });

        const cobrarBtn = panel.querySelector('#detail-cobrar');
        if (cobrarBtn) cobrarBtn.addEventListener('click', e => {
            cerrar(); setTimeout(() => this.navManager.showCobroModal(e.currentTarget.dataset.citaId), 250);
        });

        panel.querySelector('#detail-editar').addEventListener('click', e => {
            const c = this.navManager.citas.find(x => x.id === e.currentTarget.dataset.citaId);
            cerrar(); if (c) setTimeout(() => this.navManager.showNewCitaModal(Object.assign({}, c)), 250);
        });

        panel.querySelector('#detail-eliminar').addEventListener('click', e => {
            if (confirm('Eliminar esta cita?')) {
                this.navManager.deleteCita(e.currentTarget.dataset.citaId);
                cerrar(); setTimeout(() => this.refresh(), 300);
            }
        });

        document.addEventListener('keydown', function onEsc(ev) {
            if (ev.key === 'Escape') { cerrar(); document.removeEventListener('keydown', onEsc); }
        });
    }

    setupListeners() {
        window.agendaManagerInstance = this;

        document.querySelectorAll('.agenda-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.agendaView = btn.dataset.view;
                document.querySelectorAll('.agenda-view-btn').forEach(b => {
                    const active = b.dataset.view === this.agendaView;
                    b.classList.toggle('bg-[#2B93A6]', active);
                    b.classList.toggle('text-white', active);
                    b.classList.toggle('text-slate-400', !active);
                });
                this._reRenderContent();
            });
        });

        document.getElementById('agenda-prev-btn') && document.getElementById('agenda-prev-btn').addEventListener('click', () => {
            if (this.agendaView === 'week')       this.selectedDate.setDate(this.selectedDate.getDate() - 7);
            else if (this.agendaView === 'month') this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
            else                                   this.selectedDate.setDate(this.selectedDate.getDate() - 1);
            this._updateFechaLabel(); this.refresh();
        });

        document.getElementById('agenda-next-btn') && document.getElementById('agenda-next-btn').addEventListener('click', () => {
            if (this.agendaView === 'week')       this.selectedDate.setDate(this.selectedDate.getDate() + 7);
            else if (this.agendaView === 'month') this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
            else                                   this.selectedDate.setDate(this.selectedDate.getDate() + 1);
            this._updateFechaLabel(); this.refresh();
        });

        document.getElementById('agenda-hoy-btn') && document.getElementById('agenda-hoy-btn').addEventListener('click', () => {
            this.selectedDate = new Date(); this._updateFechaLabel(); this.refresh();
        });

        document.getElementById('agenda-date-input') && document.getElementById('agenda-date-input').addEventListener('change', e => {
            this.selectedDate = new Date(e.target.value + 'T00:00:00'); this._updateFechaLabel(); this.refresh();
        });

        document.getElementById('btn-toggle-sidebar') && document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
            this.sidebarVisible = !this.sidebarVisible;
            const sb = document.getElementById('agenda-sidebar');
            if (sb) sb.classList.toggle('hidden', !this.sidebarVisible);
        });

        document.getElementById('btn-nueva-cita') && document.getElementById('btn-nueva-cita').addEventListener('click', () => {
            this.navManager.showNewCitaModal({ fecha: this._dateStr(this.selectedDate) });
        });

        document.getElementById('btn-bloquear') && document.getElementById('btn-bloquear').addEventListener('click', () => {
            this.mostrarModalBloque({ fecha: this._dateStr(this.selectedDate) });
        });

        this._loadBloquesFirestore();
        this._bindMiniCalListeners();

        document.querySelectorAll('.proxima-cita-item').forEach(item => {
            item.addEventListener('click', () => {
                const cita = this.navManager.citas.find(c => c.id === item.dataset.citaId);
                if (cita) this.mostrarDetalleCita(cita);
            });
        });

        document.getElementById('agenda-search') && document.getElementById('agenda-search').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.agenda-cita-card').forEach(card => {
                const cita = this.navManager.citas.find(c => c.id === card.dataset.citaId);
                card.style.opacity = (!q || (cita && cita.cliente && cita.cliente.toLowerCase().includes(q))) ? '1' : '0.15';
            });
        });

        this.setupClickToAdd();
        this.setupDragDrop();
        this.attachCitaListeners();
        this._startTimeIndicator();
        if (this.agendaView === 'analytics') this._setupStatsListeners();
    }

    _bindMiniCalListeners() {
        const prev = document.getElementById('mini-cal-prev');
        const next = document.getElementById('mini-cal-next');
        if (prev) prev.addEventListener('click', () => {
            this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
            const mc = document.getElementById('calendar-mini');
            if (mc) { mc.innerHTML = this.renderCalendarMini(); this._bindMiniCalListeners(); }
        });
        if (next) next.addEventListener('click', () => {
            this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
            const mc = document.getElementById('calendar-mini');
            if (mc) { mc.innerHTML = this.renderCalendarMini(); this._bindMiniCalListeners(); }
        });
    }

    setupClickToAdd() {
        document.querySelectorAll('[data-recurso][data-tiempo][data-fecha]').forEach(celda => {
            celda.addEventListener('click', e => {
                if (e.target !== celda) return;
                this.navManager.showNewCitaModal({
                    fecha:   celda.dataset.fecha,
                    hora:    celda.dataset.tiempo,
                    recurso: celda.dataset.recurso !== 'auto' ? celda.dataset.recurso : '',
                });
            });
        });
    }

    setupDragDrop() {
        document.querySelectorAll('.agenda-cita-card[draggable="true"]').forEach(card => {
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', card.dataset.citaId);
                e.dataTransfer.effectAllowed = 'move';
                card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', () => { card.style.opacity = ''; });
        });
        document.querySelectorAll('[data-recurso][data-tiempo][data-fecha]').forEach(celda => {
            celda.addEventListener('dragover', e => { e.preventDefault(); celda.style.background = 'rgba(43,147,166,0.2)'; });
            celda.addEventListener('dragleave', () => { celda.style.background = ''; });
            celda.addEventListener('drop', e => {
                e.preventDefault(); celda.style.background = '';
                const id   = e.dataTransfer.getData('text/plain');
                const cita = this.navManager.citas.find(c => c.id === id);
                if (!cita) return;
                cita.hora  = celda.dataset.tiempo;
                cita.fecha = celda.dataset.fecha;
                if (celda.dataset.recurso && celda.dataset.recurso !== 'auto') cita.recurso = celda.dataset.recurso;
                this.navManager.saveCita(cita);
                this.refresh();
            });
        });
    }

    attachCitaListeners() {
        document.querySelectorAll('.quick-estado').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.navManager.cambiarEstadoCita(btn.dataset.citaId, btn.dataset.estado);
                setTimeout(() => this.refresh(), 200);
            });
        });

        document.querySelectorAll('.open-detail').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const cita = this.navManager.citas.find(c => c.id === btn.dataset.citaId);
                if (cita) this.mostrarDetalleCita(cita);
            });
        });

        document.querySelectorAll('.week-cita-chip').forEach(chip => {
            chip.addEventListener('click', e => {
                e.stopPropagation();
                const cita = this.navManager.citas.find(c => c.id === chip.dataset.citaId);
                if (cita) this.mostrarDetalleCita(cita);
            });
        });

        document.querySelectorAll('.agenda-cita-card').forEach(card => {
            card.addEventListener('contextmenu', e => {
                e.preventDefault();
                const cita = this.navManager.citas.find(c => c.id === card.dataset.citaId);
                if (cita) this.mostrarMenuContextual(cita, e.clientX, e.clientY);
            });
        });

        document.querySelectorAll('.delete-bloque').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.bloques = this.bloques.filter(b => b.id !== btn.dataset.bloqueId);
                this._persistBloques();
                this.refresh();
            });
        });
    }

    mostrarMenuContextual(cita, x, y) {
        document.querySelectorAll('.agenda-ctx-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'agenda-ctx-menu fixed z-50 rounded-xl py-1 shadow-2xl overflow-hidden';
        menu.style.cssText = 'top:' + y + 'px;left:' + x + 'px;background:#0f1e35;border:1px solid rgba(43,147,166,0.3);min-width:160px';
        menu.innerHTML = '<button class="ctx-editar w-full text-left px-4 py-2 text-sm hover:bg-[rgba(43,147,166,0.15)] transition flex items-center gap-2 text-slate-200"><i class="fas fa-edit w-4 text-[#38BDF8]"></i>Editar</button>'
            + '<button class="ctx-cobrar w-full text-left px-4 py-2 text-sm hover:bg-[rgba(16,185,129,0.15)] transition flex items-center gap-2 text-slate-200"><i class="fas fa-cash-register w-4 text-emerald-400"></i>Cobrar</button>'
            + '<div style="height:1px;background:rgba(255,255,255,0.06);margin:2px 0"></div>'
            + '<button class="ctx-eliminar w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 transition flex items-center gap-2 text-red-400"><i class="fas fa-trash w-4"></i>Eliminar</button>';
        document.body.appendChild(menu);
        menu.querySelector('.ctx-editar').addEventListener('click', () => { this.navManager.showNewCitaModal(Object.assign({}, cita)); menu.remove(); });
        menu.querySelector('.ctx-cobrar').addEventListener('click', () => { this.navManager.showCobroModal(cita.id); menu.remove(); });
        menu.querySelector('.ctx-eliminar').addEventListener('click', () => {
            if (confirm('Eliminar esta cita?')) { this.navManager.deleteCita(cita.id); this.refresh(); }
            menu.remove();
        });
        setTimeout(() => { document.addEventListener('click', () => menu.remove(), { once: true }); }, 50);
    }

    jumpToDate(dateStr) {
        this.selectedDate = new Date(dateStr + 'T00:00:00');
        this.agendaView   = 'day';
        document.querySelectorAll('.agenda-view-btn').forEach(b => {
            const active = b.dataset.view === 'day';
            b.classList.toggle('bg-[#2B93A6]', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('text-slate-400', !active);
        });
        this._updateFechaLabel();
        this.refresh();
    }

    _buildFechaLabel() {
        if (this.agendaView === 'week') {
            const lunes = new Date(this.selectedDate);
            const dow = lunes.getDay();
            lunes.setDate(lunes.getDate() - (dow === 0 ? 6 : dow - 1));
            const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6);
            return lunes.getDate() + ' - ' + domingo.getDate() + ' ' + domingo.toLocaleDateString('es-ES', { month: 'long' });
        }
        if (this.agendaView === 'month') {
            const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            return MESES[this.selectedDate.getMonth()] + ' ' + this.selectedDate.getFullYear();
        }
        return this.selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    _updateFechaLabel() {
        const label = document.getElementById('agenda-fecha-label');
        if (label) label.textContent = this._buildFechaLabel();
        const input = document.getElementById('agenda-date-input');
        if (input) input.value = this._dateStr(this.selectedDate);
    }

    _reRenderContent() {
        const el = document.getElementById('agenda-content');
        if (!el) return;
        el.innerHTML = this.renderContent();
        if (this.agendaView === 'analytics') {
            this._setupStatsListeners();
        } else {
            this.setupClickToAdd(); this.setupDragDrop(); this.attachCitaListeners(); this._updateFechaLabel();
        }
    }

    _startTimeIndicator() {
        if (this._timeInterval) clearInterval(this._timeInterval);
        this._timeInterval = setInterval(() => {
            const line = document.getElementById('time-indicator-line');
            if (!line) return;
            const ahora = new Date();
            const h = ahora.getHours(), m = ahora.getMinutes();
            if (h < this.horaInicio || h >= this.horaFin) { line.style.display = 'none'; return; }
            const topPx = 40 + (h - this.horaInicio) * this.pxPorHora + (m / 60) * this.pxPorHora;
            line.style.top = topPx + 'px'; line.style.display = '';
            const labelEl = line.querySelector('.absolute.left-1');
            if (labelEl) labelEl.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        }, 60000);
    }

    refresh() {
        this.recursos = this._loadRecursos();
        const content = document.getElementById('agenda-content');
        const miniCal = document.getElementById('calendar-mini');
        if (content) content.innerHTML = this.renderContent();
        if (miniCal)  miniCal.innerHTML = this.renderCalendarMini();
        this.setupClickToAdd(); this.setupDragDrop(); this.attachCitaListeners(); this._bindMiniCalListeners();
    }

    // ── BLOQUES DE TIEMPO ─────────────────────────────────────────
    _renderBloquesDay(fechaStr, headerH, numR) {
        const bloquesHoy = this.bloques.filter(b => b.fecha === fechaStr);
        if (!bloquesHoy.length) return '';
        const colW  = 'calc((100% - 70px) / ' + numR + ')';
        const ICONS = { 'Almuerzo': 'fa-utensils', 'Reunion interna': 'fa-users', 'Administracion': 'fa-folder', 'No molestar': 'fa-ban', 'Formacion': 'fa-book', 'Descanso': 'fa-coffee', 'Otro': 'fa-clock' };
        return bloquesHoy.map(b => {
            const startMin   = this._toMinutes(b.horaInicio);
            const endMin     = this._toMinutes(b.horaFin);
            if (endMin <= startMin) return '';
            const topPx      = headerH + (startMin - this.horaInicio * 60) / 60 * this.pxPorHora;
            const heightPx   = Math.max((endMin - startMin) / 60 * this.pxPorHora, 22);
            const recursoIdx = this.recursos.indexOf(b.recurso);
            const allCols    = !b.recurso || recursoIdx < 0;
            const leftCalc   = allCols ? '70px' : 'calc(70px + ' + recursoIdx + ' * ' + colW + ')';
            const widthCalc  = allCols ? 'calc(100% - 74px)' : 'calc(' + colW + ' - 8px)';
            const icon       = ICONS[b.tipo] || 'fa-clock';
            return '<div class="agenda-bloque-card absolute z-[5] rounded-md select-none group/bloque pointer-events-auto"'
                + ' style="top:' + topPx + 'px;left:' + leftCalc + ';width:' + widthCalc + ';height:' + heightPx + 'px;'
                + 'background:repeating-linear-gradient(45deg,rgba(100,116,139,0.07) 0,rgba(100,116,139,0.07) 3px,rgba(100,116,139,0.03) 3px,rgba(100,116,139,0.03) 9px);'
                + 'border:1px dashed rgba(100,116,139,0.3)" data-bloque-id="' + b.id + '">'
                + '<div class="flex items-center gap-1.5 px-2 h-full overflow-hidden">'
                + '<i class="fas ' + icon + ' flex-shrink-0" style="font-size:10px;color:#64748b"></i>'
                + '<span class="text-xs font-semibold truncate" style="color:#64748b">' + b.tipo + (b.notas ? ' \u2014 ' + b.notas : '') + '</span>'
                + '</div>'
                + '<button class="delete-bloque absolute top-0.5 right-0.5 w-4 h-4 rounded-full hidden group-hover/bloque:flex items-center justify-center transition" style="background:rgba(239,68,68,0.2);color:#f87171;font-size:8px" data-bloque-id="' + b.id + '">'
                + '<i class="fas fa-times pointer-events-none"></i></button>'
                + '</div>';
        }).join('');
    }

    mostrarModalBloque(predatos = {}) {
        document.getElementById('modal-bloque')?.remove();
        const TIPOS = ['Almuerzo', 'Reunion interna', 'Administracion', 'No molestar', 'Formacion', 'Descanso', 'Otro'];
        const modalHtml = '<div id="modal-bloque" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">'
            + '<div class="bg-[#0f1e35] border border-[rgba(43,147,166,0.25)] rounded-xl shadow-2xl w-full max-w-sm">'
            + '<div class="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">'
            + '<div class="flex items-center gap-2"><i class="fas fa-ban text-slate-400 text-sm"></i><h3 class="text-sm font-bold text-white">Bloquear tiempo</h3></div>'
            + '<button id="modal-bloque-close" class="text-slate-400 hover:text-white p-1 transition"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<form id="form-bloque" class="p-4 space-y-3">'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1.5">Tipo de bloque</label>'
            + '<div class="grid grid-cols-3 gap-1.5">'
            + TIPOS.map(t => {
                const sel = t === (predatos.tipo || 'Almuerzo');
                return '<label class="bloque-tipo-label flex items-center justify-center px-2 py-1.5 rounded-lg border cursor-pointer text-xs font-semibold transition text-center '
                    + (sel ? 'border-[#2B93A6] text-[#38BDF8] bg-[rgba(43,147,166,0.12)]' : 'border-[rgba(255,255,255,0.08)] text-slate-400 hover:border-[rgba(43,147,166,0.4)]') + '">'
                    + '<input type="radio" name="bloque-tipo" value="' + t + '" ' + (sel ? 'checked' : '') + ' class="hidden">' + t + '</label>';
            }).join('')
            + '</div></div>'
            + '<div class="grid grid-cols-2 gap-3">'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1">Fecha</label>'
            + '<input type="date" id="bloque-fecha" value="' + (predatos.fecha || this._dateStr(this.selectedDate)) + '" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]"></div>'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1">Empleado</label>'
            + '<select id="bloque-recurso" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]">'
            + '<option value="" class="bg-[#0f1e35]">Todos</option>'
            + this.recursos.map(r => '<option value="' + r + '" class="bg-[#0f1e35]" ' + (predatos.recurso === r ? 'selected' : '') + '>' + r + '</option>').join('')
            + '</select></div></div>'
            + '<div class="grid grid-cols-2 gap-3">'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1">Hora inicio</label>'
            + '<input type="time" id="bloque-inicio" value="' + (predatos.horaInicio || '14:00') + '" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]"></div>'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1">Hora fin</label>'
            + '<input type="time" id="bloque-fin" value="' + (predatos.horaFin || '15:00') + '" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]"></div></div>'
            + '<div><label class="block text-xs font-bold text-slate-300 mb-1">Nota (opcional)</label>'
            + '<input type="text" id="bloque-notas" placeholder="Ej: con todo el equipo" value="' + (predatos.notas || '') + '" class="w-full px-3 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B93A6]"></div>'
            + '<div class="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">'
            + '<button type="button" id="modal-bloque-cancel" class="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-300 btn-secondary">Cancelar</button>'
            + '<button type="submit" class="flex-1 py-2 rounded-lg text-sm font-semibold btn-primary">Bloquear</button>'
            + '</div></form></div></div>';
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.querySelectorAll('.bloque-tipo-label').forEach(lbl => {
            lbl.addEventListener('click', () => {
                document.querySelectorAll('.bloque-tipo-label').forEach(l => {
                    l.classList.remove('border-[#2B93A6]', 'text-[#38BDF8]', 'bg-[rgba(43,147,166,0.12)]');
                    l.classList.add('border-[rgba(255,255,255,0.08)]', 'text-slate-400');
                });
                lbl.classList.add('border-[#2B93A6]', 'text-[#38BDF8]', 'bg-[rgba(43,147,166,0.12)]');
                lbl.classList.remove('border-[rgba(255,255,255,0.08)]', 'text-slate-400');
            });
        });

        const cerrar = () => document.getElementById('modal-bloque')?.remove();
        document.getElementById('modal-bloque-close').addEventListener('click', cerrar);
        document.getElementById('modal-bloque-cancel').addEventListener('click', cerrar);

        document.getElementById('form-bloque').addEventListener('submit', e => {
            e.preventDefault();
            const tipo = document.querySelector('[name="bloque-tipo"]:checked')?.value || 'Otro';
            const nuevo = {
                id:         predatos.id || 'b' + Date.now(),
                tipo,
                fecha:      document.getElementById('bloque-fecha').value,
                horaInicio: document.getElementById('bloque-inicio').value,
                horaFin:    document.getElementById('bloque-fin').value,
                recurso:    document.getElementById('bloque-recurso').value,
                notas:      document.getElementById('bloque-notas').value,
            };
            const idx = this.bloques.findIndex(b => b.id === nuevo.id);
            if (idx > -1) this.bloques[idx] = nuevo; else this.bloques.push(nuevo);
            this._persistBloques();
            cerrar();
            this.refresh();
        });
    }

    _persistBloques() {
        try { localStorage.setItem('nodetech_bloques', JSON.stringify(this.bloques)); } catch {}
        if (window.fs && window.db && window.firebaseUser) {
            window.fs.setDoc(
                window.fs.doc(window.db, 'users', window.firebaseUser.uid, 'config', 'bloques'),
                { bloques: this.bloques }
            ).catch(() => {});
        }
    }

    _loadBloquesFirestore() {
        if (window.fs && window.db && window.firebaseUser) {
            window.fs.getDoc(
                window.fs.doc(window.db, 'users', window.firebaseUser.uid, 'config', 'bloques')
            ).then(snap => {
                if (snap.exists() && snap.data().bloques?.length) {
                    this.bloques = snap.data().bloques;
                    this.refresh();
                }
            }).catch(() => {});
        }
    }

    // ── ANALÍTICAS (modular) ──────────────────────────────────────
    _statsWidgets() {
        return [
            { id: 'kpis',      label: 'Indicadores clave',    icon: 'fa-tachometer-alt', span: 2 },
            { id: 'ocupacion', label: 'Ocupaci\u00f3n semanal', icon: 'fa-signal',         span: 1 },
            { id: 'barras',    label: 'Actividad por d\u00eda', icon: 'fa-chart-bar',      span: 1 },
            { id: 'heatmap',   label: 'Mapa de calor',         icon: 'fa-th',             span: 2 },
            { id: 'servicios', label: 'Top servicios',         icon: 'fa-list-ol',        span: 1 },
            { id: 'clientes',  label: 'Top clientes',          icon: 'fa-users',          span: 1 },
        ];
    }

    _getStatsConfig() {
        const saved = localStorage.getItem('nodetech_stats_config');
        if (saved) { try { return JSON.parse(saved); } catch (_) {} }
        return this._statsWidgets().map(w => ({ id: w.id, visible: true }));
    }

    _saveStatsConfig(config) {
        localStorage.setItem('nodetech_stats_config', JSON.stringify(config));
    }

    _renderStatsWidget(id, d) {
        const span = this._statsWidgets().find(w => w.id === id)?.span === 2 ? 'col-span-2' : 'col-span-1';
        const card = (content) => '<div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-4 ' + span + '">' + content + '</div>';
        const hdr  = (label)   => '<p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">' + label + '</p>';
        switch (id) {
            case 'kpis':
                return '<div class="col-span-2 grid grid-cols-2 gap-2">'
                    + this._kpiCard('fa-calendar-check', 'Total',          d.total + '',                                     '#38BDF8', 'rgba(43,147,166,0.12)')
                    + this._kpiCard('fa-check-circle',   'Completadas',    d.completadas + ' (' + d.tasaComp + '%)',         '#4ADE80', 'rgba(34,197,94,0.10)')
                    + this._kpiCard('fa-user-slash',     'No presentados', d.noPresentados + ' (' + d.tasaNP + '%)',        '#F87171', 'rgba(239,68,68,0.08)')
                    + this._kpiCard('fa-euro-sign',      'Cobrado/Estim.', '\u20ac' + d.cobrado + ' / \u20ac' + d.estimado, '#6EE7B7', 'rgba(16,185,129,0.10)')
                    + '</div>';
            case 'ocupacion':
                return card(
                    hdr('Ocupaci\u00f3n esta semana')
                    + '<div class="flex items-center gap-3 mb-1">'
                    + '<div class="text-3xl font-black" style="color:#38BDF8">' + d.ocupacion + '<span class="text-base">%</span></div>'
                    + '<div class="flex-1 h-2.5 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.06)">'
                    + '<div class="h-full rounded-full" style="width:' + d.ocupacion + '%;background:linear-gradient(90deg,#2B93A6,#38BDF8)"></div>'
                    + '</div></div>'
                    + '<p class="text-xs text-slate-500">' + d.citasSemana + ' citas esta semana</p>'
                );
            case 'barras':
                return card(
                    hdr('Actividad por d\u00eda')
                    + '<div class="flex gap-1 items-end" style="height:60px">'
                    + d.DIAS_HEAT.map((day, i) => {
                        const n = d.heatmap[i].reduce((s, v) => s + v, 0);
                        const maxDia = Math.max(1, ...d.DIAS_HEAT.map((_, j) => d.heatmap[j].reduce((s, v) => s + v, 0)));
                        const pct = n / maxDia;
                        return '<div class="flex flex-col items-center gap-0.5 flex-1">'
                            + '<div class="w-full rounded-sm" style="height:' + Math.max(3, Math.round(pct * 52)) + 'px;background:rgba(43,147,166,' + (0.2 + pct * 0.8).toFixed(2) + ')"></div>'
                            + '<span style="font-size:9px;color:#475569">' + day + '</span></div>';
                    }).join('')
                    + '</div>'
                );
            case 'heatmap':
                return card(
                    hdr('Mapa de calor \u2014 hora \u00d7 d\u00eda')
                    + '<div style="overflow-x:auto"><div style="min-width:280px">'
                    + '<div class="grid mb-1.5" style="grid-template-columns:28px repeat(' + d.HORAS_HEAT.length + ',1fr);gap:2px"><div></div>'
                    + d.HORAS_HEAT.map(h => '<div class="text-center" style="font-size:9px;color:#475569">' + h + 'h</div>').join('') + '</div>'
                    + d.DIAS_HEAT.map((day, i) =>
                        '<div class="grid mb-0.5" style="grid-template-columns:28px repeat(' + d.HORAS_HEAT.length + ',1fr);gap:2px">'
                        + '<div class="flex items-center" style="font-size:9px;color:#475569">' + day + '</div>'
                        + d.heatmap[i].map(v => {
                            const intensity = v / d.maxHeat;
                            const bg = v === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(43,147,166,' + (0.15 + intensity * 0.85).toFixed(2) + ')';
                            return '<div class="rounded-sm" title="' + v + ' citas" style="height:16px;background:' + bg + '"></div>';
                        }).join('') + '</div>'
                    ).join('')
                    + '</div></div>'
                );
            case 'servicios':
                return card(
                    hdr('Top servicios')
                    + (d.topServicios.length
                        ? d.topServicios.map(([s, n]) =>
                            '<div class="mb-2"><div class="flex justify-between mb-0.5">'
                            + '<span class="text-xs font-semibold text-white truncate">' + s + '</span>'
                            + '<span class="text-xs text-slate-500 ml-1 flex-shrink-0">' + n + '</span></div>'
                            + '<div class="h-1.5 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.06)">'
                            + '<div class="h-full rounded-full" style="width:' + Math.round(n / d.maxServ * 100) + '%;background:linear-gradient(90deg,#2B93A6,#38BDF8)"></div></div></div>'
                        ).join('')
                        : '<p class="text-xs text-slate-600 text-center py-3">Sin datos</p>')
                );
            case 'clientes':
                return card(
                    hdr('Top clientes')
                    + (d.topClientes.length
                        ? d.topClientes.map(([c, n], idx) => {
                            const colors = ['#38BDF8', '#4ADE80', '#A78BFA', '#FCD34D', '#FB923C'];
                            return '<div class="flex items-center gap-2 py-1.5 border-b border-[rgba(255,255,255,0.05)] last:border-0">'
                                + '<span class="text-xs font-black w-4 text-center" style="color:' + colors[idx] + '">' + (idx + 1) + '</span>'
                                + '<span class="text-xs text-white font-semibold flex-1 truncate">' + c + '</span>'
                                + '<span class="text-xs font-bold" style="color:' + colors[idx] + '">' + n + '</span></div>';
                        }).join('')
                        : '<p class="text-xs text-slate-600 text-center py-3">Sin datos</p>')
                );
            default: return '';
        }
    }

    _setupStatsListeners() {
        document.getElementById('btn-stats-config')?.addEventListener('click', () => {
            this._statsConfigOpen = !this._statsConfigOpen;
            this._reRenderContent();
        });
        document.querySelectorAll('.stats-widget-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const widgetId   = btn.dataset.widgetId;
                const allWidgets = this._statsWidgets();
                const saved      = this._getStatsConfig();
                const config     = allWidgets.map(w => {
                    const s = saved.find(c => c.id === w.id);
                    return { id: w.id, visible: s ? s.visible : true };
                });
                const entry = config.find(c => c.id === widgetId);
                if (!entry) return;
                if (entry.visible && config.filter(w => w.visible).length <= 1) return;
                entry.visible = !entry.visible;
                this._saveStatsConfig(config);
                this._statsConfigOpen = true;
                this._reRenderContent();
            });
        });
    }

    renderAnalytics() {
        const citas   = this.navManager.citas;
        const hoy     = new Date();
        const hace30  = new Date(); hace30.setDate(hace30.getDate() - 30);
        const recientes = citas.filter(c => {
            if (!c.fecha) return false;
            const d = new Date(c.fecha + 'T00:00:00');
            return d >= hace30 && d <= hoy;
        });
        const total         = recientes.length;
        const completadas   = recientes.filter(c => c.estado === 'completado').length;
        const noPresentados = recientes.filter(c => c.estado === 'no-presentado').length;
        const cobrado       = recientes.filter(c => c.cobrado).reduce((s, c) => s + parseInt(c.precio || 0), 0);
        const estimado      = recientes.reduce((s, c) => s + parseInt(c.precio || 0), 0);
        const tasaNP        = total > 0 ? Math.round(noPresentados / total * 100) : 0;
        const tasaComp      = total > 0 ? Math.round(completadas / total * 100) : 0;

        const servicioMap = {};
        recientes.forEach(c => { if (c.servicio) servicioMap[c.servicio] = (servicioMap[c.servicio] || 0) + 1; });
        const topServicios = Object.entries(servicioMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxServ = topServicios[0]?.[1] || 1;

        const clienteMap = {};
        recientes.forEach(c => { if (c.cliente) clienteMap[c.cliente] = (clienteMap[c.cliente] || 0) + 1; });
        const topClientes = Object.entries(clienteMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const HORAS_HEAT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const DIAS_HEAT  = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
        const heatmap    = Array.from({ length: 7 }, () => Array(HORAS_HEAT.length).fill(0));
        recientes.forEach(c => {
            if (!c.fecha || !c.hora) return;
            const d   = new Date(c.fecha + 'T00:00:00');
            const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
            const h   = parseInt((c.hora || '0').split(':')[0]);
            const hi  = HORAS_HEAT.indexOf(h);
            if (hi >= 0) heatmap[dow][hi]++;
        });
        const maxHeat = Math.max(1, ...heatmap.flat());

        const lunes = new Date(hoy);
        lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
        const finSemana = new Date(lunes); finSemana.setDate(finSemana.getDate() + 6);
        const citasSemana = citas.filter(c => {
            if (!c.fecha) return false;
            const d = new Date(c.fecha + 'T00:00:00');
            return d >= lunes && d <= finSemana;
        }).length;
        const ocupacion = Math.min(100, Math.round(citasSemana / Math.max(1, 5 * (this.horaFin - this.horaInicio)) * 100));

        const wd = { total, completadas, noPresentados, cobrado, estimado, tasaNP, tasaComp,
                     topServicios, maxServ, topClientes, heatmap, maxHeat, HORAS_HEAT, DIAS_HEAT, citasSemana, ocupacion };

        const allWidgets   = this._statsWidgets();
        const savedConfig  = this._getStatsConfig();
        const mergedConfig = allWidgets.map(w => {
            const saved = savedConfig.find(c => c.id === w.id);
            return { id: w.id, visible: saved ? saved.visible : true };
        });
        const configOpen    = this._statsConfigOpen || false;
        const activeClass   = 'border-[#2B93A6] text-[#38BDF8] bg-[rgba(43,147,166,0.12)]';
        const inactiveClass = 'border-[rgba(255,255,255,0.08)] text-slate-500 hover:text-slate-300';
        const btnClass      = configOpen ? activeClass : 'border-[rgba(255,255,255,0.1)] text-slate-400 hover:text-white';

        return '<div class="p-4 flex flex-col gap-4 h-full overflow-y-auto">'
            + '<div class="flex items-center justify-between flex-wrap gap-2">'
            + '<div class="flex items-center gap-2">'
            + '<span class="text-xs text-slate-400">\u00daltimos 30 d\u00edas</span>'
            + '<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(43,147,166,0.15);color:#38BDF8">' + total + ' citas</span>'
            + '</div>'
            + '<button id="btn-stats-config" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ' + btnClass + '">'
            + '<i class="fas fa-sliders-h"></i> Personalizar</button>'
            + '</div>'
            + '<div id="stats-config-panel" class="' + (configOpen ? '' : 'hidden') + ' glass border border-[rgba(43,147,166,0.25)] rounded-xl p-3">'
            + '<p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Herramientas activas \u2014 clic para activar / desactivar</p>'
            + '<div class="flex flex-wrap gap-2">'
            + allWidgets.map(w => {
                const isVis = mergedConfig.find(c => c.id === w.id)?.visible !== false;
                return '<button class="stats-widget-toggle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border '
                    + (isVis ? activeClass : inactiveClass)
                    + '" data-widget-id="' + w.id + '">'
                    + '<i class="fas ' + w.icon + '"></i> ' + w.label + '</button>';
            }).join('')
            + '</div></div>'
            + '<div class="grid grid-cols-2 gap-3">'
            + mergedConfig.filter(w => w.visible).map(w => this._renderStatsWidget(w.id, wd)).join('')
            + '</div>'
            + '</div>';
    }

    _kpiCard(icon, label, value, color, bg) {
        return '<div class="rounded-xl p-3 flex items-center gap-2.5" style="background:' + bg + ';border:1px solid ' + color + '20">'
            + '<i class="fas ' + icon + '" style="color:' + color + ';font-size:18px;flex-shrink:0"></i>'
            + '<div><p class="text-xs font-bold uppercase leading-tight" style="color:' + color + '66">' + label + '</p>'
            + '<p class="text-sm font-black" style="color:' + color + '">' + value + '</p></div></div>';
    }

    destroy() {
        if (this._timeInterval) { clearInterval(this._timeInterval); this._timeInterval = null; }
        const panel = document.getElementById('agenda-detail-panel');
        if (panel) panel.remove();
    }
}
