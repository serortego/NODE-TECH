# 🎬 GUÍA RÁPIDA - Prueba el Dashboard

## 🚀 En 3 Minutos

### Paso 1: Resetear Datos
```
1. Abre: http://localhost:8000
2. Abre Consola: F12 → Console
3. Pega y ejecuta:
   await resetData.resetAllData();
4. La página se recarga automáticamente
```

### Paso 2: Crear Datos en el Asistente
Haz clic en **Asistente** en el menú izquierdo

#### 2.1 Crear Factura
En el chat, escribe:
```
crea una factura de 100 para maria
```

Deberías ver:
```
✅ Factura de 100€ creada correctamente para maria.
Se agregó a Finanzas.
```

#### 2.2 Agendar Cita
En el chat, escribe:
```
agenda una cita con juan a las 10:00
```

Deberías ver:
```
✅ Cita agendada correctamente!
📅 Cliente: juan
⏰ Hora: 10:00
```

#### 2.3 Crear Cliente
En el chat, escribe:
```
crear nuevo cliente ana
```

Deberías ver:
```
✅ Cliente "ana" agregado correctamente a tu base de datos.
```

#### 2.4 Ver Resumen
En el chat, escribe:
```
resumen
```

Debería mostrar un resumen con los datos que creaste.

### Paso 3: Ver Datos en Otras Secciones

**Haz clic en cada sección y verás los datos que creaste:**

| Sección | Qué Ver |
|---------|---------|
| 📊 **Inicio** | Total Ingresos: 100€, Citas: 1, Clientes: 1 |
| 💰 **Finanzas** | Tabla con "maria - 100€" |
| 📅 **Agenda** | Lista con "10:00 - juan - Servicio" |
| 👥 **Clientes** | Tabla con "ana - Activo" |

## 🎮 Más Comandos para Probar

### Facturas
```
crea una factura de 50
necesito cobrar 200 de juan
factura de 75 para laura
invoice 30
```

### Citas
```
agenda cita con maria a las 14:00
agendar a las 11:00 - corte
reserva con pedro a las 16:00 - color
```

### Clientes
```
agregar cliente luis
nuevo cliente carmen
crear cliente diego
```

### Información
```
ayuda
resumen
que puedo hacer
```

## ✨ Lo Interesante: TODO ES EN TIEMPO REAL

Crea una factura en el Asistente → Ve a Finanzas → ¡Aparece automáticamente!

**Sin recargar la página.** ✨

## 🧪 Verificar en Firebase

1. Ve a: https://console.firebase.google.com
2. Tu proyecto → Firestore Database
3. Verás collections: `facturas`, `citas`, `clientes`, `empleados`, `mensajes`
4. Los datos que creaste estarán ahí

## 🐛 Si Algo No Funciona

### "No aparece nada en Finanzas"
```javascript
// En consola (F12):
db.collection('facturas').get().then(s => {
    console.log('Facturas:', s.docs.map(d => d.data()));
});
```

### "Resetear no funciona"
```javascript
// En consola:
console.log(resetData); // Debe mostrar objeto con funciones
```

### "El asistente no reconoce el comando"
- Intenta con frases más simples
- Ej: "factura 100" en vez de algo más complejo

## 📊 Estructura de Datos que se Crea

```
facturas/
├─ {cliente: "maria", monto: "100", timestamp: ...}

citas/
├─ {cliente: "juan", hora: "10:00", servicio: "Servicio", monto: "0", timestamp: ...}

clientes/
├─ {nombre: "ana", email: "", estado: "Activo", timestamp: ...}

mensajes/
├─ {texto: "crea una factura de 100 para maria", tipo: "user", timestamp: ...}
├─ {texto: "✅ Factura de 100€...", tipo: "bot", timestamp: ...}
```

## 🎯 Lo que FUNCIONA Ahora (v2.5)

✅ Crear facturas → Aparecen en Finanzas  
✅ Agendar citas → Aparecen en Agenda  
✅ Crear clientes → Aparecen en Clientes  
✅ Datos en tiempo real → Sin recargar página  
✅ Métricas actualizadas → Totales, contadores  
✅ Script de reset → Limpia todo rápidamente  

## 🔮 Lo que FALTA (Próximas Actualizaciones)

⏳ Backend con lógica pesada  
⏳ Validaciones en servidor  
⏳ Autenticación real con usuarios  
⏳ Auditoría y historial  
⏳ Exportación de reportes  

## 💡 Tip: Navegar Rápido

En el Asistente, cuando crees algo, te da botones para navegar. Por ejemplo:

Después de crear factura, ve los botones:
```
[Ver Finanzas] [Nueva factura] [Crear cita]
```

Haz clic en "Ver Finanzas" y ¡va automáticamente a esa sección!

---

**¡Listo!** Ahora el dashboard funciona end-to-end con Firebase. ✨

Próximo paso: Crear el backend para la lógica pesada 🚀
