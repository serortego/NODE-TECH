// Vista: Inicio (Dashboard)
import { db } from "../modules/firebase-config.js";
import { collection, getDocs, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function renderInicio() {
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Resumen General 📊</h1>
                    <p class="text-slate-500 mt-1">Estado de tu negocio</p>
                </div>
                <button class="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition">
                    + Nueva cita
                </button>
            </div>

            <!-- Tarjetas de Resumen -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Ingresos -->
                <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition">
                    <p class="text-slate-600 text-sm font-medium">Ingresos Totales</p>
                    <p class="text-4xl font-bold text-slate-900 mt-2" id="total-ingresos">0 €</p>
                    <p class="text-green-600 text-sm mt-2">Todas las facturas</p>
                </div>
                
                <!-- Citas -->
                <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition">
                    <p class="text-slate-600 text-sm font-medium">Total Citas</p>
                    <p class="text-4xl font-bold text-slate-900 mt-2" id="total-citas">0</p>
                    <p class="text-orange-600 text-sm mt-2">Agendadas</p>
                </div>

                <!-- Clientes -->
                <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition">
                    <p class="text-slate-600 text-sm font-medium">Total Clientes</p>
                    <p class="text-4xl font-bold text-slate-900 mt-2" id="total-clientes">0</p>
                    <p class="text-blue-600 text-sm mt-2">En tu base de datos</p>
                </div>
            </div>

            <!-- Contenedor Principal -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Últimas Facturas -->
                <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-slate-900">Últimas Facturas</h2>
                        <a href="#finanzas" class="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver todas</a>
                    </div>
                    
                    <div class="space-y-3" id="facturas-lista">
                        <div class="text-center py-4 text-slate-500">Cargando facturas...</div>
                    </div>
                </div>

                <!-- Últimas Citas -->
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">Próximas Citas</h2>
                    
                    <div class="space-y-4" id="citas-lista">
                        <div class="text-center py-4 text-slate-500 text-sm">Cargando citas...</div>
                    </div>
                </div>
            </div>

            <!-- Empleados -->
            <div class="bg-white rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-lg font-bold text-slate-900">Equipo</h2>
                    <a href="#empleados" class="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver todos</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="empleados-lista">
                    <div class="text-center py-4 text-slate-500 col-span-full">Cargando empleados...</div>
                </div>
            </div>
        </div>
    `;
}

export function initInicio() {
    const totalIngresos = document.getElementById('total-ingresos');
    const totalCitas = document.getElementById('total-citas');
    const totalClientes = document.getElementById('total-clientes');
    const facturasList = document.getElementById('facturas-lista');
    const citasList = document.getElementById('citas-lista');
    const empleadosList = document.getElementById('empleados-lista');

    // Cargar facturas
    onSnapshot(query(collection(db, "facturas"), orderBy("timestamp", "desc")), (snapshot) => {
        let total = 0;
        facturasList.innerHTML = '';

        if (snapshot.empty) {
            facturasList.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">No hay facturas. <a href="#finanzas" class="text-blue-600">Ver Finanzas</a></div>';
            totalIngresos.textContent = '0 €';
            return;
        }

        snapshot.docs.slice(0, 3).forEach((doc) => {
            const data = doc.data();
            const monto = parseFloat(data.monto || 0);
            total += monto;

            facturasList.innerHTML += `
                <div class="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                        <p class="font-semibold text-slate-900 text-sm">${escapeHtml(data.cliente)}</p>
                        <p class="text-xs text-slate-500">#${doc.id.slice(-5)}</p>
                    </div>
                    <p class="text-slate-900 font-bold">${monto}€</p>
                </div>
            `;
        });

        totalIngresos.textContent = total + ' €';
    });

    // Cargar citas
    onSnapshot(query(collection(db, "citas"), orderBy("timestamp", "asc")), (snapshot) => {
        citasList.innerHTML = '';

        if (snapshot.empty) {
            citasList.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">No hay citas. <a href="#agenda" class="text-blue-600">Crear una</a></div>';
            totalCitas.textContent = '0';
            return;
        }

        totalCitas.textContent = snapshot.size;

        snapshot.docs.slice(0, 4).forEach((doc) => {
            const data = doc.data();
            citasList.innerHTML += `
                <div class="flex items-center justify-between text-sm py-2 border-b border-slate-100">
                    <div>
                        <p class="font-semibold text-slate-900">${data.hora}</p>
                        <p class="text-xs text-slate-500">${escapeHtml(data.cliente)}</p>
                    </div>
                    <p class="text-slate-600">${escapeHtml(data.servicio)}</p>
                </div>
            `;
        });
    });

    // Cargar clientes
    onSnapshot(query(collection(db, "clientes"), orderBy("timestamp", "desc")), (snapshot) => {
        totalClientes.textContent = snapshot.size;
    });

    // Cargar empleados
    onSnapshot(query(collection(db, "empleados"), orderBy("timestamp", "desc")), (snapshot) => {
        empleadosList.innerHTML = '';

        if (snapshot.empty) {
            empleadosList.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm col-span-full">No hay empleados. <a href="#empleados" class="text-blue-600">Añadir uno</a></div>';
            return;
        }

        snapshot.docs.slice(0, 4).forEach((doc) => {
            const data = doc.data();
            empleadosList.innerHTML += `
                <div class="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre || 'E')}&background=3b82f6&color=fff" alt="${data.nombre}" class="w-10 h-10 rounded-full">
                    <div class="text-center">
                        <p class="font-semibold text-slate-900 text-xs">${escapeHtml(data.nombre)}</p>
                        <p class="text-xs text-slate-500">${escapeHtml(data.puesto || 'Empleado')}</p>
                    </div>
                </div>
            `;
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
