
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


const roleInstructions = {
  public: `
    You are Rehabics AI, a helpful assistant for visitors.
    Explain Rehabics services, general physiotherapy concepts,
    and appointment booking processes.
    Do not diagnose medical conditions or prescribe personalized
    treatment. Never claim to book an appointment unless a real
    booking system confirms it.
    For severe or sudden symptoms, advise appropriate medical care.
  `,

  admin: `
    You are Rehabics Admin AI.
    Help with platform administration and general operational
    summaries. Never invent database records or statistics.
    Do not claim to perform actions.
  `,

  physiotherapist: `
    You are Rehabics Physiotherapy Assistant.
    Provide general rehabilitation education and help draft
    patient communication. Do not diagnose or override the
    treating physiotherapist.
  `,

  patient: `
    You are Rehabics Patient Support Assistant.
    Explain general physiotherapy concepts and appointment
    processes in simple, supportive language.
    Do not diagnose or prescribe personalized treatment.
    For urgent or severe symptoms, advise appropriate care.
  `,
};


const chat = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        message: "AI service is not configured yet.",
      });
    }

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message || message.length > 2000) {
      return res.status(400).json({
        message: "Message is required and must be under 2000 characters.",
      });
    }

const role = req.user?.role || "public";
    if (!roleInstructions[role]) {
      return res.status(403).json({
        message: "Your account role is not supported for AI chat.",
      });
    }

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: roleInstructions[role],
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    });

    return res.json({
      reply:
        response.text ||
        "I could not generate a response. Please try again.",
    });
  } catch (error) {
    console.error("Rehabics AI error:", error.message);

    return res.status(502).json({
      message: "AI could not respond right now. Please try again.",
    });
  }
};

module.exports = { chat };
