export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  status: 'active' | 'inactive';
  order: number;
  preview?: string;
  createdAt: number;
}

export const CATEGORIES = [
  'Frontend',
  'Backend',
  'Design',
  'Productivity',
  'News',
  'Hobby',
  'Finance',
  'Other',
  'Uncategorized'
] as const;

export type CategoryType = typeof CATEGORIES[number];

export interface AIResponse {
  category: string;
}
