
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
  status: 'active' | 'inactive';
  order: number;
  preview?: string;
  createdAt: number;
}

// Default categories for initialization, but the app now supports dynamic strings
export const DEFAULT_CATEGORIES = [
  'Frontend',
  'Backend',
  'Design',
  'Productivity',
  'News',
  'Hobby',
  'Finance',
  'Other',
  'Uncategorized'
];

export type CategoryType = string;

export interface AIResponse {
  category: string;
}

export type AIProvider = 'openrouter' | 'gemini' | 'ollama';

export interface AISettings {
  provider: AIProvider;
  
  // OpenRouter Settings
  openRouterApiKey: string;
  openRouterModel: string;

  // Gemini Settings
  geminiApiKey: string;
  geminiModel: string;

  // Ollama Settings
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaApiKey: string;

  // Performance Settings
  batchSize: number;
  delayBetweenBatches: number; // in milliseconds
}

export const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-pro-exp-02-05:free', name: 'Gemini 2.0 Pro Exp (Free)' },
  { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini 2.0 Flash Thinking (Free)' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
];

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  openRouterApiKey: '',
  openRouterModel: 'google/gemini-2.0-pro-exp-02-05:free',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  ollamaApiKey: '',
  batchSize: 1, // Default to 1 for safety
  delayBetweenBatches: 5000, // Default 5 seconds
};
