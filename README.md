# 📱 NODE - Frontend Structure

Nueva estructura modular y escalable del frontend de NODE.

## 🗂️ Estructura del Proyecto

```
src/frontend/
├── public/                    # Archivos estáticos y HTML
│   ├── index.html            # Dashboard principal (nuevo)
│   ├── welcome_page.html     # Landing page (mantenido)
│   ├── sing_up.html          # Página de registro
│   ├── menu.html             # Menú (legacy)
│   ├── crm_calendar.html     # Calendario CRM (legacy)
│   ├── app.js                # VIEJO - No usar
│   └── app-legacy.js         # Backup del app.js original
├── styles/
│   └── main.css              # Estilos globales
└── js/                       # Nuevo: Estructura modular
    ├── app.js                # Archivo principal - Router y control
    ├── modules/              # Módulos reutilizables
    │   ├── firebase-config.js    # Configuración de Firebase
    │   └── auth.js               # Módulo de autenticación
    └── views/                # Vistas/Páginas
        ├── inicio.js         # Dashboard principal
        ├── asistente.js      # Chatbot con Firebase
        ├── agenda.js         # Calendario/Agenda
        ├── finanzas.js       # Gestión de facturas
        ├── empleados.js      # Gestión de empleados
        ├── clientes.js       # Gestión de clientes
        └── ayuda.js          # Centro de ayuda
```

## 🚀 Características

### 1. **Modularidad**
- Cada vista está en su propio archivo
- Módulos reutilizables en `js/modules/`
- Sistema de routing sin dependencias externas

### 2. **Autenticación con Google Firebase**
- Login integrado en el módulo `auth.js`
- Protección automática de vistas
- Gestión de usuario en header

### 3. **Vistas Disponibles**

#### Inicio
Dashboard principal con:
- Tarjetas de resumen (ingresos, citas, clientes)
- Próximas citas
- Actividad reciente

#### Asistente
Chatbot inteligente con:
- Integración Firebase
- Comandos para crear facturas
- Historial de mensajes persistente

#### Agenda
Gestión de citas:
- Calendario interactivo
- Lista de citas del día
- Editar/eliminar citas

#### Finanzas
Dashboard financiero:
- Total de ingresos
- Facturas pendientes
- Tabla de facturas
- Exportación de datos

#### Empleados
Gestión del equipo:
- Tarjetas de empleados
- Información de contacto
- Estado en línea
- Agregar/eliminar empleados

#### Clientes
CRM de clientes:
- Tabla completa de clientes
- Búsqueda y filtros
- Total gastado por cliente
- Estados (Activo, Preferente, Inactivo)

#### Ayuda
Centro de soporte:
- FAQs con respuestas
- Contacto directo
- Guía de uso

## 💻 Cómo Usar

### Agregar una Nueva Vista

1. **Crear archivo en `js/views/`:**
```javascript
// src/frontend/js/views/nueva-vista.js
export function renderNuevaVista() {
    return `
        <!-- HTML de la vista -->
    `;
}

export function initNuevaVista() {
    // Inicialización (event listeners, etc)
}
```

2. **Registrar en `app.js`:**
```javascript
import { renderNuevaVista, initNuevaVista } from './views/nueva-vista.js';

// Agregar al objeto views:
const views = {
    ...
    nuevavista: {
        render: renderNuevaVista,
        init: initNuevaVista
    }
};
```

3. **Agregar al menú en `index.html`:**
```html
<a class="nav-item" data-view="nuevavista" href="#nuevavista">
    <i class="fas fa-icon"></i>
    <span>Nueva Vista</span>
</a>
```

### Crear un Módulo Reutilizable

```javascript
// src/frontend/js/modules/mi-modulo.js
export function funcionUno() {
    // código
}

export function funcionDos() {
    // código
}
```

Importar en las vistas:
```javascript
import { funcionUno, funcionDos } from '../modules/mi-modulo.js';
```

## 🎨 Estilos

- **Framework**: Tailwind CSS (CDN)
- **Colores principales**:
  - Azul: `#2563EB`
  - Gris: `#0F172A`, `#64748B`
  - Fondo: `#F8FAFC`
  - Blanco: `#FFFFFF`

## 🔐 Seguridad

- Autenticación con Google Firebase
- Datos encriptados en Firestore
- Sesiones persistentes
- Logout disponible en el menú

## 📱 Responsive

- Desktop: Menú lateral completo
- Tablet: Menú optimizado
- Mobile: Menú toggle con hamburguesa

## 🐛 Archivos Legacy

Archivos antiguos mantenidos por referencia:
- `public/app.js` - Original (reemplazado)
- `public/app-legacy.js` - Backup del original
- `public/welcome_page.html` - Landing page
- `public/menu.html` - Menú antiguo

## 📚 Recursos

- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Font Awesome Icons](https://fontawesome.com)

## ✅ Checklist para Nuevo Desarrollo

- [ ] Nueva vista creada en `js/views/`
- [ ] Módulo registrado en `app.js`
- [ ] Opción agregada al menú en `index.html`
- [ ] Estilos compatibles con Tailwind
- [ ] Responsivo probado
- [ ] Integración Firebase (si aplica)
- [ ] Documentado en este README

---

**Última actualización**: Abril 2026  
**Versión**: 2.0 (Modular)
