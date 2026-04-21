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

  function toISODate(d) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

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

    if (lower.includes('cita') || lower.includes('agendar') || lower.includes('crear')) {
      const cita = createAppointmentFromCommand(text);
      return 'Cita creada para ' + cita.cliente + ' el ' + cita.fecha + ' a las ' + cita.hora + '.';
    }

    if (lower.includes('hoy') || lower.includes('mostrar citas')) {
      return listTodayAppointments();
    }

    if (lower.includes('ayuda')) {
      return 'Puedes pedirme: "Crear cita para Cliente X mañana a las 10:00" o "Mostrar citas de hoy".';
    }

    return 'Entendido. Si quieres, te ayudo a crear una cita con fecha y hora.';
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
    appendMessage('bot', 'Hola, soy tu asistente. Puedo crear citas y consultar las de hoy.');
    formEl.addEventListener('submit', handleSubmit);
  });
})();
