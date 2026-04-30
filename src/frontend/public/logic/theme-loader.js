// ═══════════════════════════════════════════════════════════════════
// THEME-LOADER.JS — Lee el tipo de negocio y aplica la terminología
// Requiere: business-config.js cargado antes en el HTML
// ═══════════════════════════════════════════════════════════════════

(function () {
  const cfg  = BUSINESS_CONFIG.otros;

  // Exponer globalmente para que navigation.js / dental_navigation.js lo usen
  window.BCONFIG = cfg;

  document.addEventListener('DOMContentLoaded', () => {

    // ── Reemplaza texto en [data-label] ────────────────────────────
    document.querySelectorAll('[data-label]').forEach(el => {
      const key = el.dataset.label;
      if (cfg[key] !== undefined) el.textContent = cfg[key];
    });

    // ── Reemplaza placeholder en [data-placeholder] ────────────────
    document.querySelectorAll('[data-placeholder]').forEach(el => {
      const key = el.dataset.placeholder;
      if (cfg[key] !== undefined) el.placeholder = cfg[key];
    });

    // ── Rellena el select de servicios dinámicamente ───────────────
    const select = document.getElementById('cita-servicio');
    if (select && cfg.servicios?.length) {
      select.innerHTML = `<option value="" class="bg-[#0f1e35]">${cfg.placeholderServicio}</option>`;
      cfg.servicios.forEach(({ grupo, color, items }) => {
        const og = document.createElement('optgroup');
        og.label       = grupo;
        og.style.color = color;
        items.forEach(item => {
          const opt = document.createElement('option');
          opt.value     = item;
          opt.textContent = item;
          opt.className = 'bg-[#0f1e35]';
          og.appendChild(opt);
        });
        select.appendChild(og);
      });
    }

    // ── Actualiza el título de la pestaña ──────────────────────────
    if (cfg.businessName) {
      document.title = `NODE TECH | ${cfg.businessName}`;
    }

  });
})();
