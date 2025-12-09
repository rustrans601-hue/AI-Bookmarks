import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Trash2, GripVertical, CheckCircle, AlertCircle } from 'lucide-react';
import { Bookmark } from '../types';

interface Props {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
}

export const BookmarkItem: React.FC<Props> = ({ bookmark, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: bookmark.id });

  // State to manage image source and fallback levels
  // Level 0: Original (mshots)
  // Level 1: Backup Screenshot (thum.io)
  // Level 2: Logo/Favicon
  // Level 3: Text Avatar
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
      // Attempt 1: Try thum.io as a backup screenshot service
      setFallbackLevel(1);
      setImageSrc(`https://image.thum.io/get/width/600/crop/800/noanimate/${bookmark.url}`);
    } else if (fallbackLevel === 1) {
      // Attempt 2: Fallback to high-res favicon/logo
      setFallbackLevel(2);
      try {
        const domain = new URL(bookmark.url).hostname;
        setImageSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
      } catch (e) {
         // If URL parsing fails, skip to text
         setFallbackLevel(3);
         setImageSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(bookmark.title)}&background=f3f4f6&color=6b7280&size=256&font-size=0.33`);
      }
    } else if (fallbackLevel === 2) {
      // Final Attempt: Text Avatar
      setFallbackLevel(3);
      setImageSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(bookmark.title)}&background=f3f4f6&color=6b7280&size=256&font-size=0.33`);
    }
  };

  // Adjust image styling based on what we are showing
  // Screenshots (Level 0 & 1) should cover. Logo (Level 2) should contain.
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
      <div className="h-32 bg-gray-100 relative overflow-hidden flex items-center justify-center">
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
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600/90 text-white shadow-sm backdrop-blur-sm">
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
          </div>
          
          <div 
             {...attributes} 
             {...listeners}
             className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 -mr-2"
          >
            <GripVertical size={16} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
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
