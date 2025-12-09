import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from "../types";

// NOTE: In a production environment, this key should be handled securely on the backend.
// For this client-side demo, we use the injected process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const categorizeBookmarkWithAI = async (title: string, url: string): Promise<string> => {
  try {
    const prompt = `
      Categorize the following bookmark based on its title and URL.
      Bookmark Title: "${title}"
      Bookmark URL: "${url}"
      
      You MUST strictly choose one category from this list: ${CATEGORIES.join(', ')}.
      If it doesn't fit well, choose 'Other'.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The best matching category from the provided list.",
              enum: [...CATEGORIES]
            }
          },
          required: ["category"]
        }
      }
    });

    const text = response.text;
    if (!text) return 'Uncategorized';

    const result = JSON.parse(text);
    return result.category || 'Other';

  } catch (error) {
    console.error("Gemini API Error:", error);
    return 'Uncategorized';
  }
};
