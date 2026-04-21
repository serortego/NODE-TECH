(function () {
  const STORAGE_KEY = 'crm-appointments';
  const messagesEl = document.getElementById('chat-messages');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('chat-input');

  function loadAppointments() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAppointments(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function appendMessage(role, text) {
    const bubbleClass = role === 'user' ? 'chat-bubble user ml-auto' : 'chat-bubble bot';
    const wrapper = document.createElement('div');
    wrapper.className = bubbleClass + ' max-w-[85%] rounded-2xl p-3 text-sm';
    wrapper.textContent = text;
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toISODate(d) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  function parseDateFromText(text) {
    const lower = text.toLowerCase();
    if (lower.includes('mañana')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return toISODate(d);
    }
    if (lower.includes('hoy')) return toISODate(new Date());

    const m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      return m[3] + '-' + mm + '-' + dd;
    }

    return toISODate(new Date());
  }

  function parseTimeFromText(text) {
    const m = text.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : '09:00';
  }

  function parseClientFromText(text) {
    const m = text.match(/para\s+(.+?)(?:\s+mañana|\s+hoy|\s+el\s+\d|\s+a\s+las?|$)/i);
    return m ? m[1].trim() : 'Cliente sin nombre';
  }

  // ── Lógica de facturas ─────────────────────────────────────────────────────
  function handleInvoiceCommand(text) {
    const lower = text.toLowerCase();

    // Navegar directamente al módulo
    if (lower.includes('ir a contabilidad') || lower.includes('abrir contabilidad') || lower.includes('módulo contabilidad')) {
      setTimeout(() => { window.location.href = 'contabilidad.html'; }, 900);
      return 'Abriendo el módulo de Contabilidad...';
    }

    // Ver facturas / pendientes
    if ((lower.includes('ver') || lower.includes('mostrar') || lower.includes('lista') || lower.includes('pendientes')) && !lower.includes('crear')) {
      setTimeout(() => { window.location.href = 'contabilidad.html'; }, 900);
      return 'Te llevo a tu panel de facturas ahora mismo.';
    }

    // Crear factura
    if (lower.includes('crear') || lower.includes('nueva') || lower.includes('generar') || lower.includes('emitir')) {
      const cliente = parseClientFromText(text);
      const hasCliente = cliente !== 'Cliente sin nombre';
      const paramCliente = hasCliente ? '&cliente=' + encodeURIComponent(cliente) : '';
      setTimeout(() => {
        window.location.href = 'contabilidad.html?nuevo=true' + paramCliente;
      }, 900);
      return 'Preparando nueva factura' + (hasCliente ? ' para ' + cliente : '') + '...';
    }

    return 'Puedo ayudarte con facturas. Dime: "Crear factura para [cliente]" o "Ver mis facturas pendientes".';
  }

  // ── Lógica principal de citas ──────────────────────────────────────────────
  function createAppointmentFromCommand(text) {
    const items = loadAppointments();
    const cita = {
      id: String(Date.now()),
      cliente: parseClientFromText(text),
      fecha: parseDateFromText(text),
      hora: parseTimeFromText(text),
      descripcion: 'Creada desde asistente',
      servicio: 'Reunión'
    };

    items.push(cita);
    saveAppointments(items);
    return cita;
  }

  function listTodayAppointments() {
    const today = toISODate(new Date());
    const items = loadAppointments().filter(a => a.fecha === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    if (!items.length) return 'No hay citas para hoy.';
    const lines = items.slice(0, 5).map(a => '- ' + (a.hora || '--:--') + ' ' + (a.cliente || 'Cliente'));
    return 'Citas de hoy:\n' + lines.join('\n');
  }

  function processMessage(text) {
    const lower = text.toLowerCase();

    // Comandos de facturación
    if (lower.includes('factura') || lower.includes('contabilidad') || lower.includes('cobro') || lower.includes('presupuesto')) {
      return handleInvoiceCommand(text);
    }

    // Comandos de citas — "crear" solo activa cita si no hay "factura" en el texto
    if (lower.includes('cita') || lower.includes('agendar') || lower.includes('crear') || lower.includes('programar')) {
      const cita = createAppointmentFromCommand(text);
      return 'Cita creada para ' + cita.cliente + ' el ' + cita.fecha + ' a las ' + cita.hora + '.';
    }

    if (lower.includes('hoy') || lower.includes('mostrar citas')) {
      return listTodayAppointments();
    }

    if (lower.includes('ayuda')) {
      return 'Puedes pedirme:\n• "Crear cita para Cliente X mañana a las 10:00"\n• "Mostrar citas de hoy"\n• "Crear factura para [empresa]"\n• "Ver mis facturas pendientes"';
    }

    return 'Entendido. Puedo crear citas o facturas. Escribe "ayuda" para ver los comandos disponibles.';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage('user', text);
    inputEl.value = '';

    const reply = processMessage(text);
    setTimeout(() => appendMessage('bot', reply), 250);
  }

  window.addQuick = function addQuick(text) {
    inputEl.value = text;
    formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  document.addEventListener('DOMContentLoaded', () => {
    appendMessage('bot', 'Hola, soy tu asistente. Puedo gestionar citas y facturas. Escribe "ayuda" para ver qué puedo hacer.');
    formEl.addEventListener('submit', handleSubmit);
  });
})();

