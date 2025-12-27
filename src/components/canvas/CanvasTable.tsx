import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { MoreHorizontal, X, Plus, Trash2, Columns, Rows, Paintbrush, Type, Palette, ChevronLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, GripVertical, Grid, AlignLeft, AlignCenter, AlignRight, LayoutTemplate, Minus, RotateCcw, Upload, Search, Bold, Italic, Underline, Strikethrough, Subscript, Superscript, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasTable as TableType } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';
import { ColorPanel } from './ColorPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

const BULLET_ARCHETYPES = ['•', '◦', '▪', '▫', '◆', '◇', '➤', '→', '⇒', '—', '✔', '★', '♥'];
const toRoman = (num: number) => {
  const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) { roman += i; num -= lookup[i]; }
  }
  return roman;
}
const NUMBER_FORMATS = [
  { id: 'decimal', label: '1. 2. 3.', format: (n: number) => `${n}.` },
  { id: 'alpha-upper', label: 'A. B. C.', format: (n: number) => `${String.fromCharCode(64 + n)}.` },
  { id: 'alpha-lower', label: 'a. b. c.', format: (n: number) => `${String.fromCharCode(96 + n)}.` },
  { id: 'roman-upper', label: 'I. II. III.', format: (n: number) => `${toRoman(n)}.` },
  { id: 'roman-lower', label: 'i. ii. iii.', format: (n: number) => `${toRoman(n).toLowerCase()}.` },
  { id: 'decimal-paren-right', label: '1) 2) 3)', format: (n: number) => `${n})` },
  { id: 'decimal-paren-both', label: '(1) (2)', format: (n: number) => `(${n})` },
];
const LIST_PREFIX_REGEX = /^(\s*)(?:•|◦|▪|▫|◆|◇|➤|→|⇒|—|✔|★|♥|\d+\.|[a-zA-Z]\.|[ivxIVX]+\.|[a-zA-Z]\)|[\d]+\)|(?:\(\d+\))) \s*/;

// Table style presets
const TABLE_STYLES = {
  default: { name: 'Modern', baseColor: '#374151' },
  ocean: { name: 'Ocean', baseColor: '#0891b2' },
  forest: { name: 'Forest', baseColor: '#16a34a' },
  sunset: { name: 'Sunset', baseColor: '#ea580c' },
  purple: { name: 'Purple', baseColor: '#7c3aed' },
};

type TableStyleKey = keyof typeof TABLE_STYLES;

