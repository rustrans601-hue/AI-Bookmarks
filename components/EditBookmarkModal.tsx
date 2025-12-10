
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Tag } from 'lucide-react';
import { CategoryType, Bookmark } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { title: string, url: string, category: string, tags: string[] }) => Promise<void>;
  bookmark: Bookmark | null;
  existingCategories?: string[];
}

export const EditBookmarkModal: React.FC<Props> = ({ isOpen, onClose, onSave, bookmark, existingCategories = [] }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<CategoryType>('Uncategorized');
  const [tags, setTags] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (bookmark) {
        setTitle(bookmark.title);
        setUrl(bookmark.url);
        setCategory(bookmark.category);
        setTags(bookmark.tags ? bookmark.tags.join(', ') : '');
        setIsCustomCategory(false);
    }
  }, [bookmark, isOpen]);

  if (!isOpen || !bookmark) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    
    setIsProcessing(true);
    
    // Parse tags (comma separated)
    const parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    await onSave(bookmark.id, { title, url, category, tags: parsedTags });
    setIsProcessing(false);
    onClose();
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

  const displayCategories = ['Uncategorized', ...existingCategories.filter(c => c !== 'Uncategorized')];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Edit Bookmark</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Bookmark Title"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="https://example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Optional)</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag size={16} className="text-gray-400" />
                </div>
                <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="dev, tools, reading (comma separated)"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            {!isCustomCategory ? (
                <select
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
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Type new category name..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoFocus
                    />
                    <button 
                        type="button" 
                        onClick={() => { setIsCustomCategory(false); setCategory('Uncategorized'); }}
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
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
