// contabilidad.js — Módulo de facturación para NODE
// ES module: importa Firebase Auth + Firestore desde CDN
// Escucha el evento 'nodeUserReady' emitido por navigation.js

import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';

// ─── Estado ───────────────────────────────────────────────────────────────────
let uid = null;
let facturas = [];
let editingId = null;
let conceptos = [];

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const listaEl           = document.getElementById('lista-facturas');
const formEl            = document.getElementById('form-factura');
const facturasContainer = document.getElementById('facturas-container');
const btnNueva          = document.getElementById('btn-nueva-factura');
const btnCancelar       = document.getElementById('btn-cancelar');
const btnGuardar        = document.getElementById('btn-guardar');
const btnGuardarEmitir  = document.getElementById('btn-guardar-emitir');
const btnPdf            = document.getElementById('btn-pdf-preview');
const btnAddConcepto    = document.getElementById('btn-add-concepto');
const conceptosBody     = document.getElementById('conceptos-body');
const filtroEstado      = document.getElementById('filtro-estado');
const editingIdEl       = document.getElementById('editing-id');

// Form fields
const fClienteNombre    = document.getElementById('f-cliente-nombre');
const fClienteEmail     = document.getElementById('f-cliente-email');
const fClienteNif       = document.getElementById('f-cliente-nif');
const fClienteDir       = document.getElementById('f-cliente-dir');
const fFechaEmision     = document.getElementById('f-fecha-emision');
const fFechaVencimiento = document.getElementById('f-fecha-vencimiento');
const fEstado           = document.getElementById('f-estado');
const fIva              = document.getElementById('f-iva');
const fNotas            = document.getElementById('f-notas');

// Stats
const statTotal         = document.getElementById('stat-total');
const statPendiente     = document.getElementById('stat-pendiente');
const statCobrado       = document.getElementById('stat-cobrado');
const statVencidas      = document.getElementById('stat-vencidas');

// Totales
const tBase             = document.getElementById('t-base');
const tIvaLabel         = document.getElementById('t-iva-label');
const tIva              = document.getElementById('t-iva');
const tTotal            = document.getElementById('t-total');

// ─── Firestore helpers ────────────────────────────────────────────────────────
function facturasCol() {
  return collection(db, 'users', uid, 'facturas');
}

