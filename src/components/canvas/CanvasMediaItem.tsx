import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, FileText, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasMediaItem as MediaItemType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CanvasMediaItemProps {
  item: MediaItemType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<MediaItemType>) => void;
  onDelete: () => void;
}

export function CanvasMediaItem({
  item,
  isSelected,
  scale = 1,
  onSelect,
  onUpdate,
  onDelete,
}: CanvasMediaItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const dragStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    itemX: 0,
    itemY: 0,
    itemWidth: 0,
    itemHeight: 0
  });

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      itemX: item.x,
      itemY: item.y,
      itemWidth: 0,
      itemHeight: 0
    };
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;

    onUpdate({
      x: dragStartRef.current.itemX + deltaX,
      y: dragStartRef.current.itemY + deltaY,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      itemX: 0,
      itemY: 0,
      itemWidth: item.width,
      itemHeight: item.height
    };
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;

    onUpdate({
      width: Math.max(150, dragStartRef.current.itemWidth + deltaX),
      height: Math.max(100, dragStartRef.current.itemHeight + deltaY),
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

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

  const togglePlayback = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getFileIcon = () => {
    const ext = item.fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return '📊';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['ppt', 'pptx'].includes(ext || '')) return '📽️';
    return '📁';
  };

  const renderContent = () => {
    switch (item.type) {
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground truncate max-w-full">{item.fileName}</span>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={item.url}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <Button size="sm" variant="secondary" onClick={togglePlayback}>
              {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        );
      case 'video':
        return (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={item.url}
            className="w-full h-full object-cover"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        );
      case 'file':
        return (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center h-full p-4 gap-2 hover:bg-muted/50 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-4xl">{getFileIcon()}</span>
            <span className="text-sm text-foreground font-medium truncate max-w-full">{item.fileName}</span>
            <span className="text-xs text-muted-foreground">Click to open</span>
          </a>
        );
      default:
        return null;
    }
  };

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
        height: item.height,
      }}
      onClick={onSelect}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-hidden" style={{ height: 'calc(100% - 32px)' }}>
        {renderContent()}
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-full h-full text-muted-foreground/50" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </motion.div>
  );
}
