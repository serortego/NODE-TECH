# 🤖 Asistente NODE - Sistema Inteligente de Comandos

## 📋 Descripción

El Asistente NODE es un chatbot inteligente que reconoce intenciones del usuario y ejecuta acciones correspondientes. Está diseñado para ser **robusto ahora** y **listo para IA en el futuro**.

## 🎯 Características Actuales

### ✅ Inteligencia Natural (Sin IA)
- **Reconocimiento de intenciones**: Entiende lo que quieres, no solo frases exactas
- **Extracción de datos**: Detecta números, nombres, fechas automáticamente
- **Sugerencias contextuales**: Botones que se adaptan a cada respuesta
- **Historial persistente**: Todos los mensajes se guardan en Firebase

### 📊 Intenciones Soportadas

| Intención | Palabras Clave | Acción |
|-----------|---|---|
| **Factura** | factura, invoice, cobrar, venta, ingreso | Crear factura en Firestore |
| **Cita** | cita, agendar, agenda, reserva, appointment | Agendar nueva cita |
| **Cliente** | cliente, contacto, empresa, buscar | Buscar cliente por nombre |
| **Empleado** | empleado, staff, equipo, personal | Buscar empleado |
| **Resumen** | resumen, hoy, estado, overview | Dar resumen del día |
| **Ayuda** | ayuda, help, qué puedo hacer | Mostrar comandos disponibles |

## 🧠 Cómo Funciona

### 1. **Análisis del Texto**
```
Usuario: "necesito una factura de 150 euros para maría"
↓
```

### 2. **Detección de Intención**
```
Palabras clave encontradas: "factura" (2 puntos)
Intención: CREAR FACTURA
↓
```

### 3. **Extracción de Parámetros**
```
Monto: 150
Cliente: María
↓
```

### 4. **Ejecución**
```
Crear factura en Firebase
Generar respuesta contextual
Mostrar sugerencias relacionadas
```

## 📁 Arquitectura del Código

```
js/
├── views/
│   └── asistente.js          # UI del chat
└── modules/
    └── command-processor.js   # Lógica de comandos (CORAZÓN DEL ASISTENTE)
```

### `command-processor.js` - Módulo Principal

**Funciones Principales:**

```javascript
// Procesa un mensaje del usuario
export async function procesarMensajeUsuario(texto)
// Retorna: { tipo, mensaje, sugerencias }

// Estructura preparada para IA
export async function procesarConIA(texto)
// TODO: Descomentar cuando tengas backend
```

## 🔄 Flujo de Procesamiento

```
┌─ Usuario escribe ─┐
│                   ↓
│         procesarMensajeUsuario()
│                   ↓
│         Detectar Intención
│                   ↓
│         Extraer Parámetros
│                   ↓
│         Ejecutar Acción
│                   ↓
│         Generar Respuesta
│                   ↓
└─ Mostrar con Sugerencias ─┘
```

## 💬 Ejemplos de Conversación

### Ejemplo 1: Crear Factura
```
Usuario: "necesito cobrar 100 de mi cliente juan"

🤖 Asistente: "✅ Factura de 100€ creada para juan. Se agregó a Finanzas."

Sugerencias:
[Ver Finanzas] [Nueva factura] [Crear cita]
```

### Ejemplo 2: Agendar Cita
```
Usuario: "quiero agendar cita con ana"

🤖 Asistente: "📅 Entiendo que quieres agendar cita con Ana.
Necesito más detalles:
• ¿Qué hora prefieres?
• ¿Qué servicio?
• ¿Qué día?"

Sugerencias:
[Ver Agenda] [Volver a Asistente]
```

### Ejemplo 3: Comando No Reconocido
```
Usuario: "hola"

🤖 Asistente: "🤔 No estoy seguro de lo que pides. Intenta con:
• 'Crea una factura de 50€'
• 'Agenda una cita'
• 'Ayuda' para más opciones"

Sugerencias:
[Ayuda] [Crear factura] [Agendar cita]
```

## 🚀 Cómo Extender el Sistema

### Agregar Nuevo Comando

**Paso 1**: Agregar intención en `command-processor.js`

```javascript
const intenciones = {
    // ... intenciones existentes
    mi_comando: {
        palabras_clave: ['palabra1', 'palabra2', 'palabra3'],
        palabras_ignorar: ['palabra_a_evitar'],
        accion: 'mi_accion',
        parametros: ['param1', 'param2']
    }
};
```

**Paso 2**: Crear procesador

```javascript
function procesarMiComando(texto) {
    return {
        tipo: 'exito',
        mensaje: 'Tu respuesta aquí',
        sugerencias: [
            { texto: 'Opción 1', comando: 'comando' },
            { texto: 'Opción 2', comando: 'comando' }
        ]
    };
}
```

