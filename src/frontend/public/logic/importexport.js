// importexport.js — Importador / Exportador CSV/Excel para NodeTech
// Clase: ImportExportManager
// Soporta: clientes, empleados, tarifas, citas
// Requiere: window.db, window.fs, window.firebaseUser

class ImportExportManager {
    constructor(navigationManager) {
        this.navManager = navigationManager;
        this._unsubs = [];
    }

    destroy() {
        this._unsubs.forEach(u => u?.());
        this._unsubs = [];
    }

    // ── Esquemas de columnas por entidad ─────────────────────────
    static get SCHEMAS() {
        return {
            clientes: {
                label: 'Clientes',
                icon: 'fa-users',
                color: 'text-teal-400',
                col: 'clientes',
                cols: ['nombre', 'telefono', 'email', 'notas'],
                colsLabel: ['Nombre *', 'Telefono', 'Email', 'Notas'],
                ejemplo: [
                    ['Ana Garcia', '600123456', 'ana@email.com', 'Cliente VIP'],
                    ['Juan Lopez', '611987654', '', ''],
                ]
            },
            empleados: {
                label: 'Empleados',
                icon: 'fa-user-tie',
                color: 'text-blue-400',
                col: 'empleados',
                cols: ['nombre', 'puesto', 'telefono', 'email', 'salario'],
                colsLabel: ['Nombre *', 'Puesto', 'Telefono', 'Email', 'Salario (EUR)'],
                ejemplo: [
                    ['Maria Sanchez', 'Esteticista', '620111222', 'maria@salon.com', '1400'],
                    ['Carlos Ruiz', 'Barbero', '630333444', '', '1200'],
                ]
            },
            tarifas: {
                label: 'Tarifas / Servicios',
                icon: 'fa-tags',
                color: 'text-amber-400',
                col: 'tarifas',
                cols: ['nombre', 'precio'],
                colsLabel: ['Nombre del servicio *', 'Precio (EUR) *'],
                ejemplo: [
                    ['Corte de pelo', '15'],
                    ['Tinte completo', '45'],
                    ['Manicura', '20'],
                ]
            },
            citas: {
                label: 'Citas',
                icon: 'fa-calendar-day',
                color: 'text-purple-400',
                col: 'citas',
                cols: ['cliente', 'servicio', 'fecha', 'hora', 'horaFin', 'precio', 'recurso', 'notas'],
                colsLabel: ['Cliente *', 'Servicio *', 'Fecha (YYYY-MM-DD) *', 'Hora inicio *', 'Hora fin', 'Precio (EUR)', 'Empleado', 'Notas'],
                ejemplo: [
                    ['Ana Garcia', 'Corte de pelo', '2026-05-01', '10:00', '10:30', '15', 'Maria', ''],
                    ['Juan Lopez', 'Tinte completo', '2026-05-02', '11:00', '12:00', '45', '', ''],
                ]
            },
        };
    }

