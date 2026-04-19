# 🎯 NODE - Modo DEMO (Sin Autenticación)

## 📢 Cambios Realizados

La versión actual del dashboard NODE está configurada en **MODO DEMO ABIERTO**, lo que significa:

✅ **No se requiere login**  
✅ **Acceso público inmediato**  
✅ **Todos pueden probar todas las funcionalidades**  
✅ **Perfecto para demostraciones y pruebas**

## 🚀 Cómo Usar

### Iniciar el Dashboard

```bash
# Opción 1: Python
cd src/frontend/public
python -m http.server 8000
# Abrir: http://localhost:8000/index.html

# Opción 2: Node.js
npx http-server src/frontend/public

# Opción 3: Live Server (VS Code)
Click derecho en index.html → Open with Live Server
```

### Acceso Directo
- No hay pantalla de login
- El dashboard carga automáticamente
- Usuario por defecto: **Demo NODE**
- Email: **modo@prueba**

## 🔄 Cambios Específicos

### 1. **Authentication Module** (`js/modules/auth.js`)
```javascript
// Antes: Requería Google Auth
// Ahora: Modo demo sin autenticación

export function initAuth(onUserLogged, onUserLoggedOut) {
    // Se carga directamente con usuario demo
    onUserLogged(demoUser);
}
```

### 2. **App.js** (`js/app.js`)
```javascript
// Antes: Esperaba login
// Ahora: Inicia sesión automática en modo demo

const demoUser = {
    displayName: "Demo NODE",
    email: "modo@prueba"
};
onUserLogged(demoUser);
```

### 3. **Header**
- Avatar: **N** (de NODE)
- Nombre: **Demo NODE**
- Email: **modo@prueba**
- Subtítulo en menú: **🎯 Demo Abierta**

### 4. **Botón Cerrar Sesión**
- Texto cambió a: **"Reiniciar"**
- Función: Recarga la página
- Ícono: Reload en lugar de Sign-out

## 📊 Funcionalidades Disponibles

Todas las secciones funcionan sin restricciones:

| Sección | Status | Notas |
|---------|--------|-------|
| Inicio | ✅ Funcional | Dashboard completo |
| Asistente | ✅ Funcional | Chatbot + Firebase |
| Agenda | ✅ Funcional | Calendario interactivo |
| Finanzas | ✅ Funcional | Tabla de facturas |
| Empleados | ✅ Funcional | Gestión de equipo |
| Clientes | ✅ Funcional | CRM completo |
| Ayuda | ✅ Funcional | FAQs y soporte |

## 💾 Datos y Persistencia

### Firebase Firestore
- ✅ **Escritura habilitada**: Puedes crear facturas, mensajes, etc.
- ✅ **Lectura habilitada**: Se cargan todos los datos
- ✅ **Persistencia**: Los datos se guardan en tiempo real
- ⚠️ **Nota**: Todos comparten la misma base de datos (datos públicos)

### Ejemplo: Crear Factura
```
1. Ir a Asistente
2. Escribir: "Crea una factura de 100€"
3. La factura se guarda en Firebase
4. Ir a Finanzas
5. La factura aparece en la tabla
```

## 🔮 Próximo: Autenticación Real

Cuando estés listo para implementar login de verdad:

### Opción 1: Google Auth (Recomendado)
```javascript
// Descomentar código en auth.js
import { auth } from "./firebase-config.js";
import { signInWithPopup, GoogleAuthProvider } from "firebase";

export function loginWithGoogle() {
    return signInWithPopup(auth, provider);
}
```

### Opción 2: Email/Contraseña (Firebase)
```javascript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}
```

### Opción 3: Custom Backend
- Crear endpoints en tu backend
- Implementar JWT tokens
- Registrar usuarios en tu base de datos

## 📝 Archivos Modificados

- `public/index.html` - Oculta pantalla de auth
- `js/app.js` - Carga automática sin login
- `js/modules/auth.js` - Modo demo sin Google
- Todos los demás archivos **sin cambios**

## ✅ Checklist antes de Producción

- [ ] Implementar sistema de login real
- [ ] Crear tabla de usuarios en BD
- [ ] Hash de contraseñas (bcrypt)
- [ ] Tokens JWT o sesiones
- [ ] Validación de credenciales en backend
- [ ] Rate limiting en login
- [ ] Recuperación de contraseña
- [ ] 2FA (autenticación de dos factores)

## 🎓 Comandos Disponibles en Asistente

Prueba estos comandos en el chatbot:

```
• Crea una factura de 50€
• Crea una factura de 120€
• Nueva cita para Juan
• Buscar cliente Ana
```

## 🐛 Debugging

```javascript
// En console del navegador

// Ver usuario actual
console.log(getCurrentUser());

// Ver si estás en modo demo
console.log('Modo DEMO activado');

// Ver todas las vistas
console.log(Object.keys(views));
```

## 🔒 Notas de Seguridad

⚠️ **IMPORTANTE**: Este modo DEMO está para pruebas únicamente.

- ❌ NO usar en producción
- ❌ NO con datos sensibles reales
- ❌ Cualquiera puede ver/modificar datos
- ✅ Para demostraciones seguras, implementar autenticación

## 📞 Soporte

Si necesitas:
- Cambiar a modo producción con auth
- Implementar login con Google
- Agregar autenticación personalizada

Revisar archivos:
- `js/modules/auth.js` - Módulo de autenticación
- `CHANGELOG.md` - Historial de cambios
- `README.md` - Documentación técnica

---

**Estado**: 🎯 Demo Abierta  
**Última actualización**: Abril 2026  
**Seguridad**: Demo únicamente (NO producción)
