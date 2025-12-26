import { useState, useRef, useEffect } from 'react';
import { GripVertical, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CanvasTextBox as TextBoxType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';
import { TextFormattingToolbar } from './TextFormattingToolbar';

interface CanvasTextBoxProps {
  item: TextBoxType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBoxType>) => void;
  onDelete: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onHistorySave?: (prevItem: TextBoxType, newItem: TextBoxType) => void;
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
  scale = 1,
  onSelect,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
  onHistorySave,
}: CanvasTextBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);
  const [stylePanelPos, setStylePanelPos] = useState({ x: 0, y: -50 });
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelDragStartRef = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  // History Snapshots
  const snapshotRef = useRef<TextBoxType | null>(null);

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
    // Don't drag if clicking inside content (allow text selection)
    if ((e.target as HTMLElement).isContentEditable) return;

    e.preventDefault();
    setIsDragging(true);
    snapshotRef.current = { ...item }; // Snapshot for history
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
      // Save history if moved
      if (onHistorySave && snapshotRef.current && (snapshotRef.current.x !== item.x || snapshotRef.current.y !== item.y)) {
        onHistorySave(snapshotRef.current, item);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    snapshotRef.current = { ...item }; // Snapshot for history
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
      height: Math.max(60, dragStartRef.current.itemHeight + deltaY),
    });
  };

  const handleResizeEnd = () => {
    if (isResizing) {
      setIsResizing(false);
      // Save history if resized
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
  }, [isDragging]); // Added item dependency to capture latest state in handleDragEnd - Wait, handleDragEnd is closed over "item"? Yes.
  // Actually, we need to be careful. The 'item' in closure might be stale if re-render happens during drag.
  // But typically drag is smooth. Ideally use ref or dependency.
  // Better pattern: handleDragEnd uses 'item' from props. useEffect needs to depend on it? No, that would re-bind listener.
  // Re-binding is fine if cheap. or use a ref for current item.

  // Let's use a ref for currentItem to avoid re-binding loops or stale closures during drag
  const currentItemRef = useRef(item);
  useEffect(() => { currentItemRef.current = item; }, [item]);

  // Updating handleDragEnd to use currentItemRef inside the effect or proper closure?
  // Easier: Just let React re-bind. It's fine for desktop.

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
    if (!newTag.trim()) return;
    onAddTag(newTag.trim());
    setNewTag('');
  };

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    return TAG_COLORS[lowerTag] || TAG_COLORS['default'];
  };

  // Sync content if changed externally (e.g. undo/redo)
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== item.content) {
      // Only update if we are not the active element (prevent overwriting typing)
      if (document.activeElement !== contentRef.current) {
        contentRef.current.innerHTML = item.content || '';
      }
    }
  }, [item.content]);

  // Auto-focus new text boxes
  useEffect(() => {
    if (isSelected && !item.content && contentRef.current) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        contentRef.current?.focus();
      }, 10);
    }
  }, [isSelected]); // Check once on mount/selection

  const handleFocus = () => {
    snapshotRef.current = { ...item }; // Snapshot on focus start
  };

  const handleBlur = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML;

      // Auto-delete if empty (and not just created to avoid instant deletion issues on mis-click?)
      // Actually, if user leaves it empty, it should go away.
      if (!newContent || newContent.trim() === '' || newContent === '<br>') {
        onDelete();
      } else if (newContent !== item.content) {
        onUpdate({ content: newContent });
        // Save history on blur if content changed
        if (onHistorySave && snapshotRef.current) {
          onHistorySave(snapshotRef.current, { ...item, content: newContent });
        }
      }
    }
  };

  const handleFormat = (command: string, value?: string) => {
    if (!contentRef.current) return;

    // Save snapshot BEFORE execution
    const prevItem = { ...item, content: contentRef.current.innerHTML };

    // Ensure focus is in the editor
    document.execCommand('styleWithCSS', false, 'true');

    if (command === 'increaseFontSize') {
      const current = parseInt(document.queryCommandValue('fontSize') || '3');
      if (current < 7) document.execCommand('fontSize', false, (current + 1).toString());
    } else if (command === 'decreaseFontSize') {
      const current = parseInt(document.queryCommandValue('fontSize') || '3');
      if (current > 1) document.execCommand('fontSize', false, (current - 1).toString());
    } else {
      document.execCommand(command, false, value);
    }

    // Get new content ASAP
    const newContent = contentRef.current.innerHTML;

    // Update Store
    onUpdate({ content: newContent });

    // Save History
    if (onHistorySave) {
      onHistorySave(prevItem, { ...item, content: newContent });
    }

    // Update snapshot for next edit
    snapshotRef.current = { ...item, content: newContent };

    // Keep focus
    contentRef.current.focus();
  };

  // Panel drag handlers
  const handlePanelDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPanelDragging(true);
    panelDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: stylePanelPos.x,
      panelY: stylePanelPos.y,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - panelDragStartRef.current.mouseX) / (scale || 1);
      const deltaY = (moveEvent.clientY - panelDragStartRef.current.mouseY) / (scale || 1);
      setStylePanelPos({
        x: panelDragStartRef.current.panelX + deltaX,
        y: panelDragStartRef.current.panelY + deltaY,
      });
    };

    const handleUp = () => {
      setIsPanelDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Internal History for granular undo
  const historyRef = useRef<{ html: string, caret: number }[]>([{ html: item.content || '', caret: 0 }]);
  const historyIndexRef = useRef(0);
  const isUndoingRef = useRef(false);

  // Helper: Get Caret Position (Text Offset)
  const getCaretIndex = (element: HTMLElement) => {
    let position = 0;
    const isSupported = typeof window.getSelection !== "undefined";
    if (isSupported) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount !== 0) {
        const range = window.getSelection()?.getRangeAt(0);
        const preCaretRange = range?.cloneRange();
        preCaretRange?.selectNodeContents(element);
        preCaretRange?.setEnd(range!.endContainer, range!.endOffset);
        position = preCaretRange?.toString().length || 0;
      }
    }
    return position;
  };

  // Helper: Set Caret Position
  const setCaretIndex = (element: HTMLElement, index: number) => {
    const range = document.createRange();
    const sel = window.getSelection();
    let currentPos = 0;
    let nodeStack: Node[] = [element];
    let node: Node | undefined;
    let found = false;

    while (nodeStack.length > 0 && !found) {
      node = nodeStack.pop();
      if (!node) continue;

      if (node.nodeType === 3) { // Text Node
        const textLen = node.textContent?.length || 0;
        if (currentPos + textLen >= index) {
          range.setStart(node, index - currentPos);
          range.collapse(true);
          found = true;
        } else {
          currentPos += textLen;
        }
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }
    if (found && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isUndoingRef.current) return;
    if (!contentRef.current) return;

    const newHtml = contentRef.current.innerHTML;
    const caret = getCaretIndex(contentRef.current);

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ html: newHtml, caret });
    if (newHistory.length > 100) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  };

  const handleCustomUndo = (e: React.KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (isCtrl && (key === 'z' || key === 'y')) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      const isRedo = e.shiftKey || key === 'y';

      if (isRedo) { // REDO
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          const state = historyRef.current[historyIndexRef.current];
          if (contentRef.current) {
            isUndoingRef.current = true;
            contentRef.current.innerHTML = state.html;
            setCaretIndex(contentRef.current, state.caret);
            isUndoingRef.current = false;
            // Removed onUpdate calls. Sync happens on Blur.
          }
        }
      } else { // UNDO (only Ctrl+Z)
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const state = historyRef.current[historyIndexRef.current];
          if (contentRef.current) {
            isUndoingRef.current = true;
            contentRef.current.innerHTML = state.html;
            setCaretIndex(contentRef.current, state.caret);
            isUndoingRef.current = false;
            // Removed onUpdate calls. Sync happens on Blur.
          }
        }
      }
    }
  };

  return (
    <div
      ref={boxRef}
      className={cn(
        'absolute flex flex-col transition-shadow group',
        isSelected ? ' z-20' : 'z-10',
        isDragging && 'cursor-grabbing opacity-90'
      )}
      style={{
        left: item.x,
        top: item.y,
        minWidth: 100,
        width: 'fit-content',
        minHeight: 40,
        height: 'auto',
        maxWidth: 600, // Prevent text box from becoming too wide
      }}
      onMouseDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Formatting Toolbar - Visible when Selected AND Hovered (or interacting) */}
      {/* Formatting toolbar is now in the 3-dot menu */}

      {/* Drag Handle & Actions - Visible on hover or interacting */}
      <div className={cn(
        "flex justify-between items-center px-2 py-1 bg-muted/50 border border-transparent rounded-t-lg cursor-grab active:cursor-grabbing transition-opacity duration-200",
        (isDragging || isResizing) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        isSelected && ""
      )}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />

        {/* Style Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsStylePanelOpen(!isStylePanelOpen);
            if (!isStylePanelOpen) {
              setStylePanelPos({ x: 0, y: -50 }); // Reset position when opening
            }
          }}
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>

        {/* Draggable Style Panel */}
        {isStylePanelOpen && (
          <div
            className="absolute z-50 bg-background border rounded-lg shadow-lg p-2"
            style={{
              left: stylePanelPos.x,
              top: stylePanelPos.y,
              cursor: isPanelDragging ? 'grabbing' : 'default'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div
                onMouseDown={handlePanelDragStart}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <TextFormattingToolbar onFormat={handleFormat} />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsStylePanelOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

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

      {/* Content Area */}
      <div className={cn(
        "flex-1 flex flex-col relative min-h-0 border-x border-b border-transparent rounded-b-lg transition-colors duration-200",
        (isDragging || isResizing) ? "border-primary/20 bg-muted/10" : "group-hover:border-primary/20 group-hover:bg-muted/10"
      )}>
        <div
          key={item.content} // Force re-render on external updates (Undo/Redo)
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full h-full p-2 outline-none text-base break-words cursor-text min-h-[40px]"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onKeyDown={(e) => {
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'y')) {
              handleCustomUndo(e);
            } else {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          style={{
            fontFamily: 'Calibri, sans-serif',
            fontSize: '16px',
            lineHeight: 'normal',
          }}
          dangerouslySetInnerHTML={{ __html: item.content || '' }}
        />

        {/* Tags Display (Bottom) */}
        {item.tags && item.tags.length > 0 && (
          <div className="px-2 py-1 flex flex-wrap gap-1 pointer-events-none absolute bottom-1 right-2 opacity-50">
            {item.tags.map(tag => (
              <span key={tag} className={cn("w-2 h-2 rounded-full", getTagColor(tag).split(' ')[0])} title={tag} />
            ))}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center pointer-events-auto",
          (isDragging || isResizing || !isSelected) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          // Wait, logic for resize handle visibility:
          // Default: Visible on Hover.
          // If Resizing: Must be visible.
          // IsSelected logic? Previously "!isSelected && opacity-0".
          // New logic: Only visible on Hover?
          // If I am resizing, I am hovering OR holding mouse down.
          // Let's force visible if isResizing.
        )}
        onMouseDown={handleResizeStart}
      >
        <svg className="w-3 h-3 text-muted-foreground/50" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div >
  );
}
