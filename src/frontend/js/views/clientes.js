// Vista: Clientes
import { db } from "../modules/firebase-config.js";
import { collection, getDocs, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function renderClientes() {
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Clientes</h1>
                    <p class="text-slate-500 mt-1">Gestiona tus contactos y relaciones comerciales</p>
                </div>
                <button class="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition">
                    + Nuevo cliente
                </button>
            </div>

            <!-- Resumen -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Total Clientes</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="total-clientes">0</p>
                    <p class="text-blue-600 text-sm mt-2">Activos y potenciales</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Clientes Activos</p>
                    <p class="text-3xl font-bold text-green-600 mt-2" id="clientes-activos">0</p>
                    <p class="text-green-600 text-sm mt-2">Con actividad</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Ingresos por Cliente</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="promedio-cliente">0€</p>
                    <p class="text-blue-600 text-sm mt-2">Promedio</p>
                </div>
            </div>

            <!-- Tabla de clientes -->
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200">
                    <input type="text" placeholder="Buscar cliente..." class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                </div>
                <table class="w-full">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Nombre</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Teléfono</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Total Gastado</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Estado</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-slate-900">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="clientes-tabla">
                        <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td colspan="6" class="px-6 py-8 text-center text-slate-500">Cargando clientes...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function initClientes() {
    const tablaBod = document.getElementById('clientes-tabla');
    const totalClientes = document.getElementById('total-clientes');
    const clientesActivos = document.getElementById('clientes-activos');
    const promedioCliente = document.getElementById('promedio-cliente');

    onSnapshot(query(collection(db, "clientes"), orderBy("timestamp", "desc")), (snapshot) => {
        tablaBod.innerHTML = '';
        let total = 0;
        let activos = 0;
        let totalGasto = 0;

        if (snapshot.empty) {
            tablaBod.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-slate-500">
                        No hay clientes. <a href="#" class="text-blue-600 font-semibold">Crear uno</a>
                    </td>
                </tr>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const gasto = parseFloat(data.gasto || 0);
            totalGasto += gasto;
            total++;

            if (data.estado === 'Activo' || data.estado === 'Preferente') {
                activos++;
            }

            const colorEstado = data.estado === 'Activo' ? 'green' : data.estado === 'Preferente' ? 'blue' : 'gray';

            tablaBod.innerHTML += `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td class="px-6 py-4 text-sm font-semibold text-slate-900">${escapeHtml(data.nombre)}</td>
                    <td class="px-6 py-4 text-sm text-slate-600">${escapeHtml(data.email || 'N/A')}</td>
                    <td class="px-6 py-4 text-sm text-slate-600">${escapeHtml(data.telefono || 'N/A')}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-slate-900">${gasto}€</td>
                    <td class="px-6 py-4 text-sm">
                        <span class="bg-${colorEstado}-100 text-${colorEstado}-700 px-3 py-1 rounded-full text-xs font-semibold">
                            ${data.estado || 'Activo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm space-x-2">
                        <button class="text-blue-600 hover:text-blue-700 font-semibold">Ver</button>
                        <button class="text-green-600 hover:text-green-700 font-semibold">Editar</button>
                        <button class="text-red-600 hover:text-red-700 font-semibold delete-btn" data-id="${doc.id}">Eliminar</button>
                    </td>
                </tr>
            `;
        });

        // Agregar event listeners para eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const clienteId = e.target.dataset.id;
                if (confirm('¿Eliminar este cliente?')) {
                    try {
                        await deleteDoc(doc(db, 'clientes', clienteId));
                    } catch (error) {
                        console.error('Error eliminando cliente:', error);
                    }
                }
            });
        });

        totalClientes.textContent = total;
        clientesActivos.textContent = activos;
        promedioCliente.textContent = (total > 0 ? Math.round(totalGasto / total) : 0) + '€';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
