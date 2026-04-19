# 🚀 Guía: Integrar IA al Asistente NODE

Cuando estés listo para agregar IA verdadera al asistente, sigue esta guía.

## 📋 Opciones de IA

### 1️⃣ OpenAI GPT (Recomendado para Producción)
- **Ventaja**: Mejor comprensión de lenguaje natural
- **Costo**: $0.001 - $0.003 USD por request
- **Velocidad**: ~1 segundo
- **Configuración**: Fácil con API key

### 2️⃣ Hugging Face (Gratuito, Local)
- **Ventaja**: Gratuito, privado, sin cuota
- **Costo**: 0 USD (pero recursos locales)
- **Velocidad**: 2-5 segundos
- **Configuración**: Requiere backend

### 3️⃣ Cohere (Intermedio)
- **Ventaja**: Buena relación costo-beneficio
- **Costo**: $0.002 - $0.005 USD por request
- **Velocidad**: ~1 segundo
- **Configuración**: Fácil

## 🔧 Implementación Paso a Paso

### OPCIÓN 1: OpenAI (Más Fácil)

#### Paso 1: Crear Cuenta

1. Ir a [openai.com](https://openai.com)
2. Sign up y crear API key
3. Agregar método de pago

#### Paso 2: Backend con Python (Flask)

```python
# requirements.txt
flask==3.0.0
flask-cors==4.0.0
openai==1.3.0

# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

app = Flask(__name__)
CORS(app)

# Configurar OpenAI
openai.api_key = "tu-api-key-aqui"

@app.route('/api/asistente/procesar', methods=['POST'])
def procesar_mensaje():
    data = request.json
    mensaje = data.get('mensaje', '')
    
    try:
        # Llamar a GPT
        respuesta = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """Eres el asistente NODE, un chatbot para gestión empresarial.
                    Tu tarea es:
                    1. Entender lo que el usuario quiere (crear factura, agendar cita, etc)
                    2. Responder de forma clara y amigable
                    3. Devolver un JSON con la estructura: 
                    { "tipo": "exito|error|info", "mensaje": "...", "sugerencias": [...] }"""
                },
                {"role": "user", "content": mensaje}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        # Parsear respuesta
        respuesta_texto = respuesta.choices[0].message.content
        
        # Convertir a JSON si es posible
        import json
        try:
            resultado = json.loads(respuesta_texto)
        except:
            resultado = {
                "tipo": "info",
                "mensaje": respuesta_texto,
                "sugerencias": []
            }
        
        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({
            "tipo": "error",
            "mensaje": f"Error: {str(e)}",
            "sugerencias": []
        }), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

#### Paso 3: Actualizar Frontend

En `command-processor.js`:

```javascript
export async function procesarConIA(texto) {
    try {
        const respuesta = await fetch('http://localhost:5000/api/asistente/procesar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: texto })
        });
        
        if (!respuesta.ok) throw new Error('Error en servidor');
        
        return await respuesta.json();
    } catch (error) {
        console.error('Error en IA:', error);
        // Fallback al sistema local
        return await procesarMensajeUsuario(texto);
    }
}
```

En `asistente.js`, cambiar:

```javascript
// Antes:
const respuesta = await procesarMensajeUsuario(texto);

// Después:
const respuesta = await procesarConIA(texto);
```

#### Paso 4: Ejecutar

```bash
# Terminal 1: Backend
python app.py
# Output: Running on http://localhost:5000

# Terminal 2: Frontend
cd src/frontend/public
python -m http.server 8000
# Abre: http://localhost:8000
```

---

### OPCIÓN 2: Hugging Face (Gratuito)

#### Paso 1: Backend con FastAPI

```python
# requirements.txt
fastapi==0.104.0
uvicorn==0.24.0
transformers==4.35.0
torch==2.0.0

# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

app = FastAPI()

# Permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar modelo de lenguaje
nlp = pipeline("text-generation", model="gpt2")

@app.post("/api/asistente/procesar")
async def procesar_mensaje(data: dict):
    mensaje = data.get('mensaje', '')
    
    try:
        # Generar respuesta
        resultado = nlp(mensaje, max_length=100, num_return_sequences=1)
        respuesta_texto = resultado[0]['generated_text']
        
        return {
            "tipo": "info",
            "mensaje": respuesta_texto,
            "sugerencias": [
                {"texto": "Ver Finanzas", "comando": "ir a finanzas"},
                {"texto": "Crear factura", "comando": "crea una factura"}
            ]
        }
    except Exception as e:
        return {
            "tipo": "error",
            "mensaje": f"Error: {str(e)}",
            "sugerencias": []
        }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

#### Paso 2: Ejecutar

```bash
uvicorn app:app --reload
```

---

### OPCIÓN 3: Cohere API

