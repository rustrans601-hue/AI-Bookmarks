
import { getAISettings } from './storage';
import { GoogleGenAI, Type } from "@google/genai";

const STRICT_CATEGORIES = [
  "Work / Business",
  "Technology / AI",
  "Education",
  "Tools",
  "Media / Content",
  "Travel",
  "Shopping",
  "Finance",
  "Hobbies",
  "Personal"
];

const SYSTEM_PROMPT = `
  You are an expert bookmark classifier. Your goal is to organize bookmarks based on their **semantic meaning**, not just their domain.

  I will provide a list of bookmarks with "title" and "url".

  RULES FOR CATEGORIES:
  1. You must assign EXACTLY ONE category per bookmark.
  2. You MUST choose from this strict list of 10 categories:
     ${JSON.stringify(STRICT_CATEGORIES)}
  3. Choose the category that best describes the *primary purpose* of the link.

  RULES FOR TAGS:
  1. Assign 1 to 5 tags per bookmark.
  2. Tags must represent secondary meanings, specific topics, or technologies.
  3. Tags must be short (1-2 words), lowercase, and in English.
  4. DO NOT use abstract tags like "interesting", "misc", "other".
  5. DO NOT duplicate the category name in the tags.

  EXAMPLE:
  Input: { "title": "OpenAI API Docs", "url": "platform.openai.com" }
  Output: { 
    "category": "Technology / AI", 
    "tags": ["llm", "api", "developer", "documentation"] 
  }

  Return ONLY a valid JSON array of objects with fields: "id", "category", "tags".
`;

const MAX_RETRIES = 5;

// Helper to pause execution with abort support
const delay = (ms: number, signal?: AbortSignal) => new Promise<void>(resolve => {
    if (signal?.aborted) {
        resolve();
        return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
    });
});

export const organizeBookmarksBatch = async (
  bookmarks: { id: string; title: string; url: string }[],
  existingCategories: string[], // Kept for signature compatibility but ignored in favor of STRICT_CATEGORIES
  signal?: AbortSignal
): Promise<{ id: string; category: string; tags: string[] }[]> => {
  if (bookmarks.length === 0) return [];

  const settings = getAISettings();
  const batchSize = settings.batchSize || 1;
  const delayMs = settings.delayBetweenBatches || 5000;

  const chunks = [];
  for (let i = 0; i < bookmarks.length; i += batchSize) {
    chunks.push(bookmarks.slice(i, i + batchSize));
  }

  console.log(`[v6] Starting AI organization: ${bookmarks.length} bookmarks. Batch Size: ${batchSize}. Delay: ${delayMs}ms.`);
  
  let allResults: { id: string; category: string; tags: string[] }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    // Check for abort before processing chunk
    if (signal?.aborted) {
        console.log("AI Organization stopped by user.");
        break;
    }

    const chunk = chunks[i];
    try {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} items)...`);
      // Use the retry wrapper with signal
      const chunkResults = await processChunkWithRetry(chunk, 0, signal);
      allResults = [...allResults, ...chunkResults];
      
      // Delay between chunks to be polite to APIs and avoid rate limits
      if (i < chunks.length - 1) {
          if (signal?.aborted) break;
          console.log(`Waiting ${delayMs}ms before next batch...`);
          await delay(delayMs, signal);
      }
    } catch (error: any) {
      // If aborted, log info and break without error
      if (signal?.aborted || error.message === 'Aborted by user' || error.name === 'AbortError') {
          console.log("Processing stopped/aborted.");
          break;
      }

      console.error(`Error processing chunk ${i + 1}:`, error);
      
      // Stop on Quota Exceeded or Auth errors to prevent log spam
      const errMsg = (error?.message || String(error)).toLowerCase();
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('resource_exhausted') || 
          errMsg.includes('401') || errMsg.includes('unauthorized') || 
          errMsg.includes('403') || errMsg.includes('forbidden') ||
          errMsg.includes('invalid api key')) {
          console.error("Aborting remaining chunks due to Critical API Error (Rate Limit/Quota/Auth).");
          break;
      }
    }
  }

  return allResults;
};

// Wrapper to handle retries and fallback
const processChunkWithRetry = async (
    chunk: { id: string; title: string; url: string }[],
    retryCount = 0,
    signal?: AbortSignal
): Promise<{ id: string; category: string; tags: string[] }[]> => {
    if (signal?.aborted) throw new Error("Aborted by user");

    try {
        return await processChunk(chunk, signal);
    } catch (error: any) {
        if (signal?.aborted || error.name === 'AbortError') throw new Error("Aborted by user");

        const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
        
        // Critical Errors - DO NOT RETRY
        const isAuthError = 
            errorMessage.includes('401') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('403') || 
            errorMessage.includes('forbidden') ||
            errorMessage.includes('invalid api key') ||
            errorMessage.includes('invalid_api_key');

        if (isAuthError) {
            console.error("Authentication or Permission error. Stopping retries.");
            throw error;
        }

        const isProviderError = errorMessage.includes('provider') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('failed to fetch');
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');

        // FALLBACK LOGIC:
        const settings = getAISettings();
        if (settings.provider === 'openrouter' && (isProviderError || isRateLimit) && settings.geminiApiKey) {
            console.warn("OpenRouter failed or rate limited. Attempting fallback to Direct Gemini API...");
            try {
                return await callDirectGemini(settings.geminiApiKey, 'gemini-2.0-flash', chunk);
            } catch (fallbackError) {
                console.error("Fallback to Gemini also failed:", fallbackError);
            }
        }

        // RETRY LOGIC:
        if (retryCount < MAX_RETRIES) {
            let waitTime = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s...
            
            if (isRateLimit) {
                // Wait much longer for rate limits
                waitTime = 10000 + (retryCount * 5000); 
                console.warn(`Rate limit hit (429). Cooling down for ${waitTime}ms before retry ${retryCount + 1}...`);
            } else {
                console.warn(`Chunk failed. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            }
            
            // Pass signal to delay to allow interruption
            await delay(waitTime, signal);
            return processChunkWithRetry(chunk, retryCount + 1, signal);
        }

        throw error;
    }
};

