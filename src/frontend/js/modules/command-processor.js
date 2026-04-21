// Módulo de Procesamiento de Comandos para Asistente NODE
// Sistema inteligente de reconocimiento de intenciones del usuario
// Preparado para integración futura con IA

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==================== DICCIONARIO DE INTENCIONES ====================

const intenciones = {
    factura: {
        palabras_clave: ['factura', 'invoice', 'cobrar', 'venta', 'ingreso', 'pago'],
        palabras_ignorar: ['estado', 'historial', 'pendiente'],
        accion: 'crear_factura',
        parametros: ['monto', 'cliente', 'descripcion']
    },
    cita: {
        palabras_clave: ['cita', 'citas', 'agendar', 'agenda', 'reserva', 'appointment', 'horario'],
        palabras_ignorar: ['ver', 'historial'],
        accion: 'crear_cita',
        parametros: ['cliente', 'hora', 'fecha', 'servicio']
    },
    cliente: {
        palabras_clave: ['cliente', 'contacto', 'empresa', 'buscar', 'encontrar', 'search'],
        palabras_ignorar: ['crear', 'nueva'],
        accion: 'buscar_cliente',
        parametros: ['nombre']
    },
    empleado: {
        palabras_clave: ['empleado', 'trabajador', 'staff', 'equipo', 'personal', 'quien es'],
        palabras_ignorar: [],
        accion: 'buscar_empleado',
        parametros: ['nombre']
    },
    resumen: {
        palabras_clave: ['resumen', 'hoy', 'resumen del día', 'como voy', 'estado', 'overview'],
        palabras_ignorar: [],
        accion: 'dar_resumen',
        parametros: []
    },
    help: {
        palabras_clave: ['ayuda', 'help', 'que puedo hacer', 'puedes hacer', 'comandos', 'qué haces'],
        palabras_ignorar: [],
        accion: 'mostrar_ayuda',
        parametros: []
    }
};

// ==================== ANÁLISIS DE TEXTO ====================

/**
 * Extrae números del texto
 */
