# 🚀 QUICK START - NODE Demo

## ⚡ Empezar en 1 Minuto

### Paso 1: Abrir en Navegador

**Opción A - Más Fácil (Python)**
```bash
cd src/frontend/public
python -m http.server 8000
```

**Opción B - Con Node.js**
```bash
npx http-server src/frontend/public
```

**Opción C - VS Code Live Server**
- Click derecho en `src/frontend/public/index.html`
- Seleccionar "Open with Live Server"

### Paso 2: Acceder
```
http://localhost:8000
```

### Paso 3: ¡Listo! 🎉
El dashboard abierto está esperándote. **No hay login requerido.**

---

## 🎮 Prueba Rápida

### Hacer una Prueba en 2 minutos

1. **Abre el dashboard**
2. **Navega al menú lateral:**
   - Inicio → Ver resumen
   - Asistente → Escribir: `Crea una factura de 100€`
   - Finanzas → Ver la factura creada
   - Clientes → Ver lista completa
   - Empleados → Ver tarjetas del equipo

### Prueba el Chatbot
Escribe estos comandos en **Asistente**:
```
Crea una factura de 50€
Crea una factura de 200€
Nueva cita para Juan
```

---

## 📱 Responsive

Prueba en diferentes tamaños:
- **Desktop (1920px)** - Menú completo
- **Tablet (768px)** - Menú compacto
- **Mobile (375px)** - Botón hamburguesa

---

## 📊 Estructura

```
NODE/
├── src/frontend/
│   ├── public/
│   │   ├── index.html ← EMPIEZA AQUÍ
│   │   └── ...
│   ├── js/
│   │   ├── app.js (router)
│   │   ├── modules/ (auth, firebase)
│   │   └── views/ (7 secciones)
│   └── styles/main.css
```

---

## 💡 Notas Importantes

✅ **Sin login** - Demo abierta al público  
✅ **Datos reales** - Conectado a Firebase  
✅ **Todo funciona** - Todas las secciones activas  
⚠️ **Demo only** - Para pruebas, no producción  

---

## 🔗 Enlaces Útiles

- [DEMO_MODE.md](./DEMO_MODE.md) - Cómo funciona el modo demo
- [CHANGELOG.md](./CHANGELOG.md) - Cambios realizados
- [src/frontend/README.md](./src/frontend/README.md) - Documentación técnica
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Guía de pruebas completa

---

## 🚨 Errores Comunes

### ❌ "ModuleNotFoundError" o "Cannot find module"
**Solución**: Asegúrate de usar un servidor local (no abrir directamente el HTML)

### ❌ Firebase no carga
**Solución**: Verificar conexión a internet y consola del navegador

### ❌ Menú lateral no aparece
**Solución**: Recargar página (Ctrl+Shift+R para caché)

---

## 🎓 Próximos Pasos

1. **Explorar todas las secciones**
2. **Crear datos de prueba**
3. **Probar en móvil/tablet**
4. **Leer documentación técnica**
5. **Decidir si agregar autenticación**

---

**¡Bienvenido a NODE! 🚀**

Cualquier duda o sugerencia, revisar los archivos .md de documentación.
