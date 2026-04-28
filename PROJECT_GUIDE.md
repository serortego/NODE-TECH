# NODE TECH — Guía del Proyecto

> **Actualización continua**: este archivo documenta la arquitectura real y el estado actual del proyecto. Actualízalo con cada cambio relevante.

---

## Descripción General

NODE TECH es una aplicación web SPA (Single Page Application) de gestión empresarial con:
- Autenticación (email/contraseña + Google) vía Firebase Auth
- Base de datos en tiempo real con Cloud Firestore
- UI moderna con Tailwind CSS + glassmorphism
- Chatbot/Asistente integrado con acceso a todos los módulos
- Gestión de: Agenda, Clientes, Empleados, Finanzas y Contabilidad

---

## Estructura de Archivos

```
NODE/
├── PROJECT_GUIDE.md              ← Este archivo
├── firebase.json                 ← Configuración Firebase Hosting
├── firestore.rules               ← Reglas de seguridad Firestore
├── firestore.indexes.json        ← Índices de Firestore
├── package.json
│
├── config/
│   └── requirements.txt          ← Dependencias Python (backend futuro)
│
└── src/
    ├── backend/
    │   └── backend.py            ← Backend Python (en desarrollo)
    │
    └── frontend/
        ├── styles/
        │   └── main.css
        │
        ├── js/                   ← (legacy / experimental)
        │   ├── app.js
        │   ├── modules/
        │   │   ├── auth.js
        │   │   ├── command-processor.js
        │   │   ├── firebase-config.js
        │   │   └── reset-data.js
        │   └── views/
        │       ├── agenda.js, asistente.js, ayuda.js
        │       ├── clientes.js, empleados.js
        │       ├── finanzas.js, inicio.js
        │
        └── public/               ← CÓDIGO ACTIVO (lo que sirve el sitio)
            ├── index.html        ← Redirige a welcome_page.html
            │
            ├── visual/           ← Todas las páginas HTML
            │   ├── welcome_page.html   ← Página de bienvenida/landing
            │   ├── sign_up.html        ← Registro
            │   ├── inicio.html         ← App principal (SPA)
            │   ├── agenda.html
            │   ├── chatbot.html
            │   ├── clientes.html
            │   ├── contabilidad.html
            │   ├── empleados.html
            │   ├── finanzas.html
            │
            └── logic/            ← Toda la lógica JS activa
                ├── firebase-config.js  ← Inicialización Firebase
                ├── auth.js             ← Auth guard + funciones de sesión
                ├── DataManager.js      ← Gestor central de datos (Firestore)
                ├── navigation.js       ← Router SPA + todos los Managers
                ├── chatbot.js          ← ChatbotManager
                ├── agenda.js
                ├── clientes.js
                ├── contabilidad.js
                ├── empleados.js
                ├── finanzas.js
                ├── inicio.js
                └── sign_up.js
```

---

## Flujo de la Aplicación

```
Usuario llega a /
    ↓
index.html → redirige a welcome_page.html
    ↓
welcome_page.html  (landing con CTA "Entrar" / "Registrarse")
    ↓                           ↓
sign_up.html               inicio.html (app principal)
(Registro)                      ↓
    ↓               auth.js carga → verifica sesión
    └──────────────→     ↓ autenticado
                    DataManager.js inicia listeners Firestore
                    dispara evento 'appReady'
                         ↓
                    navigation.js carga la vista 'dashboard' por defecto
                         ↓
                    NavigationManager gestiona el router hash-based
```

---

## Módulos Principales

### `firebase-config.js`
- Inicializa Firebase con `initializeApp`.
- Exporta `auth` y `db` usados por todos los módulos.
- Firebase SDK: versión **10.14.1** (CDN modular).
- Proyecto Firebase: `node-tech` (id: `node-tech`).

### `auth.js`
- Auth guard: oculta `body` con CSS hasta confirmar sesión.
- Si no hay sesión → redirige a `welcome_page.html`.
- Funciones exportadas: `registerWithEmail`, `loginWithEmail`, `loginWithGoogle`, `logoutUser`.
- Globales expuestos en páginas protegidas: `window.db`, `window.firebaseUser`, `window.firebaseProfile`, `window.firebaseSignOut`, `window.fs`.
- Dispara evento `appReady` al confirmar autenticación.

### `DataManager.js`
- **Corazón del sistema**: fuente única de verdad para todos los módulos.
- Mantiene caché local de: `empleados`, `clientes`, `servicios`, `citas`, `finanzas`.
- Usa `onSnapshot` para sincronización en tiempo real con Firestore.
- Patrón observador: los managers se suscriben con `dataManager.suscribirse('colección', callback)`.
- Instancia global: `window.dataManager`.

