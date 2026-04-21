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
    exportBtn: document.getElementById('export-excel')
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

    const appDates = new Set(state.appointments.map(a => a.fecha));

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
      const hasAppointments = appDates.has(iso);

      const classes = [
        'h-12 rounded-xl flex items-center justify-center cursor-pointer transition border text-sm font-semibold',
        isSelected ? 'selected-day border-blue-600' : 'bg-white border-slate-200 hover:bg-slate-50',
        !isSelected && hasAppointments ? 'day-with-appointments' : ''
      ].join(' ');

      html += '<button type="button" class="' + classes + '" data-date="' + iso + '">' + dayNum + '</button>';
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

  function renderDayList() {
    const d = new Date(state.selectedDate + 'T00:00:00');
    el.selectedDateTitle.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const items = getSelectedDayAppointments();
    if (!items.length) {
      el.appointmentsList.innerHTML = '<p class="text-slate-500">No hay citas para este día.</p>';
      return;
    }

    el.appointmentsList.innerHTML = items.map(a => {
      const label = a.descripcion || a.servicio || 'Cita';
      return [
        '<article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">',
        '  <div class="flex items-start justify-between gap-3">',
        '    <div>',
        '      <p class="font-semibold text-slate-900">' + escapeHtml(a.cliente || 'Cliente') + '</p>',
        '      <p class="text-sm text-slate-600 mt-1">' + escapeHtml(label) + '</p>',
        '      <p class="text-sm text-slate-500 mt-1">' + escapeHtml(a.hora || '--:--') + '</p>',
        '    </div>',
        '    <div class="flex gap-2">',
        '      <button type="button" data-action="edit" data-id="' + a.id + '" class="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white">Editar</button>',
        '      <button type="button" data-action="delete" data-id="' + a.id + '" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button>',
        '    </div>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function resetForm() {
    el.id.value = '';
    el.client.value = '';
    el.date.value = state.selectedDate;
    el.time.value = '';
    el.description.value = '';
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
    const a = state.appointments.find(item => item.id === id);
    if (!a) return;
    el.id.value = a.id;
    el.client.value = a.cliente || '';
    el.date.value = a.fecha || state.selectedDate;
    el.time.value = a.hora || '';
    el.description.value = a.descripcion || a.servicio || '';
    state.selectedDate = a.fecha || state.selectedDate;
    renderMonth();
    renderDayList();
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('No se pudo cargar la librería de exportación.');
      return;
    }

    const rows = state.appointments.map(a => ({
      ID: a.id,
      Cliente: a.cliente || '',
      Fecha: a.fecha || '',
      Hora: a.hora || '',
      Descripcion: a.descripcion || a.servicio || ''
    }));

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

      const id = el.id.value || String(Date.now());
      upsertAppointment({
        id,
        cliente,
        fecha,
        hora,
        descripcion,
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

    el.appointmentsList.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;
      const id = actionBtn.getAttribute('data-id');
      const action = actionBtn.getAttribute('data-action');
      if (action === 'edit') editAppointment(id);
      if (action === 'delete' && confirm('¿Eliminar cita?')) removeAppointment(id);
    });

    el.exportBtn.addEventListener('click', exportExcel);

    refresh();
  });
})();
