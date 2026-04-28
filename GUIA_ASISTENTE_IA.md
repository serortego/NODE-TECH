# Guía Completa del Asistente IA (Ollama + Python)

Esta guía explica en profundidad cómo funciona el nuevo Asistente Inteligente de tu aplicación, responde a tus preguntas clave y te da los pasos exactos para arrancarlo cuando lo necesites.

---

## 1. Preguntas Frecuentes (FAQ)

### ¿Has descargado una Inteligencia Artificial en mi ordenador?
**Sí, totalmente.** He descargado un programa llamado **Ollama** y, a través de él, hemos descargado un modelo de inteligencia artificial real llamado `llama3.2` (creado por Meta/Facebook). Este modelo pesa alrededor de 2 GB y ahora vive físicamente en el disco duro de tu ordenador. No dependes de internet ni de servidores externos como ChatGPT para que "piense". Todo el razonamiento ocurre en tu propia máquina.

### ¿Para funcionar, mi ordenador tiene que estar encendido?
**Sí.** Al estar instalada físicamente en tu ordenador, la IA usa el procesador (y/o la tarjeta gráfica) de tu máquina para pensar y generar respuestas. Si tu ordenador está apagado, la IA no existe.
*Nota futura: Si el día de mañana publicas esta página web para que la usen otros clientes en internet, tendrías que alquilar un ordenador en la nube (servidor) que esté encendido 24/7 y que tenga este modelo de IA instalado.*

### ¿Cuando quiera que funcione la IA, qué tengo que hacer?
Para que el asistente de la web cobre vida, siempre deben estar funcionando **dos piezas** en tu ordenador al mismo tiempo:
1. **Ollama:** El motor de la inteligencia artificial.
2. **El servidor Python (Backend):** El "traductor" que comunica tu página web con Ollama.

A continuación, te explico cómo arrancar ambas cosas paso a paso.

---

## 2. Guía de Arranque Paso a Paso (Control Manual 100%)

*IMPORTANTE: Ollama ya NO arranca de forma invisible al iniciar el ordenador para que tengas el control total sobre los recursos de tu máquina.*

Siempre que enciendas tu ordenador y quieras que el chatbot funcione, debes encender manualmente **DOS TERMINALES**:

### Paso 1: Encender el motor de IA (Ollama)
1. Abre tu terminal de Windows (Símbolo del sistema o PowerShell).
2. Escribe este comando y pulsa Enter:
   ```bash
   ollama run llama3.2
   ```
   *(Verás que arranca la IA y se queda lista para chatear. Deja esta ventana de terminal abierta o minimizada).*

### Paso 2: Encender el Backend de Python (El Traductor)
Este es el código que conecta la página web con Ollama.
1. Abre una **nueva ventana de terminal** (o hazlo desde la terminal integrada de Visual Studio Code).
2. Navega a la carpeta del backend:
   ```bash
   cd src\backend
   ```
3. Ejecuta el servidor con este comando:
   ```bash
   python -m uvicorn backend:app --host 0.0.0.0 --port 8000
   ```
   *(Deberás ver un texto que termina en "Uvicorn running...". Deja esta terminal también abierta o minimizada).*

### Paso 3: Usar la web y Apagado
- **Para usar la IA:** Ya puedes usar la página web de forma normal. Mientras esas dos terminales estén abiertas, el chatbot estará disponible. Si no están abiertas, la web mostrará `❌ Chatbot no disponible` protegiendo tu app.
- **Para apagar la IA y liberar recursos:** 
  1. Ve a la terminal del Python y presiona `Control + C` (o cierra la ventana).
  2. Ve a la terminal de Ollama, escribe `/bye` y pulsa Enter (o cierra la ventana). ¡Listo! Inteligencia Artificial totalmente apagada.

---

## 3. ¿Cómo funciona por debajo? (Para que tengas el control)

Es fundamental que entiendas la arquitectura para que tengas el control total de tu código:

1. **El Frontend (JavaScript - `chatbot.js`)**
   - El usuario escribe: *"Agéndame una cita para mañana"*.
   - El archivo `chatbot.js` intercepta el texto y lo envía en formato JSON al backend de Python mediante un `fetch("http://localhost:8000/chat")`.

2. **El Backend (Python - `backend.py`)**
   - Recibe el texto de la web.
   - En este archivo Python tenemos definida una lista llamada `TOOLS` (Herramientas). Son instrucciones para la IA que le dicen: *"Oye, la web tiene funciones para crear citas, buscar clientes, etc."*.
   - Python le envía el mensaje del usuario + las `TOOLS` a Ollama (la IA).

3. **Ollama (La Inteligencia - Modelo llama3.2)**
   - Ollama recibe la información y "piensa": *"El usuario quiere una cita para mañana. Veo que tengo una herramienta llamada `crearCita` que requiere un nombre y una fecha. ¡Perfecto!"*
   - Ollama le responde al Python: *"No quiero responder con texto normal, quiero ejecutar la herramienta `crearCita`"*.

4. **El Viaje de Vuelta**
   - El Python recibe esta orden y se la devuelve a la web (`chatbot.js`).
   - La web dice: *"¡Ah! La IA quiere que ejecute `crearCita`"*. Entonces la web ejecuta la función en `window.dataManager`.
   - Una vez creada la cita internamente en la base de datos, la web le avisa de nuevo al Python: *"Ya está, cita creada"*.
   - Python se lo pasa a Ollama, y Ollama finalmente redacta el mensaje amigable: *"¡Listo! He agendado la cita para mañana"*.

Con este sistema tienes **arquitectura profesional**. El Frontend solo se encarga de mostrar la web, la IA está encapsulada localmente, y el Backend actúa de director de orquesta.
