
import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Trash2, GripVertical, CheckCircle, AlertCircle, Copy, Pencil } from 'lucide-react';
import { Bookmark } from '../types';

interface Props {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onEdit: (bookmark: Bookmark) => void;
  variant?: 'card' | 'list';
}

export const BookmarkItem: React.FC<Props> = ({ bookmark, onDelete, onEdit, variant = 'card' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: bookmark.id, disabled: variant === 'list' });

  // State to manage image source and fallback levels
  const [imageSrc, setImageSrc] = useState(bookmark.preview || '');
  const [fallbackLevel, setFallbackLevel] = useState(0);

  useEffect(() => {
    setImageSrc(bookmark.preview || '');
    setFallbackLevel(0);
  }, [bookmark.preview]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const statusColor = bookmark.status === 'active' ? 'text-green-500' : 'text-red-500';

  const handleImageError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImageSrc(`https://image.thum.io/get/width/600/crop/800/noanimate/${bookmark.url}`);
    } else if (fallbackLevel === 1) {
      setFallbackLevel(2);
      try {
        const domain = new URL(bookmark.url).hostname;
        setImageSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      } catch (e) {
         setFallbackLevel(3);
         setImageSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(bookmark.title)}&background=f3f4f6&color=6b7280&size=128&font-size=0.33`);
      }
    } else if (fallbackLevel === 2) {
      setFallbackLevel(3);
      setImageSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(bookmark.title)}&background=f3f4f6&color=6b7280&size=128&font-size=0.33`);
    }
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(bookmark.url);
  };

  // --- LIST VARIANT ---
  if (variant === 'list') {
    // For list view, we prioritize the favicon (Level 2) logic directly if possible, or fallbacks
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`;

    return (
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img 
            src={faviconUrl} 
            alt="" 
            className="w-5 h-5 rounded-sm object-contain opacity-80"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${bookmark.title}&size=32` }}
          />
          <div className="min-w-0 flex-1">
             <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-blue-600 font-medium truncate block">
                {bookmark.title}
             </a>
             {/* Tags in list view */}
             {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {bookmark.tags.map(tag => (
                    <span key={tag} className="text-[10px] text-gray-400">#{tag}</span>
                  ))}
                </div>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button 
                onClick={() => onEdit(bookmark)}
                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                title="Edit"
            >
                <Pencil size={14} />
            </button>
            <button 
                onClick={handleCopyUrl}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                title="Copy URL"
            >
                <Copy size={14} />
            </button>
            <a 
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                title="Open Link"
            >
                <ExternalLink size={14} />
            </a>
            <button 
                onClick={() => onDelete(bookmark.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100"
                title="Delete"
            >
                <Trash2 size={14} />
            </button>
        </div>
      </div>
    );
  }

  // --- CARD VARIANT (Default) ---
  const isScreenshot = fallbackLevel < 2;
  const imageClass = isScreenshot
    ? "w-full h-full object-cover object-top opacity-95 group-hover:opacity-100 transition-opacity"
    : "w-full h-full object-contain p-8 bg-gray-50 opacity-90 group-hover:opacity-100 transition-opacity";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div 
        className="h-32 bg-gray-100 relative overflow-hidden flex items-center justify-center cursor-pointer"
        onClick={() => onEdit(bookmark)}
      >
        <img 
          src={imageSrc} 
          alt={bookmark.title}
          className={imageClass}
          onError={handleImageError}
          loading="lazy"
        />
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
             <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white/95 backdrop-blur-sm shadow-sm ${statusColor} flex items-center gap-1 border border-gray-100`}>
                {bookmark.status === 'active' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                {bookmark.status === 'active' ? 'Active' : 'Broken'}
             </span>
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600/90 text-white shadow-sm backdrop-blur-sm hover:bg-blue-700 transition-colors">
                {bookmark.category}
            </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold text-sm leading-snug truncate" title={bookmark.title}>
              {bookmark.title}
            </h3>
            <a 
              href={bookmark.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-600 truncate block mt-1 flex items-center gap-1"
            >
              <ExternalLink size={10} />
              {(() => {
                try {
                  return new URL(bookmark.url).hostname.replace('www.', '');
                } catch {
                  return bookmark.url;
                }
              })()}
            </a>
            
            {/* Tags Display */}
            {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {bookmark.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
          </div>
          
          <div 
             {...attributes} 
             {...listeners}
             className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 -mr-2"
          >
            <GripVertical size={16} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end gap-1">
            <button 
                onClick={() => onEdit(bookmark)}
                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                title="Edit Bookmark"
            >
                <Pencil size={16} />
            </button>
            <button 
                onClick={() => onDelete(bookmark.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete Bookmark"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};
