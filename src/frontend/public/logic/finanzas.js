import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';

let uid = null;
let editingId = null;
const state = { transacciones: [] };

document.addEventListener('nodeUserReady', async ({ detail }) => {
  uid = detail.user.uid;

  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-display-name');
  const emailEl  = document.getElementById('user-display-email');
  const name = detail.profile.displayName || detail.profile.email || '—';
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = detail.profile.displayName ? detail.profile.email : '';

  // Fecha de hoy como valor por defecto
  const fechaEl = document.getElementById('f-fecha');
  if (fechaEl) fechaEl.value = toISODate(new Date());

  await load();
  render();
  setupForm();
});

async function load() {
  try {
    const q = query(collection(db, 'users', uid, 'finanzas'), orderBy('fecha', 'desc'));
    const snap = await getDocs(q);
    state.transacciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    state.transacciones = [];
  }
}

function render() {
  let ingresos = 0;
  let gastos   = 0;

  state.transacciones.forEach(t => {
    const v = parseFloat(t.importe) || 0;
    if (t.tipo === 'ingreso') ingresos += v;
    else                      gastos   += v;
  });

  const balance = ingresos - gastos;

  const ingEl  = document.getElementById('stat-ingresos');
  const gasEl  = document.getElementById('stat-gastos');
  const balEl  = document.getElementById('stat-balance');
  if (ingEl)  ingEl.textContent  = fmt(ingresos);
  if (gasEl)  gasEl.textContent  = fmt(gastos);
  if (balEl) {
    balEl.textContent  = fmt(Math.abs(balance));
    balEl.className = 'mt-4 text-4xl font-extrabold ' + (balance >= 0 ? 'text-green-600' : 'text-red-500');
  }

  const list = document.getElementById('finanzas-list');
  if (!list) return;

  if (!state.transacciones.length) {
    list.innerHTML = '<p class="text-slate-500 text-sm">No hay transacciones registradas. Usa el formulario para añadir la primera.</p>';
    return;
  }

  list.innerHTML = state.transacciones.map(t => {
    const esIngreso = t.tipo === 'ingreso';
    const colorClase = esIngreso ? 'ingreso' : 'gasto';
    const colorTexto = esIngreso ? 'text-green-600' : 'text-red-500';
    const signo      = esIngreso ? '+' : '-';

    return `
      <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 ${colorClase}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-slate-900 truncate">${esc(t.concepto || '—')}</p>
            <div class="flex flex-wrap gap-2 mt-1">
              <span class="rounded-full ${esIngreso ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'} px-2 py-0.5 text-xs font-medium capitalize">${esc(t.tipo || '')}</span>
              ${t.categoria ? `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${esc(t.categoria)}</span>` : ''}
            </div>
            <p class="text-xs text-slate-500 mt-2">${esc(t.fecha || '')}</p>
          </div>
          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <p class="text-lg font-bold ${colorTexto}">${signo}${fmt(parseFloat(t.importe) || 0)}</p>
            <div class="flex gap-2">
              <button type="button" data-edit="${t.id}" class="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white transition">Editar</button>
              <button type="button" data-del="${t.id}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition">Eliminar</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function setupForm() {
  const form      = document.getElementById('finanza-form');
  const cancelBtn = document.getElementById('cancel-edit');
  const newBtn    = document.getElementById('btn-nuevo');
  const list      = document.getElementById('finanzas-list');
  const titleEl   = document.getElementById('form-title');

  newBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    document.getElementById('f-fecha').value = toISODate(new Date());
    if (titleEl) titleEl.textContent = 'Añadir transacción';
    document.getElementById('f-concepto')?.focus();
  });

  cancelBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    document.getElementById('f-fecha').value = toISODate(new Date());
    if (titleEl) titleEl.textContent = 'Añadir transacción';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.querySelector('input[name="f-tipo"]:checked')?.value || 'ingreso';
    const data = {
      tipo,
      concepto:  document.getElementById('f-concepto').value.trim(),
      importe:   parseFloat(document.getElementById('f-importe').value) || 0,
      fecha:     document.getElementById('f-fecha').value,
      categoria: document.getElementById('f-categoria').value.trim()
    };

    if (!data.concepto || !data.fecha) { alert('Concepto y fecha son obligatorios.'); return; }
    if (data.importe <= 0) { alert('El importe debe ser mayor que 0.'); return; }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', uid, 'finanzas', editingId), data);
        editingId = null;
      } else {
        await addDoc(collection(db, 'users', uid, 'finanzas'), { ...data, creadoEn: serverTimestamp() });
      }
      form.reset();
      document.getElementById('f-fecha').value = toISODate(new Date());
      if (titleEl) titleEl.textContent = 'Añadir transacción';
      await load();
      render();
    } catch (err) {
      console.error('[finanzas]', err);
      alert('Error al guardar. Inténtalo de nuevo.');
    }
  });

  list?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      const t  = state.transacciones.find(x => x.id === id);
      if (!t) return;
      editingId = id;
      const radio = document.getElementById(t.tipo === 'gasto' ? 'f-tipo-gasto' : 'f-tipo-ingreso');
      if (radio) radio.checked = true;
      document.getElementById('f-concepto').value  = t.concepto  || '';
      document.getElementById('f-importe').value   = t.importe   || '';
      document.getElementById('f-fecha').value     = t.fecha     || '';
      document.getElementById('f-categoria').value = t.categoria || '';
      if (titleEl) titleEl.textContent = 'Editar transacción';
      document.getElementById('f-concepto')?.focus();
    }

    if (delBtn && confirm('¿Eliminar esta transacción?')) {
      const id = delBtn.getAttribute('data-del');
      try {
        await deleteDoc(doc(db, 'users', uid, 'finanzas', id));
        await load();
        render();
      } catch (err) {
        console.error('[finanzas]', err);
        alert('Error al eliminar.');
      }
    }
  });
}

function fmt(n) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function toISODate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