    render() {
        const schemas = ImportExportManager.SCHEMAS;
        return `
        <div class="space-y-5 max-w-3xl mx-auto">
            <div class="flex items-center gap-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                <h1 class="text-2xl font-bold text-white">
                    <i class="fas fa-file-excel text-emerald-400 mr-2"></i>Importar / Exportar
                </h1>
                <span class="text-xs text-slate-500">Mueve tus datos entre Excel y NodeTech</span>
            </div>

            <!-- TABS -->
            <div class="flex gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl">
                <button id="ie-tab-importar" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-[rgba(43,147,166,0.2)] text-[#38BDF8] transition">
                    <i class="fas fa-upload mr-1.5"></i>Importar
                </button>
                <button id="ie-tab-exportar" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                    <i class="fas fa-download mr-1.5"></i>Exportar
                </button>
            </div>

            <!-- ════ IMPORTAR ════ -->
            <div id="ie-panel-importar" class="space-y-4">

                <!-- Selector de entidad -->
                <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
                    <p class="text-sm font-bold text-slate-300">Que quieres importar?</p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="ie-entity-grid">
                        ${Object.entries(schemas).map(([key, s], idx) => `
                        <label class="ie-entity-opt cursor-pointer">
                            <input type="radio" name="ie-entidad" value="${key}" class="hidden" ${idx === 0 ? 'checked' : ''}>
                            <div class="ie-entity-card border rounded-xl p-3 text-center transition hover:border-[rgba(43,147,166,0.4)] ${idx === 0 ? 'border-[#2B93A6] bg-[rgba(43,147,166,0.1)]' : 'border-[rgba(255,255,255,0.08)]'}">
                                <i class="fas ${s.icon} ${s.color} text-xl mb-1 block"></i>
                                <span class="text-xs font-semibold text-white">${s.label}</span>
                            </div>
                        </label>`).join('')}
                    </div>

                    <!-- Descarga plantilla -->
                    <div class="flex items-center gap-3 pt-2 border-t border-[rgba(255,255,255,0.07)]">
                        <span class="text-xs text-slate-400">Sin archivo? Descarga la plantilla:</span>
                        <button id="ie-btn-plantilla" class="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                            <i class="fas fa-file-download text-emerald-400"></i> Descargar plantilla .csv
                        </button>
                    </div>
                </div>

                <!-- Zona de drop / upload -->
                <div id="ie-dropzone"
                    class="border-2 border-dashed border-[rgba(43,147,166,0.35)] rounded-xl p-10 text-center cursor-pointer hover:border-[#2B93A6] hover:bg-[rgba(43,147,166,0.04)] transition">
                    <i class="fas fa-cloud-upload-alt text-[#38BDF8] text-3xl mb-3 block"></i>
                    <p class="text-sm font-semibold text-white mb-1">Arrastra tu archivo aqui</p>
                    <p class="text-xs text-slate-500 mb-3">CSV o Excel (.xlsx) — max. 5 MB</p>
                    <button id="ie-btn-browse" class="btn-primary px-4 py-2 rounded-lg text-sm">Seleccionar archivo</button>
                    <input type="file" id="ie-file-input" accept=".csv,.xlsx,.xls" class="hidden">
                </div>

                <!-- Mapeador + previsualización -->
                <div id="ie-preview-wrapper" class="hidden space-y-3">
                    <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                        <div class="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between">
                            <span class="text-sm font-bold text-white" id="ie-preview-titulo">Vista previa</span>
                            <span class="text-xs text-slate-500" id="ie-preview-count"></span>
                        </div>
                        <!-- Mapeador de columnas -->
                        <div id="ie-mapper" class="p-4 border-b border-[rgba(255,255,255,0.07)]"></div>
                        <!-- Tabla preview -->
                        <div class="overflow-x-auto max-h-52 overflow-y-auto">
                            <table id="ie-preview-table" class="w-full text-xs"></table>
                        </div>
                    </div>
                    <button id="ie-btn-importar" class="w-full btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        <i class="fas fa-database"></i> Importar a NodeTech
                    </button>
                </div>

                <!-- Resultado final -->
                <div id="ie-resultado" class="hidden glass border border-emerald-500/30 rounded-xl p-6 text-center space-y-2">
                    <i class="fas fa-check-circle text-emerald-400 text-3xl"></i>
                    <p class="text-base font-bold text-white" id="ie-resultado-msg"></p>
                    <p class="text-xs text-slate-400" id="ie-resultado-sub"></p>
                    <button id="ie-btn-reiniciar" class="btn-secondary px-4 py-2 rounded-lg text-sm mt-2">Importar otro archivo</button>
                </div>
            </div>

            <!-- ════ EXPORTAR ════ -->
            <div id="ie-panel-exportar" class="hidden space-y-4">
                <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
                    <div class="px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
                        <p class="text-sm font-bold text-white">Selecciona que exportar</p>
                        <p class="text-xs text-slate-500 mt-0.5">Genera un CSV listo para abrir en Excel</p>
                    </div>
                    <div class="divide-y divide-[rgba(255,255,255,0.06)]">
                        ${Object.entries(schemas).map(([key, s]) => `
                        <div class="flex items-center justify-between px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition">
                            <div class="flex items-center gap-3">
                                <i class="fas ${s.icon} ${s.color} w-5 text-center"></i>
                                <div>
                                    <p class="text-sm font-semibold text-white">${s.label}</p>
                                    <p class="text-xs text-slate-500" id="ie-exp-count-${key}">...</p>
                                </div>
                            </div>
                            <button data-export="${key}" class="ie-btn-export btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                <i class="fas fa-download text-emerald-400"></i> Exportar CSV
                            </button>
                        </div>`).join('')}
                    </div>
                </div>

                <div class="glass border border-[rgba(255,255,255,0.08)] rounded-xl p-4 flex items-start gap-3">
                    <i class="fas fa-info-circle text-[#38BDF8] mt-0.5 flex-shrink-0 text-sm"></i>
                    <p class="text-xs text-slate-400">El CSV usa <strong class="text-white">punto y coma (;)</strong> como separador para compatibilidad con Excel en espanol. Si los valores aparecen en una sola columna, abre con <em>Datos &rarr; Desde texto/CSV</em> y elige separador <strong class="text-white">;</strong></p>
                </div>
            </div>
        </div>`;
    }

