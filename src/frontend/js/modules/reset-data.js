/**
 * SCRIPT DE RESET - Limpiar todas las colecciones de Firebase
 */

import { db } from "./firebase-config.js";
import { collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const COLECCIONES = ['facturas', 'citas', 'clientes', 'empleados', 'mensajes'];

/**
 * Elimina todos los documentos de una colección
 */
async function limpiarColeccion(nombreColeccion) {
    try {
        const querySnapshot = await getDocs(collection(db, nombreColeccion));
        let contador = 0;

        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
            contador++;
        }

        console.log(`✅ ${nombreColeccion}: ${contador} documentos eliminados`);
        return contador;
    } catch (error) {
        console.error(`❌ Error limpiando ${nombreColeccion}:`, error);
        return 0;
    }
}

/**
 * Reset completo - limpia todas las colecciones
 */
export async function resetAllData() {
    console.log('🔄 Iniciando reset de datos...');
    let totalEliminados = 0;

    for (const coleccion of COLECCIONES) {
        const eliminados = await limpiarColeccion(coleccion);
        totalEliminados += eliminados;
    }

    console.log(`✅ Reset completado. Total documentos eliminados: ${totalEliminados}`);
    console.log('🔄 Recargando página en 2 segundos...');

    setTimeout(() => {
        location.reload();
    }, 2000);
}

/**
 * Reset selectivo - solo una colección
 */
export async function resetColeccion(nombreColeccion) {
    if (!COLECCIONES.includes(nombreColeccion)) {
        console.error(`❌ Colección desconocida: ${nombreColeccion}`);
        console.log(`Colecciones disponibles: ${COLECCIONES.join(', ')}`);
        return;
    }

    const confirmacion = confirm(`¿Eliminar todos los documentos de ${nombreColeccion}?`);
    if (!confirmacion) return;

    await limpiarColeccion(nombreColeccion);
}
