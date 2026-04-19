import { db } from "../modules/firebase-config.js";
import { collection, getDocs, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function renderAgenda() {
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Agenda</h1>
                    <p class="text-slate-500 mt-1">Gestiona tus citas y eventos</p>
                </div>
                <button class="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition">
                    + Nueva cita
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Resumen -->
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Citas Hoy</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="citas-hoy">0</p>
                    <p class="text-blue-600 text-sm mt-2">Próximas 24h</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Esta Semana</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="citas-semana">0</p>
                    <p class="text-blue-600 text-sm mt-2">Total de citas</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Ingresos Pendientes</p>
                    <p class="text-3xl font-bold text-green-600 mt-2" id="ingresos-citas">0€</p>
                    <p class="text-green-600 text-sm mt-2">Por servicios</p>
                </div>
            </div>

            <!-- Lista de citas -->
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200">
                    <h2 class="font-bold text-slate-900">Próximas Citas</h2>
                </div>
                <div class="divide-y divide-slate-200" id="citas-lista">
                    <div class="px-6 py-8 text-center text-slate-500">
                        Cargando citas...
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function initAgenda() {
    const citasLista = document.getElementById('citas-lista');
    const citasHoy = document.getElementById('citas-hoy');
    const citasSemana = document.getElementById('citas-semana');
    const ingresosCitas = document.getElementById('ingresos-citas');

    onSnapshot(query(collection(db, "citas"), orderBy("timestamp", "asc")), (snapshot) => {
        citasLista.innerHTML = '';
        let totalHoy = 0;
        let totalSemana = 0;
        let totalIngresos = 0;

        if (snapshot.empty) {
            citasLista.innerHTML = `
                <div class="px-6 py-8 text-center text-slate-500">
                    No hay citas. <a href="#" class="text-blue-600 font-semibold">Crear una</a>
                </div>
            `;
            citasHoy.textContent = '0';
            citasSemana.textContent = '0';
            ingresosCitas.textContent = '0€';
            return;
        }

        const hoy = new Date();
        const finSemana = new Date();
        finSemana.setDate(finSemana.getDate() + 7);

        snapshot.forEach((doc) => {
            const data = doc.data();
            const monto = parseFloat(data.monto || 0);
            totalIngresos += monto;

            const fecha = data.timestamp?.toDate?.() || new Date();
            const esHoy = fecha.toDateString() === hoy.toDateString();
            const esEstaSemana = fecha < finSemana;

            if (esHoy) totalHoy++;
            if (esEstaSemana) totalSemana++;

            const fechaFormato = fecha.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
            const horaFormato = data.hora || '10:00';
            const colorBorde = ['border-blue-600', 'border-green-600', 'border-purple-600', 'border-orange-600'][Math.floor(Math.random() * 4)];

            citasLista.innerHTML += `
                <div class="border-l-4 ${colorBorde} px-6 py-4 hover:bg-slate-50 transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-bold text-slate-900">${horaFormato}</p>
                            <p class="text-sm text-slate-600">${escapeHtml(data.cliente)}</p>
                            <p class="text-xs text-slate-500">${fechaFormato}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-slate-900">${escapeHtml(data.servicio || 'Servicio')}</p>
                            <p class="text-sm text-slate-500">${monto}€</p>
                        </div>
                    </div>
                </div>
            `;
        });

        citasHoy.textContent = totalHoy;
        citasSemana.textContent = totalSemana;
        ingresosCitas.textContent = totalIngresos + '€';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
