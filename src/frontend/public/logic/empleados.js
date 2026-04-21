import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';

let uid = null;
let editingId = null;
const state = { empleados: [] };

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
    const q = query(collection(db, 'users', uid, 'empleados'), orderBy('creadoEn', 'desc'));
    const snap = await getDocs(q);
    state.empleados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    state.empleados = [];
  }
}

function render() {
  const deptos = new Set(state.empleados.map(e => e.departamento).filter(Boolean));

  const totalEl  = document.getElementById('stat-total');
  const deptosEl = document.getElementById('stat-deptos');
  if (totalEl)  totalEl.textContent  = state.empleados.length;
  if (deptosEl) deptosEl.textContent = deptos.size;

  const list = document.getElementById('empleados-list');
  if (!list) return;

  if (!state.empleados.length) {
    list.innerHTML = '<p class="text-slate-500 text-sm">No hay empleados registrados. Usa el formulario para añadir el primero.</p>';
    return;
  }

  list.innerHTML = state.empleados.map(e => `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-slate-900 truncate">${esc(e.nombre || '—')}</p>
          <div class="flex flex-wrap gap-2 mt-1">
            ${e.cargo        ? `<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">${esc(e.cargo)}</span>`        : ''}
            ${e.departamento ? `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${esc(e.departamento)}</span>` : ''}
          </div>
          <div class="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
            ${e.email    ? `<span class="truncate"><i class="fas fa-envelope mr-1 text-slate-400"></i>${esc(e.email)}</span>`    : ''}
            ${e.telefono ? `<span><i class="fas fa-phone mr-1 text-slate-400"></i>${esc(e.telefono)}</span>` : ''}
          </div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button type="button" data-edit="${e.id}" class="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white transition">Editar</button>
          <button type="button" data-del="${e.id}" class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition">Eliminar</button>
        </div>
      </div>
    </article>
  `).join('');
}

function setupForm() {
  const form      = document.getElementById('empleado-form');
  const cancelBtn = document.getElementById('cancel-edit');
  const newBtn    = document.getElementById('btn-nuevo');
  const list      = document.getElementById('empleados-list');
  const titleEl   = document.getElementById('form-title');

  newBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    if (titleEl) titleEl.textContent = 'Añadir empleado';
    document.getElementById('e-nombre')?.focus();
  });

  cancelBtn?.addEventListener('click', () => {
    editingId = null;
    form?.reset();
    if (titleEl) titleEl.textContent = 'Añadir empleado';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre:       document.getElementById('e-nombre').value.trim(),
      cargo:        document.getElementById('e-cargo').value.trim(),
      departamento: document.getElementById('e-departamento').value.trim(),
      email:        document.getElementById('e-email').value.trim(),
      telefono:     document.getElementById('e-telefono').value.trim()
    };

    if (!data.nombre) { alert('El nombre es obligatorio.'); return; }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', uid, 'empleados', editingId), data);
        editingId = null;
      } else {
        await addDoc(collection(db, 'users', uid, 'empleados'), { ...data, creadoEn: serverTimestamp() });
      }
      form.reset();
      if (titleEl) titleEl.textContent = 'Añadir empleado';
      await load();
      render();
    } catch (err) {
      console.error('[empleados]', err);
      alert('Error al guardar. Inténtalo de nuevo.');
    }
  });

  list?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');

    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      const emp = state.empleados.find(x => x.id === id);
      if (!emp) return;
      editingId = id;
      document.getElementById('e-nombre').value       = emp.nombre       || '';
      document.getElementById('e-cargo').value        = emp.cargo        || '';
      document.getElementById('e-departamento').value = emp.departamento || '';
      document.getElementById('e-email').value        = emp.email        || '';
      document.getElementById('e-telefono').value     = emp.telefono     || '';
      if (titleEl) titleEl.textContent = 'Editar empleado';
      document.getElementById('e-nombre')?.focus();
    }

    if (delBtn && confirm('¿Eliminar este empleado?')) {
      const id = delBtn.getAttribute('data-del');
      try {
        await deleteDoc(doc(db, 'users', uid, 'empleados', id));
        await load();
        render();
      } catch (err) {
        console.error('[empleados]', err);
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