### `navigation.js`
- Contiene **NavigationManager** + todos los Managers de módulo en un único archivo.
- Router basado en `data-view` de los elementos de la barra lateral.
- Vistas disponibles: `dashboard`, `asistente`, `agenda`, `finanzas`, `empleados`, `clientes`, `contabilidad`.
- Cada vista instancia su propio Manager, que tiene `render()` y `setupListeners()`.
- Al cambiar de vista se llama `manager.destroy()` para limpiar listeners anteriores.

### `chatbot.js` — ChatbotManager
- Asistente conversacional con contexto de conversación (`accionPendiente`, `datosCliente`, `datoCita`).
- Solo pide información esencial al usuario.
- Acciones soportadas: crear citas, crear clientes, buscar empleados/clientes, resumen del día.
- Usa `DataManager` para leer y escribir en Firestore.

---

## Estructura Firestore

```
firestore/
├── users/{uid}
│   ├── email, displayName, role ("user"|"admin")
│   ├── status ("active"|"disabled")
│   └── createdAt, lastLoginAt
│
├── citas/{citaId}         ← Appointments
├── clientes/{clienteId}   ← CRM
├── empleados/{empleadoId} ← Staff
├── finanzas/{finanzaId}   ← Ingresos/Gastos
└── servicios/{servicioId} ← Catálogo de servicios
```

---

## Diseño y Estilos

- **Framework CSS**: Tailwind CSS (CDN).
- **Fuentes**: Inter + Space Grotesk (Google Fonts).
- **Paleta principal**:
  - Fondo: `#060D1A` (navy oscuro)
  - Teal: `#2B93A6` / `#38BDF8`
  - Cards glassmorphism: `rgba(255,255,255,0.04)` con `backdrop-filter: blur(14px)`
- **Iconos**: Font Awesome 6.0.0.
- El CSS compartido está en `main.css` y en `<style>` inline de cada HTML.

---

## Auth Guard — Cómo Proteger una Página

Agregar en el `<head>` de cualquier página protegida:

```html
<style id="auth-loading">body{visibility:hidden!important}</style>
<script type="module" src="../logic/auth.js"></script>
```

`auth.js` quita ese estilo cuando confirma sesión activa (o redirige si no hay).

---

## Cómo Agregar un Nuevo Módulo

1. Crear `logic/mi_modulo.js` con clase `MiModuloManager` que tenga `render()`, `setupListeners()` y `destroy()`.
2. En `navigation.js`, dentro del `switch` de `loadView()`:
   ```javascript
   case 'mi_modulo':
       this.currentManager = new MiModuloManager(this);
       content = this.currentManager.render();
       setTimeout(() => this.currentManager.setupListeners(), 0);
       break;
   ```
3. Agregar `<li data-view="mi_modulo">` en la sidebar de `inicio.html`.
4. Importar el script en `inicio.html`.

---

## Comandos Git Útiles

```bash
# Ver ramas
git branch -a

# Ver commits nuevos en remoto sin bajarlos
git fetch
git log HEAD..origin/main --oneline

# Cambiar de rama
git switch nombre_rama

# Sincronizar rama actual con remoto
git pull

# Publicar cambios
git add .
git commit -m "descripcion"
git push
```

### Ramas Actuales
| Rama | Descripción |
|------|-------------|
| `TEST` | Rama de desarrollo activa |
| `main` | Rama estable/producción |
| `respaldo/main-antes-sync-20260421-2114` | Respaldo local antes de sync |
| `origin/test` | Rama TEST en GitHub |
| `origin/main` | Rama main en GitHub |

---

## Configuración Firebase

- **Proyecto**: `node-tech`
- **Auth Domain**: `node-tech.firebaseapp.com`
- **SDK**: `10.14.1` (modular CDN)
- **Proveedores activos**: Email/Contraseña + Google
- **Hosting**: configurado en `firebase.json`

---

## Estado Actual del Proyecto

| Módulo | Estado |
|--------|--------|
| Autenticación | ✅ Funcional (Email + Google) |
| Dashboard | ✅ Funcional |
| Asistente/Chatbot | ✅ Funcional (sin IA) |
| Agenda | ✅ Funcional |
| Clientes | ✅ Funcional |
| Empleados | ✅ Funcional |
| Finanzas | ✅ Funcional |
| Contabilidad | ✅ Funcional |
| Backend Python | 🔧 En desarrollo |
| Integración IA | 📋 Planificado |

---

## Próximos Pasos

- [ ] Conectar backend Python (FastAPI) para procesamiento con IA
- [ ] Integrar IA al chatbot (OpenAI / Hugging Face)
- [ ] Mejorar responsive en móviles
- [ ] Añadir notificaciones push
- [ ] Tests automatizados
