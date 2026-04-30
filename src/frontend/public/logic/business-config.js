// ═══════════════════════════════════════════════════════════════════
// BUSINESS-CONFIG.JS — Configuración genérica de la app
// ═══════════════════════════════════════════════════════════════════

const BUSINESS_CONFIG = {

  otros: {
    businessName:        'Mi Negocio',
    badge:               '🏢 Mi Negocio',
    clienteSingular:     'Cliente',
    clientePlural:       'Clientes',
    empleadoSingular:    'Empleado',
    empleadoPlural:      'Empleados',
    salaSingular:        'Sala',
    salaPlural:          'Salas',
    citaSingular:        'Cita',
    citaPlural:          'Citas',
    servicioSingular:    'Servicio',
    servicioPlural:      'Servicios',
    nuevaCita:           'Nueva Cita',
    precioLabel:         'Importe (€)',
    placeholderCliente:  'Nombre del cliente',
    placeholderServicio: 'Selecciona un servicio',
    servicios: [
      { grupo: 'Servicios', color: '#38BDF8',
        items: ['Consultoría', 'Asesoría', 'Formación', 'Proyecto', 'Reunión', 'Servicio general'] }
    ]
  }

};

// Alias para compatibilidad con perfiles ya creados en Firestore
// (todos los tipos apuntan a la config genérica)
BUSINESS_CONFIG.dental     = BUSINESS_CONFIG.otros;
BUSINESS_CONFIG.medica     = BUSINESS_CONFIG.otros;
BUSINESS_CONFIG.taller     = BUSINESS_CONFIG.otros;
BUSINESS_CONFIG.peluqueria = BUSINESS_CONFIG.otros;