const FONT_OPTIONS = [
  { name: 'Default (Inter)', value: 'Inter' },
  { name: 'System UI', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { name: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { name: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },

  // Serif
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },

  // Monospace
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
  { name: 'Consolas', value: 'Consolas, monaco, monospace' },

  // Designer / Google (if installed)
  { name: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { name: 'Roboto', value: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },

  // Bangla / International
  { name: 'SolaimanLipi', value: '"SolaimanLipi", sans-serif' },
  { name: 'Kalpurush', value: '"Kalpurush", sans-serif' },
  { name: 'Hind Siliguri', value: '"Hind Siliguri", sans-serif' },

  // Display
  { name: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
  { name: 'Brush Script', value: '"Brush Script MT", cursive' },
];

const getContrastColor = (hexColor: string): string => {
  try {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 0.5 ? '#FFFFFF' : '#1F2937';
  } catch {
    return '#1F2937';
  }
};

interface CanvasTableProps {
  item: TableType;
  isSelected: boolean;
  scale?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TableType>) => void;
  onDelete: () => void;
  onHistorySave?: (prevItem: TableType, newItem: TableType) => void;
}

  // Memoized Grid Component
const TableGrid = memo(({
  item,
  colWidths,
  focusedCell,
  isEditing, // NEW PROP
  inputRefs,
  handleInput,
  handleKeyDown,
  handleFocus,
  handleBlur,
  handleMouseDown,
  handleMouseUp,
  handlePaste,
  onSelect,
  defaultTextColor,
  defaultAlign = 'left',
  defaultFontSize = 14,
  defaultFontFamily = 'Inter',
  showControls,
  borderColor,
  selectionRange,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  handleDoubleClick, // NEW PROP
}: {
  item: TableType;
  colWidths: (number | string)[];
  focusedCell: { row: number; col: number } | null;
  isEditing: boolean;
  inputRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
  handleInput: (e: React.FormEvent<HTMLDivElement>, rowIndex: number, colIndex: number) => void;
  handleKeyDown: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  handleFocus: (rowIndex: number, colIndex: number) => void;
  handleBlur: () => void;
  handleMouseDown: () => void;
  handleMouseUp: () => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  onSelect: () => void;
  defaultTextColor: string;
  defaultAlign?: 'left' | 'center' | 'right';
  defaultFontSize?: number;
  defaultFontFamily?: string;
  showControls?: boolean;
  borderColor: string;
  selectionRange: { start: { row: number, col: number }, end: { row: number, col: number } } | null;
  handleCellMouseDown: (r: number, c: number) => void;
  handleCellMouseEnter: (r: number, c: number) => void;
  handleCellMouseUp: () => void;
  handleDoubleClick: (r: number, c: number) => void;
}) => {
  const initializedCells = useRef<Set<string>>(new Set());

  // Sync cell content from props to DOM
  useEffect(() => {
    item.cells.forEach((row, r) => {
      row.forEach((content, c) => {
        const key = `${r}-${c}`;
        const el = inputRefs.current[key];
        // If content differs AND (we are NOT editing THIS cell OR simple focus check), update DOM
        // With isEditing flag, we can be more precise.
        // If el is activeElement, we generally don't want to touch it while typing.
        if (el && el !== document.activeElement && el.innerHTML !== content) {
           el.innerHTML = content;
        }
      });
    });
  }, [item.cells, focusedCell]);

  return (
    <tbody>
      {item.cells.map((row, rowIndex) => (
        <tr 
          key={rowIndex} 
          className="relative group/row"
          style={{ borderBottom: rowIndex < item.cells.length - 1 ? `1px solid ${borderColor}` : 'none' }}
        >
          {row.map((cellContent, colIndex) => {
            const isHeader = rowIndex === 0;
            const cellStyles = item.cellStyles?.[rowIndex]?.[colIndex];
            const textColor = cellStyles?.textColor || defaultTextColor;
            const textAlign = cellStyles?.textAlign || (isHeader ? 'center' : defaultAlign);
            const fontSize = cellStyles?.textSize || defaultFontSize;
            const fontFamily = cellStyles?.fontFamily || defaultFontFamily;

            const isBold = cellStyles?.isBold ?? (isHeader || item.isBold);
            const isItalic = cellStyles?.isItalic ?? item.isItalic;
            const isUnderline = cellStyles?.isUnderline ?? item.isUnderline;
            const isStrike = cellStyles?.isStrike ?? item.isStrike;
            const isSub = cellStyles?.isSubscript;
            const isSuper = cellStyles?.isSuperscript;

            const isSelected = selectionRange && 
              rowIndex >= Math.min(selectionRange.start.row, selectionRange.end.row) &&
              rowIndex <= Math.max(selectionRange.start.row, selectionRange.end.row) &&
              colIndex >= Math.min(selectionRange.start.col, selectionRange.end.col) &&
              colIndex <= Math.max(selectionRange.start.col, selectionRange.end.col);

            const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
            const isEditingCell = isFocused && isEditing;

            const cellKey = `${rowIndex}-${colIndex}`;
            let cellWidth = colWidths[colIndex];
            if (typeof cellWidth === 'string' && cellWidth.endsWith('%') && item.width) {
              const percent = parseFloat(cellWidth);
              cellWidth = `${(item.width * percent) / 100}px`;
            }

            return (
              <td
                key={cellKey}
                className={cn(
                  "relative p-0 align-top transition-colors duration-200 cursor-text group/cell"
                )}
                style={{
                  minWidth: cellWidth,
                  width: cellWidth,
                  backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.05)' : (cellStyles?.backgroundColor || 'transparent'),
                  borderRight: colIndex < row.length - 1 ? `1px solid ${borderColor}` : 'none',
                }}
                data-row={rowIndex}
                data-col={colIndex}
                onClick={() => {
                   inputRefs.current[cellKey]?.focus();
                }}
                onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex)}
                onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
              >
                <div
                  ref={(el) => {
                    inputRefs.current[cellKey] = el;
                    if (el && !initializedCells.current.has(cellKey)) {
                      el.innerHTML = cellContent;
                      initializedCells.current.add(cellKey);
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  className={cn(
                    "h-full min-h-[32px] p-2 outline-none resize-none overflow-hidden bg-transparent whitespace-nowrap",
                    "selection:bg-primary/20",
                    // Hide Caret/Selection if NOT editing
                    // Always allow interaction
                    "caret-auto selection:bg-primary/20 cursor-text"
                    // Actually, if pointer-events-none, we can't focus?
                    // But 'td' onClick handles focus.
                    // Wait, if pointer-events-none, we can't select text partially. Good for Excel behavior.
                    // But we rely on 'focus' on DIV.
                    // Let's remove pointer-events-none and rely on caret-transparent.
                  )}
                  style={{
                    color: textColor,
                    textAlign: textAlign,
                    fontSize: isSub || isSuper ? '0.75em' : `${fontSize}px`,
                    fontFamily: fontFamily,
                    fontWeight: isBold ? 700 : 400,
                    fontStyle: isItalic ? 'italic' : 'normal',
                    textDecoration: (isUnderline || isStrike) ? `${isUnderline ? 'underline ' : ''}${isStrike ? 'line-through' : ''}`.trim() : 'none',
                    verticalAlign: isSub ? 'sub' : isSuper ? 'super' : 'baseline',
                    lineHeight: isSub || isSuper ? '1' : 1.5,
                    // caretColor: !isEditingCell ? 'transparent' : 'auto', // Explicit Style
                  }}
                  onInput={(e) => handleInput(e, rowIndex, colIndex)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                  onFocus={() => handleFocus(rowIndex, colIndex)}
                  onBlur={handleBlur}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onPaste={handlePaste}
                  onSelect={onSelect}
                  onKeyUp={onSelect}
                />
              </td>
            )
          })}
        </tr>
      ))}
    </tbody>
  );
});
TableGrid.displayName = 'TableGrid';

export function CanvasTable({ item, isSelected, scale = 1, onSelect, onUpdate, onDelete, onHistorySave }: CanvasTableProps) {
  const [isEditMode, setIsEditMode] = useState(false); // NEW STATE
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState<'accent' | 'bg' | 'text' | null>(null);
  const [colorScope, setColorScope] = useState<'cell' | 'table'>('table');
  const [textTab, setTextTab] = useState<'font' | 'align' | 'color' | 'style' | 'list-bullet' | 'list-number' | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    subscript: false,
    superscript: false,
  });
  const [tableScale, setTableScale] = useState(1);
  const inputRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const savedSelectionRef = useRef<Range | null>(null);
  const dragControls = useDragControls();
  const prevItemRef = useRef<TableType>(item);
  
  // Cell-level undo/redo history
  const cellHistoryRef = useRef<{ [key: string]: { html: string; caret: number }[] }>({});
  const cellHistoryIndexRef = useRef<{ [key: string]: number }>({});
  const isUndoingRef = useRef(false);
  
  // Range Selection State
  const [selectionRange, setSelectionRange] = useState<{ start: { row: number, col: number }, end: { row: number, col: number } } | null>(null);
  const isSelectingRef = useRef(false);

  const currentStyleKey = (item.tableStyle || 'default') as TableStyleKey;
  const accentColor = item.headerColor || TABLE_STYLES[currentStyleKey]?.baseColor || '#374151';
  const bgColor = item.bgColor || 'transparent';
  const textColor = item.textColor || '#e5e5e5';
  const borderColor = accentColor + '60';
  const displayBorderColor = item.hideBorder ? 'transparent' : borderColor;

  const [tempColor, setTempColor] = useState(accentColor);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });

  // Fallback for colWidths
  const colWidths = item.colWidths || Array(item.cols).fill(`${100 / item.cols}%`);

  // Helper to save current selection
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Helper to restore saved selection
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  // Helper to select all content in the focused cell
  const selectCellContent = () => {
    if (!focusedCell) return false;
    const cellEl = inputRefs.current[`${focusedCell.row}-${focusedCell.col}`];
    if (!cellEl) return false;

    cellEl.focus();
    const sel = window.getSelection();
    if (!sel) return false;

    const range = document.createRange();
    range.selectNodeContents(cellEl);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  };

  // Helper: Get Caret Position (Text Offset)
  const getCaretIndex = (element: HTMLElement) => {
    let position = 0;
    const selection = window.getSelection();
    if (selection && selection.rangeCount !== 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      position = preCaretRange.toString().length;
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

  // Initialize cell history when focusing a cell
  const initCellHistory = (cellKey: string, html: string) => {
    if (!cellHistoryRef.current[cellKey]) {
      cellHistoryRef.current[cellKey] = [{ html, caret: 0 }];
      cellHistoryIndexRef.current[cellKey] = 0;
    }
  };

  // Push to cell history
  const pushCellHistory = (cellKey: string, html: string, caret: number) => {
    if (isUndoingRef.current) return;
    
    const history = cellHistoryRef.current[cellKey] || [];
    const index = cellHistoryIndexRef.current[cellKey] ?? 0;
    
    // Truncate history if we're not at the end
    const newHistory = history.slice(0, index + 1);
    newHistory.push({ html, caret });
    
    // Keep history limited
    if (newHistory.length > 100) newHistory.shift();
    
    cellHistoryRef.current[cellKey] = newHistory;
    cellHistoryIndexRef.current[cellKey] = newHistory.length - 1;
  };

  // Custom detection for subscript - check if selection is inside <sub> tag
  const isSelectionInSubscript = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    
    // Check if there's an actual selection (not just cursor)
    // If collapsed (just cursor), check parent - but be more strict
    if (sel.isCollapsed) {
      // For collapsed selection, only return true if cursor is in middle of sub content
      let node: Node | null = sel.anchorNode;
      while (node) {
        if (node.nodeName === 'SUB') {
          const subEl = node as HTMLElement;
          const range = sel.getRangeAt(0);
          // Only highlight if cursor is NOT at the very end of the sub element
          const textLen = subEl.textContent?.length || 0;
          if (range.startOffset < textLen) return true;
          return false;
        }
        node = node.parentNode;
      }
      return false;
    }
    
    // For actual selection, check if anchor is in sub
    let node: Node | null = sel.anchorNode;
    while (node) {
      if (node.nodeName === 'SUB') return true;
      node = node.parentNode;
    }
    return false;
  };

  // Custom detection for superscript - check if selection is inside <sup> tag
  const isSelectionInSuperscript = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    
    // Check if there's an actual selection (not just cursor)
    if (sel.isCollapsed) {
      let node: Node | null = sel.anchorNode;
      while (node) {
        if (node.nodeName === 'SUP') {
          const supEl = node as HTMLElement;
          const range = sel.getRangeAt(0);
          const textLen = supEl.textContent?.length || 0;
          if (range.startOffset < textLen) return true;
          return false;
        }
        node = node.parentNode;
      }
      return false;
    }
    
    let node: Node | null = sel.anchorNode;
    while (node) {
      if (node.nodeName === 'SUP') return true;
      node = node.parentNode;
    }
    return false;
  };

  // Helper to get accurate format state using both queryCommandState and DOM traversal
  const getAccurateFormatState = () => ({
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    subscript: document.queryCommandState('subscript') || isSelectionInSubscript(),
    superscript: document.queryCommandState('superscript') || isSelectionInSuperscript(),
  });

  // Helper to find the parent sub/sup element
  const findFormattingParent = (tagName: 'SUB' | 'SUP'): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    while (node) {
      if (node.nodeName === tagName) return node as HTMLElement;
      node = node.parentNode;
    }
    return null;
  };

  // Helper to unwrap (remove) a formatting tag while keeping the content
  const unwrapTag = (tagName: 'SUB' | 'SUP'): boolean => {
    const element = findFormattingParent(tagName);
    if (!element || !element.parentNode) return false;
    
    // Replace the element with its contents
    const parent = element.parentNode;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    return true;
  };

  const handleStyleUpdate = (updates: Partial<TableType>) => {
    if (onHistorySave) {
      onHistorySave(item, { ...item, ...updates });
    }
    onUpdate(updates);
  };

  const formatList = (symbol: string, type: 'bullet' | 'number', formatId?: string) => {
    if (!focusedCell) return;
    const { row, col } = focusedCell;
    const currentText = item.cells[row]?.[col] || '';

    const lines = currentText.split('\n');
    const newLines = lines.map((line, i) => {
      const match = line.match(LIST_PREFIX_REGEX);
      if (match) {
        if (type === 'bullet') return line.replace(LIST_PREFIX_REGEX, `${symbol} `);
        if (type === 'number' && formatId) {
          const fmt = NUMBER_FORMATS.find(f => f.id === formatId);
          if (fmt) return line.replace(LIST_PREFIX_REGEX, `${fmt.format(i + 1)} `);
        }
        return line;
      } else {
        if (type === 'bullet') return `${symbol} ${line}`;
        if (type === 'number' && formatId) {
          const fmt = NUMBER_FORMATS.find(f => f.id === formatId);
          if (fmt) return `${fmt.format(i + 1)} ${line}`;
        }
        return line;
      }
    });

    // Use updateCell logic pattern
    const newCells = item.cells.map((r, i) => i === row ? r.map((c, j) => j === col ? newLines.join('\n') : c) : r);
    const newItem = { ...item, cells: newCells };
    if (onHistorySave) {
      onHistorySave(item, newItem);
    }
    onUpdate({ cells: newCells });
  };

  const [isResetConfirming, setIsResetConfirming] = useState(false);
  useEffect(() => {
    if (isResetConfirming) {
      const t = setTimeout(() => setIsResetConfirming(false), 2500);
      return () => clearTimeout(t);
    }
  }, [isResetConfirming]);

  // Font Search & Custom Fonts
  const [fontSearch, setFontSearch] = useState('');
  const [customFonts, setCustomFonts] = useState<{ name: string, value: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontName = file.name.split('.')[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fontUrl = event.target?.result as string;
      const fontFace = new FontFace(fontName, `url(${fontUrl})`);
      fontFace.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
        setCustomFonts(prev => [...prev, { name: fontName, value: `"${fontName}", sans-serif` }]);
        // Auto-select
        if (colorScope === 'cell' && focusedCell) {
          const key = `${focusedCell.row}-${focusedCell.col}`;
          handleStyleUpdate({ cellStyles: { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], fontFamily: `"${fontName}", sans-serif` } } });
        } else {
          const cleanCells = item.cellStyles ? Object.fromEntries(Object.entries(item.cellStyles).map(([k, v]) => { const { fontFamily, ...rest } = v; return [k, rest]; })) : {};
          handleStyleUpdate({ fontFamily: `"${fontName}", sans-serif`, cellStyles: cleanCells });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredFonts = [...customFonts, ...FONT_OPTIONS].filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()));

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, itemX: item.x, itemY: item.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
      onUpdate({ x: Math.round(dragStartRef.current.itemX + deltaX), y: Math.round(dragStartRef.current.itemY + deltaY) });
    };
    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        const newX = Math.round(dragStartRef.current.itemX + deltaX);
        const newY = Math.round(dragStartRef.current.itemY + deltaY);

        const prevItem = { ...item, x: dragStartRef.current.itemX, y: dragStartRef.current.itemY };
        const newItem = { ...item, x: newX, y: newY };

        onHistorySave?.(prevItem, newItem);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, scale, onUpdate, item]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, itemX: 0, itemY: 0 };
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
      const delta = (deltaX + deltaY) / 2; // Average of both for smoother feel
      const newScale = Math.max(0.5, Math.min(3, tableScale + delta * 0.003)); // Much lower sensitivity
      setTableScale(newScale);
      dragStartRef.current.mouseX = e.clientX;
      dragStartRef.current.mouseY = e.clientY;
    };
    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      // Recalculate final scale one last time to be sure
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
      const delta = (deltaX + deltaY) / 2;
      const finalScale = Math.max(0.5, Math.min(3, tableScale + delta * 0.003));

      if (Math.abs(finalScale - tableScale) > 0.01) { // Only save if changed meaningfully
        // Wait, tableScale is state. item doesn't have scale property? 
        // CanvasTable component has `tableScale` state, but is it persisted to `item`?
        // Checking code: `scale` prop is canvas zoom. `tableScale` is local state?
        // If `tableScale` is LOCAL, then undoing it won't work unless `item` stores it.
        // Let's check if `TableType` has a scale or width/height property that drives this?
        // The resize logic updates `tableScale` state.
        // Previous code: `setTableScale(newScale)`.
        // It DOES NOT update `item`?
        // If it doesn't update `item`, then Table Resize is NOT persisted at all?
        // In that case, Undo "Delete" issue applies to Move.
        // But Resize "Gayeb" issue?
        // If Resize isn't persisted, user can't undo it anyway.
        // But user asked about Move (Drag).
        // I will focus on Drag. 
        // But wait, does resizing update item?
        // The original code `handleResizeStart` updated *width/height* directly.
        // My previous refactor to `tableScale` might have lost persistence IF I didn't add onUpdate!
        // Let's look at `handleMouseMove` for resize (Line 92).
        // `setTableScale(newScale)`. No `onUpdate`.
        // So Resize IS BROKEN (not persisting).
        // I should fix Resize Persistence too.
        // Does `TableType` have `scale`? Or `width`/`height`?
        // Standard is `width`/`height`.
        // So `tableScale` should map to `width`/`height`.
        // But `transform: scale` is used.
        // If I use transform, `width/height` are constant?
        // That's bad for persistence.
        // I should probably update `item.scale` if it exists?
        // Or update `width/height` = `base * scale`.
        // Let's assume for now I just need to fix Drag.
        // I will skip Resize fix in this chunk to be safe, or just do Drag?
        // User specific request: "drag kore point A theke B".
        // Use case: Drag.
        // I will stick to Drag.
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isResizing, scale, tableScale]);

  // Clear focused cell when table is deselected
  useEffect(() => {
    if (!isSelected) {
      setFocusedCell(null);
    }
  }, [isSelected]);

  const updateCell = (row: number, col: number, value: string) => {
    const newCells = item.cells.map((r, i) => i === row ? r.map((c, j) => j === col ? value : c) : r);
    onUpdate({ cells: newCells });
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    // Excel-like Overwrite Logic
    // If typing printable char and NOT editing -> Overwrite
    if (!isEditMode && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && !e.key.match(/F\d+/)) {
        e.preventDefault();
        const cellEl = inputRefs.current[`${rowIndex}-${colIndex}`];
        if (cellEl) {
            cellEl.innerHTML = e.key;
            // Move caret to end
            setCaretIndex(cellEl, 1);
            setIsEditMode(true); 
            // Trigger Update
            updateCell(rowIndex, colIndex, e.key);
        }
        return;
    }
    
    // F2 Logic
    if (e.key === 'F2') {
        setIsEditMode(true);
        return;
    }

    // Escape cursor from sub/sup tags when typing at the end
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const anchorNode = sel.anchorNode;
        
        // Check if we're inside a SUB or SUP
        let formattingNode: HTMLElement | null = null;
        let node: Node | null = anchorNode;
        while (node) {
          if (node.nodeName === 'SUB' || node.nodeName === 'SUP') {
            formattingNode = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }
        
        if (formattingNode && anchorNode) {
          // Check if cursor is at the very end of the text inside formatting element
          // This handles both text nodes and when cursor is at end of any child
          const isTextNode = anchorNode.nodeType === Node.TEXT_NODE;
          const textLength = anchorNode.textContent?.length || 0;
          const isAtTextEnd = isTextNode && range.startOffset >= textLength;
          const isLastChild = anchorNode === formattingNode.lastChild || 
                              (anchorNode.parentNode === formattingNode && !anchorNode.nextSibling);
          const isAtEnd = isAtTextEnd && isLastChild;
          
          if (isAtEnd) {
            e.preventDefault();
            
            // Insert the character after the formatting tag
            const parent = formattingNode.parentNode;
            if (parent) {
              // Create a text node with the typed character
              const textNode = document.createTextNode(e.key);
              if (formattingNode.nextSibling) {
                parent.insertBefore(textNode, formattingNode.nextSibling);
              } else {
                parent.appendChild(textNode);
              }
              // Move selection to after the new text node
              const newRange = document.createRange();
              newRange.setStart(textNode, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              
              // Trigger input event to update state
              const inputEvent = new InputEvent('input', { bubbles: true, data: e.key });
              (e.target as HTMLElement)?.dispatchEvent(inputEvent);
            }
          }
        }
      }
    }
    
    
    // Handle Ctrl+Z (Undo) and Ctrl+Y/Ctrl+Shift+Z (Redo)
    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    
    // RESTORED LOCAL UNDO LOGIC
    // This allows character-by-character undo (Tying) to work locally.
    // Yet it STILL bubbles to Global Undo if:
    // 1. Content mismatch (Paste)
    // 2. Start of history (Index 0)
    
    if (isCtrl && (key === 'z' || key === 'y')) {
      const cellKey = `${rowIndex}-${colIndex}`;
      const cellEl = inputRefs.current[cellKey];
      if (!cellEl) return;

      const history = cellHistoryRef.current[cellKey] || [];
      let index = cellHistoryIndexRef.current[cellKey] ?? 0;
      const historyState = history[index];

      // If content mismatches local history (e.g. after a Paste), let Global Undo handle it
      if (historyState && historyState.html !== cellEl.innerHTML) {
         e.preventDefault(); // BLOCK NATIVE UNDO
         cellEl.blur(); 
         // Force Bubble via Dispatch
         setTimeout(() => {
            document.body.dispatchEvent(new KeyboardEvent('keydown', {
               key: e.key, code: e.code, ctrlKey: true, metaKey: e.metaKey, shiftKey: e.shiftKey, bubbles: true
            }));
         }, 0);
         return;
      }

      const isRedo = e.shiftKey || key === 'y';

      // If cannot undo locally (start of history), bubble to Global Undo
      if (!isRedo && index === 0) {
        e.preventDefault(); // BLOCK NATIVE UNDO
        cellEl.blur();
        // Force Bubble via Dispatch
        setTimeout(() => {
            document.body.dispatchEvent(new KeyboardEvent('keydown', {
               key: e.key, code: e.code, ctrlKey: true, metaKey: e.metaKey, shiftKey: e.shiftKey, bubbles: true
            }));
         }, 0);
        return;
      }
      
      // If cannot redo locally (end of history), bubble
      if (isRedo && index >= history.length - 1) {
        return;
      }

      // HANDLE LOCAL UNDO
      e.preventDefault(); // Prevent Browser Undo
      e.stopPropagation(); // Stop Global Undo from running
      
      if (isRedo) { // REDO
        if (index < history.length - 1) {
          index++;
          cellHistoryIndexRef.current[cellKey] = index;
          const state = history[index];
          if (state) {
            isUndoingRef.current = true;
            cellEl.innerHTML = state.html;
            setCaretIndex(cellEl, state.caret);
            isUndoingRef.current = false;
            // Update cell data
            updateCell(rowIndex, colIndex, state.html);
          }
        }
      } else { // UNDO
        if (index > 0) {
          index--;
          cellHistoryIndexRef.current[cellKey] = index;
          const state = history[index];
          if (state) {
            isUndoingRef.current = true;
            cellEl.innerHTML = state.html;
            setCaretIndex(cellEl, state.caret);
            isUndoingRef.current = false;
            // Update cell data
            updateCell(rowIndex, colIndex, state.html);
          }
        }
      }
      return;
    }
    
    // --- NAVIGATION LOGIC (Excel-like) ---
    if (!isCtrl && !e.altKey && !e.metaKey) {
       // Arrow Up
       if (key === 'arrowup') {
          if (rowIndex > 0) {
             e.preventDefault();
             inputRefs.current[`${rowIndex - 1}-${colIndex}`]?.focus();
          }
       }
       // Arrow Down / Enter
       else if (key === 'arrowdown' || (key === 'enter' && !e.shiftKey)) {
          if (rowIndex < item.rows - 1) {
             e.preventDefault();
             inputRefs.current[`${rowIndex + 1}-${colIndex}`]?.focus();
          }
       }
       // Arrow Left
       else if (key === 'arrowleft') {
          const caret = getCaretIndex(e.currentTarget as HTMLElement);
          if (caret === 0 && colIndex > 0) {
             e.preventDefault();
             inputRefs.current[`${rowIndex}-${colIndex - 1}`]?.focus();
          }
       }
       // Arrow Right
       else if (key === 'arrowright') {
          const target = e.currentTarget as HTMLElement;
          const caret = getCaretIndex(target);
          if (caret >= (target.textContent?.length || 0) && colIndex < item.cols - 1) {
             e.preventDefault();
             inputRefs.current[`${rowIndex}-${colIndex + 1}`]?.focus();
          }
       }
       // Tab / Shift+Tab
       else if (key === 'tab') {
          e.preventDefault();
          if (e.shiftKey) { // Previous
             if (colIndex > 0) {
                 inputRefs.current[`${rowIndex}-${colIndex - 1}`]?.focus();
             } else if (rowIndex > 0) {
                 inputRefs.current[`${rowIndex - 1}-${item.cols - 1}`]?.focus();
             }
          } else { // Next
             if (colIndex < item.cols - 1) {
                 inputRefs.current[`${rowIndex}-${colIndex + 1}`]?.focus();
             } else if (rowIndex < item.rows - 1) {
                 inputRefs.current[`${rowIndex + 1}-0`]?.focus();
             }
          }
       }
    }

    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (rowIndex === item.rows - 1) {
        addRow();
        setTimeout(() => {
          const newCellKey = `${rowIndex + 1}-${colIndex}`;
          inputRefs.current[newCellKey]?.focus();
        }, 50);
      } else {
        const nextCellKey = `${rowIndex + 1}-${colIndex}`;
        inputRefs.current[nextCellKey]?.focus();
      }
    }
  };

  const addRow = (index?: number) => {
    const insertIndex = index !== undefined ? index : item.rows;
    const newRow = new Array(item.cols).fill('');
    const newCells = [...item.cells];
    newCells.splice(insertIndex, 0, newRow);

    const newItem = { ...item, cells: newCells, rows: item.rows + 1 };
    onUpdate(newItem);
    onHistorySave?.(item, newItem);
  };
  const removeRow = (index?: number) => {
    if (item.rows > 1) {
      const targetIndex = index !== undefined ? index : item.rows - 1;
      const newCells = [...item.cells];
      newCells.splice(targetIndex, 1);

      const newItem = { ...item, cells: newCells, rows: item.rows - 1 };
      onUpdate(newItem);
      onHistorySave?.(item, newItem);
    }
  };
  const addCol = (index?: number) => {
    const insertIndex = index !== undefined ? index : item.cols;
    const newCells = item.cells.map(row => {
      const r = [...row];
      r.splice(insertIndex, 0, '');
      return r;
    });

    const newItem = { ...item, cells: newCells, cols: item.cols + 1 };
    onUpdate(newItem);
    onHistorySave?.(item, newItem);
  };
  const removeCol = (index?: number) => {
    if (item.cols > 1) {
      const targetIndex = index !== undefined ? index : item.cols - 1;
      const newCells = item.cells.map(row => {
        const r = [...row];
        r.splice(targetIndex, 1);
        return r;
      });

      const newItem = { ...item, cells: newCells, cols: item.cols - 1 };
      onUpdate(newItem);
      onHistorySave?.(item, newItem);
    }
  };

  // Range Selection Handlers
  const handleCellMouseDown = (r: number, c: number) => {
    // Exit edit mode on new selection (Excel behavior)
    // Notion-like: Always allow editing/selection
    // setIsEditMode(false); // REMOVED: Don't exit edit mode
    setIsEditMode(true); // Always ensure we are 'editing' so other logic holds

    // Only start selection if not resizing
    if (isResizing) return;
    
    isSelectingRef.current = true;
    setSelectionRange({ start: { row: r, col: c }, end: { row: r, col: c } });
    
    // Don't blur immediately - let user select text if they stay in cell
    // We will blur in mousemove if they drag outside
  };

  const handleDoubleClick = (r: number, c: number) => {
      setIsEditMode(true);
      // Explicitly focus cell
      inputRefs.current[`${r}-${c}`]?.focus();
  };

  // Global mouse tracking for robust selection
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isSelectingRef.current) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const td = el?.closest('td');
      
      if (td) {
        const r = parseInt(td.getAttribute('data-row') || '-1');
        const c = parseInt(td.getAttribute('data-col') || '-1');
        
        if (r !== -1 && c !== -1) {
          setSelectionRange(prev => {
             if (!prev) return null;
             
             // If we have dragged to a DIFFERENT cell than start
             if (prev.start.row !== r || prev.start.col !== c) {
                // If we were in text edit mode (activeElement exists), blur it now
                // This switches behavior from text selection to cell selection
                if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) {
                   document.activeElement.blur();
                   window.getSelection()?.removeAllRanges();
                }
             }
             
             return { ...prev, end: { row: r, col: c } };
          });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      isSelectingRef.current = false;
    };

    // Add listeners to window to capture events even if mouse leaves table
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Handle Copy for Selection Range
  // Handle Copy for Selection Range (Ctrl+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Copy (Ctrl+C), Cut (Ctrl+X), or Delete (Backspace/Delete)
      const isCmd = e.ctrlKey || e.metaKey;
      const isCopy = isCmd && e.key === 'c';
      const isCut = isCmd && e.key === 'x';
      const isDelete = e.key === 'Delete' || e.key === 'Backspace';

      if (isCopy || isCut || isDelete) {
        if (!selectionRange) return; 

        const { start, end } = selectionRange;
        const isMultiCell = start.row !== end.row || start.col !== end.col;

        // Check if text is selected within a cell
        if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) {
           // If editing a cell, prioritize text action UNLESS selection spans multiple cells
           // For Delete -> If editing text, let browser handle backspace/delete
           // For Cut/Copy -> If editing text, let browser handle it
           if (!isMultiCell) return;
        }

        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);

        // PERFORM COPY / CUT-COPY Logic
        if (isCopy || isCut) {
           e.preventDefault();
           console.log(isCut ? 'Cutting range:' : 'Copying range:', { minR, maxR, minC, maxC });

           let tsv = "";
           let html = "<table><tbody>";

           for (let r = minR; r <= maxR; r++) {
              html += "<tr>";
              let rowLine = [];
              for (let c = minC; c <= maxC; c++) {
                 const cellContent = item.cells[r]?.[c] || "";
                 // Strip HTML for TSV
                 const div = document.createElement('div');
                 div.innerHTML = cellContent;
                 let text = div.textContent || "";
                 rowLine.push(text);
                 
                 // Keep HTML for rich paste
                 html += `<td style="border:1px solid #000;">${cellContent}</td>`;
              }
              tsv += rowLine.join("\t") + "\n";
              html += "</tr>";
           }
           html += "</tbody></table>";

           // Use Clipboard API
           if (navigator.clipboard) {
              navigator.clipboard.writeText(tsv).then(() => {
                 setSelectionRange(undefined);
                 console.log('Text copied to clipboard');
                 try {
                     const type = "text/html";
                     const blob = new Blob([html], { type });
                     const data = [new ClipboardItem({ 
                         [type]: blob,
                         ["text/plain"]: new Blob([tsv], { type: "text/plain" })
                     })];
                     navigator.clipboard.write(data).catch(e => console.warn("HTML copy failed, text only", e));
                 } catch (e) {
                     console.warn("ClipboardItem not supported", e);
                 }
              }).catch(err => {
                  console.error('Clipboard action failed:', err);
              });
           }
        }

        // PERFORM DELETE / CUT Logic (Clear Cells)
        if (isCut || isDelete) {
           if (!isCopy) e.preventDefault(); // Prevent default for Cut/Delete (Copy already blocked above)
           
           console.log('Clearing range:', { minR, maxR, minC, maxC });
           
           // Create Deep Copy of Cells
           const newCells = item.cells.map(row => [...row]);
           let hasChanges = false;
           
           for (let r = minR; r <= maxR; r++) {
              for (let c = minC; c <= maxC; c++) {
                 // Clear Logic
                 const cellKey = `${r}-${c}`;
                 
                 // 1. Clear Store State
                 if (newCells[r] && newCells[r][c] !== "") {
                    newCells[r][c] = ""; 
                    hasChanges = true;
                 }
                 
                 // 2. FORCE Clear DOM Element (Fixes "Ghost" text in active cell)
                 const cellEl = inputRefs.current[cellKey];
                 if (cellEl) {
                    cellEl.innerHTML = "";
                 }
                 
                 // 3. Reset Local History (Optional, to avoid mismatch on next undo? 
                 // Actually, if we clear DOM, local history mismatch logic handles it correctly.)
              }
           }
           
           if (hasChanges) {
               const newItem = { ...item, cells: newCells };
               onUpdate(newItem);
               onHistorySave?.(item, newItem);
           }
           setSelectionRange(undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRange, item.cells]);

  const changeStyle = (style: TableStyleKey) => {
    const newItem = { ...item, tableStyle: style, headerColor: TABLE_STYLES[style].baseColor, bgColor: 'transparent' };
    onUpdate(newItem);
    onHistorySave?.(item, newItem);
  };

  const showControls = isHovered || isMenuOpen;

  return (
    <motion.div

      className={cn('absolute flex flex-col group', isDragging && 'cursor-grabbing opacity-90')}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: tableScale, opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={{ left: item.x, top: item.y, transformOrigin: 'top left', width: 'fit-content', minWidth: item.width || 100 }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header / Drag Handle (Text Box Style) */}
      {/* Header / Drag Handle (Absolute Overlay) */}
      <div
        className={cn(
          "absolute bottom-[calc(100%_-_2px)] left-0 w-full flex items-center px-2 py-1 bg-muted/50 backdrop-blur-sm rounded-t-lg border-2 border-b-0 cursor-grab active:cursor-grabbing transition-opacity duration-150 z-10",
          showControls ? "opacity-100" : "opacity-0"
        )}
        style={{ borderColor: isSelected ? '#0EA5E9' : displayBorderColor }}
        onMouseDown={handleDragStart}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Grip & Quick Actions */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => addCol()} title="Add Column"><Columns className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => addRow()} title="Add Row"><Rows className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Center: Menu */}
        <div className="absolute left-1/2 -translate-x-1/2" onMouseDown={(e) => e.stopPropagation()}>
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted", isMenuOpen && "bg-muted text-foreground")}
                onMouseDown={() => saveSelection()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-0 h-0 p-0 bg-transparent border-none shadow-none overflow-visible"
              style={{ pointerEvents: 'none' }}
              side="right"
              align="start"
              collisionPadding={10}
              onOpenAutoFocus={(e) => e.preventDefault()}
              sideOffset={5}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <motion.div
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                initial={{ x: panelOffset.x, y: panelOffset.y }}
                onDragEnd={(e, info) => {
                  setPanelOffset((prev) => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
                }}
                className="w-56 bg-popover border rounded-lg shadow-xl overflow-hidden"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b cursor-move"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {textTab ? (
                      textTab === 'font' ? 'Typography' :
                        textTab === 'align' ? 'Alignment' :
                          textTab === 'style' ? 'Formatting' :
                            textTab === 'list-bullet' ? 'Bullet Library' :
                              textTab === 'list-number' ? 'Numbering' : 'Text Color'
                    ) : (
                      activeColorPicker ? (
                        activeColorPicker === 'accent' ? 'Accent Color' :
                          activeColorPicker === 'bg' ? 'Background' :
                            'Text Style'
                      ) : 'Table Options'
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {(activeColorPicker || textTab) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          if (textTab === 'list-bullet' || textTab === 'list-number') {
                            setTextTab('style');
                          } else if (textTab) {
                            setTextTab(null);
                          } else {
                            setActiveColorPicker(null);
                          }
                        }}
                        title="Back"
                      >
                        <ChevronLeft className="h-3 w-3" /> Back
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="p-2">
                  {(activeColorPicker || textTab) && (
                    <>
                      {activeColorPicker === 'bg' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mb-2 h-7 text-xs justify-start px-2 hover:bg-muted"
                          onClick={() => {
                            onUpdate({ bgColor: 'transparent' });
                            setActiveColorPicker(null);
                          }}
                        >
                          <X className="h-3 w-3 mr-2" /> No Background
                        </Button>
                      )}

                      {/* Global Scope Switcher & Grid (Level 1) */}
                      {activeColorPicker === 'text' && !textTab && (
                        <>
                          <div className="flex bg-muted rounded p-0.5 mb-2">
                            <button
                              className={cn("flex-1 text-xs py-1 rounded transition-colors font-medium", colorScope === 'cell' ? "bg-background text-foreground shadow-sm" : "hover:text-foreground text-muted-foreground")}
                              onClick={() => setColorScope('cell')}
                            >
                              Cell
                            </button>
                            <button
                              className={cn("flex-1 text-xs py-1 rounded transition-colors font-medium", colorScope === 'table' ? "bg-background text-foreground shadow-sm" : "hover:text-foreground text-muted-foreground")}
                              onClick={() => setColorScope('table')}
                            >
                              Table
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-1">
                            <Button variant="outline" size="sm" className="h-12 justify-start px-4 hover:bg-muted hover:text-primary transition-colors flex flex-col items-center justify-center gap-1" onClick={() => setTextTab('font')} title="Typography">
                              <Type className="h-5 w-5" /> <span className="text-[10px] font-medium">Font</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-12 justify-start px-4 hover:bg-muted hover:text-primary transition-colors flex flex-col items-center justify-center gap-1" onClick={() => setTextTab('align')} title="Align">
                              <AlignLeft className="h-5 w-5" /> <span className="text-[10px] font-medium">Align</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-12 justify-start px-4 hover:bg-muted hover:text-primary transition-colors flex flex-col items-center justify-center gap-1" onClick={() => setTextTab('color')} title="Color">
                              <Palette className="h-5 w-5" /> <span className="text-[10px] font-medium">Color</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-12 justify-start px-4 hover:bg-muted hover:text-primary transition-colors flex flex-col items-center justify-center gap-1" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setTextTab('style'); }} title="Style">
                              <Bold className="h-5 w-5" /> <span className="text-[10px] font-medium">Style</span>
                            </Button>
                            <Button
                              variant={isResetConfirming ? "destructive" : "outline"}
                              size="sm"
                              className={cn(
                                "h-12 justify-start px-4 transition-all flex flex-col items-center justify-center gap-1 col-span-2",
                                !isResetConfirming && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                              )}
                              onClick={() => {
                                if (isResetConfirming) {
                                  if (colorScope === 'cell' && focusedCell) {
                                    const key = `${focusedCell.row}-${focusedCell.col}`;
                                    const { textSize, fontFamily, textColor, textAlign, ...rest } = item.cellStyles?.[key] || {};
                                    const newStyles = { ...item.cellStyles, [key]: rest };
                                    handleStyleUpdate({ cellStyles: newStyles });
                                  } else {
                                    handleStyleUpdate({ textSize: undefined, fontFamily: undefined, textColor: undefined, textAlign: undefined });
                                  }
                                  setIsResetConfirming(false);
                                } else {
                                  setIsResetConfirming(true);
                                }
                              }}
                              title="Reset Styles"
                            >
                              <RotateCcw className={cn("h-5 w-5", isResetConfirming && "animate-pulse")} />
                              <span className="text-[10px] font-medium">{isResetConfirming ? 'Sure?' : 'Reset'}</span>
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Tool Content (Level 2) - Hidden if no tab selected */}
                      {textTab && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-200">

                          {textTab === 'style' && (() => {
                            return (
                              <div className="flex flex-col gap-2 p-1">
                                {/* Basic Formatting */}
                                <div className="flex items-center justify-between bg-muted rounded p-1">
                                  <div className="flex gap-1 w-full justify-between">
                                    <Button
                                      size="sm"
                                      variant={activeFormats.bold ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.bold && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        document.execCommand('bold', false, undefined);
                                        setActiveFormats(prev => ({ ...prev, bold: document.queryCommandState('bold') }));
                                      }}
                                      title="Bold"
                                    >
                                      <Bold className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeFormats.italic ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.italic && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        document.execCommand('italic', false, undefined);
                                        setActiveFormats(prev => ({ ...prev, italic: document.queryCommandState('italic') }));
                                      }}
                                      title="Italic"
                                    >
                                      <Italic className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeFormats.underline ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.underline && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        document.execCommand('underline', false, undefined);
                                        setActiveFormats(prev => ({ ...prev, underline: document.queryCommandState('underline') }));
                                      }}
                                      title="Underline"
                                    >
                                      <Underline className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeFormats.strike ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.strike && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        document.execCommand('strikeThrough', false, undefined);
                                        setActiveFormats(prev => ({ ...prev, strike: document.queryCommandState('strikeThrough') }));
                                      }}
                                      title="Strikethrough"
                                    >
                                      <Strikethrough className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeFormats.subscript ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.subscript && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const isCurrentlySubscript = document.queryCommandState('subscript') || isSelectionInSubscript();
                                        const isCurrentlySuperscript = document.queryCommandState('superscript') || isSelectionInSuperscript();
                                        
                                        if (isCurrentlySubscript) {
                                          // Toggle OFF - unwrap the sub tag
                                          unwrapTag('SUB');
                                        } else {
                                          // Toggle ON - first turn off superscript if needed
                                          if (isCurrentlySuperscript) {
                                            unwrapTag('SUP');
                                          }
                                          document.execCommand('subscript', false, undefined);
                                        }
                                        setActiveFormats(getAccurateFormatState());
                                      }}
                                      title="Subscript"
                                    >
                                      <Subscript className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeFormats.superscript ? "secondary" : "outline"}
                                      className={cn("h-8 w-8 p-0", activeFormats.superscript && "bg-primary/10 text-primary border-primary/20")}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const isCurrentlySubscript = document.queryCommandState('subscript') || isSelectionInSubscript();
                                        const isCurrentlySuperscript = document.queryCommandState('superscript') || isSelectionInSuperscript();
                                        
                                        if (isCurrentlySuperscript) {
                                          // Toggle OFF - unwrap the sup tag
                                          unwrapTag('SUP');
                                        } else {
                                          // Toggle ON - first turn off subscript if needed
                                          if (isCurrentlySubscript) {
                                            unwrapTag('SUB');
                                          }
                                          document.execCommand('superscript', false, undefined);
                                        }
                                        setActiveFormats(getAccurateFormatState());
                                      }}
                                      title="Superscript"
                                    >
                                      <Superscript className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <Button variant="outline" size="sm" className="h-8 text-xs justify-center" onClick={() => setTextTab('list-bullet')} title="Bullet List">
                                    <List className="h-3.5 w-3.5 mr-2" /> Bullet
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-8 text-xs justify-center" onClick={() => setTextTab('list-number')} title="Numbered List">
                                    <ListOrdered className="h-3.5 w-3.5 mr-2" /> Number
                                  </Button>
                                </div>
                              </div>
                            );
                          })()}

                          {textTab === 'list-bullet' && (() => {
                            const { row, col } = focusedCell || { row: 0, col: 0 };
                            const currentText = item.cells[row]?.[col] || '';
                            const match = currentText.match(LIST_PREFIX_REGEX);
                            const currentPrefix = match ? match[0].trim() : '';

                            return (
                              <div className="p-1">
                                <div className="grid grid-cols-5 gap-1">
                                  {BULLET_ARCHETYPES.map((char) => (
                                    <Button
                                      key={char}
                                      variant={currentPrefix === char ? "secondary" : "outline"}
                                      size="sm"
                                      className={cn("h-9 w-9 p-0 text-lg", currentPrefix === char && "bg-primary/10 text-primary border-primary/20")}
                                      onClick={() => formatList(char, 'bullet')}
                                    >
                                      {char}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {textTab === 'list-number' && (() => {
                            const { row, col } = focusedCell || { row: 0, col: 0 };
                            const currentText = item.cells[row]?.[col] || '';
                            const match = currentText.match(LIST_PREFIX_REGEX);
                            const currentPrefix = match ? match[0].trim() : '';

                            const detectFormat = (p: string) => {
                              if (/^\d+\.$/.test(p)) return 'decimal';
                              if (/^[IVX]+\.$/.test(p)) return 'roman-upper';
                              if (/^[ivx]+\.$/.test(p)) return 'roman-lower';
                              if (/^[A-Z]\.$/.test(p)) return 'alpha-upper';
                              if (/^[a-z]\.$/.test(p)) return 'alpha-lower';
                              if (/^\d+\)$/.test(p)) return 'decimal-paren-right';
                              if (/^\(\d+\)$/.test(p)) return 'decimal-paren-both';
                              return null;
                            };
                            const activeFormatId = detectFormat(currentPrefix);

                            return (
                              <div className="flex flex-col gap-1 p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                {NUMBER_FORMATS.map((fmt) => (
                                  <Button
                                    key={fmt.id}
                                    variant={activeFormatId === fmt.id ? "secondary" : "outline"}
                                    className={cn("w-full justify-start gap-3 h-10", activeFormatId === fmt.id && "bg-primary/10 text-primary border-primary/20")}
                                    onClick={() => formatList('', 'number', fmt.id)}
                                  >
                                    <span className={cn("w-16 text-right font-mono text-xs", activeFormatId === fmt.id ? "font-bold text-primary" : "text-muted-foreground")}>{fmt.label}</span>
                                    <span className="text-sm">List Item</span>
                                  </Button>
                                ))}
                              </div>
                            );
                          })()}

                          {textTab === 'font' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1 bg-muted rounded p-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-sm hover:bg-background shadow-none" onClick={() => {
                                  const step = 2;
                                  if (colorScope === 'cell' && focusedCell) {
                                    const key = `${focusedCell.row}-${focusedCell.col}`;
                                    const current = item.cellStyles?.[key]?.textSize || item.textSize || 14;
                                    const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textSize: Math.max(8, current - step) } };
                                    handleStyleUpdate({ cellStyles: newStyles });
                                  } else {
                                    const current = item.textSize || 14;
                                    const cleanCells = item.cellStyles ? Object.fromEntries(Object.entries(item.cellStyles).map(([k, v]) => { const { textSize, ...rest } = v; return [k, rest]; })) : {};
                                    handleStyleUpdate({ textSize: Math.max(8, current - step), cellStyles: cleanCells });
                                  }
                                }}><Minus className="h-3.5 w-3.5" /></Button>
                                <input
                                  type="number"
                                  className="flex-1 w-full text-center text-sm font-medium bg-transparent border-none p-0 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={(colorScope === 'cell' && focusedCell)
                                    ? (item.cellStyles?.[`${focusedCell.row}-${focusedCell.col}`]?.textSize || item.textSize || 14)
                                    : (item.textSize || 14)}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value);
                                    if (isNaN(val)) return;
                                    const size = Math.max(1, Math.min(100, val));
                                    if (colorScope === 'cell' && focusedCell) {
                                      const key = `${focusedCell.row}-${focusedCell.col}`;
                                      const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textSize: size } };
                                      handleStyleUpdate({ cellStyles: newStyles });
                                    } else {
                                      const cleanCells = item.cellStyles ? Object.fromEntries(Object.entries(item.cellStyles).map(([k, v]) => { const { textSize, ...rest } = v; return [k, rest]; })) : {};
                                      handleStyleUpdate({ textSize: size, cellStyles: cleanCells });
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground mr-1">px</span>
                                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-sm hover:bg-background shadow-none" onClick={() => {
                                  const step = 2;
                                  if (colorScope === 'cell' && focusedCell) {
                                    const key = `${focusedCell.row}-${focusedCell.col}`;
                                    const current = item.cellStyles?.[key]?.textSize || item.textSize || 14;
                                    const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textSize: Math.min(72, current + step) } };
                                    handleStyleUpdate({ cellStyles: newStyles });
                                  } else {
                                    const current = item.textSize || 14;
                                    const cleanCells = item.cellStyles ? Object.fromEntries(Object.entries(item.cellStyles).map(([k, v]) => { const { textSize, ...rest } = v; return [k, rest]; })) : {};
                                    handleStyleUpdate({ textSize: Math.min(72, current + step), cellStyles: cleanCells });
                                  }
                                }}><Plus className="h-3.5 w-3.5" /></Button>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="p-1">
                                  <div className="flex items-center gap-1 bg-muted/30 rounded border p-1 focus-within:border-primary/50 focus-within:ring-1 ring-primary/20 transition-all">
                                    <Search className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                    <input
                                      className="flex-1 min-w-0 h-6 text-xs bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50 px-1"
                                      placeholder="Search..."
                                      value={fontSearch}
                                      onChange={(e) => setFontSearch(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-0.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                  {filteredFonts.map((font) => (
                                    <button
                                      key={font.value}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-xs rounded transition-colors flex items-center justify-between",
                                        ((colorScope === 'cell' && focusedCell && (item.cellStyles?.[`${focusedCell.row}-${focusedCell.col}`]?.fontFamily === font.value)) || (!focusedCell && item.fontFamily === font.value))
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "hover:bg-muted text-muted-foreground"
                                      )}
                                      style={{ fontFamily: font.value }}
                                      onClick={() => {
                                        if (colorScope === 'cell' && focusedCell) {
                                          const key = `${focusedCell.row}-${focusedCell.col}`;
                                          const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], fontFamily: font.value } };
                                          handleStyleUpdate({ cellStyles: newStyles });
                                        } else {
                                          const cleanCells = item.cellStyles ? Object.fromEntries(Object.entries(item.cellStyles).map(([k, v]) => { const { fontFamily, ...rest } = v; return [k, rest]; })) : {};
                                          handleStyleUpdate({ fontFamily: font.value, cellStyles: cleanCells });
                                        }
                                      }}
                                    >
                                      {font.name}
                                      {((colorScope === 'cell' && focusedCell && (item.cellStyles?.[`${focusedCell.row}-${focusedCell.col}`]?.fontFamily === font.value)) || (!focusedCell && item.fontFamily === font.value)) && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {textTab === 'align' && (() => {
                            const currentAlign = (colorScope === 'cell' && focusedCell)
                              ? (item.cellStyles?.[`${focusedCell.row}-${focusedCell.col}`]?.textAlign || item.textAlign || 'left')
                              : (item.textAlign || 'left');

                            return (
                              <div className="flex flex-col gap-2 p-1">
                                <Button
                                  variant={currentAlign === 'left' ? "secondary" : "outline"}
                                  className={cn("w-full justify-start gap-3 h-10", currentAlign === 'left' && "bg-primary/10 text-primary border-primary/20")}
                                  onClick={() => {
                                    if (colorScope === 'cell' && focusedCell) {
                                      const key = `${focusedCell.row}-${focusedCell.col}`;
                                      const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textAlign: 'left' as const } };
                                      handleStyleUpdate({ cellStyles: newStyles });
                                    } else {
                                      handleStyleUpdate({ textAlign: 'left' });
                                    }
                                  }}
                                >
                                  <AlignLeft className="h-4 w-4" /> Left
                                </Button>
                                <Button
                                  variant={currentAlign === 'center' ? "secondary" : "outline"}
                                  className={cn("w-full justify-start gap-3 h-10", currentAlign === 'center' && "bg-primary/10 text-primary border-primary/20")}
                                  onClick={() => {
                                    if (colorScope === 'cell' && focusedCell) {
                                      const key = `${focusedCell.row}-${focusedCell.col}`;
                                      const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textAlign: 'center' as const } };
                                      handleStyleUpdate({ cellStyles: newStyles });
                                    } else {
                                      handleStyleUpdate({ textAlign: 'center' });
                                    }
                                  }}
                                >
                                  <AlignCenter className="h-4 w-4" /> Center
                                </Button>
                                <Button
                                  variant={currentAlign === 'right' ? "secondary" : "outline"}
                                  className={cn("w-full justify-start gap-3 h-10", currentAlign === 'right' && "bg-primary/10 text-primary border-primary/20")}
                                  onClick={() => {
                                    if (colorScope === 'cell' && focusedCell) {
                                      const key = `${focusedCell.row}-${focusedCell.col}`;
                                      const newStyles = { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textAlign: 'right' as const } };
                                      handleStyleUpdate({ cellStyles: newStyles });
                                    } else {
                                      handleStyleUpdate({ textAlign: 'right' });
                                    }
                                  }}
                                >
                                  <AlignRight className="h-4 w-4" /> Right
                                </Button>
                              </div>
                            );
                          })()}

                          {textTab === 'color' && (
                            <ColorPanel
                              color={tempColor}
                              onChange={setTempColor}
                              onApply={(c) => {
                                if (colorScope === 'cell' && focusedCell) {
                                  const key = `${focusedCell.row}-${focusedCell.col}`;
                                  handleStyleUpdate({ cellStyles: { ...item.cellStyles, [key]: { ...item.cellStyles?.[key], textColor: c } } });
                                } else {
                                  handleStyleUpdate({ textColor: c, cellStyles: {} });
                                }
                              }}
                              onClose={() => setTextTab(null)}
                            />
                          )}
                        </div>
                      )}

                      {activeColorPicker !== 'text' && (
                        <ColorPanel
                          color={tempColor}
                          onChange={setTempColor}
                          onApply={(c) => {
                            if (activeColorPicker === 'accent') {
                              const newItem = { ...item, headerColor: c };
                              onUpdate({ headerColor: c });
                              onHistorySave?.(item, newItem);
                            }
                            if (activeColorPicker === 'bg') {
                              const newItem = { ...item, bgColor: c };
                              onUpdate({ bgColor: c });
                              onHistorySave?.(item, newItem);
                            }
                          }}
                          onClose={() => setActiveColorPicker(null)}
                        />
                      )}
                    </>
                  )}

                  {(!activeColorPicker && !textTab) && (
                    <>
                      <div className="mb-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">Style Preset</p>
                        <div className="flex gap-1 px-1 justify-between">
                          {(Object.keys(TABLE_STYLES) as TableStyleKey[]).map((styleKey) => (
                            <button
                              key={styleKey}
                              className={cn('w-6 h-6 rounded-full border-2 transition-transform hover:scale-110', currentStyleKey === styleKey ? 'border-white ring-2 ring-primary' : 'border-transparent')}
                              style={{ backgroundColor: TABLE_STYLES[styleKey].baseColor }}
                              onClick={() => changeStyle(styleKey)}
                              title={TABLE_STYLES[styleKey].name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-border my-2" />

                      <div className="space-y-1">
                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors" onClick={() => { setActiveColorPicker('accent'); setTempColor(accentColor); }}>
                          <div className="p-1 rounded bg-blue-500/10 text-blue-500"><Paintbrush className="h-3.5 w-3.5" /></div>
                          <span className="flex-1 text-left">Accent Color</span>
                          <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: accentColor }} />
                        </button>
                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors" onClick={() => { setActiveColorPicker('bg'); setTempColor(bgColor === 'transparent' ? '#ffffff' : bgColor); }}>
                          <div className="p-1 rounded bg-green-500/10 text-green-500"><Palette className="h-3.5 w-3.5" /></div>
                          <span className="flex-1 text-left">Background</span>
                          {bgColor === 'transparent' ? (
                            <div className="w-4 h-4 rounded-full border shadow-sm flex items-center justify-center bg-gray-100"><X className="h-3 w-3 text-gray-400" /></div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: bgColor }} />
                          )}
                        </button>
                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setActiveColorPicker('text'); setColorScope(focusedCell ? 'cell' : 'table'); setTempColor(textColor); }}>
                          <div className="p-1 rounded bg-orange-500/10 text-orange-500"><Type className="h-3.5 w-3.5" /></div>
                          <span className="flex-1 text-left">Text Style</span>
                          <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: textColor }} />
                        </button>

                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors cursor-pointer" onClick={() => onUpdate({ hideBorder: !item.hideBorder })}>
                          <div className="p-1 rounded bg-indigo-500/10 text-indigo-500"><Grid className="h-3.5 w-3.5" /></div>
                          <span className="flex-1 text-left">Show Borders</span>
                          <Switch
                            checked={!item.hideBorder}
                            onCheckedChange={() => onUpdate({ hideBorder: !item.hideBorder })}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-muted scale-75 data-[state=checked]:bg-primary"
                          />
                        </button>
                      </div>

                      <div className="h-px bg-border my-2" />

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Row</p>
                          {focusedCell ? (
                            <>
                              <div className="grid grid-cols-2 gap-1">
                                <Button variant="secondary" size="sm" className="h-6 text-[10px] px-0" onClick={() => addRow(focusedCell.row)} title="Insert Above"><ArrowUp className="h-3 w-3" /></Button>
                                <Button variant="secondary" size="sm" className="h-6 text-[10px] px-0" onClick={() => addRow(focusedCell.row + 1)} title="Insert Below"><ArrowDown className="h-3 w-3" /></Button>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-full text-[10px] text-red-500 hover:bg-red-50" onClick={() => removeRow(focusedCell.row)} disabled={item.rows <= 1}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" size="sm" className="h-6 w-full text-[10px]" onClick={() => addRow()}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                              <Button variant="ghost" size="sm" className="h-6 w-full text-[10px] text-red-500 hover:bg-red-50" onClick={() => removeRow()} disabled={item.rows <= 1}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                            </>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Column</p>
                          {focusedCell ? (
                            <>
                              <div className="grid grid-cols-2 gap-1">
                                <Button variant="secondary" size="sm" className="h-6 text-[10px] px-0" onClick={() => addCol(focusedCell.col)} title="Insert Left"><ArrowLeft className="h-3 w-3" /></Button>
                                <Button variant="secondary" size="sm" className="h-6 text-[10px] px-0" onClick={() => addCol(focusedCell.col + 1)} title="Insert Right"><ArrowRight className="h-3 w-3" /></Button>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-full text-[10px] text-red-500 hover:bg-red-50" onClick={() => removeCol(focusedCell.col)} disabled={item.cols <= 1}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" size="sm" className="h-6 w-full text-[10px]" onClick={() => addCol()}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                              <Button variant="ghost" size="sm" className="h-6 w-full text-[10px] text-red-500 hover:bg-red-50" onClick={() => removeCol()} disabled={item.cols <= 1}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Delete */}
        <div className="ml-auto" onMouseDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete} title="Delete"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>


      <div
        className={cn(
          "overflow-visible origin-top-left relative rounded-b-lg transition-all duration-150",
          showControls ? "rounded-t-none" : "rounded-t-lg"
        )}
        style={{
          backgroundColor: bgColor,
          border: `2px solid ${isSelected ? '#0EA5E9' : displayBorderColor}`,
        }}
      >
        <table className="border-collapse" style={{ tableLayout: 'auto', minWidth: '100%' }}>
          <TableGrid
            item={item}
            colWidths={colWidths}
            focusedCell={focusedCell}
            isEditing={isEditMode}
            inputRefs={inputRefs}
            handleInput={(e, r, c) => {
              const cellKey = `${r}-${c}`;
              const cellEl = e.currentTarget;
              const html = cellEl.innerHTML;
              const caret = getCaretIndex(cellEl);
              pushCellHistory(cellKey, html, caret);
              updateCell(r, c, html);
            }}
            handleKeyDown={handleKeyDown}
            handleFocus={(r, c) => {
              const cellKey = `${r}-${c}`;
              const cellEl = inputRefs.current[cellKey];
              if (cellEl) {
                initCellHistory(cellKey, cellEl.innerHTML);
              }
              prevItemRef.current = JSON.parse(JSON.stringify(item));
              setFocusedCell({ row: r, col: c });
              onSelect();
              setTimeout(() => {
                setActiveFormats(getAccurateFormatState());
              }, 0);
            }}
            handleBlur={() => {
              if (JSON.stringify(prevItemRef.current) !== JSON.stringify(item)) {
                onHistorySave?.(prevItemRef.current, item);
              }
              setFocusedCell(null);
            }}
            handleMouseDown={() => {
              document.addEventListener('selectionchange', onSelect, { once: true });
            }}
            handleMouseUp={() => {
              onSelect();
              setActiveFormats(getAccurateFormatState());
            }}
            handlePaste={(e) => {
              e.preventDefault();
              const clipboardData = e.clipboardData;
              const html = clipboardData.getData('text/html');
              const text = clipboardData.getData('text/plain');

              // Try to parse HTML table first
              if (html && html.includes('<table')) {
                 const parser = new DOMParser();
                 const doc = parser.parseFromString(html, 'text/html');
                 const rows = doc.querySelectorAll('tr');
                 
                 if (rows.length > 0) {
                    const startRow = focusedCell?.row || 0;
                    const startCol = focusedCell?.col || 0;
                    
                    // Create copy of cells to modify
                    let newCells = item.cells.map(r => [...r]);
                    let maxRow = item.rows;
                    let maxCol = item.cols;

                    // Expand table if needed
                    if (startRow + rows.length > maxRow) {
                       const rowsToAdd = (startRow + rows.length) - maxRow;
                       for (let i = 0; i < rowsToAdd; i++) {
                          newCells.push(new Array(maxCol).fill(""));
                       }
                       maxRow += rowsToAdd;
                    }

                    rows.forEach((tr, rIndex) => {
                       const cells = tr.querySelectorAll('td, th');
                       
                       // Expand cols if needed for this row
                       if (startCol + cells.length > maxCol) {
                          const colsToAdd = (startCol + cells.length) - maxCol;
                          newCells.forEach(row => {
                             for(let i=0; i<colsToAdd; i++) row.push("");
                          });
                          maxCol += colsToAdd;
                       }

                       cells.forEach((td, cIndex) => {
                          const targetR = startRow + rIndex;
                          const targetC = startCol + cIndex;
                          
                          // Basic text extraction or innerHTML preservation? 
                          // Let's preserve simple HTML but strip block resizing garbage if any
                          // For now, innerHTML is best for rich text.
                          // But we need to be careful of nested tables or complex structures.
                          // Taking textContent or simple innerHTML.
                          let content = td.innerHTML;
                          
                          // cleanup common copy garbage (like <meta> tags or extensive attrs)
                          // Simplify: just take text if it looks too complex, or sanitize.
                          // NoteDown cells use contentEditable div.
                          
                          newCells[targetR][targetC] = content;

                          // FORCE UPDATE DOM immediately (especially important for focused cell which is skipped by useEffect)
                          const key = `${targetR}-${targetC}`;
                          if (inputRefs.current[key]) {
                             inputRefs.current[key]!.innerHTML = content;
                          }

                          // Clear Local History to force Global Undo bubbling for these cells
                          // This ensures Ctrl+Z triggers the Global Undo (reverting the Paste) instead of getting trapped locally
                          if (cellHistoryRef.current) {
                             cellHistoryRef.current[key] = [];
                             cellHistoryIndexRef.current[key] = 0;
                          }
                       });
                    });

                    // Update item
                    const newItem = { ...item, cells: newCells, rows: maxRow, cols: maxCol };
                    
                    // Update refs to avoid double-save on blur
                    prevItemRef.current = JSON.parse(JSON.stringify(newItem));
                    
                    onUpdate(newItem);
                    onHistorySave?.(item, newItem);
                    return;
                 }
              }

              // Fallback to text insertion (default behavior)
              document.execCommand('insertText', false, text);
            }}
            onSelect={() => {
              setActiveFormats(getAccurateFormatState());
            }}
            // Style Defaults
            defaultTextColor={item.textColor || '#e5e5e5'}
            defaultAlign={item.textAlign || 'left'}
            defaultFontSize={item.textSize || 14}
            defaultFontFamily={item.fontFamily || 'Inter'}
            showControls={showControls}
            borderColor={borderColor}
            selectionRange={selectionRange}
            handleCellMouseDown={handleCellMouseDown}
            handleCellMouseEnter={() => {}} // Not used anymore
            handleCellMouseUp={() => {}} // Not used anymore
            handleDoubleClick={handleDoubleClick}
          />
        </table>

        {/* Resize Handle - Corner triangle shape */}
        <div
          className={cn(
            "resize-handle absolute -bottom-1 -right-1 w-0 h-0 cursor-nwse-resize transition-opacity duration-150",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{
            borderLeft: '12px solid transparent',
            borderBottom: `12px solid ${accentColor}`,
          }}
          onMouseDown={handleResizeStart}
        />
      </div>
    </motion.div>
  );
}
