import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { CategoryType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, url: string, category: string) => Promise<void>;
  isProcessing: boolean;
  existingCategories?: string[];
}

export const AddBookmarkModal: React.FC<Props> = ({ isOpen, onClose, onAdd, isProcessing, existingCategories = [] }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<CategoryType>('Uncategorized');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
        // Simple validation: don't allow empty new category
        alert("Please enter a name for the new category.");
        return;
    }

    await onAdd(title, url, finalCategory);

    // Reset state
    setTitle('');
    setUrl('');
    setCategory('Uncategorized');
    setCustomCategory('');
    setIsCustomCategory(false);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '___custom___') {
        setIsCustomCategory(true);
        setCategory('');
    } else {
        setIsCustomCategory(false);
        setCategory(val);
    }
  };

  // Filter Uncategorized to not show up twice or oddly in the list if passed in existingCategories
  const displayCategories = ['Uncategorized', ...existingCategories.filter(c => c !== 'Uncategorized')];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Add New Bookmark</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g., React Documentation"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            {!isCustomCategory ? (
                <select
                id="category-select"
                value={category}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                >
                {displayCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="___custom___" className="font-semibold text-blue-600">+ Create new category...</option>
                </select>
            ) : (
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Type new category name..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoFocus
                    />
                    <button 
                        type="button" 
                        onClick={() => { setIsCustomCategory(false); setCustomCategory(''); setCategory('Uncategorized'); }}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing || !title || !url}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add Bookmark
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
