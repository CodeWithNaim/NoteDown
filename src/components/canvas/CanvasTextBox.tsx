import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { motion } from 'framer-motion';
import { GripVertical, X, Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CanvasTextBox as TextBoxType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CanvasTextBoxProps {
  item: TextBoxType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBoxType>) => void;
  onDelete: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  'todo': 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  'important': 'bg-red-500/20 text-red-600 dark:text-red-400',
  'done': 'bg-green-500/20 text-green-600 dark:text-green-400',
  'idea': 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  'default': 'bg-primary/10 text-primary',
};

export function CanvasTextBox({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
}: CanvasTextBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: item.content,
    editorProps: {
      attributes: {
        class: 'editor-content outline-none min-h-[60px] p-2',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() });
    },
  });

  useEffect(() => {
    if (editor && item.content !== editor.getHTML()) {
      editor.commands.setContent(item.content);
    }
  }, [item.id]);

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

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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
    const deltaY = e.clientY - dragStartPos.current.y;
    onUpdate({
      width: Math.max(200, resizeStartSize.current.width + deltaX),
      height: Math.max(100, resizeStartSize.current.height + deltaY),
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

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim().toLowerCase());
      setNewTag('');
    }
  };

  const getTagColor = (tag: string) => {
    return TAG_COLORS[tag.toLowerCase()] || TAG_COLORS.default;
  };

  return (
    <motion.div
      ref={boxRef}
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
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Tag className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button size="sm" className="h-8" onClick={handleAddTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['todo', 'important', 'done', 'idea'].map((preset) => (
                    <button
                      key={preset}
                      className={cn('text-xs px-2 py-0.5 rounded-full capitalize', getTagColor(preset))}
                      onClick={() => onAddTag(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 py-1 bg-muted/30 border-b">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', getTagColor(tag))}
            >
              {tag}
              <button
                className="hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tag);
                }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Editor Content */}
      <div className="overflow-auto" style={{ height: `calc(100% - ${item.tags.length > 0 ? '68px' : '36px'})` }}>
        <EditorContent editor={editor} />
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
