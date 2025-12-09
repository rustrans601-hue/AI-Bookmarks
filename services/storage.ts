import { Bookmark } from '../types';

const STORAGE_KEY = 'ai_bookmarks_data';

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
