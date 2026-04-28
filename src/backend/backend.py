import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    user_context: Optional[str] = None

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "crearCita",
            "description": "Crea una nueva cita en la agenda para un cliente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente": { "type": "string", "description": "Nombre del cliente" },
                    "fecha": { "type": "string", "description": "Fecha de la cita (formato YYYY-MM-DD o 'hoy' o 'mañana')" },
                    "hora": { "type": "string", "description": "Hora de la cita (HH:MM)" },
                    "motivo": { "type": "string", "description": "El servicio, tratamiento o motivo de la cita" },
                    "duracion": { "type": "integer", "description": "Duración de la cita en minutos (ejemplo: 30, 45, 60)" }
                },
                "required": ["cliente", "fecha", "hora", "motivo", "duracion"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "verCitas",
            "description": "Muestra las citas agendadas para una fecha específica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fecha": { "type": "string", "description": "Fecha a consultar (formato YYYY-MM-DD, 'hoy' o 'mañana')" }
                },
                "required": ["fecha"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancelarCita",
            "description": "Cancela una cita existente de un cliente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente": { "type": "string", "description": "Nombre del cliente cuya cita se va a cancelar" }
                },
                "required": ["cliente"]
            }
        }
    }
]

# --- CONTEXTO Y COMPORTAMIENTO BASE DE LA IA ---
PROMPT_CONTEXTO_BASE = """Eres el asistente de Inteligencia Artificial exclusivo de NODE-TECH. 
NODE-TECH es un software avanzado de gestión empresarial (CRM y ERP) diseñado para clínicas dentales y otros negocios. 
Tu propósito es asistir al usuario en la gestión diaria de la clínica a través de esta plataforma.

REGLAS GENERALES DE COMPORTAMIENTO:
1. Eres una herramienta profesional de asistencia. NO debes tener conversaciones genéricas ni actuar como una persona normal. Tu tono debe ser servicial, conciso y profesional.
2. NUNCA, bajo ningún concepto, escribas código JSON o corchetes '{}' en tus respuestas textuales al usuario. Si ejecutas una herramienta, confirma la acción en lenguaje natural.
3. Si te saludan, responde de forma breve indicando que eres el asistente de NODE-TECH.
4. EXPLICACIONES: Si el usuario pregunta CÓMO hacer algo, explícale que tú puedes hacerlo si te da la información necesaria, pero NO ejecutes la herramienta.
"""

# --- INSTRUCCIONES ESPECÍFICAS DE LAS HERRAMIENTAS ---
PROMPT_HERRAMIENTAS = """CAPACIDADES Y HERRAMIENTAS:
Actualmente, tus capacidades están limitadas a la gestión de la Agenda: puedes crear citas, ver citas de un día específico y cancelar citas.
SOLO puedes utilizar las herramientas que tienes expresamente programadas.

REGLA DE ORO PARA CREAR CITAS: 
Para ejecutar la herramienta 'crearCita' necesitas 5 datos EXACTOS: Cliente, Fecha, Hora, Motivo (servicio) y Duración (en minutos). 
¡NUNCA TE INVENTES ESTOS DATOS! Si el usuario te pide una cita pero falta CUALQUIERA de estos datos, NO uses la herramienta. 
Pregúntale al usuario paso a paso la información que falta hasta tener los 5 datos antes de ejecutar la herramienta.
"""

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        messages = [msg.dict(exclude_none=True) for msg in request.messages]
        
        # Inject system prompt if not present
        if len(messages) > 0 and messages[0].get("role") != "system":
            contexto_usuario = f"DATOS DEL USUARIO ACTUAL (Úsalos para personalizar tu respuesta): {request.user_context}\n\n" if request.user_context else ""
            
            # Construcción dinámica y escalable del System Prompt
            final_system_prompt = f"{PROMPT_CONTEXTO_BASE}\n{contexto_usuario}\n{PROMPT_HERRAMIENTAS}"
            
            messages.insert(0, {
                "role": "system",
                "content": final_system_prompt
            })
        
        response = ollama.chat(
            model='llama3.2',
            messages=messages,
            tools=TOOLS
        )
        
        return response['message']
    except Exception as e:
        return {"error": str(e)}
