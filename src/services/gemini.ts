import { GoogleGenAI, Type } from "@google/genai";

export async function generateJSONContent(prompt: string, schema: any, modelContext?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    throw new Error("A chave de API do Gemini não foi configurada. Se você fez o deploy na Vercel, certifique-se de adicionar a variável de ambiente GEMINI_API_KEY nas configurações do projeto.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = modelContext 
    ? `Aqui está um modelo de arquivo JSON que eu utilizo:\n\n${modelContext}\n\n${prompt}`
    : prompt;

  const config: any = {
    responseMimeType: "application/json",
    systemInstruction: "Você é um assistente especializado em gerar dados estruturados em JSON. Siga rigorosamente o esquema fornecido. Se um modelo de arquivo for fornecido, mantenha exatamente a mesma estrutura de chaves e estilo de conteúdo, apenas gerando novos dados (como para um novo mês ou período). Se o usuário pedir conteúdo bíblico, garanta precisão teológica e use versões conhecidas da Bíblia.",
  };

  if (schema) {
    config.responseSchema = schema;
  }

  const response = await ai.models.generateContent({
    // Alterado para o modelo Flash para evitar erros de cota e aumentar a velocidade
    model: "gemini-3-flash-preview", 
    contents: fullPrompt,
    config,
  });

  return response.text;
}