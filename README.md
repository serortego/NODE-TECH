# 🎯 NODE - Software de Gestión Empresarial (Versión Demo)

> **Estado Actual**: 🎯 **MODO DEMO ABIERTO** (Sin autenticación)  
> Para versión con login, ver [DEMO_MODE.md](./DEMO_MODE.md)

## 🚀 Empezar Rápido

```bash
# Opción 1: Python
cd src/frontend/public
python -m http.server 8000
# Abre: http://localhost:8000

# Opción 2: Node.js
npx http-server src/frontend/public

# Opción 3: VS Code
Click derecho en index.html → Open with Live Server
```

> **Sin login requerido** - Acceso inmediato al dashboard

---

## 📋 Características

### 7 Secciones Funcionales

| Sección | Descripción | Status |
|---------|-------------|--------|
| **Inicio** | Dashboard con resumen de ingresos, citas y clientes | ✅ |
| **Asistente** | Chatbot inteligente con soporte de comandos | ✅ |
| **Agenda** | Calendario interactivo con gestión de citas | ✅ |
| **Finanzas** | Panel de facturas e ingresos con gráficos | ✅ |
| **Empleados** | Gestión de equipo con perfiles individuales | ✅ |
| **Clientes** | CRM completo con búsqueda y filtros | ✅ |
| **Ayuda** | Centro de soporte con FAQs | ✅ |

### Características Técnicas

- ✅ **Menú sidebar** responsive con iconos
- ✅ **Header moderno** con búsqueda y notificaciones
- ✅ **Sistema de routing** sin librerías externas
- ✅ **Integración Firebase** (Firestore + Auth)
- ✅ **Diseño Tailwind CSS** profesional
- ✅ **Completamente responsive** (Desktop, Tablet, Mobile)

---

## 📁 Estructura del Proyecto

```
NODE-TECH/
├── src/frontend/
│   ├── js/                      # Módulos JavaScript
│   │   ├── app.js              # Router principal
│   │   ├── modules/
│   │   │   ├── firebase-config.js
│   │   │   └── auth.js
│   │   └── views/
│   │       ├── inicio.js
│   │       ├── asistente.js
│   │       ├── agenda.js
│   │       ├── finanzas.js
│   │       ├── empleados.js
│   │       ├── clientes.js
│   │       └── ayuda.js
│   ├── public/
│   │   ├── index.html          # Dashboard
│   │   └── welcome_page.html   # Landing page
│   ├── styles/main.css
│   └── README.md
├── QUICK_START.md              # Empezar en 1 minuto
├── DEMO_MODE.md                # Explicación del modo demo
├── CHANGELOG.md                # Historial de cambios
└── TESTING_GUIDE.md            # Guía de pruebas

```

---

## 🎓 Uso Básico

### Crear una Factura (Vía Chatbot)

1. Ir a sección **Asistente**
2. Escribir: `Crea una factura de 100€`
3. El chatbot confirma la creación
4. Ir a **Finanzas**
5. La factura aparece en la tabla

### Ver Resumen

1. **Inicio**: Tarjetas con ingresos, citas, clientes
2. **Próximas citas**: Lista del día
3. **Actividad reciente**: Últimas acciones

### Gestionar Equipo

1. Ir a **Empleados**
2. Ver tarjetas con información
3. Botones para editar o eliminar

---

## 🔧 Tecnología

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework CSS**: Tailwind CSS v3
- **Backend**: Firebase Firestore
- **Autenticación**: (Demo: sin auth, Producción: Google Auth)
- **Icons**: Font Awesome 6.4
- **Routing**: Custom vanilla JS

---

## 📖 Documentación

| Documento | Descripción |
|-----------|-------------|
| [QUICK_START.md](./QUICK_START.md) | Empezar en 1 minuto |
| [DEMO_MODE.md](./DEMO_MODE.md) | Cómo funciona el modo demo |
| [CHANGELOG.md](./CHANGELOG.md) | Cambios v1 → v2 |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Plan de pruebas completo |
| [src/frontend/README.md](./src/frontend/README.md) | Documentación técnica |

---

## 🚀 Próximos Pasos

### Para Pruebas
1. Explorar todas las secciones
2. Crear datos de prueba
3. Probar en diferentes dispositivos
4. Revisar la consola para debugging

### Para Producción
1. Implementar autenticación con login real
2. Crear sistema de usuarios
3. Hash de contraseñas
4. Validaciones de seguridad
5. Backup y recuperación
6. Ver [DEMO_MODE.md](./DEMO_MODE.md) para más detalles

---

## 🎯 Estado Actual

- 🎯 **Demo Abierta**: Sin login, acceso público
- ✅ **Todas las funcionalidades activas**
- 📊 **Datos reales**: Conectado a Firebase
- ⚠️ **Para pruebas**: No usar en producción
- 🔐 **Seguridad**: Agregar autenticación antes de producción

---

## 🤝 Contribuir

Para agregar nuevas funcionalidades:

1. Crear nueva vista en `src/frontend/js/views/`
2. Registrar en `app.js`
3. Agregar al menú en `index.html`
4. Documentar en `README.md`

Ver [src/frontend/README.md](./src/frontend/README.md) para guía completa.

---

## 📞 Soporte

- 📖 Leer documentación
- 🐛 Revisar console del navegador
- 💾 Verificar conexión a Firebase
- 🔗 Comprobar versión del navegador (ES6+)

---

## 📄 Licencia

Proyecto NODE 2026 - Todos los derechos reservados

---

**Última actualización**: Abril 2026  
**Versión**: 2.0 Demo  
**Estado**: ✅ Listo para probar
