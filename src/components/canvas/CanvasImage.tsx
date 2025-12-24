import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasMediaItem as MediaItemType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CanvasImageProps {
  item: MediaItemType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<MediaItemType>) => void;
  onDelete: () => void;
}

export function CanvasImage({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: CanvasImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - item.x, y: e.clientY - item.y };
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;
    onUpdate({
      x: Math.max(0, e.clientX - dragStartPos.current.x),
      y: Math.max(0, e.clientY - dragStartPos.current.y),
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { width: item.width, height: item.height };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - dragStartPos.current.x;
    // Maintain aspect ratio
    const aspectRatio = resizeStartSize.current.width / resizeStartSize.current.height;
    const newWidth = Math.max(100, resizeStartSize.current.width + deltaX);
    const newHeight = newWidth / aspectRatio;
    onUpdate({
      width: newWidth,
      height: newHeight,
    });
  };

  const handleResizeEnd = () => setIsResizing(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  return (
    <motion.div
      className={cn(
        'absolute bg-card border rounded-lg shadow-md overflow-hidden transition-shadow',
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg',
        isDragging && 'cursor-grabbing opacity-90'
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
      }}
      onClick={onSelect}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header - only visible on hover/select */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-black/50 backdrop-blur-sm z-10 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        )}
        onMouseDown={handleDragStart}
      >
        <GripVertical className="h-4 w-4 text-white cursor-grab active:cursor-grabbing" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white hover:text-red-400 hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Image */}
      <img
        src={item.url}
        alt={item.fileName}
        className="w-full h-auto object-contain"
        draggable={false}
      />

      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-primary/80 rounded-tl-lg flex items-center justify-center"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22Z" />
        </svg>
      </div>
    </motion.div>
  );
}