async function fetchFacturas() {
  try {
    const q = query(facturasCol(), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    facturas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    facturas = [];
  }
  renderLista();
  renderStats();
}

async function generateNumero() {
  const year = new Date().getFullYear();
  const snap = await getDocs(facturasCol());
  const count = snap.size + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
}

async function saveFactura(estado) {
  const data = buildFacturaData(estado);
  if (!data) return;

  try {
    if (editingId) {
      const ref = doc(db, 'users', uid, 'facturas', editingId);
      await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
    } else {
      const numero = await generateNumero();
      await addDoc(facturasCol(), {
        ...data,
        numero,
        userId: uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    await fetchFacturas();
    hideForm();
  } catch (err) {
    alert('Error al guardar la factura. Inténtalo de nuevo.');
    console.error(err);
  }
}

async function deleteFactura(id) {
  if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'facturas', id));
    await fetchFacturas();
  } catch {
    alert('Error al eliminar la factura.');
  }
}

// ─── Build data ───────────────────────────────────────────────────────────────
function buildFacturaData(estado) {
  const nombre = fClienteNombre.value.trim();
  if (!nombre) {
    alert('El nombre del cliente es obligatorio.');
    fClienteNombre.focus();
    return null;
  }
  if (conceptos.length === 0) {
    alert('Añade al menos un concepto antes de guardar.');
    return null;
  }

  const iva = parseFloat(fIva.value) || 0;
  const base = conceptos.reduce((sum, c) => sum + c.subtotal, 0);
  const ivaAmount = base * (iva / 100);
  const total = base + ivaAmount;

  return {
    estado,
    cliente: {
      nombre,
      email: fClienteEmail.value.trim(),
      nif:   fClienteNif.value.trim(),
      direccion: fClienteDir.value.trim()
    },
    fechaEmision:     fFechaEmision.value,
    fechaVencimiento: fFechaVencimiento.value,
    conceptos:        conceptos.map(c => ({ ...c })),
    subtotal: base,
    impuesto: iva,
    total,
    notas: fNotas.value.trim()
  };
}

// ─── Conceptos (line items) ───────────────────────────────────────────────────
function addConcepto(desc = '', qty = 1, precio = 0) {
  conceptos.push({
    descripcion:    desc,
    cantidad:       qty,
    precioUnitario: precio,
    subtotal:       qty * precio
  });
  renderConceptos();
}

function removeConcepto(index) {
  conceptos.splice(index, 1);
  renderConceptos();
}

function updateConcepto(index, field, value) {
  if (field === 'descripcion') {
    conceptos[index][field] = value;
  } else {
    conceptos[index][field] = parseFloat(value) || 0;
  }
  conceptos[index].subtotal = conceptos[index].cantidad * conceptos[index].precioUnitario;
  // Re-render only totals (no need to re-render full table on every keystroke)
  updateTotals();
}

function renderConceptos() {
  conceptosBody.innerHTML = '';
  conceptos.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-100';
    tr.innerHTML = `
      <td class="px-4 py-2">
        <input type="text" value="${escapeAttr(c.descripcion)}" data-i="${i}" data-f="descripcion"
          placeholder="Descripción del servicio"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2">
        <input type="number" value="${c.cantidad}" min="1" data-i="${i}" data-f="cantidad"
          class="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2">
        <input type="number" value="${c.precioUnitario}" min="0" step="0.01" data-i="${i}" data-f="precioUnitario"
          class="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-600" />
      </td>
      <td class="px-4 py-2 text-right font-semibold text-slate-900 whitespace-nowrap" data-subtotal="${i}">${fmtEur(c.subtotal)}</td>
      <td class="px-4 py-2 text-center">
        <button type="button" data-del="${i}" class="text-red-400 hover:text-red-600 transition text-sm px-1">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    conceptosBody.appendChild(tr);
  });
  updateTotals();
}

function updateTotals() {
  const iva  = parseFloat(fIva.value) || 0;
  const base = conceptos.reduce((sum, c) => sum + c.subtotal, 0);
  const ivaAmount = base * (iva / 100);

  // Update subtotal cells without full re-render
  conceptos.forEach((c, i) => {
    const cell = conceptosBody.querySelector(`[data-subtotal="${i}"]`);
    if (cell) cell.textContent = fmtEur(c.subtotal);
  });

  tBase.textContent     = fmtEur(base);
  tIvaLabel.textContent = `IVA (${iva}%)`;
  tIva.textContent      = fmtEur(ivaAmount);
  tTotal.textContent    = fmtEur(base + ivaAmount);
}

// ─── Render lista ─────────────────────────────────────────────────────────────
function renderLista() {
  const filtro   = filtroEstado.value;
  const filtered = filtro ? facturas.filter(f => f.estado === filtro) : facturas;

  if (!filtered.length) {
    facturasContainer.innerHTML = `
      <div class="flex flex-col items-center gap-3 py-14 text-slate-400">
        <i class="fas fa-file-invoice text-4xl"></i>
        <p class="text-sm">${filtro ? 'No hay facturas con este estado.' : 'Sin facturas todavía. ¡Crea la primera!'}</p>
      </div>`;
    return;
  }

  facturasContainer.innerHTML = filtered.map(f => `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 hover:bg-blue-50 transition group">
      <div class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="font-mono text-sm font-bold text-blue-700">${escapeHtml(f.numero || '—')}</span>
          <span class="estado-${f.estado} rounded-full px-3 py-0.5 text-xs font-semibold capitalize">${f.estado}</span>
        </div>
        <p class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(f.cliente?.nombre || '—')}</p>
        <p class="text-xs text-slate-500">${f.fechaEmision || '—'}${f.fechaVencimiento ? ' · Vence: ' + f.fechaVencimiento : ''}</p>
      </div>
      <div class="flex items-center gap-4 flex-shrink-0">
        <span class="text-lg font-extrabold text-slate-900">${fmtEur(f.total || 0)}</span>
        <div class="flex gap-2">
          <button onclick="window._cont.edit('${f.id}')" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
            <i class="fas fa-pencil-alt mr-1"></i> Editar
          </button>
          <button onclick="window._cont.pdf('${f.id}')" class="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition">
            <i class="fas fa-file-pdf mr-1"></i> PDF
          </button>
          <button onclick="window._cont.del('${f.id}')" class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderStats() {
  const emitidas = facturas.filter(f => f.estado === 'emitida');
  const pagadas  = facturas.filter(f => f.estado === 'pagada');
  const vencidas = facturas.filter(f => f.estado === 'vencida');

  statTotal.textContent     = facturas.length;
  statPendiente.textContent = fmtEur(emitidas.reduce((s, f) => s + (f.total || 0), 0));
  statCobrado.textContent   = fmtEur(pagadas.reduce((s, f) => s + (f.total || 0), 0));
  statVencidas.textContent  = vencidas.length;
}

// ─── Control del formulario ───────────────────────────────────────────────────
function showForm(factura = null) {
  editingId = factura ? factura.id : null;
  editingIdEl.value = editingId || '';

  const today = new Date().toISOString().split('T')[0];
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  if (factura) {
    document.getElementById('form-titulo').textContent = 'Editar ' + (factura.numero || 'factura');
    fClienteNombre.value    = factura.cliente?.nombre   || '';
    fClienteEmail.value     = factura.cliente?.email    || '';
    fClienteNif.value       = factura.cliente?.nif      || '';
    fClienteDir.value       = factura.cliente?.direccion || '';
    fFechaEmision.value     = factura.fechaEmision      || today;
    fFechaVencimiento.value = factura.fechaVencimiento  || in30;
    fEstado.value           = factura.estado            || 'borrador';
    fIva.value              = factura.impuesto          ?? 21;
    fNotas.value            = factura.notas             || '';
    conceptos               = (factura.conceptos || []).map(c => ({ ...c }));
    btnPdf.disabled         = false;
  } else {
    document.getElementById('form-titulo').textContent = 'Nueva factura';
    fClienteNombre.value    = '';
    fClienteEmail.value     = '';
    fClienteNif.value       = '';
    fClienteDir.value       = '';
    fFechaEmision.value     = today;
    fFechaVencimiento.value = in30;
    fEstado.value           = 'borrador';
    fIva.value              = 21;
    fNotas.value            = '';
    conceptos               = [];
    btnPdf.disabled         = true;
  }

  renderConceptos();
  formEl.classList.add('visible');
  listaEl.style.display = 'none';
  formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  formEl.classList.remove('visible');
  listaEl.style.display = '';
  editingId = null;
  conceptos = [];
}

// ─── Generación de PDF ────────────────────────────────────────────────────────
function generatePDF(factura) {
  if (!window.jspdf) { alert('La librería PDF no está disponible. Recarga la página.'); return; }
  const { jsPDF } = window.jspdf;
  const pdfdoc = new jsPDF({ unit: 'mm', format: 'a4' });

  const blue = [37, 99, 235];
  const dark = [15, 23, 42];
  const gray = [100, 116, 139];
  const light = [241, 245, 249];

  // Cabecera azul
  pdfdoc.setFillColor(...blue);
  pdfdoc.rect(0, 0, 210, 36, 'F');

  pdfdoc.setTextColor(255, 255, 255);
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(24);
  pdfdoc.text('NODE', 15, 20);

  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(10);
  pdfdoc.text('Gestión empresarial', 15, 28);

  // Número y estado
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(14);
  pdfdoc.text(factura.numero || 'FACTURA', 195, 16, { align: 'right' });
  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(9);
  pdfdoc.text('Estado: ' + (factura.estado || '').toUpperCase(), 195, 24, { align: 'right' });

  // Fechas
  pdfdoc.setTextColor(...dark);
  pdfdoc.setFontSize(9);
  pdfdoc.text('Fecha emisión: ' + (factura.fechaEmision || '—'), 195, 46, { align: 'right' });
  if (factura.fechaVencimiento) {
    pdfdoc.text('Vencimiento: ' + factura.fechaVencimiento, 195, 52, { align: 'right' });
  }

  // Datos del cliente
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text('CLIENTE', 15, 46);

  pdfdoc.setTextColor(...dark);
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(11);
  pdfdoc.text(factura.cliente?.nombre || '—', 15, 53);

  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setFontSize(9);
  pdfdoc.setTextColor(...gray);
  let cy = 59;
  if (factura.cliente?.nif)       { pdfdoc.text('NIF/CIF: ' + factura.cliente.nif, 15, cy); cy += 5; }
  if (factura.cliente?.email)     { pdfdoc.text(factura.cliente.email, 15, cy); cy += 5; }
  if (factura.cliente?.direccion) { pdfdoc.text(factura.cliente.direccion, 15, cy); cy += 5; }

  // Separador
  pdfdoc.setDrawColor(226, 232, 240);
  pdfdoc.line(15, 78, 195, 78);

  // Cabecera tabla
  let y = 86;
  pdfdoc.setFillColor(...light);
  pdfdoc.rect(15, y - 5, 180, 9, 'F');
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text('DESCRIPCIÓN', 18, y);
  pdfdoc.text('CANT.', 118, y, { align: 'right' });
  pdfdoc.text('PRECIO UNIT.', 155, y, { align: 'right' });
  pdfdoc.text('SUBTOTAL', 193, y, { align: 'right' });

  y += 7;
  pdfdoc.setFont('helvetica', 'normal');
  pdfdoc.setTextColor(...dark);

  (factura.conceptos || []).forEach((c, idx) => {
    if (y > 255) {
      pdfdoc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      pdfdoc.setFillColor(248, 250, 252);
      pdfdoc.rect(15, y - 5, 180, 8, 'F');
    }
    pdfdoc.setFontSize(9);
    const descLines = pdfdoc.splitTextToSize(c.descripcion || '—', 95);
    pdfdoc.text(descLines, 18, y);
    pdfdoc.text(String(c.cantidad), 118, y, { align: 'right' });
    pdfdoc.text(fmtEur(c.precioUnitario), 155, y, { align: 'right' });
    pdfdoc.text(fmtEur(c.subtotal), 193, y, { align: 'right' });
    y += Math.max(8, descLines.length * 5);
  });

  // Totales
  y += 6;
  pdfdoc.setDrawColor(226, 232, 240);
  pdfdoc.line(130, y, 195, y);
  y += 6;

  const iva       = factura.impuesto || 0;
  const ivaAmount = (factura.subtotal || 0) * (iva / 100);

  pdfdoc.setFontSize(9);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text('Base imponible:', 132, y);
  pdfdoc.setTextColor(...dark);
  pdfdoc.text(fmtEur(factura.subtotal || 0), 193, y, { align: 'right' });
  y += 7;

  pdfdoc.setTextColor(...gray);
  pdfdoc.text(`IVA (${iva}%):`, 132, y);
  pdfdoc.setTextColor(...dark);
  pdfdoc.text(fmtEur(ivaAmount), 193, y, { align: 'right' });
  y += 3;

  pdfdoc.setDrawColor(226, 232, 240);
  pdfdoc.line(130, y, 195, y);
  y += 6;

  pdfdoc.setFillColor(...blue);
  pdfdoc.rect(130, y - 5, 65, 11, 'F');
  pdfdoc.setFont('helvetica', 'bold');
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor(255, 255, 255);
  pdfdoc.text('TOTAL', 133, y + 2);
  pdfdoc.text(fmtEur(factura.total || 0), 193, y + 2, { align: 'right' });

  // Notas
  if (factura.notas) {
    y += 18;
    pdfdoc.setFont('helvetica', 'bold');
    pdfdoc.setFontSize(8);
    pdfdoc.setTextColor(...gray);
    pdfdoc.text('NOTAS', 15, y);
    y += 5;
    pdfdoc.setFont('helvetica', 'normal');
    pdfdoc.setFontSize(9);
    pdfdoc.setTextColor(...dark);
    const notaLines = pdfdoc.splitTextToSize(factura.notas, 170);
    pdfdoc.text(notaLines, 15, y);
  }

  // Pie de página
  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor(...gray);
  pdfdoc.text(
    'Generado por NODE · ' + new Date().toLocaleDateString('es-ES'),
    105, 288, { align: 'center' }
  );

  pdfdoc.save(`${factura.numero || 'factura'}.pdf`);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function fmtEur(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
btnNueva.addEventListener('click', () => showForm(null));
btnCancelar.addEventListener('click', hideForm);
btnAddConcepto.addEventListener('click', () => addConcepto());
filtroEstado.addEventListener('change', renderLista);

btnGuardar.addEventListener('click', () => saveFactura(fEstado.value));

btnGuardarEmitir.addEventListener('click', () => {
  fEstado.value = 'emitida';
  saveFactura('emitida');
});

btnPdf.addEventListener('click', () => {
  if (!editingId) return;
  const f = facturas.find(x => x.id === editingId);
  if (f) generatePDF(f);
});

fIva.addEventListener('input', updateTotals);

// Delegación de eventos para la tabla de conceptos
conceptosBody.addEventListener('input', e => {
  const el = e.target;
  const i  = parseInt(el.dataset.i);
  if (isNaN(i)) return;
  updateConcepto(i, el.dataset.f, el.value);
});

conceptosBody.addEventListener('click', e => {
  const btn = e.target.closest('[data-del]');
  if (btn) removeConcepto(parseInt(btn.dataset.del));
});

// ─── API pública (usada por onclick en el HTML renderizado) ───────────────────
window._cont = {
  edit: (id) => {
    const f = facturas.find(x => x.id === id);
    if (f) showForm(f);
  },
  del: deleteFactura,
  pdf: (id) => {
    const f = facturas.find(x => x.id === id);
    if (f) generatePDF(f);
  }
};

// ─── Inicialización tras autenticación ───────────────────────────────────────
document.addEventListener('appReady', async ({ detail }) => {
  uid = detail.user.uid;

  const name     = detail.profile?.displayName || detail.profile?.email || '?';
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-display-name');
  const emailEl  = document.getElementById('user-display-email');

  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = detail.profile?.displayName ? detail.user.email : '';

  await fetchFacturas();

  // Soporte para redirección desde el chatbot (?nuevo=true&cliente=X)
  const params  = new URLSearchParams(window.location.search);
  if (params.get('nuevo') === 'true') {
    showForm(null);
    const cliente = params.get('cliente');
    if (cliente) fClienteNombre.value = decodeURIComponent(cliente);
  }
});