function extraerMontos(texto) {
    const matches = texto.match(/\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
}

/**
 * Extrae nombres del texto (palabras capitalizadas)
 */
function extraerNombres(texto) {
    const palabras = texto.split(/\s+/);
    return palabras.filter(p => /^[A-Z]/.test(p)).join(' ');
}

/**
 * Detecta la intención principal del usuario
 */
function detectarIntencion(texto) {
    const textoLower = texto.toLowerCase();
    let intencionDetectada = null;
    let puntuacionMax = 0;

    for (const [clave, config] of Object.entries(intenciones)) {
        let puntuacion = 0;

        // Buscar palabras clave
        for (const palabra of config.palabras_clave) {
            if (textoLower.includes(palabra)) {
                puntuacion += 2;
            }
        }

        // Restar puntos si contiene palabras a ignorar
        for (const palabra of config.palabras_ignorar) {
            if (textoLower.includes(palabra)) {
                puntuacion -= 1;
            }
        }

        if (puntuacion > puntuacionMax) {
            puntuacionMax = puntuacion;
            intencionDetectada = clave;
        }
    }

    return intencionDetectada;
}

// ==================== PROCESADORES DE COMANDOS ====================

/**
 * Crear factura
 */
async function procesarFactura(texto) {
    const montos = extraerMontos(texto);
    const monto = montos[0];

    if (!monto || monto <= 0) {
        return {
            tipo: 'error',
            mensaje: '❓ Necesito saber el monto. Ejemplo: "Crea una factura de 100€"',
            sugerencias: [
                { texto: 'Factura de 50€', comando: 'crea una factura de 50' },
                { texto: 'Factura de 100€', comando: 'crea una factura de 100' },
                { texto: 'Factura de 200€', comando: 'crea una factura de 200' }
            ]
        };
    }

    try {
        const nombre = extraerNombres(texto) || 'Cliente Nuevo';

        await addDoc(collection(db, "facturas"), {
            cliente: nombre,
            monto: String(monto),
            timestamp: serverTimestamp()
        });

        return {
            tipo: 'exito',
            mensaje: `✅ Factura de ${monto}€ creada correctamente para ${nombre}. Se agregó a Finanzas.`,
            sugerencias: [
                { texto: 'Ver Finanzas', comando: 'ir a finanzas' },
                { texto: 'Nueva factura', comando: 'crea otra factura' },
                { texto: 'Crear cita', comando: 'agenda una cita' }
            ]
        };
    } catch (error) {
        console.error('Error al crear factura:', error);
        return {
            tipo: 'error',
            mensaje: '⚠️ Error al crear la factura. Intenta de nuevo.',
            sugerencias: []
        };
    }
}

/**
 * Crear cita
 */
async function procesarCita(texto) {
    const cliente = extraerNombres(texto) || 'Cliente';
    const montos = extraerMontos(texto);
    const monto = montos[0];

    // Si no tiene hora, pedir detalles
    if (!texto.includes(':') && !texto.includes('mañana') && !texto.includes('hoy')) {
        return {
            tipo: 'pregunta',
            mensaje: `📅 Entiendo que quieres agendar una cita para ${cliente}. Necesito más detalles:\n• ¿Qué hora? (ej: 10:00)\n• ¿Qué servicio?\n• ¿Qué día?`,
            sugerencias: [
                { texto: '10:00 - Corte', comando: 'cita con ' + cliente + ' a las 10:00' },
                { texto: '14:00 - Otro servicio', comando: 'cita con ' + cliente + ' a las 14:00' },
                { texto: 'Ver Agenda', comando: 'ir a agenda' }
            ]
        };
    }

    try {
        // Extraer hora del formato "10:00" o "a las 10:00"
        const horaMatch = texto.match(/(\d{1,2}):(\d{2})/);
        const hora = horaMatch ? `${horaMatch[1]}:${horaMatch[2]}` : '10:00';
        const servicio = texto.includes('corte') ? 'Corte' : 
                        texto.includes('color') ? 'Color y tinte' : 
                        texto.includes('peinado') ? 'Peinado' : 'Servicio';

        await addDoc(collection(db, "citas"), {
            cliente: cliente,
            servicio: servicio,
            hora: hora,
            monto: String(monto || 20),
            estado: 'Confirmada',
            timestamp: serverTimestamp()
        });

        return {
            tipo: 'exito',
            mensaje: `✅ Cita agendada correctamente!\n📅 Cliente: ${cliente}\n⏰ Hora: ${hora}\n💼 Servicio: ${servicio}${monto ? '\n💰 Precio: ' + monto + '€' : ''}`,
            sugerencias: [
                { texto: 'Ver Agenda', comando: 'ir a agenda' },
                { texto: 'Nueva cita', comando: 'agenda otra cita' },
                { texto: 'Crear factura', comando: 'crea una factura' }
            ]
        };
    } catch (error) {
        console.error('Error al crear cita:', error);
        return {
            tipo: 'error',
            mensaje: '⚠️ Error al agendar la cita. Intenta de nuevo.',
            sugerencias: []
        };
    }
}

/**
 * Buscar o crear cliente
 */
async function procesarBuscarCliente(texto) {
    const cliente = extraerNombres(texto);

    if (!cliente) {
        return {
            tipo: 'pregunta',
            mensaje: '👤 ¿Qué cliente buscas o quieres crear? Dame un nombre.',
            sugerencias: [
                { texto: 'Ver todos', comando: 'ir a clientes' },
                { texto: 'Volver', comando: 'ayuda' }
            ]
        };
    }

    // Crear cliente directamente si dice "nuevo", "agregar", "crear"
    if (texto.toLowerCase().includes('nuevo') || texto.toLowerCase().includes('agregar') || texto.toLowerCase().includes('crear')) {
        try {
            await addDoc(collection(db, "clientes"), {
                nombre: cliente,
                email: '',
                telefono: '',
                gasto: '0',
                estado: 'Activo',
                timestamp: serverTimestamp()
            });

            return {
                tipo: 'exito',
                mensaje: `✅ Cliente "${cliente}" agregado correctamente a tu base de datos.`,
                sugerencias: [
                    { texto: 'Ver Clientes', comando: 'ir a clientes' },
                    { texto: 'Crear factura', comando: 'crea una factura de 50 para ' + cliente },
                    { texto: 'Agendar cita', comando: 'agenda cita con ' + cliente }
                ]
            };
        } catch (error) {
            console.error('Error al crear cliente:', error);
            return {
                tipo: 'error',
                mensaje: '⚠️ Error al agregar cliente. Intenta de nuevo.',
                sugerencias: []
            };
        }
    }

    return {
        tipo: 'info',
        mensaje: `🔍 Buscando cliente: ${cliente}... Ve a Clientes para ver todos o crea uno nuevo.`,
        sugerencias: [
            { texto: 'Crear cliente', comando: 'crear nuevo cliente ' + cliente },
            { texto: 'Ver Clientes', comando: 'ir a clientes' },
            { texto: 'Nueva factura', comando: 'crea una factura para ' + cliente }
        ]
    };
}

/**
 * Dar resumen del día
 */
function procesarResumen() {
    return {
        tipo: 'info',
        mensaje: `📊 Resumen de hoy:\n• Ingresos: 320€\n• Citas: 8\n• Clientes: 156\n• Facturas pendientes: 2\n\nVe a Inicio para más detalles.`,
        sugerencias: [
            { texto: 'Ir a Inicio', comando: 'ir a inicio' },
            { texto: 'Ver Finanzas', comando: 'ir a finanzas' },
            { texto: 'Ver Citas', comando: 'ir a agenda' }
        ]
    };
}

/**
 * Mostrar ayuda y comandos disponibles
 */
function procesarAyuda() {
    return {
        tipo: 'info',
        mensaje: `🤖 Soy el Asistente NODE. Puedo ayudarte con:\n\n✅ Crear facturas: "Crea una factura de 100€"\n✅ Agendar citas: "Agenda cita con Juan"\n✅ Buscar clientes: "Busca a Ana"\n✅ Ver resumen: "Resumen de hoy"\n\n¿Qué necesitas?`,
        sugerencias: [
            { texto: 'Crear factura', comando: 'crea una factura de 50' },
            { texto: 'Agendar cita', comando: 'agenda una cita' },
            { texto: 'Buscar cliente', comando: 'busca a un cliente' }
        ]
    };
}

// ==================== FUNCIÓN PRINCIPAL ====================

/**
 * Procesa un mensaje del usuario
 * Retorna respuesta estructurada lista para mostrar
 * 
 * Estructura de retorno:
 * {
 *   tipo: 'exito' | 'error' | 'info' | 'pregunta',
 *   mensaje: string,
 *   sugerencias: [{ texto, comando }, ...]
 * }
 */
export async function procesarMensajeUsuario(texto) {
    console.log('🔄 procesarMensajeUsuario recibió:', texto);
    
    if (!texto || texto.trim().length === 0) {
        console.log('❌ Texto vacío');
        return {
            tipo: 'info',
            mensaje: '👋 Hola, ¿en qué puedo ayudarte?',
            sugerencias: [
                { texto: 'Ver comandos', comando: 'ayuda' },
                { texto: 'Crear factura', comando: 'crea una factura' },
                { texto: 'Agendar cita', comando: 'agenda una cita' }
            ]
        };
    }

    const intencion = detectarIntencion(texto);
    console.log('🎯 Intención detectada:', intencion);

    // Procesar según intención detectada
    switch (intencion) {
        case 'factura':
            return await procesarFactura(texto);
        case 'cita':
            return await procesarCita(texto);
        case 'cliente':
            return await procesarBuscarCliente(texto);
        case 'empleado':
            return {
                tipo: 'info',
                mensaje: '👥 Para información de empleados, ve a la sección Empleados o dime el nombre del empleado a buscar/crear.',
                sugerencias: [
                    { texto: 'Ver Empleados', comando: 'ir a empleados' },
                    { texto: 'Crear empleado', comando: 'agregar nuevo empleado' }
                ]
            };
        case 'resumen':
            return procesarResumen();
        case 'help':
            return procesarAyuda();
        default:
            return {
                tipo: 'info',
                mensaje: '🤔 No estoy seguro de lo que pides. Intenta con:\n• "Crea una factura de 50€"\n• "Agenda una cita"\n• "Ayuda" para más opciones',
                sugerencias: [
                    { texto: 'Ayuda', comando: 'ayuda' },
                    { texto: 'Crear factura', comando: 'crea una factura' },
                    { texto: 'Agendar cita', comando: 'agenda una cita' }
                ]
            };
    }
}

/**
 * Función futura para integrar IA
 * Cuando tengas un backend con IA, reemplaza procesarMensajeUsuario por esto:
 */
export async function procesarConIA(texto) {
    // TODO: Descomentar cuando tengas backend con IA
    /*
    try {
        const respuesta = await fetch('/api/asistente/procesar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: texto })
        });
        return await respuesta.json();
    } catch (error) {
        console.error('Error en IA:', error);
        return {
            tipo: 'error',
            mensaje: 'Error al procesar. Intenta de nuevo.',
            sugerencias: []
        };
    }
    */
}

// ==================== EXPORTAR CONFIGURACIÓN ====================

export const configAsistente = {
    intenciones: Object.keys(intenciones),
    version: '2.0',
    modo: 'comandos-locales', // Cambiar a 'ia' cuando sea disponible
    descripcion: 'Asistente NODE con reconocimiento inteligente de comandos'
};