Similar a OpenAI, pero con API de Cohere:

```python
import cohere

co = cohere.Client("tu-api-key")

response = co.generate(
    prompt=f"Usuario: {mensaje}\nAsistente:",
    max_tokens=300
)

respuesta_texto = response.generations[0].text
```

---

## 🎯 Mejor Práctica: Arquitectura Escalable

```
Frontend (Node)
    ↓
API Gateway (opcional)
    ↓
Backend (tu servidor)
    ├─ Endpoint /api/asistente/procesar
    ├─ Validar entrada
    ├─ Llamar a IA (OpenAI, Hugging Face, etc)
    ├─ Procesar respuesta
    └─ Guardar en Firebase/BD
    ↓
Firebase/Base de Datos
```

## 🔒 Seguridad

### Nunca expongas API keys

```javascript
// ❌ MALO - API key en frontend
const respuesta = await fetch('https://api.openai.com/...', {
    headers: { 'Authorization': 'Bearer sk-xxx...' }
});

// ✅ BUENO - Backend hace la llamada
const respuesta = await fetch('http://localhost:5000/api/asistente/...', {
    method: 'POST',
    body: JSON.stringify({ mensaje: texto })
});
```

### Variables de entorno

```python
# .env (NO COMMITEAR)
OPENAI_API_KEY=sk-xxx...
DATABASE_URL=...

# app.py
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('OPENAI_API_KEY')
```

## 📊 Prompts Efectivos para IA

### Prompt para Asistente NODE

```
Eres el asistente NODE, un chatbot profesional para gestión empresarial.

Tu objetivo es:
1. Entender lo que el usuario necesita
2. Responder de forma clara y amigable
3. Sugerir acciones relacionadas
4. Devolver respuestas en formato JSON

Siempre responde en JSON con esta estructura:
{
    "tipo": "exito" | "error" | "info" | "pregunta",
    "mensaje": "Tu respuesta aquí",
    "sugerencias": [
        {"texto": "Opción 1", "comando": "comando1"},
        {"texto": "Opción 2", "comando": "comando2"}
    ]
}

El usuario quiere:
{mensaje_del_usuario}

Responde:
```

## 💡 Estrategia Híbrida (Recomendada)

Combinar sistema local + IA:

```javascript
export async function procesarMensajeUsuario(texto) {
    // 1. Primero intentar con comandos locales
    if (esComandoSimple(texto)) {
        return procesarLocal(texto);
    }
    
    // 2. Si es más complejo, usar IA
    try {
        return await procesarConIA(texto);
    } catch (error) {
        // 3. Si falla IA, volver a local
        return procesarLocal(texto);
    }
}
```

**Ventajas:**
- ⚡ Rápido para comandos simples
- 🤖 Inteligente para preguntas complejas
- 🔄 Fallback si IA no disponible
- 💰 Menos llamadas a IA = menos costo

## 📈 Estimación de Costos

### OpenAI GPT-3.5 (Recomendado)

```
- $0.0005 por 1K tokens entrada
- $0.0015 por 1K tokens salida
- Promedio: $0.001 por mensaje

1,000 mensajes/mes = $1 USD
10,000 mensajes/mes = $10 USD
100,000 mensajes/mes = $100 USD
```

### Hugging Face (Gratuito)

```
- 0 USD por API
- Solo costo de servidor
- Para pequeña escala: ~$5-20 USD/mes hosting
```

## 🚀 Deployment

### Opción A: Heroku (Fácil)

```bash
# Crear Procfile
echo "web: python app.py" > Procfile

# Deployar
heroku create tu-app-nombre
heroku config:set OPENAI_API_KEY=sk-xxx
git push heroku main
```

### Opción B: Railway (Moderno)

1. Conectar GitHub
2. Agregar variables de entorno
3. Deploy automático

### Opción C: Docker (Profesional)

```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

## ✅ Checklist Implementación

- [ ] Elegir proveedor de IA (OpenAI/HF/Cohere)
- [ ] Crear cuenta y API key
- [ ] Crear backend (Flask/FastAPI)
- [ ] Implementar endpoint `/api/asistente/procesar`
- [ ] Actualizar `command-processor.js`
- [ ] Actualizar `asistente.js` para usar IA
- [ ] Agregar fallback a sistema local
- [ ] Probar localmente
- [ ] Configurar variables de entorno
- [ ] Deploy a servidor
- [ ] Monitorear logs
- [ ] Optimizar prompts

## 📞 Recursos Útiles

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Hugging Face Models](https://huggingface.co/models)
- [Cohere API](https://cohere.com/api)
- [Flask Docs](https://flask.palletsprojects.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

**Cuando estés listo, sigue esta guía y tu asistente NODE será potenciado por IA 🤖✨**
