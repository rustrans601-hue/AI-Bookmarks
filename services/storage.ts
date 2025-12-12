
import { Bookmark, AISettings, DEFAULT_AI_SETTINGS } from '../types';

const STORAGE_KEY = 'ai_bookmarks_data';
const SETTINGS_KEY = 'ai_bookmarks_settings';

export const getScreenshotUrl = (url: string): string => {
  try {
    const encoded = encodeURIComponent(url);
    // Request a slightly larger image (800x600) to ensure good quality on retina screens
    return `https://s.wordpress.com/mshots/v1/${encoded}?w=800&h=600`;
  } catch (e) {
    return `https://ui-avatars.com/api/?background=random&name=URL`;
  }
};

const MOCK_DATA: Bookmark[] = [
  { 
    id: 'bkm-1', 
    title: 'React Documentation', 
    url: 'https://react.dev/', 
    category: 'Frontend', 
    tags: ['react', 'docs', 'ui'],
    status: 'active', 
    order: 1, 
    createdAt: Date.now(), 
    preview: getScreenshotUrl('https://react.dev/') 
  },
  { 
    id: 'bkm-2', 
    title: 'Vue.js Guide', 
    url: 'https://vuejs.org/', 
    category: 'Frontend', 
    tags: ['vue', 'framework'],
    status: 'active', 
    order: 2, 
    createdAt: Date.now(), 
    preview: getScreenshotUrl('https://vuejs.org/') 
  },
  { 
    id: 'bkm-3', 
    title: 'Broken Link Example', 
    url: 'https://broken-url-404.com/', 
    category: 'Backend', 
    tags: ['testing', '404'],
    status: 'inactive', 
    order: 3, 
    createdAt: Date.now(), 
    preview: getScreenshotUrl('https://broken-url-404.com/') 
  },
  { 
    id: 'bkm-4', 
    title: 'Firebase Firestore Docs', 
    url: 'https://firebase.google.com/docs/firestore', 
    category: 'Backend', 
    tags: ['database', 'firebase'],
    status: 'active', 
    order: 4, 
    createdAt: Date.now(), 
    preview: getScreenshotUrl('https://firebase.google.com/docs/firestore') 
  },
  { 
    id: 'bkm-5', 
    title: 'Modern CSS Layouts', 
    url: 'https://web.dev/', 
    category: 'Design', 
    tags: ['css', 'web'],
    status: 'active', 
    order: 5, 
    createdAt: Date.now(), 
    preview: getScreenshotUrl('https://web.dev/') 
  },
];

export const getBookmarks = (): Bookmark[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    // Initialize with mock data if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
  }
  return JSON.parse(data);
};

export const saveBookmarks = (bookmarks: Bookmark[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
};

export const addBookmarkToStorage = (bookmark: Bookmark) => {
  const bookmarks = getBookmarks();
  bookmarks.push(bookmark);
  saveBookmarks(bookmarks);
  return bookmarks;
};

export const updateBookmarkInStorage = (updated: Bookmark) => {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.id === updated.id);
  if (index !== -1) {
    bookmarks[index] = updated;
    saveBookmarks(bookmarks);
  }
  return bookmarks;
};

export const deleteBookmarkFromStorage = (id: string) => {
  const bookmarks = getBookmarks().filter(b => b.id !== id);
  saveBookmarks(bookmarks);
  return bookmarks;
};

// --- AI Settings ---

export const getAISettings = (): AISettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  let settings = DEFAULT_AI_SETTINGS;

  if (data) {
    try {
      const parsed = JSON.parse(data);
      
      // Migration: If old format (apiKey/model directly on root), move to OpenRouter fields
      if (parsed.apiKey && !parsed.openRouterApiKey) {
        parsed.openRouterApiKey = parsed.apiKey;
        parsed.openRouterModel = parsed.model || DEFAULT_AI_SETTINGS.openRouterModel;
        parsed.provider = 'openrouter';
      }
      
      // Migration: Fix broken model ID from previous default
      if (parsed.openRouterModel === 'google/gemini-2.0-flash-lite-preview-02-05:free') {
          parsed.openRouterModel = DEFAULT_AI_SETTINGS.openRouterModel;
      }
      
      settings = { ...DEFAULT_AI_SETTINGS, ...parsed };
      
      // Ensure numeric values exist
      if (!settings.batchSize) settings.batchSize = DEFAULT_AI_SETTINGS.batchSize;
      if (settings.delayBetweenBatches === undefined) settings.delayBetweenBatches = DEFAULT_AI_SETTINGS.delayBetweenBatches;
      if (!settings.ollamaBaseUrl) settings.ollamaBaseUrl = DEFAULT_AI_SETTINGS.ollamaBaseUrl;
      if (!settings.ollamaModel) settings.ollamaModel = DEFAULT_AI_SETTINGS.ollamaModel;
      if (settings.ollamaApiKey === undefined) settings.ollamaApiKey = DEFAULT_AI_SETTINGS.ollamaApiKey;
      
      // Ensure backup defaults
      if (settings.autoBackupEnabled === undefined) settings.autoBackupEnabled = DEFAULT_AI_SETTINGS.autoBackupEnabled;
      if (settings.autoBackupInterval === undefined) settings.autoBackupInterval = DEFAULT_AI_SETTINGS.autoBackupInterval;
      if (settings.lastBackupTime === undefined) settings.lastBackupTime = 0;

    } catch {
      settings = DEFAULT_AI_SETTINGS;
    }
  }

  // --- Auto-Injection of Default/Env Keys ---
  
  // 1. Force the hardcoded OpenRouter key if the stored one is empty
  if (!settings.openRouterApiKey && DEFAULT_AI_SETTINGS.openRouterApiKey) {
      settings.openRouterApiKey = DEFAULT_AI_SETTINGS.openRouterApiKey;
  }
  
  // 2. Fallback for Gemini key via environment variables
  if (!settings.geminiApiKey && process.env.API_KEY) {
      settings.geminiApiKey = process.env.API_KEY;
  }

  return settings;
};

export const saveAISettings = (settings: AISettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
