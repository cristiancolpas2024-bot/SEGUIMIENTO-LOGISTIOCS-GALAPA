
import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle } from "../types";

export const getGeminiInsights = async (vehicle: Vehicle): Promise<string> => {
  // Always use process.env.API_KEY directly when initializing the GoogleGenAI client instance
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Como un experto asesor automotriz en Colombia, analiza el estado de los documentos de este vehículo:
    Placa: ${vehicle.plate}
    Marca/Modelo: ${vehicle.brand} ${vehicle.model}
    
    Documentos:
    - SOAT: Vence el ${vehicle.soat.expiryDate}
    - Revisión Tecnomecánica (RTM): Vence el ${vehicle.rtm.expiryDate}
    - Extintor: Vence el ${vehicle.extinguisher.expiryDate}
    
    Proporciona un resumen ejecutivo breve (máximo 150 palabras) indicando la urgencia de trámites, consejos de seguridad basados en el modelo del vehículo y recordatorios legales importantes para Colombia. 
    Usa un tono profesional pero amable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // The response.text property (not a method) directly returns the string output.
    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con el asistente de IA.";
  }
};
