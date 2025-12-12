
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  ArrowDownUp,
  LayoutTemplate,
  Grid,
  Square,
  Tag,
  X
} from 'lucide-react';

import { Bookmark, DEFAULT_CATEGORIES } from './types';
import { getBookmarks, saveBookmarks, addBookmarkToStorage, updateBookmarkInStorage, deleteBookmarkFromStorage, getScreenshotUrl, getAISettings, saveAISettings } from './services/storage';
import { organizeBookmarksBatch } from './services/gemini';
import { ImportedData, exportToJson } from './services/importUtils';
import { BookmarkItem } from './components/BookmarkItem';
import { AddBookmarkModal } from './components/AddBookmarkModal';
import { EditBookmarkModal } from './components/EditBookmarkModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';

const App: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'board'>('grid');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Edit State
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Controller to stop AI analysis
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // --- Auto Backup Logic ---
  useEffect(() => {
    if (bookmarks.length === 0) return;

    const checkAndPerformBackup = () => {
        const settings = getAISettings();
        if (!settings.autoBackupEnabled) return;

        const now = Date.now();
        const lastBackup = settings.lastBackupTime || 0;
        const intervalMs = settings.autoBackupInterval * 60 * 60 * 1000;

        if (now - lastBackup > intervalMs) {
            console.log("Performing auto-backup...");
            exportToJson(bookmarks);
            
            // Update last backup time
            saveAISettings({
                ...settings,
                lastBackupTime: now
            });
        }
    };

    // Check on startup (after bookmarks load)
    checkAndPerformBackup();

    // Check periodically (every 10 minutes)
    const intervalId = setInterval(checkAndPerformBackup, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [bookmarks]);

  // --- Derived State: Dynamic Categories ---
  const availableCategories = useMemo(() => {
    // Get all unique categories from current bookmarks
    const categoriesSet = new Set(bookmarks.map(b => b.category));
    
    if (bookmarks.length === 0) {
        return DEFAULT_CATEGORIES;
    }
    
    const cats = Array.from(categoriesSet);
    return cats.sort((a: string, b: string) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });
  }, [bookmarks]);

  // --- Actions ---

  const handleAddBookmark = async (title: string, url: string, category: string, tags: string[]) => {
    setIsAdding(true);
    // Simulate network delay for better UX feel
    await new Promise(r => setTimeout(r, 600));

    const newBookmark: Bookmark = {
      id: `bkm-${Date.now()}`,
      title,
      url,
      category,
      tags,
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

  const handleUpdateBookmark = async (id: string, updates: { title: string, url: string, category: string, tags: string[] }) => {
    // Find original bookmark to preserve other fields
    const original = bookmarks.find(b => b.id === id);
    if (!original) return;

    // Check if URL changed, update preview if so
    let preview = original.preview;
    if (original.url !== updates.url) {
        preview = getScreenshotUrl(updates.url);
    }

    const updatedBookmark: Bookmark = {
        ...original,
        ...updates,
        preview
    };

    const updatedList = updateBookmarkInStorage(updatedBookmark);
    setBookmarks(updatedList);
    setEditingBookmark(null); // Close modal
  };

  const handleDeleteBookmark = (id: string) => {
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
        const updated = deleteBookmarkFromStorage(id);
        setBookmarks(updated);
        
        // If we deleted the last item in the selected category, switch to All
        const remainingInCat = updated.filter(b => b.category === selectedCategory);
        if (selectedCategory !== 'All' && remainingInCat.length === 0) {
            setSelectedCategory('All');
        }
    }
  };

  const handleImportBookmarks = (data: ImportedData[]) => {
     let currentOrder = bookmarks.length;
     const newBookmarks: Bookmark[] = data.map((item, index) => ({
        id: `bkm-${Date.now()}-${index}`,
        title: item.title,
        url: item.url,
        category: 'Uncategorized',
        tags: [],
        status: 'active',
        order: currentOrder + index,
        createdAt: Date.now(),
        preview: getScreenshotUrl(item.url)
     }));

     const updated = [...bookmarks, ...newBookmarks];
     setBookmarks(updated);
     saveBookmarks(updated);
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
    if (isAnalyzing) return;

    // 1. Identify bookmarks that need organization
    const targets = bookmarks.filter(b => 
        ['Uncategorized', 'Other', 'Без категории'].includes(b.category)
    );

    if (targets.length === 0) {
        alert("No uncategorized bookmarks found to organize.");
        return;
    }

    setIsAnalyzing(true);
    
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // 2. Prepare payload for AI
    const payload = targets.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url
    }));

    // 3. Get existing categories
    const existingCats = availableCategories.filter(c => 
        !['Uncategorized', 'Other', 'Без категории'].includes(c)
    );

    try {
        // 4. Call Batch API with Signal
        const results = await organizeBookmarksBatch(payload, existingCats, controller.signal);

        // 5. Update State
        if (results.length > 0) {
            const newBookmarks = bookmarks.map(b => {
                const match = results.find(r => r.id === b.id);
                if (match) {
                    return { ...b, category: match.category };
                }
                return b;
            });
            
            setBookmarks(newBookmarks);
            saveBookmarks(newBookmarks);
        }
    } catch (error) {
        console.error("AI Analysis error:", error);
    } finally {
        setIsAnalyzing(false);
        abortControllerRef.current = null;
    }
  };

  const handleStopAnalysis = () => {
    if (abortControllerRef.current) {
        console.log("Stopping AI analysis...");
        abortControllerRef.current.abort();
    }
  };

  const handleStatusCheck = async () => {
    const updated = bookmarks.map(b => ({
        ...b,
        status: Math.random() > 0.8 ? 'inactive' as const : 'active' as const
    }));
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setSelectedCategory('All'); // Reset category to ensure global search/filter
  };

  const clearTagFilter = () => {
    setSelectedTag(null);
  };

  // --- Filtered Data ---

  const getBookmarksBySearch = (list: Bookmark[]) => {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.url.toLowerCase().includes(q) ||
      b.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  };

  const filteredGridBookmarks = useMemo(() => {
    let result = bookmarks;
    
    // If tag is selected, it overrides category filtering
    if (selectedTag) {
        result = result.filter(b => b.tags?.includes(selectedTag));
    } else if (selectedCategory !== 'All') {
        result = result.filter(b => b.category === selectedCategory);
    }
    
    return getBookmarksBySearch(result);
  }, [bookmarks, selectedCategory, searchQuery, selectedTag]);


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

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Board View"
                >
                  <LayoutTemplate size={18} />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

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

              {isAnalyzing ? (
                <button 
                  onClick={handleStopAnalysis}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 shadow-sm"
                  title="Stop AI Sorting"
                >
                    <Square size={14} fill="currentColor" />
                    Stop AI Sorting
                </button>
              ) : (
                <button 
                    onClick={handleAICategorization}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:opacity-90"
                >
                    <Sparkles size={14} />
                    AI Organize
                </button>
              )}

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-md"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add New</span>
              </button>
            </div>
          </div>
          
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
        
        {/* Category Filters (Hidden if Tag View is active to avoid confusion) */}
        {!selectedTag && viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
                <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${selectedCategory === 'All' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                >
                    All Bookmarks
                </button>
                {availableCategories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${selectedCategory === cat ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                        title={cat}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        )}

        {/* Tag View Banner */}
        {selectedTag && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <Tag size={20} />
                    </div>
                    <div>
                        <h3 className="text-blue-900 font-semibold">Filtering by tag</h3>
                        <div className="text-blue-700 font-bold text-lg">#{selectedTag}</div>
                    </div>
                </div>
                <button 
                    onClick={clearTagFilter}
                    className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                    title="Clear tag filter"
                >
                    <X size={24} />
                </button>
            </div>
        )}

        <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-700 font-medium flex items-center gap-2">
                <ListFilter size={18} />
                {selectedTag ? (
                    `Found ${filteredGridBookmarks.length} result(s)`
                ) : (
                    viewMode === 'grid' ? (
                        `${selectedCategory} (${filteredGridBookmarks.length})`
                    ) : (
                        `All Categories (${availableCategories.length})`
                    )
                )}
            </h2>
            {selectedCategory === 'All' && !searchQuery && !selectedTag && viewMode === 'grid' && (
                <span className="text-xs text-gray-400 italic">Drag items to reorder</span>
            )}
        </div>

        {viewMode === 'grid' && (
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={filteredGridBookmarks.map(b => b.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredGridBookmarks.map((bookmark) => (
                            <BookmarkItem 
                                key={bookmark.id} 
                                bookmark={bookmark} 
                                onDelete={handleDeleteBookmark}
                                onEdit={(b) => setEditingBookmark(b)}
                                onTagClick={handleTagClick}
                            />
                        ))}
                        
                        {filteredGridBookmarks.length === 0 && (
                            <div className="col-span-full py-16 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <Search className="text-gray-400" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No bookmarks found</h3>
                                <p className="text-gray-500 mt-1">
                                    {selectedTag 
                                        ? `No bookmarks with tag #${selectedTag}` 
                                        : "Try adjusting your search or add a new bookmark."
                                    }
                                </p>
                                {!selectedTag && (
                                    <button 
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        Add your first bookmark
                                    </button>
                                )}
                                {selectedTag && (
                                    <button 
                                        onClick={clearTagFilter}
                                        className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        )}

        {viewMode === 'board' && (
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {availableCategories.map((cat) => {
                    // Filter based on category AND global tag/search filters
                    const catBookmarks = getBookmarksBySearch(bookmarks).filter(b => {
                         const matchCat = b.category === cat;
                         const matchTag = selectedTag ? b.tags?.includes(selectedTag) : true;
                         return matchCat && matchTag;
                    });
                    
                    if (catBookmarks.length === 0) return null;

                    const colors = [
                        'bg-blue-100 text-blue-600',
                        'bg-green-100 text-green-600',
                        'bg-purple-100 text-purple-600',
                        'bg-orange-100 text-orange-600',
                        'bg-pink-100 text-pink-600',
                        'bg-indigo-100 text-indigo-600',
                        'bg-teal-100 text-teal-600'
                    ];
                    const colorIndex = cat.length % colors.length;
                    const colorClass = colors[colorIndex];
                    
                    return (
                        <div key={cat} className="break-inside-avoid mb-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${colorClass}`}>
                                        {cat.substring(0, 1).toUpperCase()}
                                    </div>
                                    <h3 className="font-semibold text-gray-800">{cat}</h3>
                                </div>
                                <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                                    {catBookmarks.length}
                                </span>
                            </div>
                            
                            <div className="flex flex-col">
                                {catBookmarks.map(bookmark => (
                                    <BookmarkItem 
                                        key={bookmark.id}
                                        bookmark={bookmark}
                                        onDelete={handleDeleteBookmark}
                                        onEdit={(b) => setEditingBookmark(b)}
                                        onTagClick={handleTagClick}
                                        variant="list"
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </main>

      <AddBookmarkModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBookmark}
        isProcessing={isAdding}
        existingCategories={availableCategories}
      />
      
      <EditBookmarkModal
        isOpen={!!editingBookmark}
        onClose={() => setEditingBookmark(null)}
        bookmark={editingBookmark}
        onSave={handleUpdateBookmark}
        existingCategories={availableCategories}
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