// Direct Gemini Call (Used for Fallback)
const callDirectGemini = async (
    apiKey: string, 
    model: string, 
    bookmarksChunk: any[]
): Promise<any[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = JSON.stringify(bookmarksChunk);
    
    const response = await ai.models.generateContent({
        model: model,
        contents: userPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        category: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["id", "category", "tags"]
                }
            }
        },
    });

    return parseResponse(response.text || '');
};

const parseResponse = (jsonStr: string): any[] => {
    if (!jsonStr) return [];
    
    let cleanJson = jsonStr.trim();
    if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '');
    }

    try {
        const result = JSON.parse(cleanJson);
        const arrayResult = Array.isArray(result) ? result : (result.items || []);
        
        // Post-processing to ensure tags are unique and lowercase
        return arrayResult.map((item: any) => ({
            ...item,
            tags: Array.isArray(item.tags) ? [...new Set(item.tags.map((t: any) => String(t).toLowerCase()))] : []
        }));
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return [];
    }
};

const processChunk = async (
  bookmarksChunk: { id: string; title: string; url: string }[],
  signal?: AbortSignal
): Promise<{ id: string; category: string; tags: string[] }[]> => {
    const settings = getAISettings();
    const { provider } = settings;
    const userPrompt = JSON.stringify(bookmarksChunk);

    let jsonStr = '';

    // --- GEMINI PROVIDER ---
    if (provider === 'gemini') {
        const apiKey = settings.geminiApiKey;
        if (!apiKey) throw new Error("Google Gemini API Key is missing. Please add it in Settings.");
        
        const ai = new GoogleGenAI({ apiKey });
        
        if (signal?.aborted) throw new Error("Aborted by user");

        const response = await ai.models.generateContent({
          model: settings.geminiModel || 'gemini-2.0-flash',
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "category", "tags"]
              }
            }
          },
        });

        jsonStr = response.text || '';
    }
    
    // --- OLLAMA PROVIDER ---
    else if (provider === 'ollama') {
        let baseUrl = (settings.ollamaBaseUrl || 'http://localhost:11434').trim();
        // Normalize URL to ensure http(s) protocol
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `http://${baseUrl}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        const model = settings.ollamaModel || 'llama3';
        const apiKey = settings.ollamaApiKey;

        console.log(`[Ollama] Using Model: "${model}" at BaseURL: ${baseUrl}`);

        const doFetch = async (url: string) => {
             console.log(`Calling Ollama at ${url} with model ${model}`);
             
             const headers: any = {
                "Content-Type": "application/json",
             };

             if (apiKey) {
                 headers['Authorization'] = `Bearer ${apiKey}`;
             }

             const res = await fetch(`${url}/api/chat`, {
                 method: "POST",
                 headers,
                 body: JSON.stringify({
                    model: model,
                    messages: [
                      { role: "system", content: SYSTEM_PROMPT },
                      { role: "user", content: userPrompt }
                    ],
                    stream: false,
                    format: "json" // Force JSON mode for Ollama
                  }),
                  signal
             });
             
             if (!res.ok) {
                throw new Error(`Ollama API Error: ${res.status} ${res.statusText}`);
             }
             return res;
        };

        let response;
        try {
            response = await doFetch(baseUrl);
        } catch (e: any) {
             // Auto-retry with 127.0.0.1 if localhost fails (common IPv6 issue)
             if (baseUrl.includes('localhost') && (e.message.includes('fetch') || e.message.includes('failed'))) {
                 console.warn("Ollama connection failed on localhost, retrying with 127.0.0.1...");
                 baseUrl = baseUrl.replace('localhost', '127.0.0.1');
                 response = await doFetch(baseUrl);
             } else {
                 throw e;
             }
        }

        const data = await response.json();
        jsonStr = data.message?.content || '';
    }

    // --- OPENROUTER PROVIDER ---
    else {
        const apiKey = settings.openRouterApiKey;
        if (!apiKey) throw new Error("OpenRouter API Key is missing. Please add it in Settings.");

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin, 
            "X-Title": "AI Bookmark Manager",
          },
          body: JSON.stringify({
            model: settings.openRouterModel,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
          }),
          signal // Pass signal to fetch
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const backendError = errorData.error?.message;
            throw new Error(backendError || `Provider returned error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        jsonStr = data.choices?.[0]?.message?.content || '';
    }

    return parseResponse(jsonStr);
};