    async setupListeners() {
        const schemas = ImportExportManager.SCHEMAS;
        let entidadActual = 'clientes';
        let filasParseadas = [];
        let headersSrc = [];

        // ── Tabs ────────────────────────────────────────────────
        const activarTab = (tab) => {
            ['importar', 'exportar'].forEach(t => {
                document.getElementById(`ie-panel-${t}`)?.classList.toggle('hidden', t !== tab);
                const btn = document.getElementById(`ie-tab-${t}`);
                btn?.classList.toggle('bg-[rgba(43,147,166,0.2)]', t === tab);
                btn?.classList.toggle('text-[#38BDF8]', t === tab);
                btn?.classList.toggle('text-slate-400', t !== tab);
            });
            if (tab === 'exportar') this._actualizarContadores(schemas);
        };
        document.getElementById('ie-tab-importar')?.addEventListener('click', () => activarTab('importar'));
        document.getElementById('ie-tab-exportar')?.addEventListener('click', () => activarTab('exportar'));

        // ── Selector de entidad ──────────────────────────────────
        document.querySelectorAll('input[name="ie-entidad"]').forEach(radio => {
            radio.addEventListener('change', () => {
                entidadActual = radio.value;
                document.querySelectorAll('.ie-entity-card').forEach(card => {
                    card.classList.remove('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.1)]');
                    card.classList.add('border-[rgba(255,255,255,0.08)]');
                });
                const card = radio.closest('.ie-entity-opt')?.querySelector('.ie-entity-card');
                card?.classList.add('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.1)]');
                card?.classList.remove('border-[rgba(255,255,255,0.08)]');
                this._resetImport();
                filasParseadas = [];
                headersSrc = [];
            });
        });

        // ── Descarga plantilla ───────────────────────────────────
        document.getElementById('ie-btn-plantilla')?.addEventListener('click', () => {
            const s = schemas[entidadActual];
            this._descargarCSV([s.colsLabel, ...s.ejemplo], `plantilla_${entidadActual}.csv`);
        });

        // ── Upload / Drag & Drop ─────────────────────────────────
        const dropzone  = document.getElementById('ie-dropzone');
        const fileInput = document.getElementById('ie-file-input');

        document.getElementById('ie-btn-browse')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files[0]) this._procesarArchivo(e.target.files[0], entidadActual, schemas, (filas, headers) => {
                filasParseadas = filas; headersSrc = headers;
                this._mostrarPreview(filas, headers, entidadActual, schemas);
            });
        });

        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.05)]');
        });
        dropzone?.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.05)]');
        });
        dropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-[#2B93A6]', 'bg-[rgba(43,147,166,0.05)]');
            const file = e.dataTransfer.files[0];
            if (file) this._procesarArchivo(file, entidadActual, schemas, (filas, headers) => {
                filasParseadas = filas; headersSrc = headers;
                this._mostrarPreview(filas, headers, entidadActual, schemas);
            });
        });

        // ── Botón importar ───────────────────────────────────────
        document.getElementById('ie-btn-importar')?.addEventListener('click', async () => {
            if (!filasParseadas.length) return;
            await this._ejecutarImportacion(filasParseadas, entidadActual, schemas);
        });

        // ── Reiniciar ────────────────────────────────────────────
        document.getElementById('ie-btn-reiniciar')?.addEventListener('click', () => {
            this._resetImport();
            filasParseadas = [];
            headersSrc = [];
        });

        // ── Exportar ─────────────────────────────────────────────
        document.querySelectorAll('.ie-btn-export').forEach(btn => {
            btn.addEventListener('click', () => this._exportar(btn.dataset.export, schemas));
        });
    }

    // ── Parsear archivo ──────────────────────────────────────────
    _procesarArchivo(file, entidad, schemas, callback) {
        if (file.size > 5 * 1024 * 1024) {
            this.navManager?.showNotification('Archivo demasiado grande (max 5 MB)', 'error');
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'csv') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = this._parsearCSV(e.target.result);
                    if (!result.filas.length) throw new Error('vacio');
                    callback(result.filas, result.headers);
                } catch {
                    this.navManager?.showNotification('No se pudo leer el CSV. Comprueba el formato.', 'error');
                }
            };
            reader.readAsText(file, 'UTF-8');
        } else if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = this._parsearXLSX(e.target.result);
                    if (!result.filas.length) throw new Error('vacio');
                    callback(result.filas, result.headers);
                } catch {
                    this.navManager?.showNotification('Error leyendo Excel. Guarda el archivo como CSV e intentalo de nuevo.', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            this.navManager?.showNotification('Formato no soportado. Usa .csv o .xlsx', 'error');
        }
    }

    _parsearCSV(texto) {
        // Detectar separador: ; o ,
        const primeraLinea = texto.split('\n')[0];
        const sep = primeraLinea.split(';').length > primeraLinea.split(',').length ? ';' : ',';
        const lineas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim());
        const headers = lineas[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const filas = lineas.slice(1).map(l => {
            const vals = this._splitCSVLine(l, sep);
            const obj = {};
            headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
            return obj;
        }).filter(f => Object.values(f).some(v => v));
        return { filas, headers };
    }

    _splitCSVLine(line, sep) {
        // Respeta campos entre comillas que puedan contener el separador
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === sep && !inQuotes) { result.push(current); current = ''; continue; }
            current += ch;
        }
        result.push(current);
        return result;
    }

    _parsearXLSX(buffer) {
        // Parser XLSX básico (sin librerías): extrae strings compartidos + primera hoja
        const txt = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));

        // Strings compartidos
        const strings = [];
        const sstMatch = txt.match(/<sst[^>]*>([\s\S]*?)<\/sst>/);
        if (sstMatch) {
            const tMatches = [...sstMatch[1].matchAll(/<si>[\s\S]*?<t[^>]*>([^<]*)<\/t>[\s\S]*?<\/si>/g)];
            tMatches.forEach(m => strings.push(m[1]));
        }

        // Primera hoja
        const sheetMatch = txt.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
        if (!sheetMatch) throw new Error('Sin sheetData');

        const rowMatches = [...sheetMatch[1].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
        const tabla = rowMatches.map(rowM => {
            // Celdas con tipo string (t="s") referencian strings compartidos; el resto valor directo
            const cellRx = /<c[^>]*>[\s\S]*?<\/c>/g;
            const cells = [...rowM[1].matchAll(cellRx)];
            return cells.map(cellM => {
                const cellStr = cellM[0];
                const isShared = /t="s"/.test(cellStr);
                const vMatch = cellStr.match(/<v>([^<]*)<\/v>/);
                if (!vMatch) return '';
                return isShared ? (strings[parseInt(vMatch[1])] || '') : vMatch[1];
            });
        });

        if (!tabla.length) throw new Error('Sin datos');
        const headers = tabla[0].map(h => String(h).trim().toLowerCase());
        const filas = tabla.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim(); });
            return obj;
        }).filter(f => Object.values(f).some(v => v));
        return { filas, headers };
    }

    // ── Mapeador visual ──────────────────────────────────────────
    _mostrarPreview(filas, headers, entidad, schemas) {
        if (!filas.length) {
            this.navManager?.showNotification('El archivo está vacío', 'error');
            return;
        }
        const s = schemas[entidad];
        document.getElementById('ie-dropzone')?.classList.add('hidden');
        document.getElementById('ie-preview-wrapper')?.classList.remove('hidden');
        document.getElementById('ie-preview-titulo').textContent = `Vista previa — ${s.label}`;
        document.getElementById('ie-preview-count').textContent = `${filas.length} registros detectados`;

        // Auto-matching de columnas
        const autoMatch = (col) => {
            const norm = (str) => this._normalizar(str);
            return headers.find(h =>
                norm(h) === norm(col) ||
                norm(h).includes(norm(col)) ||
                norm(col).includes(norm(h))
            ) || '';
        };

        const mapper = document.getElementById('ie-mapper');
        mapper.innerHTML = `
            <p class="text-xs text-slate-400 mb-2 font-semibold">Indica que columna de tu archivo corresponde a cada campo:</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${s.cols.map((col, i) => {
                const matched = autoMatch(col);
                return `<div>
                    <label class="block text-[10px] text-slate-400 mb-0.5 font-semibold">${s.colsLabel[i]}</label>
                    <select data-map-col="${col}" class="w-full px-2 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2B93A6]">
                        <option value="">(ignorar)</option>
                        ${headers.map(h => `<option value="${h}" ${h === matched ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                </div>`;
            }).join('')}
            </div>`;

        // Tabla preview — primeras 5 filas
        const table = document.getElementById('ie-preview-table');
        const preview = filas.slice(0, 5);
        table.innerHTML = `
            <thead><tr class="bg-[rgba(255,255,255,0.03)]">${headers.map(h =>
                `<th class="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">${this._escHtml(h)}</th>`
            ).join('')}</tr></thead>
            <tbody>${preview.map(f =>
                `<tr class="border-t border-[rgba(255,255,255,0.05)]">${headers.map(h =>
                    `<td class="px-3 py-1.5 text-slate-300 whitespace-nowrap">${this._escHtml(f[h] || '')}</td>`
                ).join('')}</tr>`
            ).join('')}</tbody>`;
    }

    // ── Ejecutar importación ─────────────────────────────────────
    async _ejecutarImportacion(filas, entidad, schemas) {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;
        if (!db || !uid) { this.navManager?.showNotification('Sin conexion a Firebase', 'error'); return; }

        const { collection, addDoc, serverTimestamp } = window.fs;
        const s = schemas[entidad];

        // Leer mapping del DOM
        const mapping = {};
        document.querySelectorAll('[data-map-col]').forEach(sel => {
            if (sel.value) mapping[sel.dataset.mapCol] = sel.value;
        });

        const colRequerida = s.cols[0];
        if (!mapping[colRequerida]) {
            this.navManager?.showNotification(`Debes mapear la columna "${s.colsLabel[0]}"`, 'error');
            return;
        }

        const registros = filas.map(f => {
            const obj = { createdAt: serverTimestamp() };
            s.cols.forEach(col => {
                if (mapping[col]) obj[col] = f[mapping[col]] || '';
            });
            // Conversiones numéricas
            if (obj.precio  !== undefined) obj.precio  = parseFloat(obj.precio)  || 0;
            if (obj.salario !== undefined) obj.salario = parseFloat(obj.salario) || 0;
            return obj;
        }).filter(o => o[colRequerida]);

        if (!registros.length) {
            this.navManager?.showNotification('Ningun registro valido encontrado', 'error');
            return;
        }

        const btn = document.getElementById('ie-btn-importar');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Importando...'; }

        let ok = 0, err = 0;
        for (const reg of registros) {
            try {
                await addDoc(collection(db, 'users', uid, s.col), reg);
                ok++;
            } catch { err++; }
        }

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-database mr-2"></i>Importar a NodeTech'; }

        document.getElementById('ie-preview-wrapper')?.classList.add('hidden');
        const res = document.getElementById('ie-resultado');
        res?.classList.remove('hidden');
        document.getElementById('ie-resultado-msg').textContent =
            `${ok} ${s.label.toLowerCase()} importados correctamente`;
        document.getElementById('ie-resultado-sub').textContent =
            err ? `${err} filas ignoradas por error` : 'Todos los registros guardados en Firestore';
    }

    // ── Exportar ─────────────────────────────────────────────────
    async _exportar(entidad, schemas) {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;
        if (!db || !uid) { this.navManager?.showNotification('Sin conexion', 'error'); return; }

        const { collection, getDocs } = window.fs;
        const s = schemas[entidad];
        const btn = document.querySelector(`[data-export="${entidad}"]`);
        const originalHTML = btn?.innerHTML;
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Exportando...';

        try {
            const snap = await getDocs(collection(db, 'users', uid, s.col));
            const docs = snap.docs.map(d => d.data());

            const cabecera = s.colsLabel;
            const filas = docs.map(d => s.cols.map(col => {
                const v = d[col];
                if (v === undefined || v === null) return '';
                // Firestore Timestamp → fecha legible
                if (typeof v === 'object' && v.seconds) {
                    return new Date(v.seconds * 1000).toLocaleDateString('es-ES');
                }
                return String(v);
            }));

            this._descargarCSV([cabecera, ...filas],
                `nodetech_${entidad}_${new Date().toISOString().split('T')[0]}.csv`);
            this.navManager?.showNotification(`${docs.length} registros exportados`, 'success');
        } catch {
            this.navManager?.showNotification('Error al exportar', 'error');
        }

        if (btn) btn.innerHTML = originalHTML;
    }

    // ── Contadores en panel Exportar ─────────────────────────────
    async _actualizarContadores(schemas) {
        const db  = window.db;
        const uid = window.firebaseUser?.uid;
        if (!db || !uid) return;
        const { collection, getDocs } = window.fs;

        for (const [key, s] of Object.entries(schemas)) {
            const el = document.getElementById(`ie-exp-count-${key}`);
            if (!el) continue;
            try {
                // Usar cache de DataManager si está disponible
                const cacheKey = key; // clientes, empleados, tarifas, citas
                const cache = window.dataManager?.cache?.[cacheKey];
                if (cache) {
                    el.textContent = `${cache.length} registros en NodeTech`;
                } else {
                    const snap = await getDocs(collection(db, 'users', uid, s.col));
                    el.textContent = `${snap.size} registros en NodeTech`;
                }
            } catch {
                el.textContent = '—';
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────
    _descargarCSV(filas, nombre) {
        const bom = '\uFEFF'; // BOM para Excel en Windows (tildes y ñ)
        const csv = bom + filas.map(fila =>
            fila.map(v => {
                const s = String(v ?? '').replace(/"/g, '""');
                return (s.includes(';') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s;
            }).join(';')
        ).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = nombre; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    _resetImport() {
        document.getElementById('ie-dropzone')?.classList.remove('hidden');
        document.getElementById('ie-preview-wrapper')?.classList.add('hidden');
        document.getElementById('ie-resultado')?.classList.add('hidden');
        const fi = document.getElementById('ie-file-input');
        if (fi) fi.value = '';
    }

    _normalizar(str) {
        return String(str).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[\s_\-]+/g, '');
    }

    _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
