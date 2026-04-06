import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateJSONContent(prompt: string, schema: any, modelContext?: string) {
  const fullPrompt = modelContext 
    ? `Aqui está um modelo de arquivo JSON que eu utilizo:\n\n${modelContext}\n\n${prompt}`
    : prompt;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "Você é um assistente especializado em gerar dados estruturados em JSON. Siga rigorosamente o esquema fornecido. Se um modelo de arquivo for fornecido, mantenha exatamente a mesma estrutura de chaves e estilo de conteúdo, apenas gerando novos dados (como para um novo mês ou período). Se o usuário pedir conteúdo bíblico, garanta precisão teológica e use versões conhecidas da Bíblia.",
    },
  });

  return response.text;
}
