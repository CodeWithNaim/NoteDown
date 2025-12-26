import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Plus, Check, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CanvasTodoList as TodoListType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CanvasTodoListProps {
  item: TodoListType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TodoListType>) => void;
  onDelete: () => void;
}

export function CanvasTodoList({
  item,
  isSelected,
  scale = 1,
  onSelect,
  onUpdate,
  onDelete,
}: CanvasTodoListProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newItemText, setNewItemText] = useState('');
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
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
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

  const handleDragEnd = () => setIsDragging(false);

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
      width: Math.max(200, dragStartRef.current.itemWidth + deltaX),
      height: Math.max(150, dragStartRef.current.itemHeight + deltaY),
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

  const toggleItem = (id: string) => {
    const newItems = item.items.map((i) =>
      i.id === id ? { ...i, completed: !i.completed } : i
    );
    onUpdate({ items: newItems });
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItems = [
      ...item.items,
      { id: Math.random().toString(36).substring(2), text: newItemText, completed: false },
    ];
    onUpdate({ items: newItems });
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    const newItems = item.items.filter((i) => i.id !== id);
    onUpdate({ items: newItems });
  };

  const updateItemText = (id: string, text: string) => {
    const newItems = item.items.map((i) =>
      i.id === id ? { ...i, text } : i
    );
    onUpdate({ items: newItems });
  };

  const completedCount = item.items.filter((i) => i.completed).length;

  return (
    <div
      className={cn(
        'absolute bg-card border rounded-lg shadow-md overflow-hidden transition-shadow',
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg',
        isDragging && 'cursor-grabbing opacity-90'
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        minHeight: item.height,
      }}
      onClick={onSelect}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <textarea
            defaultValue={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent text-sm font-medium outline-none resize-none overflow-hidden h-6 w-full py-0.5"
            placeholder="To-Do List"
            rows={1}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {completedCount}/{item.items.length}
          </span>
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

      {/* Progress */}
      {item.items.length > 0 && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / item.items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="p-2 space-y-1 overflow-auto" style={{ maxHeight: item.height - 80 }}>
        {item.items.map((todo) => (
          <div key={todo.id} className="flex items-center gap-2 group">
            <button
              onClick={() => toggleItem(todo.id)}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                todo.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-muted-foreground/50 hover:border-primary'
              )}
            >
              {todo.completed && <Check className="h-3 w-3" />}
            </button>
            <textarea
              defaultValue={todo.text}
              onChange={(e) => updateItemText(todo.id, e.target.value)}
              className={cn(
                'flex-1 bg-transparent text-sm outline-none resize-none overflow-hidden min-h-[24px] py-0.5',
                todo.completed && 'line-through text-muted-foreground'
              )}
              rows={1}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(todo.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Item */}
      <div className="flex gap-1 p-2 border-t">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add task..."
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
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
    </div>
  );
}
