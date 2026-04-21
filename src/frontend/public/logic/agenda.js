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
