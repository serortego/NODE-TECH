# 🔧 GUÍA DE DEBUG - NODE v2.5

## ❌ Problema Reportado
- Chatbot no responde a mensajes
- No aparecen mensajes de confirmación/error
- No se crean datos en Firebase (facturas, citas, etc.)

## ✅ Cambios Realizados

### 1. Mejoras en `asistente.js`
- ✅ Agregado try/catch completo en `initAsistente()`
- ✅ Agregados console.log() detallados en cada paso
- ✅ Verificación que elementos del DOM existen antes de usar
- ✅ Mejor manejo de errores en Firebase onSnapshot
- ✅ Mejor manejo de errores en form submit

### 2. Mejoras en `app.js`
- ✅ Removida importación de `resetAllData` (causa errores)
- ✅ Agregado try/catch en `onUserLogged()`
- ✅ Mejoras en logging durante inicialización
- ✅ Mejor manejo de elementos que podrían no existir

### 3. Mejoras en `reset-data.js`
- ✅ Simplificado para evitar errores de exportación

## 🔍 CÓMO DEBUGGEAR

### Paso 1: Abrir la Consola del Navegador
1. Abre `http://localhost:5000` en el navegador (o tu URL local)
2. Presiona `F12` para abrir Developer Tools
3. Ve a la pestaña "Console"

### Paso 2: Verificar que Todo Carga
Deberías ver logs como:
```
🎉 NODE en MODO DEMO - Dashboard abierto al público
✅ Usuario autenticado: Demo NODE
📱 Inicializando Asistente...
✅ Elementos del chat encontrados
✅ Asistente inicializado correctamente
```

Si NO ves esto, hay un problema en la inicialización.

### Paso 3: Probar el Chatbot Manualmente

1. Navega a la vista "Asistente" (click en la izquierda)
2. En la consola (F12), escribe:
   ```javascript
   await procesarMensajeUsuario("crea una factura de 50 euros")
   ```
3. Presiona Enter

Deberías ver en la consola:
```
💬 Mensaje usuario: crea una factura de 50 euros
🔄 Procesando comando...
✅ Respuesta recibida: {tipo: "exito", mensaje: "...", ...}
```

Si no ves nada, el módulo no se importó correctamente.

### Paso 4: Probar Importación de Módulos

En la consola, ejecuta:
```javascript
import { procesarMensajeUsuario } from './js/modules/command-processor.js'
  .then(() => console.log('✅ Importado correctamente'))
  .catch(err => console.error('❌ Error:', err))
```

### Paso 5: Probar Firebase

En la consola, ejecuta:
```javascript
import { db } from './js/modules/firebase-config.js'
  .then(() => console.log('✅ Firebase conectado'))
  .catch(err => console.error('❌ Error Firebase:', err))
```

## 📋 LISTA DE VERIFICACIÓN

Verifica que TODOS estos logs aparezcan en la consola (F12):

- [ ] `🎉 NODE en MODO DEMO`
- [ ] `✅ Usuario autenticado`
- [ ] `📱 Inicializando Asistente`
- [ ] `✅ Elementos del chat encontrados`
- [ ] `✅ Asistente inicializado`

Si algo falta:
1. Abre index.html en el editor
2. Verifica que tiene los elementos:
   - `<form id="chat-form">`
   - `<input id="chat-input">`
   - `<div id="chat-history">`
   - `<div id="sugerencias-rapidas">`

Si los elementos existen pero no se encuentran, hay un error en la importación o renderización.

## 🧪 TEST HTML (ALTERNATIVA)

Si todo lo anterior falla, abre:
```
http://localhost:5000/test.html
```

Este archivo HTML hace tests directos de los módulos y Firebase.

## 🎯 PRÓXIMOS PASOS SEGÚN RESULTADO

### Si los logs aparecen correctamente:
1. Escribe en el chat: "crea una factura de 50 euros"
2. Deberías ver:
   - Tu mensaje aparece en el chat
   - El chatbot responde
   - En Firebase aparece un documento en la colección "facturas"

### Si los logs NO aparecen:
1. Verifica que index.html existe en `src/frontend/public/index.html`
2. Verifica que tiene un `<script type="module" src="../js/app.js"></script>`
3. Verifica que los archivos JS están en las rutas correctas:
   - `src/frontend/js/app.js` ✅
   - `src/frontend/js/views/asistente.js` ✅
   - `src/frontend/js/modules/command-processor.js` ✅
   - `src/frontend/js/modules/firebase-config.js` ✅

### Si Firebase no conecta:
1. Verifica que firebase-config.js tiene tu configuración
2. Verifica que tu proyecto Firebase está activo
3. En la consola browser, ejecuta:
   ```javascript
   import { db } from './js/modules/firebase-config.js'
   console.log('DB:', db)
   ```

## ⚠️ ERRORES COMUNES

### Error: "procesarMensajeUsuario is not a function"
- Causa: El módulo command-processor.js no se importó
- Solución: Verifica que el archivo existe y tiene `export async function procesarMensajeUsuario`

### Error: "Cannot read property 'addEventListener' of null"
- Causa: El elemento del chat no existe en el DOM
- Solución: Verifica que index.html tiene `<form id="chat-form">`, etc.

### Error: "Cannot add property to undefined"
- Causa: Firebase no se inicializó
- Solución: Verifica firebase-config.js y tu conexión a Internet

## 📝 LOGS ESPERADOS CUANDO ESCRIBES EN CHAT

1. Haces click en Asistente
   ```
   📱 Inicializando Asistente...
   ✅ Elementos del chat encontrados
   ✅ Asistente inicializado correctamente
   ```

2. Escribes "crea una factura" y presionas Enter
   ```
   💬 Mensaje usuario: crea una factura
   ✅ Mensaje guardado en Firebase
   🔄 Procesando comando...
   ✅ Respuesta recibida: {...}
   ✅ Respuesta guardada en Firebase
   ```

3. En el chat deberías ver:
   - Tu mensaje (azul)
   - Respuesta del bot (gris)

Si no ves esto, abre F12 Console y busca errores rojo.

## 🆘 SI NADA FUNCIONA

1. Copia el error exacto de la consola (rojo)
2. Abre index.html y verifica que tiene:
   ```html
   <script type="module" src="../js/app.js"></script>
   ```
3. Verifica que la URL es correcta (¿http:// o file://?  - debe ser http://)
4. Intenta abrir en una pestaña de incógnito (puede ser cache)
5. Borra el caché del navegador (Ctrl+Shift+Delete)

## 📞 INFORMACIÓN ÚTIL

- **Versión**: NODE v2.5
- **Stack**: HTML5 + ES6 Modules + Firebase Firestore
- **Demo User**: uid="demo-user-001", name="Demo NODE"
- **Sin autenticación**: Acceso automático en modo demo
- **Collections**: facturas, citas, clientes, empleados, mensajes
