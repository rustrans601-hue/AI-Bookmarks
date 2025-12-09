import React, { useEffect, useState, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  LayoutGrid, 
  ListFilter, 
  Plus, 
  Sparkles, 
  RefreshCcw, 
  Search,
  Settings,
  ArrowDownUp
} from 'lucide-react';

import { Bookmark, CATEGORIES, CategoryType } from './types';
import { getBookmarks, saveBookmarks, addBookmarkToStorage, deleteBookmarkFromStorage, getScreenshotUrl } from './services/storage';
import { categorizeBookmarkWithAI } from './services/gemini';
import { ImportedData } from './services/importUtils';
import { BookmarkItem } from './components/BookmarkItem';
import { AddBookmarkModal } from './components/AddBookmarkModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';

const App: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  // --- Actions ---

  const handleAddBookmark = async (title: string, url: string, category: string) => {
    setIsAdding(true);
    // Simulate network delay for better UX feel
    await new Promise(r => setTimeout(r, 600));

    const newBookmark: Bookmark = {
      id: `bkm-${Date.now()}`,
      title,
      url,
      category,
      status: 'active',
      order: bookmarks.length,
      createdAt: Date.now(),
      preview: getScreenshotUrl(url)
    };

    const updated = addBookmarkToStorage(newBookmark);
    setBookmarks(updated);
    setIsAdding(false);
    setIsAddModalOpen(false);
  };

  const handleDeleteBookmark = (id: string) => {
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
        const updated = deleteBookmarkFromStorage(id);
        setBookmarks(updated);
    }
  };

  const handleImportBookmarks = (data: ImportedData[]) => {
     let currentOrder = bookmarks.length;
     const newBookmarks: Bookmark[] = data.map((item, index) => ({
        id: `bkm-${Date.now()}-${index}`,
        title: item.title,
        url: item.url,
        category: 'Uncategorized',
        status: 'active',
        order: currentOrder + index,
        createdAt: Date.now(),
        preview: getScreenshotUrl(item.url)
     }));

     const updated = [...bookmarks, ...newBookmarks];
     setBookmarks(updated);
     saveBookmarks(updated);
     // Optional: Trigger AI analysis automatically after import? 
     // For now, let user trigger it.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBookmarks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        saveBookmarks(newOrder); // Persist
        return newOrder;
      });
    }
  };

  const handleAICategorization = async () => {
    if (bookmarks.length === 0) return;
    setIsAnalyzing(true);
    
    const updates = [...bookmarks];
    let changed = false;

    // We process sequentially to avoid rate limits in this client-side demo
    for (let i = 0; i < updates.length; i++) {
        if (updates[i].category === 'Uncategorized' || updates[i].category === 'Other') {
             const newCategory = await categorizeBookmarkWithAI(updates[i].title, updates[i].url);
             if (newCategory !== updates[i].category) {
                 updates[i] = { ...updates[i], category: newCategory };
                 changed = true;
             }
        }
    }

    if (changed) {
        saveBookmarks(updates);
        setBookmarks(updates);
    }
    
    setIsAnalyzing(false);
  };

  const handleStatusCheck = async () => {
    // Simulate checking URL health
    const updated = bookmarks.map(b => ({
        ...b,
        status: Math.random() > 0.8 ? 'inactive' as const : 'active' as const
    }));
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  // --- Derived State ---

  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.url.toLowerCase().includes(q)
      );
    }

    return result;
  }, [bookmarks, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <LayoutGrid size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">AI Bookmarks</h1>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 border border-transparent focus-within:bg-white focus-within:border-blue-500 transition-all">
                  <Search size={16} className="text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm ml-2 w-48 text-gray-800 placeholder-gray-500"
                  />
               </div>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>

              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Import / Export"
              >
                <ArrowDownUp size={20} />
              </button>

              <button 
                onClick={handleStatusCheck}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Check Link Status"
              >
                <RefreshCcw size={20} />
              </button>

              <button 
                onClick={handleAICategorization}
                disabled={isAnalyzing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isAnalyzing ? 'bg-purple-100 text-purple-700' : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:opacity-90'}`}
              >
                {isAnalyzing ? (
                    <>
                        <RefreshCcw size={14} className="animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Sparkles size={14} />
                        AI Organize
                    </>
                )}
              </button>

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-md"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add New</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
             <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 border border-transparent focus-within:bg-white focus-within:border-blue-500 transition-all">
                  <Search size={16} className="text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search bookmarks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-800"
                  />
               </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
            <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
            >
                All Bookmarks
            </button>
            {CATEGORIES.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Stats / Info */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-700 font-medium flex items-center gap-2">
                <ListFilter size={18} />
                {selectedCategory} ({filteredBookmarks.length})
            </h2>
            {selectedCategory === 'All' && !searchQuery && (
                <span className="text-xs text-gray-400 italic">Drag items to reorder</span>
            )}
        </div>

        {/* Grid */}
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={filteredBookmarks.map(b => b.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBookmarks.map((bookmark) => (
                        <BookmarkItem 
                            key={bookmark.id} 
                            bookmark={bookmark} 
                            onDelete={handleDeleteBookmark}
                        />
                    ))}
                    
                    {filteredBookmarks.length === 0 && (
                        <div className="col-span-full py-16 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <Search className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No bookmarks found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your search or add a new bookmark.</p>
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                Add your first bookmark
                            </button>
                        </div>
                    )}
                </div>
            </SortableContext>
        </DndContext>
      </main>

      <AddBookmarkModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBookmark}
        isProcessing={isAdding}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
      />

      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        bookmarks={bookmarks}
        onImport={handleImportBookmarks}
      />
    </div>
  );
};

export default App;
