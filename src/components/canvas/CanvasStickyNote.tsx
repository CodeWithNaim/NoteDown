import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Palette, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CanvasStickyNote as StickyNoteType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';
import { ColorPanel } from './ColorPanel';

// Legacy color name to hex mapping
const LEGACY_COLOR_MAP: Record<string, string> = {
  yellow: '#FEF08A',
  pink: '#FBCFE8',
  blue: '#BFDBFE',
  green: '#BBF7D0',
  purple: '#DDD6FE',
};

// Get hex color from item.color (handles both hex and legacy names)
const getHexColor = (color: string): string => {
  if (color.startsWith('#')) return color;
  return LEGACY_COLOR_MAP[color] || '#FEF08A'; // Default to yellow
};

// Calculate relative luminance and return contrasting color
const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Calculate relative luminance (WCAG formula)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Return light color for dark backgrounds, dark color for light backgrounds
  return luminance < 0.5 ? '#FFFFFF' : '#1F2937';
};

interface CanvasStickyNoteProps {
  item: StickyNoteType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<StickyNoteType>) => void;
  onDelete: () => void;
  onHistorySave?: (prevItem: StickyNoteType, newItem: StickyNoteType) => void;
}

export function CanvasStickyNote({
  item,
  isSelected,
  scale = 1,
  onSelect,
  onUpdate,
  onDelete,
  onHistorySave,
}: CanvasStickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);
  const [tempColor, setTempColor] = useState(() => getHexColor(item.color));
  const [tempTextColor, setTempTextColor] = useState(() => item.textColor || '#1F2937');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // History Snapshots
  const snapshotRef = useRef<StickyNoteType | null>(null);

  // Store INITIAL values at start of drag
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
    snapshotRef.current = { ...item }; // Snapshot
    // Store everything needed to calculate new position based on delta
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
    if (isDragging) {
      setIsDragging(false);
      if (onHistorySave && snapshotRef.current && (snapshotRef.current.x !== item.x || snapshotRef.current.y !== item.y)) {
        onHistorySave(snapshotRef.current, item);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    snapshotRef.current = { ...item }; // Snapshot
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
    if (isResizing) {
      setIsResizing(false);
      if (onHistorySave && snapshotRef.current && (snapshotRef.current.width !== item.width || snapshotRef.current.height !== item.height)) {
        onHistorySave(snapshotRef.current, item);
      }
    }
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

  const handleFocus = () => {
    snapshotRef.current = { ...item };
  };

  const handleBlur = () => {
    if (snapshotRef.current && onHistorySave && snapshotRef.current.content !== item.content) {
      onHistorySave(snapshotRef.current, item);
    }
  };

  // Color update wrapper
  const handleColorChange = (newColor: string) => {
    const prevItem = { ...item };
    onUpdate({ color: newColor });
    if (onHistorySave) {
      onHistorySave(prevItem, { ...item, color: newColor });
    }
  };

  // Sync temp color when item.color changes externally
  useEffect(() => {
    setTempColor(getHexColor(item.color));
  }, [item.color]);

  // Sync content if changed externally
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== item.content) {
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.value = item.content || '';
      }
    }
  }, [item.content]);

  return (
    <motion.div
      className={cn(
        'absolute shadow-lg rounded-sm overflow-hidden transition-shadow text-gray-900',
        isSelected ? 'ring-2 ring-primary shadow-xl' : 'hover:shadow-xl',
        isDragging && 'cursor-grabbing opacity-90'
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: getHexColor(item.color),
      }}
      onClick={onSelect}
      initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: Math.random() * 4 - 2 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: `1px solid ${getContrastColor(getHexColor(item.color))}20` }}
        onMouseDown={handleDragStart}
      >
        <GripVertical className="h-4 w-4" style={{ color: getContrastColor(getHexColor(item.color)) + '99' }} />
        <div className="flex items-center gap-1">
          <Popover open={isColorPickerOpen} onOpenChange={(open) => {
            setIsColorPickerOpen(open);
            if (open) setTempColor(getHexColor(item.color)); // Reset temp on open
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10" style={{ color: getContrastColor(getHexColor(item.color)) + '99' }} title="Background Color">
                <Palette className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
              <ColorPanel
                color={tempColor}
                onChange={setTempColor}
                onApply={(c) => handleColorChange(c)}
                onClose={() => setIsColorPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <Popover open={isTextColorPickerOpen} onOpenChange={(open) => {
            setIsTextColorPickerOpen(open);
            if (open) setTempTextColor(item.textColor || '#1F2937');
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/10" style={{ color: getContrastColor(getHexColor(item.color)) + '99' }} title="Text Color">
                <Type className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
              <ColorPanel
                color={tempTextColor}
                onChange={setTempTextColor}
                onApply={(c) => {
                  const prevItem = { ...item };
                  onUpdate({ textColor: c });
                  if (onHistorySave) {
                    onHistorySave(prevItem, { ...item, textColor: c });
                  }
                }}
                onClose={() => setIsTextColorPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-red-500 hover:bg-black/10"
            style={{ color: getContrastColor(getHexColor(item.color)) + '99' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <style>{`
        .sticky-textarea-${item.id}::placeholder {
          color: ${getContrastColor(getHexColor(item.color))}80;
        }
      `}</style>
      <textarea
        ref={textareaRef}
        defaultValue={item.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="Write a note..."
        className={`sticky-textarea-${item.id} w-full h-[calc(100%-32px)] p-2 bg-transparent resize-none outline-none text-sm`}
        style={{
          fontFamily: "'Caveat', cursive",
          color: item.textColor || getContrastColor(getHexColor(item.color)),
        }}
      />

      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-full h-full" style={{ color: getContrastColor(getHexColor(item.color)) + '40' }} viewBox="0 0 24 24">
          <path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </motion.div>
  );
}
