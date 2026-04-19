# 🧪 TESTING GUIDE - NODE Dashboard v2.5

## ✅ Probando la Integración Frontend-Firebase

El dashboard ahora está completamente conectado a Firebase. Los datos que creas en el **Asistente** aparecen automáticamente en **Finanzas**, **Agenda**, **Clientes** y **Empleados**.

## 🚀 Quick Start

### 1. Resetear Datos (Limpia TODO)

Abre la consola del navegador (`F12` → `Console`) y ejecuta:

```javascript
// Reset completo
await resetData.resetAllData();

// O resetear solo una colección
await resetData.resetColeccion('facturas');
await resetData.resetColeccion('citas');
await resetData.resetColeccion('clientes');
await resetData.resetColeccion('empleados');
```

La página se recargará automáticamente.

## 📝 Workflow: Crea → Ve → Aparece

### Ejemplo 1: Crear Factura

**Paso 1:** En el chat del **Asistente**, escribe:
```
Crea una factura de 150 euros para María
```

**Paso 2:** El asistente responde:
```
✅ Factura de 150€ creada correctamente para María.
```

**Paso 3:** Ve a la sección **Finanzas** → ¡La factura aparece en la tabla!

### Ejemplo 2: Agendar Cita

**Paso 1:** En el chat, escribe:
```
Agenda una cita con Juan a las 10:00
```

**Paso 2:** El asistente responde:
```
✅ Cita agendada correctamente! 
📅 Cliente: Juan
⏰ Hora: 10:00
💼 Servicio: Servicio
```

**Paso 3:** Ve a la sección **Agenda** → ¡La cita aparece en la lista!

### Ejemplo 3: Crear Cliente

**Paso 1:** En el chat, escribe:
```
Crear nuevo cliente Ana
```

**Paso 2:** El asistente responde:
```
✅ Cliente "Ana" agregado correctamente a tu base de datos.
```

**Paso 3:** Ve a la sección **Clientes** → ¡El cliente aparece en la tabla!

## 📚 Todos los Comandos Soportados

### Facturas 💰
```
- "crea una factura de 100"
- "necesito cobrar 50 de juan"
- "factura de 200 para ana"
- "invoice 75"
```

### Citas 📅
```
- "agenda cita con maria a las 10:00"
- "cita con juan a las 14:00 - corte"
- "reserva con pedro a las 16:00"
- "agendar a las 11:00"
```

### Clientes 👤
```
- "crear nuevo cliente maria"
- "agregar cliente juan"
- "nuevo cliente ana"
- "busca a un cliente"
```

### Resumen 📊
```
- "resumen de hoy"
- "como voy hoy"
- "estado general"
- "dame un resumen"
```

### Ayuda ❓
```
- "ayuda"
- "que puedo hacer"
- "comandos"
- "help"
```

## 🔄 Flujo de Datos

```
Usuario escribe en Asistente
        ↓
Command Processor detecta intención
        ↓
Guarda en Firebase (facturas/citas/clientes/empleados)
        ↓
Las otras vistas escuchan Firebase en tiempo real (onSnapshot)
        ↓
Actualización automática en Finanzas/Agenda/Clientes ✨
```

## 📊 Ver Datos en Tiempo Real

### Opción 1: Desde el Dashboard
1. Crea algo en el **Asistente**
2. Ve a **Inicio** → Verás las métricas actualizadas
3. Ve a **Finanzas** → Verás facturas
4. Ve a **Agenda** → Verás citas
5. Ve a **Clientes** → Verás clientes
6. Ve a **Empleados** → Verás empleados

### Opción 2: Desde Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Tu proyecto → Firestore Database
3. Collections: `facturas`, `citas`, `clientes`, `empleados`
4. Verás todos los documentos creados

## 🐛 Troubleshooting

### "No aparece nada en las otras vistas"
- [ ] Verifica que la colección en Firebase tiene datos
- [ ] Abre consola (`F12`) y busca errores
- [ ] Recarga la página (`Ctrl+R`)
- [ ] Verifica conexión a Firebase

### "No puedo resetear"
- [ ] Abre consola del navegador (`F12`)
- [ ] Verifica que `resetData` esté disponible
- [ ] Intenta: `console.log(resetData)`

### "La factura se crea pero no aparece en Finanzas"
- [ ] Verifica que el botón "Ver Finanzas" está haciendo click
- [ ] Comprueba que Firebase guardó el documento
- [ ] Recarga la página

## 🎯 Métricas que se Actualizan Automáticamente

### En Inicio (Dashboard):
- ✅ Ingresos Totales (suma de facturas)
- ✅ Total Citas (contador de citas)
- ✅ Total Clientes (contador de clientes)
- ✅ Últimas 3 Facturas
- ✅ Próximas 4 Citas
- ✅ Primeros 4 Empleados

### En Finanzas:
- ✅ Total Ingresos (en tiempo real)
- ✅ Tabla de facturas (actualiza con nuevas facturas)

### En Agenda:
- ✅ Citas Hoy
- ✅ Esta Semana
- ✅ Ingresos Pendientes

### En Clientes:
- ✅ Total Clientes
- ✅ Clientes Activos
- ✅ Promedio por Cliente

### En Empleados:
- ✅ Total Empleados
- ✅ En línea
- ✅ Total Departamentos

## 💡 Notas Importantes

### Datos Dinámicos ✅
```javascript
// Las vistas usan onSnapshot para escuchar cambios
onSnapshot(query(collection(db, "facturas"), orderBy("timestamp", "desc")), (snapshot) => {
    // Actualiza automáticamente cuando hay cambios
});
```

### Sin Datos Estáticos ❌
Ya no hay datos hardcodeados. TODO viene de Firebase.

### Escalable 🚀
La arquitectura permite agregar:
- Más colecciones
- Más campos
- Más views
- Más lógica sin cambiar Firebase

## 🔮 Próximos Pasos

1. **Backend Logic** (siguientes): Mover validaciones a backend
2. **Autenticación**: Agregar sistema de usuarios
3. **Persistencia**: Guardar preferencias de usuario
4. **Historial**: Auditoría de cambios
5. **Exportación**: Descargar datos en CSV/PDF

## 📞 Comandos Útiles

```javascript
// Ver colecciones disponibles
resetData.colecciones

// Crear datos de prueba
// Manually a través del chat del asistente

// Eliminar todo
await resetData.resetAllData();

// Limpiar una colección
await resetData.resetColeccion('facturas');
```

---

**Versión**: 2.5 (Firebase Integración Completa)  
**Estado**: ✅ Listo para Testing  
**Próximo**: Backend Logic & Autenticación 🚀
