// Vista: Empleados
import { db } from "../modules/firebase-config.js";
import { collection, getDocs, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function renderEmpleados() {
    return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Empleados</h1>
                    <p class="text-slate-500 mt-1">Gestiona tu equipo de trabajo</p>
                </div>
                <button class="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition">
                    + Añadir empleado
                </button>
            </div>

            <!-- Resumen -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Total Empleados</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="total-empleados">0</p>
                    <p class="text-blue-600 text-sm mt-2">En el equipo</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">En línea</p>
                    <p class="text-3xl font-bold text-green-600 mt-2" id="empleados-online">0</p>
                    <p class="text-green-600 text-sm mt-2">Conectados ahora</p>
                </div>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                    <p class="text-slate-600 text-sm font-medium">Departamentos</p>
                    <p class="text-3xl font-bold text-slate-900 mt-2" id="total-departamentos">0</p>
                    <p class="text-blue-600 text-sm mt-2">Diferentes áreas</p>
                </div>
            </div>

            <!-- Búsqueda -->
            <div class="flex gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <input type="text" placeholder="Buscar empleado..." class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
            </div>

            <!-- Tarjetas de empleados -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="empleados-grid">
                <div class="bg-white rounded-2xl p-6 shadow-sm text-center text-slate-500">
                    Cargando empleados...
                </div>
            </div>
        </div>
    `;
}

export function initEmpleados() {
    const grid = document.getElementById('empleados-grid');
    const totalEmpleados = document.getElementById('total-empleados');
    const empleadosOnline = document.getElementById('empleados-online');
    const totalDepartamentos = document.getElementById('total-departamentos');

    onSnapshot(query(collection(db, "empleados"), orderBy("timestamp", "desc")), (snapshot) => {
        grid.innerHTML = '';
        let total = 0;
        let online = 0;
        const departamentos = new Set();

        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="col-span-full bg-white rounded-2xl p-8 shadow-sm text-center">
                    <p class="text-slate-500">No hay empleados. <a href="#" class="text-blue-600 font-semibold">Añadir uno</a></p>
                </div>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            total++;

            if (data.estado === 'En línea') {
                online++;
            }

            if (data.departamento) {
                departamentos.add(data.departamento);
            }

            const initials = (data.nombre || 'E?')
                .split(' ')
                .slice(0, 2)
                .map(w => w[0])
                .join('')
                .toUpperCase();

            grid.innerHTML += `
                <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition">
                    <div class="flex items-center gap-4 mb-4">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre || 'Empleado')}&background=3b82f6&color=fff" alt="${data.nombre}" class="w-14 h-14 rounded-full">
                        <div>
                            <p class="font-bold text-slate-900">${escapeHtml(data.nombre)}</p>
                            <p class="text-sm text-slate-600">${escapeHtml(data.puesto || 'Puesto')}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-2 mb-4 pb-4 border-b border-slate-200">
                        <p class="text-sm text-slate-600"><strong>Email:</strong> ${escapeHtml(data.email || 'N/A')}</p>
                        <p class="text-sm text-slate-600"><strong>Departamento:</strong> ${escapeHtml(data.departamento || 'N/A')}</p>
                        <p class="text-sm text-slate-600"><strong>Estado:</strong> <span class="bg-${data.estado === 'En línea' ? 'green' : 'gray'}-100 text-${data.estado === 'En línea' ? 'green' : 'gray'}-700 px-2 py-1 rounded text-xs font-semibold">${data.estado || 'Offline'}</span></p>
                    </div>

                    <div class="flex gap-2">
                        <button class="flex-1 px-3 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-200 transition">
                            Editar
                        </button>
                        <button class="flex-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200 transition delete-empleado" data-id="${doc.id}">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        });

        // Event listeners para eliminar
        document.querySelectorAll('.delete-empleado').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const empleadoId = e.target.dataset.id;
                if (confirm('¿Eliminar este empleado?')) {
                    try {
                        await deleteDoc(doc(db, 'empleados', empleadoId));
                    } catch (error) {
                        console.error('Error eliminando empleado:', error);
                    }
                }
            });
        });

        totalEmpleados.textContent = total;
        empleadosOnline.textContent = online;
        totalDepartamentos.textContent = departamentos.size;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
