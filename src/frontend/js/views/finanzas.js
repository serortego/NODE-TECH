// Vista: Finanzas
import { db } from "../modules/firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function renderFinanzas() {
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Finanzas</h1>
                    <p class="text-slate-500 mt-1">Gestiona facturas e ingresos</p>
                </div>
                <button class="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition">
                    + Nueva factura
                </button>
            </div>

            <!-- Resumen -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Total Ingresos</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="total-ingresos">0€</p>
                    <p class="text-green-600 text-sm mt-2">Todas las facturas</p>
                </div>

                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Este Mes</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2">1,240€</p>
                    <p class="text-green-600 text-sm mt-2">+8% vs mes anterior</p>
                </div>

                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Pendiente Cobro</p>
                    <p class="text-3xl font-bold text-orange-600 mt-2">320€</p>
                    <p class="text-orange-600 text-sm mt-2">2 facturas</p>
                </div>

                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Saldo Medio/Día</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2">41€</p>
                    <p class="text-blue-600 text-sm mt-2">Este mes</p>
                </div>
            </div>

            <!-- Controles -->
            <div class="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <input type="month" class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                <select class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option>Todas las facturas</option>
                    <option>Pagadas</option>
                    <option>Pendientes</option>
                    <option>Canceladas</option>
                </select>
                <input type="text" placeholder="Buscar por cliente..." class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
            </div>

            <!-- Tabla de Facturas -->
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table class="w-full">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">#ID</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Cliente</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Monto</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Estado</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Fecha</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="facturas-tabla">
                        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td colspan="6" class="px-6 py-8 text-center text-slate-500">Cargando facturas...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function initFinanzas() {
    const tablaBod = document.getElementById('facturas-tabla');
    const totalIngresos = document.getElementById('total-ingresos');

    onSnapshot(query(collection(db, "facturas"), orderBy("timestamp", "desc")), (snapshot) => {
        tablaBod.innerHTML = '';
        let total = 0;

        if (snapshot.empty) {
            tablaBod.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-slate-500">
                        No hay facturas. <a href="#" class="text-blue-600 font-semibold">Crear una</a>
                    </td>
                </tr>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const monto = parseFloat(data.monto || 0);
            total += monto;

            const fecha = data.timestamp?.toDate?.()?.toLocaleDateString('es-ES') || 'Hoy';

            tablaBod.innerHTML += `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td class="px-6 py-4 text-sm font-semibold text-slate-900">#${doc.id.slice(-6)}</td>
                    <td class="px-6 py-4 text-sm text-slate-600">${escapeHtml(data.cliente)}</td>
                    <td class="px-6 py-4 text-sm font-bold text-slate-900">${monto}€</td>
                    <td class="px-6 py-4 text-sm">
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">PAGADO</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">${fecha}</td>
                    <td class="px-6 py-4 text-sm">
                        <button class="text-blue-600 hover:text-blue-700 font-semibold">Descargar</button>
                    </td>
                </tr>
            `;
        });

        totalIngresos.textContent = `${total}€`;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
