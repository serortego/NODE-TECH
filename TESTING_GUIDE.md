# 🧪 GUÍA DE PRUEBA - Dashboard NODE v2.0

## ✅ Verificación de Instalación

### 1. Estructura de Archivos
```bash
# Verificar que existen los archivos principales
src/frontend/
├── js/app.js ✓
├── js/modules/firebase-config.js ✓
├── js/modules/auth.js ✓
├── js/views/inicio.js ✓
├── js/views/asistente.js ✓
├── js/views/agenda.js ✓
├── js/views/finanzas.js ✓
├── js/views/empleados.js ✓
├── js/views/clientes.js ✓
├── js/views/ayuda.js ✓
├── public/index.html ✓
└── README.md ✓
```

## 🚀 Cómo Probar

### Opción 1: Python (Recomendado)
```bash
cd src/frontend/public
python -m http.server 8000
# Abrir: http://localhost:8000/index.html
```

### Opción 2: Node.js
```bash
# Si tienes un servidor (ej: http-server)
npx http-server src/frontend/public
```

### Opción 3: Live Server (VS Code)
1. Instalar extensión "Live Server"
2. Click derecho en `index.html`
3. "Open with Live Server"

## 📋 Plan de Pruebas

### Test 1: Login
- [ ] Cargar página en navegador
- [ ] Debe mostrar pantalla de auth
- [ ] Botón "Entrar con Google" visible
- [ ] Click en botón abre popup Google
- [ ] Post-login: Pantalla desaparece

### Test 2: Navegación Lateral
- [ ] Menú sidebar visible a la izquierda
- [ ] Todos los items tienen iconos
- [ ] Click en cada item cambia la vista
- [ ] Vista activa resaltada en azul
- [ ] URL cambia (#inicio, #asistente, etc)

### Test 3: Header
- [ ] Logo NODE visible
- [ ] Nombre de usuario mostrado
- [ ] Avatar con inicial de nombre
- [ ] Barra de búsqueda funcional
- [ ] Icono de notificaciones visible

### Test 4: Vistas Específicas

#### 4.1 Inicio
- [ ] 3 tarjetas de resumen (ingresos, citas, clientes)
- [ ] Tabla de próximas citas
- [ ] Panel de actividad reciente
- [ ] Alerta de factura pendiente

#### 4.2 Asistente
- [ ] Área de chat visible
- [ ] Input de mensaje
- [ ] Botón Enviar funcional
- [ ] Mensaje aparece en el chat
- [ ] Bot responde con comando (Crea factura de 50€)

#### 4.3 Agenda
- [ ] Calendario mini visible
- [ ] Controles de navegación mes
- [ ] Lista de citas del día
- [ ] Botones Editar/Eliminar en citas

#### 4.4 Finanzas
- [ ] 4 tarjetas resumen (ingresos, mes, pendiente, media)
- [ ] Tabla de facturas cargada
- [ ] Filtros funcionan (mes, estado)
- [ ] Total ingresos se actualiza

#### 4.5 Empleados
- [ ] 6 tarjetas de empleados
- [ ] Información correcta en cada tarjeta
- [ ] Avatar generado con nombre
- [ ] Botones Editar/Eliminar

#### 4.6 Clientes
- [ ] Tabla con todos los clientes
- [ ] Campos: Nombre, Email, Teléfono, Empresa, Gasto, Estado
- [ ] Búsqueda funcional
- [ ] Filtro por estado
- [ ] Paginación visible

#### 4.7 Ayuda
- [ ] FAQs listadas con expand/collapse
- [ ] Respuestas se muestran al expandir
- [ ] Información de contacto visible

### Test 5: Responsivo

#### Desktop (1920px+)
- [ ] Menú sidebar completo
- [ ] Contenido ancho
- [ ] Búsqueda visible
- [ ] Todo legible

#### Tablet (768px-1024px)
- [ ] Menú sidebar más compacto
- [ ] Contenido ajustado
- [ ] Botón hamburguesa NO visible

#### Mobile (375px-480px)
- [ ] Botón hamburguesa visible
- [ ] Click abre/cierra menú
- [ ] Contenido ocupa pantalla completa
- [ ] Menú se cierra al navegar

### Test 6: Funcionalidad Firebase

#### Facturas
- [ ] Comando "Crea factura de 100€" crea entrada en Firestore
- [ ] Nueva factura aparece en Finanzas
- [ ] Total se actualiza automáticamente

#### Mensajes
- [ ] Mensajes del usuario se guardan en Firestore
- [ ] Respuestas del bot se persisten
- [ ] Historial se carga al abrir Asistente

### Test 7: Rendimiento

```javascript
// En console
console.log('Performance Test:');
console.time('Page Load');
// ... ejecutar acciones ...
console.timeEnd('Page Load');

// Debe ser < 2 segundos
```

## 🐛 Debugging

### Console Errors
```javascript
// En console del navegador

// Ver vista activa
console.log(currentView);

// Ver todas las vistas registradas
console.log(Object.keys(views));

// Ver usuario actual
console.log(getCurrentUser());

// Ver datos de Firestore
db.collection("facturas").get().then(snap => {
  console.log(snap.docs.map(d => d.data()));
});
```

### Network Tab (DevTools)
- [ ] `index.html` - 200 OK
- [ ] `app.js` - 200 OK
- [ ] `firebase-app.js` - 200 OK
- [ ] Otros módulos - 200 OK
- [ ] Sin requests a URLs rotas

### Storage (DevTools)
- [ ] Session storage limpio
- [ ] IndexedDB con datos de Firebase (si aplica)
- [ ] Cookies: Sesión de Google Auth

## ✨ Pruebas Avanzadas

### Test de Transición
1. Cargar Inicio
2. Click en Asistente
3. Escribir mensaje
4. Click en Finanzas
5. Volver a Asistente
6. El mensaje debe estar ahí

### Test de Persistencia
1. Crear una factura via chat
2. Ir a Finanzas
3. Debe aparecer la factura
4. Recargar página
5. Factura sigue en Finanzas

### Test de Autenticación
1. Logout (menú)
2. Volver a login
3. Datos del usuario persisten
4. Facturas/mensajes se cargan nuevamente

## 📊 Checklist Final

- [ ] Todos los archivos existen
- [ ] No hay errores en console
- [ ] Login funciona
- [ ] Todas las 7 vistas cargan
- [ ] Navegación suave
- [ ] Firebase integrado correctamente
- [ ] Responsive en 3 tamaños
- [ ] Datos persistentes
- [ ] Menú sidebar funcional
- [ ] Header completo

## 🎉 Si Todo Pasó

¡Enhorabuena! El nuevo dashboard está listo para producción.

Próximos pasos:
1. Deploy a Firebase Hosting
2. Configurar dominio personalizado
3. Agregar más funcionalidades
4. Entrenar usuarios
5. Monitorear performance

---

**Última actualización**: Abril 2026  
**Testeado en**: Chrome 130+, Firefox 130+, Safari 17+
