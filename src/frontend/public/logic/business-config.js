// ═══════════════════════════════════════════════════════════════════
// BUSINESS-CONFIG.JS — Terminología y servicios por tipo de negocio
// Se carga como script global antes que theme-loader.js
// Para añadir un nuevo tipo: copia un bloque y cambia los valores.
// ═══════════════════════════════════════════════════════════════════

const BUSINESS_CONFIG = {

  // ── Clínica Dental ────────────────────────────────────────────────
  dental: {
    businessName:        'Clínica Dental',
    badge:               '🦷 Clínica Dental',
    clienteSingular:     'Paciente',
    clientePlural:       'Pacientes',
    empleadoSingular:    'Dentista',
    empleadoPlural:      'Dentistas',
    salaSingular:        'Sillón',
    salaPlural:          'Sillones',
    citaSingular:        'Consulta',
    citaPlural:          'Consultas',
    servicioSingular:    'Tratamiento',
    servicioPlural:      'Tratamientos',
    nuevaCita:           'Nueva Consulta',
    precioLabel:         'Precio tratamiento (€)',
    placeholderCliente:  'Nombre del paciente',
    placeholderServicio: 'Selecciona un tratamiento',
    servicios: [
      { grupo: 'Prevención y Diagnóstico', color: '#38BDF8',
        items: ['Revisión y diagnóstico', 'Limpieza y profilaxis', 'Aplicación de flúor', 'Selladores dentales'] },
      { grupo: 'Tratamientos Restauradores', color: '#F59E0B',
        items: ['Empaste dental', 'Endodoncia', 'Corona dental', 'Puente dental'] },
      { grupo: 'Estética Dental', color: '#EC4899',
        items: ['Blanqueamiento dental', 'Carillas dentales'] },
      { grupo: 'Cirugía y Especialidades', color: '#A855F7',
        items: ['Extracción dental', 'Implante dental', 'Ortodoncia', 'Periodoncia', 'Cirugía oral'] },
      { grupo: 'Urgencias', color: '#F43F5E',
        items: ['Urgencia dental'] }
    ]
  },

  // ── Clínica Médica ────────────────────────────────────────────────
  medica: {
    businessName:        'Clínica Médica',
    badge:               '🏥 Clínica Médica',
    clienteSingular:     'Paciente',
    clientePlural:       'Pacientes',
    empleadoSingular:    'Médico/a',
    empleadoPlural:      'Médicos',
    salaSingular:        'Consulta',
    salaPlural:          'Consultas',
    citaSingular:        'Consulta',
    citaPlural:          'Consultas',
    servicioSingular:    'Consulta',
    servicioPlural:      'Consultas',
    nuevaCita:           'Nueva Consulta',
    precioLabel:         'Importe (€)',
    placeholderCliente:  'Nombre del paciente',
    placeholderServicio: 'Selecciona una consulta',
    servicios: [
      { grupo: 'Consultas', color: '#38BDF8',
        items: ['Consulta general', 'Revisión anual', 'Consulta de urgencia', 'Segunda opinión'] },
      { grupo: 'Diagnóstico', color: '#F59E0B',
        items: ['Análisis de sangre', 'Radiografía', 'Ecografía', 'Electrocardiograma'] },
      { grupo: 'Especialidades', color: '#A855F7',
        items: ['Cardiología', 'Dermatología', 'Traumatología', 'Pediatría', 'Ginecología', 'Neurología'] },
      { grupo: 'Urgencias', color: '#F43F5E',
        items: ['Urgencia médica'] }
    ]
  },

  // ── Taller ────────────────────────────────────────────────────────
  taller: {
    businessName:        'Taller',
    badge:               '🔧 Taller',
    clienteSingular:     'Cliente',
    clientePlural:       'Clientes',
    empleadoSingular:    'Técnico',
    empleadoPlural:      'Técnicos',
    salaSingular:        'Taller',
    salaPlural:          'Talleres',
    citaSingular:        'Cita',
    citaPlural:          'Citas',
    servicioSingular:    'Servicio',
    servicioPlural:      'Servicios',
    nuevaCita:           'Nueva Cita',
    precioLabel:         'Importe (€)',
    placeholderCliente:  'Nombre del cliente',
    placeholderServicio: 'Selecciona un servicio',
    servicios: [
      { grupo: 'Mantenimiento', color: '#38BDF8',
        items: ['Cambio de aceite', 'Revisión general', 'Filtros y líquidos', 'Neumáticos'] },
      { grupo: 'Reparación', color: '#F59E0B',
        items: ['Frenos', 'Suspensión', 'Motor', 'Transmisión', 'Electricidad', 'Aire acondicionado'] },
      { grupo: 'Carrocería', color: '#A855F7',
        items: ['Chapa y pintura', 'Cristales', 'Pulido y encerado'] },
      { grupo: 'Urgencias', color: '#F43F5E',
        items: ['Avería en carretera', 'Remolque', 'Diagnóstico urgente'] }
    ]
  },

  // ── Peluquería / Estética ─────────────────────────────────────────
  peluqueria: {
    businessName:        'Peluquería',
    badge:               '✂️ Peluquería',
    clienteSingular:     'Cliente',
    clientePlural:       'Clientes',
    empleadoSingular:    'Estilista',
    empleadoPlural:      'Estilistas',
    salaSingular:        'Cabina',
    salaPlural:          'Cabinas',
    citaSingular:        'Reserva',
    citaPlural:          'Reservas',
    servicioSingular:    'Servicio',
    servicioPlural:      'Servicios',
    nuevaCita:           'Nueva Reserva',
    precioLabel:         'Precio (€)',
    placeholderCliente:  'Nombre del cliente',
    placeholderServicio: 'Selecciona un servicio',
    servicios: [
      { grupo: 'Corte', color: '#38BDF8',
        items: ['Corte de cabello', 'Corte con barba', 'Corte infantil', 'Degradado'] },
      { grupo: 'Color', color: '#EC4899',
        items: ['Tinte completo', 'Mechas', 'Balayage', 'Decoloración', 'Matiz'] },
      { grupo: 'Tratamientos', color: '#F59E0B',
        items: ['Hidratación', 'Queratina', 'Alisado', 'Permanente'] },
      { grupo: 'Estética', color: '#A855F7',
        items: ['Manicura', 'Pedicura', 'Depilación', 'Maquillaje', 'Extensiones'] }
    ]
  },

  // ── Otros (genérico) ──────────────────────────────────────────────
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
