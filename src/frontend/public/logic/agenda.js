// calendar.js - Funcionalidad del calendario CRM
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.appointments = JSON.parse(localStorage.getItem('crm-appointments')) || [];
        this.editingAppointment = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.renderCalendar();
    }

    setupEventListeners() {
        // Formulario de citas
        const appointmentForm = document.getElementById('appointment-form');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleAppointmentSubmit();
            });
        }

        // Botones de navegación del calendario
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        const addAppointmentBtn = document.getElementById('add-appointment');
        const cancelEditBtn = document.getElementById('cancel-edit');
        const exportExcelBtn = document.getElementById('export-excel');

        if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        if (addAppointmentBtn) addAppointmentBtn.addEventListener('click', () => this.showAppointmentForm());
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => this.cancelEdit());
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportToExcel());
    }

    saveAppointments() {
        localStorage.setItem('crm-appointments', JSON.stringify(this.appointments));
        this.updateStats();
        this.renderCalendar();
        if (this.selectedDate) {
            this.showAppointmentsForDate(this.selectedDate);
        }
    }

    updateStats() {
        const total = this.appointments.length;
        const today = new Date().toDateString();
        const todayCount = this.appointments.filter(app => new Date(app.date).toDateString() === today).length;
        const upcoming = this.appointments.filter(app => new Date(app.date) > new Date()).length;
        
        const totalEl = document.getElementById('total-appointments');
        const todayEl = document.getElementById('today-appointments');
        const upcomingEl = document.getElementById('upcoming-appointments');
        
        if (totalEl) totalEl.textContent = total;
        if (todayEl) todayEl.textContent = todayCount;
        if (upcomingEl) upcomingEl.textContent = upcoming;
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday

        const calendarDays = document.getElementById('calendar-days');
        const currentMonthEl = document.getElementById('current-month');
        
        if (!calendarDays) return;
        
        calendarDays.innerHTML = '';

        if (currentMonthEl) {
            currentMonthEl.innerHTML = `<i class="fas fa-calendar-alt"></i> ${firstDay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
        }

        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const dayElement = document.createElement('span');
            dayElement.className = 'rounded-3xl bg-white px-2 py-3 cursor-pointer transition hover:bg-slate-100';
            dayElement.textContent = day.getDate();

            if (day.getMonth() !== month) {
                dayElement.classList.add('text-slate-400');
            }

            const dayAppointments = this.appointments.filter(app => new Date(app.date).toDateString() === day.toDateString());
            if (dayAppointments.length > 0) {
                dayElement.classList.add('day-with-appointments');
            }

            if (this.selectedDate && day.toDateString() === this.selectedDate.toDateString()) {
                dayElement.classList.add('selected-day');
            }

            dayElement.addEventListener('click', () => {
                this.selectedDate = day;
                this.renderCalendar();
                this.showAppointmentsForDate(day);
            });

            calendarDays.appendChild(dayElement);
        }
    }

    showAppointmentsForDate(date) {
        const dateStr = date.toLocaleDateString('es-ES', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        const titleEl = document.getElementById('selected-date-title');
        const listEl = document.getElementById('appointments-list');

        if (titleEl) titleEl.textContent = dateStr;
        if (!listEl) return;

        const dayAppointments = this.appointments.filter(app => 
            new Date(app.date).toDateString() === date.toDateString()
        );

        if (dayAppointments.length === 0) {
            listEl.innerHTML = '<p class="text-slate-500">No hay citas para este día.</p>';
            return;
        }

        listEl.innerHTML = '';
        dayAppointments.forEach(app => {
            const item = document.createElement('div');
            item.className = 'rounded-[1.75rem] bg-slate-50 p-4';
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-slate-950">${app.client}</p>
                        <p class="text-sm text-slate-600">${app.time} • ${app.description}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="edit-btn rounded-full bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600" data-id="${app.id}">Editar</button>
                        <button class="delete-btn rounded-full bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600" data-id="${app.id}">Eliminar</button>
                    </div>
                </div>
            `;
            listEl.appendChild(item);
        });

        // Add event listeners for edit and delete
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editAppointment(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteAppointment(e.target.dataset.id));
        });
    }

    handleAppointmentSubmit() {
        const id = document.getElementById('appointment-id').value || Date.now().toString();
        const client = document.getElementById('client-name').value.trim();
        const date = document.getElementById('appointment-date').value;
        const time = document.getElementById('appointment-time').value;
        const description = document.getElementById('appointment-description').value.trim();

        if (!client || !date || !time) {
            alert('Por favor completa todos los campos obligatorios.');
            return;
        }

        if (this.editingAppointment) {
            this.editingAppointment.client = client;
            this.editingAppointment.date = date;
            this.editingAppointment.time = time;
            this.editingAppointment.description = description;
        } else {
            this.appointments.push({ id, client, date, time, description });
        }

        this.editingAppointment = null;
        document.getElementById('appointment-form').reset();
        this.saveAppointments();
    }

    editAppointment(id) {
        const app = this.appointments.find(a => a.id == id);
        if (app) {
            this.editingAppointment = app;
            document.getElementById('appointment-id').value = app.id;
            document.getElementById('client-name').value = app.client;
            document.getElementById('appointment-date').value = app.date;
            document.getElementById('appointment-time').value = app.time;
            document.getElementById('appointment-description').value = app.description;
        }
    }

    deleteAppointment(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
            this.appointments = this.appointments.filter(a => a.id != id);
            this.saveAppointments();
        }
    }

    showAppointmentForm() {
        this.editingAppointment = null;
        document.getElementById('appointment-form').reset();
        if (this.selectedDate) {
            document.getElementById('appointment-date').value = this.selectedDate.toISOString().split('T')[0];
        }
    }

    cancelEdit() {
        this.editingAppointment = null;
        document.getElementById('appointment-form').reset();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    exportToExcel() {
        // Esta función requiere la librería XLSX
        if (typeof XLSX === 'undefined') {
            alert('La funcionalidad de exportación requiere la librería XLSX.');
            return;
        }

        const data = this.appointments.map(app => ({
            ID: app.id,
            Cliente: app.client,
            Fecha: app.date,
            Hora: app.time,
            Descripción: app.description
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Citas');
        XLSX.writeFile(wb, 'citas_crm.xlsx');
    }
}

// Inicializar calendario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si estamos en la página del calendario
    if (document.getElementById('calendar-days')) {
        window.calendarManager = new CalendarManager();
    }
});