**Paso 3**: Agregar al switch

```javascript
case 'mi_comando':
    return procesarMiComando(texto);
```

## 🤖 Integración Futura con IA

### Paso 1: Crear Backend

```python
# Python con FastAPI (ejemplo)
from fastapi import FastAPI
from transformers import pipeline

app = FastAPI()
nlp = pipeline("zero-shot-classification")

@app.post("/api/asistente/procesar")
async def procesar(mensaje: dict):
    texto = mensaje['mensaje']
    respuesta = nlp(texto, ['crear factura', 'agendar cita', 'buscar cliente'])
    # ... procesar con IA ...
    return { 'tipo': 'exito', 'mensaje': '...', 'sugerencias': [...] }
```

### Paso 2: Descomentar en `command-processor.js`

```javascript
export async function procesarConIA(texto) {
    try {
        const respuesta = await fetch('/api/asistente/procesar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: texto })
        });
        return await respuesta.json();
    } catch (error) {
        console.error('Error en IA:', error);
        // Fallback al sistema local
        return await procesarMensajeUsuario(texto);
    }
}
```

### Paso 3: Cambiar modo en `asistente.js`

```javascript
// Cambiar de:
const respuesta = await procesarMensajeUsuario(texto);

// A:
const respuesta = await procesarConIA(texto);
```

## 📊 Estructura de Respuesta

Todos los comandos retornan un objeto estándar:

```javascript
{
    tipo: 'exito' | 'error' | 'info' | 'pregunta',
    mensaje: string,           // Texto de respuesta
    sugerencias: [             // Botones de acción
        {
            texto: string,     // Lo que ve el usuario
            comando: string    // Lo que se envía al asistente
        }
    ]
}
```

## 💾 Persistencia en Firebase

### Estructura de Datos

```
firestore/
└── mensajes/
    ├── mensaje_1
    │   ├── texto: "crea una factura de 50"
    │   ├── tipo: "user"
    │   └── timestamp: 2026-04-19...
    └── mensaje_2
        ├── texto: "✅ Factura creada..."
        ├── tipo: "bot"
        ├── tipo_respuesta: "exito"
        └── timestamp: 2026-04-19...
```

### Acceder al Historial

```javascript
// Firebase
onSnapshot(query(collection(db, "mensajes"), orderBy("timestamp", "asc")), 
    (snapshot) => {
        snapshot.forEach((doc) => {
            console.log(doc.data());
        });
    }
);
```

## 🧪 Pruebas Rápidas

Prueba estos comandos en el Asistente:

```
✅ "Crea una factura de 100 euros"
✅ "necesito una factura para juan"
✅ "Agendar cita con maria"
✅ "Buscar cliente ana"
✅ "Resumen del día"
✅ "Ayuda"
✅ "Hola" (debería mostrar opciones)
```

## 📝 Mejoras Futuras

- [ ] Detección de sentimientos
- [ ] Respuestas más naturales
- [ ] Integración con IA (OpenAI, Hugging Face)
- [ ] Multiidioma
- [ ] Voz (speech-to-text)
- [ ] Aprendizaje de preferencias del usuario
- [ ] Automatización de tareas recurrentes

## 🔗 Archivos Relacionados

- [asistente.js](../views/asistente.js) - Vista/UI del chat
- [command-processor.js](../modules/command-processor.js) - Lógica de procesamiento
- [DEMO_MODE.md](../../DEMO_MODE.md) - Información sobre modo demo
- [QUICK_START.md](../../QUICK_START.md) - Guía rápida

## 🐛 Debugging

### Ver intenciones detectadas

```javascript
// En console del navegador
const intencion = detectarIntencion("crea una factura de 50");
console.log(intencion);  // Debería mostrar: 'factura'
```

### Ver respuesta del asistente

```javascript
// En command-processor.js, agregar console.log
console.log('Respuesta generada:', respuesta);
```

### Ver datos en Firebase

```javascript
// En console
db.collection("mensajes").get().then(snap => {
    snap.docs.forEach(doc => console.log(doc.data()));
});
```

## 📞 Soporte

Para problemas con el asistente:

1. Revisar console del navegador para errores
2. Verificar conexión a Firebase
3. Comprobar que el comando esté en la lista de intenciones
4. Revisar archivo `command-processor.js`

---

**Versión**: 2.0 (Comandos Locales)  
**Última actualización**: Abril 2026  
**Estado**: ✅ Listo para usar y extender

**Próximo paso**: Integrar con IA cuando tengas backend 🚀
