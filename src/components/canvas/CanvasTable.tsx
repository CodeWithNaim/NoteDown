import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasTable as TableType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CanvasTableProps {
  item: TableType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TableType>) => void;
  onDelete: () => void;
}

export function CanvasTable({
  item,
  isSelected,
  scale = 1,
  onSelect,
  onUpdate,
  onDelete,
}: CanvasTableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
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
      height: Math.max(100, dragStartRef.current.itemHeight + deltaY),
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

  const updateCell = (row: number, col: number, value: string) => {
    const newCells = item.cells.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? value : c)) : r
    );
    onUpdate({ cells: newCells });
  };

  const addRow = () => {
    const newCells = [...item.cells, new Array(item.cols).fill('')];
    onUpdate({ cells: newCells, rows: item.rows + 1 });
  };

  const removeRow = () => {
    if (item.rows <= 1) return;
    const newCells = item.cells.slice(0, -1);
    onUpdate({ cells: newCells, rows: item.rows - 1 });
  };

  const addCol = () => {
    const newCells = item.cells.map((row) => [...row, '']);
    onUpdate({ cells: newCells, cols: item.cols + 1 });
  };

  const removeCol = () => {
    if (item.cols <= 1) return;
    const newCells = item.cells.map((row) => row.slice(0, -1));
    onUpdate({ cells: newCells, cols: item.cols - 1 });
  };

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
        className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Table</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addCol}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCol} disabled={item.cols <= 1}>
            <Minus className="h-3 w-3" />
          </Button>
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

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: item.height - 32 }}>
        <table className="w-full border-collapse">
          <tbody>
            {item.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-border p-0 bg-background">
                    <textarea
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={cn(
                        'w-full h-full px-2 py-1.5 text-sm bg-transparent outline-none resize-none overflow-hidden block',
                        rowIndex === 0 && 'font-semibold bg-muted/30'
                      )}
                      placeholder={rowIndex === 0 ? 'Header' : ''}
                      rows={1}
                      style={{ minHeight: '32px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Remove Row */}
      <div className="flex justify-center gap-1 p-1 border-t bg-muted/30">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" /> Row
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={removeRow} disabled={item.rows <= 1}>
          <Minus className="h-3 w-3 mr-1" /> Row
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
