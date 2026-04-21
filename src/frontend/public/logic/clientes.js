import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';

let uid = null;
let editingId = null;
const state = { clientes: [] };

document.addEventListener('nodeUserReady', async ({ detail }) => {
  uid = detail.user.uid;

  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-display-name');
  const emailEl  = document.getElementById('user-display-email');
  const name = detail.profile.displayName || detail.profile.email || '—';
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = detail.profile.displayName ? detail.profile.email : '';

  await load();
  render();
  setupForm();
});

async function load() {
  try {
    const q = query(collection(db, 'users', uid, 'clientes'), orderBy('creadoEn', 'desc'));
    const snap = await getDocs(q);
    state.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    state.clientes = [];
  }
}

function render() {
  const now = new Date();
  const thisMonth = state.clientes.filter(c => {
    const ts = c.creadoEn;
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalEl = document.getElementById('stat-total');
  const nuevosEl = document.getElementById('stat-nuevos');
  if (totalEl)  totalEl.textContent  = state.clientes.length;
  if (nuevosEl) nuevosEl.textContent = thisMonth;

  const list = document.getElementById('clientes-list');
  if (!list) return;

  if (!state.clientes.length) {
    list.innerHTML = '<p class="text-slate-500 text-sm">No hay clientes registrados. Usa el formulario para añadir el primero.</p>';
    return;
  }

  list.innerHTML = state.clientes.map(c => `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-slate-900 truncate">${esc(c.nombre || '—')}</p>
          ${c.empresa ? `<p class="text-sm text-slate-500 mt-0.5 truncate">${esc(c.empresa)}</p>` : ''}
          <div class="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
            ${c.email    ? `<span class="truncate"><i class="fas fa-envelope mr-1 text-slate-400"></i>${esc(c.email)}</span>`    : ''}
            ${c.telefono ? `<span><i class="fas fa-phone mr-1 text-slate-400"></i>${esc(c.telefono)}</span>` : ''}
          </div>
          ${c.notas ? `<p class="text-xs text-slate-400 mt-2 truncate">${esc(c.notas)}</p>` : ''}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button type="button" data-edit="${c.id}" class="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white transition">Editar</button>
          <button type="button" data-del="${c.id}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition">Eliminar</button>
        </div>
      </div>
    </article>
  `).join('');
}

function setupForm() {
  const form      = document.getElementById('cliente-form');
  const cancelBtn = document.getElementById('cancel-edit');
  const newBtn    = document.getElementById('btn-nuevo');
  const list      = document.getElementById('clientes-list');
  const titleEl   = document.getElementById('form-title');

  newBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    if (titleEl) titleEl.textContent = 'Añadir cliente';
    document.getElementById('c-nombre')?.focus();
  });

  cancelBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    if (titleEl) titleEl.textContent = 'Añadir cliente';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre:   document.getElementById('c-nombre').value.trim(),
      empresa:  document.getElementById('c-empresa').value.trim(),
      email:    document.getElementById('c-email').value.trim(),
      telefono: document.getElementById('c-telefono').value.trim(),
      notas:    document.getElementById('c-notas').value.trim()
    };

    if (!data.nombre) { alert('El nombre es obligatorio.'); return; }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', uid, 'clientes', editingId), data);
        editingId = null;
      } else {
        await addDoc(collection(db, 'users', uid, 'clientes'), { ...data, creadoEn: serverTimestamp() });
      }
      form.reset();
      if (titleEl) titleEl.textContent = 'Añadir cliente';
      await load();
      render();
    } catch (err) {
      console.error('[clientes]', err);
      alert('Error al guardar. Inténtalo de nuevo.');
    }
  });

  list?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      const c  = state.clientes.find(x => x.id === id);
      if (!c) return;
      editingId = id;
      document.getElementById('c-nombre').value   = c.nombre   || '';
      document.getElementById('c-empresa').value  = c.empresa  || '';
      document.getElementById('c-email').value    = c.email    || '';
      document.getElementById('c-telefono').value = c.telefono || '';
      document.getElementById('c-notas').value    = c.notas    || '';
      if (titleEl) titleEl.textContent = 'Editar cliente';
      document.getElementById('c-nombre')?.focus();
    }

    if (delBtn && confirm('¿Eliminar este cliente?')) {
      const id = delBtn.getAttribute('data-del');
      try {
        await deleteDoc(doc(db, 'users', uid, 'clientes', id));
        await load();
        render();
      } catch (err) {
        console.error('[clientes]', err);
        alert('Error al eliminar.');
      }
    }
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
