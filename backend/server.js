import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: No se encontró GEMINI_API_KEY en el archivo .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
Eres el asistente virtual de Asertiva Mente, Centro Psicológico ubicado en Trujillo, Perú.

INFORMACIÓN DEL CENTRO:
Nombre: Asertiva Mente
Dirección: Av. Prol. César Vallejo 1366, Trujillo 13001
Teléfono/WhatsApp: 966 941 229

SERVICIOS Y PRECIO:
- Terapia individual: Para procesos personales, duelo, decisiones de vida o separación.
- Terapia de pareja: Para conflictos, comunicación o afrontar una separación de forma saludable.
- Terapia familiar, infantil y adolescente.
- Precio por sesión: S/ 130

REGLAS DE ATENCIÓN:
1. Responde de forma empática, profesional y BREVE (máximo 2 a 3 oraciones).
2. Si el usuario plantea un conflicto o separación: valida brevemente y recomienda Terapia Individual o de Pareja. Pregunta si desea agendar.
3. Si acepta agendar, solicita 6 datos: Nombre, Teléfono, Correo, Servicio, Fecha, Hora.
4. Con los 6 datos completos, incluye el enlace de WhatsApp al final:
   https://wa.me/51966941229?text=Hola,%20deseo%20confirmar%20mi%20cita%20con%20los%20siguientes%20datos:%20[ResumenDeDatos]
`;

// Ordenados por velocidad: el lite es el más rápido, va primero
const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash"
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(contents, maxAttempts = 2) {
  let lastError = null;

  for (const modelName of MODELS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            // Desactiva el razonamiento interno: respuesta mucho más rápida
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 300 // las respuestas son breves (2-3 oraciones)
          }
        });
        if (response.text) {
          return response.text;
        }
      } catch (err) {
        lastError = err;
        const status = err.status || err.error?.code || "sin codigo";
        console.warn(`⚠️ ${modelName} intento ${attempt}/${maxAttempts} falló (${status})`);
        if (attempt < maxAttempts) {
          await sleep(1500); // espera corta: el 503 suele durar segundos
        }
      }
    }
  }
  throw lastError || new Error("Ningún modelo estuvo disponible.");
}

app.post("/api/chat", async (req, res) => {
  const inicio = Date.now();
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "El mensaje está vacío." });
    }

    // Filtrar el historial
    const contents = [];
    if (Array.isArray(history)) {
      history.forEach((item) => {
        if (
          item &&
          item.text &&
          typeof item.text === "string" &&
          item.text.trim() !== "" &&
          !item.text.toLowerCase().includes("error")
        ) {
          const role = item.role === "user" ? "user" : "model";
          if (contents.length === 0 || contents[contents.length - 1].role !== role) {
            contents.push({
              role: role,
              parts: [{ text: item.text.trim() }]
            });
          }
        }
      });
    }

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents.pop();
    }

    contents.push({
      role: "user",
      parts: [{ text: message.trim() }]
    });

    const replyText = await generateWithRetry(contents);
    console.log(`✅ Respuesta en ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    res.json({ reply: replyText });

  } catch (error) {
    console.error("=================================");
    console.error("ERROR BACKEND:", error.message || error);
    console.error("=================================");

    res.status(500).json({
      error: "El servicio se encuentra con alta demanda en este momento. Por favor, intenta enviar tu mensaje nuevamente en unos segundos.",
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Asertiva Mente IA activo en http://localhost:${PORT}`);
});