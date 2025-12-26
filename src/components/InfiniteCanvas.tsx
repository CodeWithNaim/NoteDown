/* Existing imports */
import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useNotesStore,
  CanvasItem,
  CanvasTextBox as TextBoxType,
  CanvasMediaItem as MediaItemType,
  CanvasStickyNote as StickyNoteType,
  CanvasTable as TableType,
  CanvasTodoList as TodoListType,
} from '@/store/useNotesStore';
import { CanvasTextBox } from './canvas/CanvasTextBox';
import { CanvasMediaItem } from './canvas/CanvasMediaItem';
import { CanvasStickyNote } from './canvas/CanvasStickyNote';
import { CanvasTable } from './canvas/CanvasTable';
import { CanvasTodoList } from './canvas/CanvasTodoList';
import { CanvasImage } from './canvas/CanvasImage';
import { CanvasToolbar, ToolType } from './canvas/CanvasToolbar';
import { DrawingOverlay, DrawingOverlayRef } from './canvas/DrawingOverlay';
import { cn } from '@/lib/utils';

const generateId = () => Math.random().toString(36).substring(2, 15);

export function InfiniteCanvas() {
  const {
    getActivePage,
    addCanvasItem,
    updateCanvasItem,
    deleteCanvasItem,
    addTagToItem,
    removeTagFromItem,
  } = useNotesStore();

  const activePage = getActivePage();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [eraserMode, setEraserMode] = useState<'object' | 'pixel'>('object');
  const [eraserSize, setEraserSize] = useState(10);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [drawingColor, setDrawingColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Pan and Zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Refs for gesture control
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<DrawingOverlayRef>(null);

  // Track pointers for touch interactions & keys
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const isSpacePressedRef = useRef(false);
  // State for cursor visual feedback
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Action-Based Undo/Redo History
  type HistoryAction =
    | { type: 'ADD' | 'DELETE'; item: CanvasItem }
    | { type: 'UPDATE'; prevItem: CanvasItem; newItem: CanvasItem };

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // Helper to push action to undo stack (called after ADD or DELETE)
  const pushToUndoStack = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const last = prev[prev.length - 1];
      // Coalesce ADD + UPDATE (e.g. Create Box -> Type immediately)
      if (action.type === 'UPDATE' && last && last.type === 'ADD' && last.item.id === action.newItem.id) {
        console.log('[Undo] Coalescing ADD+UPDATE for atomic creation');
        return [...prev.slice(0, -1), { type: 'ADD', item: action.newItem }];
      }
      return [...prev, action];
    });
    setRedoStack([]); // Clear redo on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (!activePage || undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    if (lastAction.type === 'ADD') {
      // Undo ADD: delete the item, push ADD to redo (so redo can re-add it)
      deleteCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, lastAction.item.id);
      setRedoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Undid add');
    } else if (lastAction.type === 'DELETE') {
      // Undo DELETE: add the item back, push DELETE to redo (so redo can re-delete it)
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, lastAction.item);
      setRedoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Restored item');
    } else if (lastAction.type === 'UPDATE') {
      // Undo UPDATE: restore prevItem
      const currentActivePage = useNotesStore.getState().getActivePage();
      if (!currentActivePage) return;

      const prevItem = lastAction.prevItem;
      updateCanvasItem(
        currentActivePage.notebook.id,
        currentActivePage.section.id,
        currentActivePage.page.id,
        prevItem.id,
        prevItem
      );

      setRedoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Undid update');
    }
  }, [activePage, undoStack, deleteCanvasItem, addCanvasItem, updateCanvasItem]);

  const handleRedo = useCallback(() => {
    if (!activePage || redoStack.length === 0) return;

    const lastAction = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    if (lastAction.type === 'ADD') {
      // Redo ADD: add the item back
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, lastAction.item);
      setUndoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Redid add');
    } else if (lastAction.type === 'DELETE') {
      // Redo DELETE: delete the item again
      deleteCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, lastAction.item.id);
      setUndoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Redid delete');
    } else if (lastAction.type === 'UPDATE') {
      // Redo UPDATE: restore newItem - use getState() for fresh activePage
      const currentActivePage = useNotesStore.getState().getActivePage();
      if (!currentActivePage) return;

      console.log('[DEBUG] REDO ACTION:', lastAction.newItem); // VERIFY CONTENT HERE

      updateCanvasItem(currentActivePage.notebook.id, currentActivePage.section.id, currentActivePage.page.id, lastAction.newItem.id, lastAction.newItem);
      setUndoStack(prev => [...prev, lastAction]);
      toast.dismiss();
      toast.info('Redid update');
    }
  }, [activePage, redoStack, addCanvasItem, deleteCanvasItem, updateCanvasItem]);

  // NEW: Helper to save history for updates
  const handleHistorySave = useCallback((prevItem: CanvasItem, newItem: CanvasItem) => {
    pushToUndoStack({ type: 'UPDATE', prevItem, newItem });
  }, [pushToUndoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Space key specifically for panning
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }

      // Don't trigger shortcuts when typing in inputs, textareas or contentEditable elements
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('[contenteditable]');

      if (isEditing) return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'd' || e.key === 'D') setActiveTool('draw');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 's' || e.key === 'S') setActiveTool('sticky');
      if (e.key === 'e' || e.key === 'E') setActiveTool('eraser');
      if (e.key === 'b' || e.key === 'B') setActiveTool('table');
      if (e.key === 'l' || e.key === 'L') setActiveTool('todo');
      // Pan tool shortcut (Hold Space)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); // Prevent page scroll
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }

      // Undo/Redo checks - isEditing already checked above, just need to check for undo/redo shortcuts

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        if (isEditing) return;
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))) {
        if (isEditing) return;
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete item if user is editing text (isEditing already checked above)
        if (isEditing) {
          return; // Let text editing happen normally
        }
        if (selectedItemId && activePage) {
          // Find the item to push to undo stack
          const itemToDelete = activePage.page.canvasItems.find(item => item.id === selectedItemId);
          if (itemToDelete) {
            pushToUndoStack({ type: 'DELETE', item: itemToDelete });
          }
          deleteCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, selectedItemId);
          setSelectedItemId(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
      activePointersRef.current.clear();
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedItemId, activePage, deleteCanvasItem, handleUndo, handleRedo]);

  // Update undo/redo state
  useEffect(() => {
    // Check local stacks for undo/redo availability
    setCanUndo(undoStack.length > 0);
    setCanRedo(redoStack.length > 0);
  }, [undoStack, redoStack]);

  // Prevent context menu when panning
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
    }
  }, [isPanning]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      canvasElement.addEventListener('contextmenu', handleContextMenu);
      return () => {
        canvasElement.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [handleContextMenu]);

  // Screen to Canvas coordinate conversion
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - offset.x) / scale;
    const y = (screenY - rect.top - offset.y) / scale;
    return { x, y };
  }, [offset, scale]);

  // We still need the actual logic. 
  // We can separate the "prevention" from the "logic" if valid, or combine them.
  // Ideally combine. We need access to 'scale' and 'offset'.

  // Let's use a ref to hold current scale/offset so the effect doesn't need to re-bind constantly
  const stateRef = useRef({ scale, offset });
  useEffect(() => {
    stateRef.current = { scale, offset };
  }, [scale, offset]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent browser zoom
      if (e.ctrlKey) {
        e.preventDefault();

        const { scale, offset } = stateRef.current;
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, scale + delta), 5);

        const rect = canvasEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
        const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else {
        // Pan
        if (!e.ctrlKey && !e.metaKey) {
          // Native pan might also trigger browser history nav on Mac, so maybe preventDefault here too?
          // Usually standard vertical scroll is fine, but horizontal might go back.
          // Let's prevent default for safety if it's strictly a canvas app.
          e.preventDefault();

          setOffset(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
          }));
        }
      }
    };

    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', onWheel);
  }, []); // Empty dependency array = bound once! Refs provide fresh state.


  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Pan Conditions:
    // 1. Middle Mouse Button (button 1)
    // 2. Space Key + LEFT Click (button 0) -- CHANGED FROM RIGHT CLICK
    // 3. Touch (2+ fingers)

    if (e.button === 1 || (isSpacePressedRef.current && e.button === 0) || activePointersRef.current.size >= 2) {
      setIsPanning(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle Pinch Zoom / Pan for Touch
    if (pointers.size === 2) {
      const points = Array.from(pointers.values());
      const p1 = points[0];
      const p2 = points[1];

      // Calculate distance
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      // Calculate center
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;

      if (lastPinchDistRef.current !== null) {
        const deltaDate = dist - lastPinchDistRef.current;
        const zoomSensitivity = 0.005;
        const newScale = Math.min(Math.max(0.1, scale + deltaDate * zoomSensitivity), 5);

        // Zoom towards center
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const relCenterX = centerX - rect.left;
          const relCenterY = centerY - rect.top;

          const newOffsetX = relCenterX - (relCenterX - offset.x) * (newScale / scale);
          const newOffsetY = relCenterY - (relCenterY - offset.y) * (newScale / scale);

          setScale(newScale);
          setOffset({ x: newOffsetX, y: newOffsetY });
        }
      }

      lastPinchDistRef.current = dist;

      // Also Pan with the center point movement?
      // Basic implementation often separates them or handles them together carefully.
      // For simplicity, pinch zoom handles zoom, and we rely on the offset update in zoom logic to keep center.
      // To strictly pan we might need to track center movement delta.

      // Let's refine panning with 2 fingers:
      // If distance change is small but center moved?
      // For now, let's just stick to Pan logic if not pinching much?

      return;
    }

    // Reset pinch ref if not 2 pointers
    if (pointers.size !== 2) {
      lastPinchDistRef.current = null;
    }

    // ... inside handlePointerMove ...


    // Single pointer panning (Mouse Middle Button or Space+Left Click)
    if (isPanning && pointers.size === 1) {
      if (lastMousePosRef.current) {
        const deltaX = e.clientX - lastMousePosRef.current.x;
        const deltaY = e.clientY - lastMousePosRef.current.y;
        setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    }




  }, [isPanning, scale, offset, activeTool, activePage, deleteCanvasItem, screenToCanvas, pushToUndoStack]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (activePointersRef.current.size < 2) {
      lastPinchDistRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      setIsPanning(false);
      lastMousePosRef.current = null;
    }
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isPanning || isSpacePressedRef.current) return; // Don't trigger click if we just panned or space is pressed
    if (activeTool === 'draw') return;
    if ((e.target as HTMLElement).closest('.canvas-item')) return;
    if (!activePage) return;

    // Use screenToCanvas for coordinate conversion
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === 'text') {
      const newTextBox: TextBoxType = {
        id: generateId(),
        type: 'text',
        x, y,
        width: 200,
        height: 40,
        content: '',
        tags: [],
      };
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newTextBox);
      pushToUndoStack({ type: 'ADD', item: newTextBox });
      setSelectedItemId(newTextBox.id);
      setActiveTool('select');
    } else if (activeTool === 'sticky') {
      const newSticky: StickyNoteType = {
        id: generateId(),
        type: 'sticky',
        x, y,
        width: 200,
        height: 200,
        content: '',
        color: 'yellow',
      };
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newSticky);
      pushToUndoStack({ type: 'ADD', item: newSticky });
      setSelectedItemId(newSticky.id);
      setActiveTool('select');
    } else if (activeTool === 'table') {
      const newTable: TableType = {
        id: generateId(),
        type: 'table',
        x, y,
        width: 400,
        height: 200,
        rows: 3,
        cols: 3,
        cells: [
          ['Column 1', 'Column 2', 'Column 3'],
          ['', '', ''],
          ['', '', ''],
        ],
      };
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newTable);
      pushToUndoStack({ type: 'ADD', item: newTable });
      setSelectedItemId(newTable.id);
      setActiveTool('select');
    } else if (activeTool === 'todo') {
      const newTodo: TodoListType = {
        id: generateId(),
        type: 'todo',
        x, y,
        width: 280,
        height: 250,
        title: 'To-Do List',
        items: [],
      };
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newTodo);
      pushToUndoStack({ type: 'ADD', item: newTodo });
      setSelectedItemId(newTodo.id);
      setActiveTool('select');
    } else if (activeTool === 'select') {
      setSelectedItemId(null);
    }
  }, [activePage, addCanvasItem, activeTool, isPanning, screenToCanvas, pushToUndoStack]);

  const handleSaveDrawing = useCallback((pathData: string, color: string, strokeWidth: number, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!activePage) return;

    // Bounds from drawing overlay need to be adjusted if the overlay itself wasn't transformed
    // But typically drawing overlay assumes 1:1 with screen. 
    // We need to convert the bounds to canvas coordinates.
    // However, SVG paths are vector. We might need to transform the path coordinates or the container.
    // Simpler: The DrawingOverlay should transparently work ON TOP of the canvas view?
    // OR: We transform the canvas, so drawing overlay must effectively inverse transform or just be in the canvas world.

    // Best approach: Put drawing overlay INSIDE the transformed container?
    // Then the coords it returns `bounds` are local to that div... which are canvas coords!
    // So this should just work ideally.

    // If Eraser Mode
    if (activeTool === 'eraser') {
      if (eraserMode === 'pixel') {
        // Apply as Mask to intersecting drawings
        // Use getState() to get the CURRENT canvas items, not potentially stale closure state
        const currentActivePage = useNotesStore.getState().getActivePage();
        if (currentActivePage) {
          currentActivePage.page.canvasItems.forEach(item => {
            if (item.type !== 'drawing') return;

            // Simple bounding box intersection first
            if (
              bounds.x < item.x + item.width &&
              bounds.x + bounds.width > item.x &&
              bounds.y < item.y + item.height &&
              bounds.y + bounds.height > item.y
            ) {
              // Intersects! Add mask path.
              // Note: Mask path needs to be relative to the item? 
              // No, SVG masks are usually in userSpaceOnUse (Canvas Coords).
              // The 'pathData' is in Canvas Coords.
              // So we just add it.
              const newMaskEntry = { path: pathData, strokeWidth: eraserSize * 2 };
              const newMasks = [...(item.maskPaths || []), newMaskEntry];
              // Deep copy to prevent reference issues in undo stack
              const prevItemCopy = JSON.parse(JSON.stringify(item));
              const newItem = { ...item, maskPaths: newMasks };
              const newItemCopy = JSON.parse(JSON.stringify(newItem));
              updateCanvasItem(currentActivePage.notebook.id, currentActivePage.section.id, currentActivePage.page.id, item.id, { maskPaths: newMasks });
              pushToUndoStack({ type: 'UPDATE', prevItem: prevItemCopy, newItem: newItemCopy });
            }
          });
        }
      }
      return;
    }

    const newDrawing = {
      id: generateId(),
      type: 'drawing' as const,
      paths: pathData,
      color,
      strokeWidth,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };

    addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newDrawing);
    pushToUndoStack({ type: 'ADD', item: newDrawing });
  }, [activePage, addCanvasItem, pushToUndoStack, activeTool, eraserMode, eraserSize, updateCanvasItem]);

  const handleStartRecording = useCallback(async (type: 'audio' | 'video') => {
    if (!activePage) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: type === 'video' ? 'video/webm' : 'audio/webm',
        });

        try {
          const { fileToBase64 } = await import('@/utils/fileUtils');
          const url = await fileToBase64(blob);

          // Random placement within current view
          const { x, y } = screenToCanvas(
            canvasRef.current!.getBoundingClientRect().left + window.innerWidth / 2,
            canvasRef.current!.getBoundingClientRect().top + window.innerHeight / 2
          );

          const newMediaItem: MediaItemType = {
            id: generateId(),
            type,
            x,
            y,
            width: type === 'video' ? 400 : 250,
            height: type === 'video' ? 300 : 150,
            url,
            fileName: `recording-${Date.now()}.webm`,
            mimeType: type === 'video' ? 'video/webm' : 'audio/webm',
          };

          addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newMediaItem);
          pushToUndoStack({ type: 'ADD', item: newMediaItem });
          toast.success(`${type === 'video' ? 'Video' : 'Audio'} recording saved`);
        } catch (error) {
          console.error('Failed to process recording:', error);
          toast.error('Failed to save recording');
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started...');
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Could not access microphone/camera');
    }
  }, [activePage, addCanvasItem, screenToCanvas, pushToUndoStack]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleFileUpload = useCallback(async (file: File, type: 'file' | 'image') => {
    if (!activePage) return;

    try {
      const { fileToBase64 } = await import('@/utils/fileUtils');
      const url = await fileToBase64(file);

      // Center in current view
      const { x, y } = screenToCanvas(
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      if (type === 'image') {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 400;
          const aspectRatio = img.width / img.height;
          const width = Math.min(img.width, maxWidth);
          const height = width / aspectRatio;

          const newImageItem: MediaItemType = {
            id: generateId(),
            type: 'image',
            x,
            y,
            width,
            height,
            url,
            fileName: file.name,
            mimeType: file.type,
          };

          addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newImageItem);
          pushToUndoStack({ type: 'ADD', item: newImageItem });
          toast.success(`Image "${file.name}" added`);
        };
        img.src = url;
      } else {
        const newFileItem: MediaItemType = {
          id: generateId(),
          type: 'file',
          x,
          y,
          width: 200,
          height: 150,
          url,
          fileName: file.name,
          mimeType: file.type,
        };

        addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newFileItem);
        pushToUndoStack({ type: 'ADD', item: newFileItem });
        toast.success(`File "${file.name}" added`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    }
  }, [activePage, addCanvasItem, screenToCanvas, pushToUndoStack]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        handleFileUpload(file, 'image');
      } else {
        handleFileUpload(file, 'file');
      }
    });
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (!activePage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">No page selected</h2>
            <p className="text-muted-foreground">
              Select a page from the sidebar or create a new one
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleEraserMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (eraserMode === 'pixel') return; // Pixel mode handled on save (stroke completion)

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const { x: canvasX, y: canvasY } = screenToCanvas(clientX, clientY);
    const eraserRadius = eraserSize; // Use adjustable eraser size

    if (activePage) {
      activePage.page.canvasItems.forEach(item => {
        if (item.type !== 'drawing') return;

        // Check if eraser point is close to any line segment in the path
        let isNearPath = false;

        const isPointNearSvgPath = (pathData: string, px: number, py: number, threshold: number) => {
          // Robust parsing: extract all coordinate pairs regardless of SVG command (M, L, Q, C, etc.)
          const nums = pathData.match(/[-+]?\d*\.?\d+/g);
          if (!nums || nums.length < 2) return false;

          const points: { x: number; y: number }[] = [];
          for (let i = 0; i < nums.length; i += 2) {
            if (nums[i + 1] !== undefined) {
              points.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
            }
          }

          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dist = distanceToLineSegment(px, py, p1.x, p1.y, p2.x, p2.y);
            if (dist <= threshold) return true;
          }
          return false;
        };

        if (isPointNearSvgPath(item.paths, canvasX, canvasY, eraserRadius + (item.strokeWidth || 3) / 2)) {
          // It hit the object! BUT is this area masked (erased)?
          let isMasked = false;
          if (item.maskPaths && item.maskPaths.length > 0) {
            for (const mask of item.maskPaths) {
              // Check if we are hitting the mask "stroke"
              // Add safety buffer (+5px) to detect "void" more aggressively
              const maskThreshold = (mask.strokeWidth || 10) / 2 + 5;
              if (isPointNearSvgPath(mask.path, canvasX, canvasY, maskThreshold)) {
                isMasked = true;
                break;
              }
            }
          }

          if (!isMasked) {
            pushToUndoStack({ type: 'DELETE', item });
            deleteCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, item.id);
            toast.dismiss();
          }
        }
      });
    }
  }, [activePage, deleteCanvasItem, pushToUndoStack, screenToCanvas, eraserMode]);

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Line segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Parameter t represents position on line segment (0 = start, 1 = end)
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    // Find closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-background"
    >
      {/* Page Title Header */}
      <div className="absolute top-4 left-4 z-30">
        <input
          type="text"
          value={activePage.page.title}
          onChange={(e) => {
            const { updatePage } = useNotesStore.getState();
            updatePage(activePage.notebook.id, activePage.section.id, activePage.page.id, {
              title: e.target.value,
            });
          }}
          className="text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{activePage.notebook.title}</span>
          <span>/</span>
          <span>{activePage.section.title}</span>
        </div>
      </div>

      {/* Drawing Overlay (Now in Screen Space) */}
      <AnimatePresence>
        {(activeTool === 'draw' || activeTool === 'eraser') && !isSpacePressed && (
          <DrawingOverlay
            ref={drawingRef}
            isActive={(activeTool === 'draw' || activeTool === 'eraser') && !isSpacePressed}
            color={activeTool === 'eraser' ? 'rgba(239, 68, 68, 0.5)' : drawingColor}
            strokeWidth={activeTool === 'eraser' ? eraserSize * 2 : strokeWidth}
            scale={scale}
            offset={offset}
            cursor={activeTool === 'draw'
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(drawingColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, crosshair`
              : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 2 22, crosshair`
            }
            onSavePath={(path, color, width, bounds) => {
              handleSaveDrawing(path, color, width, bounds);
            }}
            onErase={activeTool === 'eraser' && eraserMode === 'object' ? handleEraserMove : undefined}
          />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        drawingColor={drawingColor}
        strokeWidth={strokeWidth}
        isRecording={isRecording}
        canUndo={canUndo}
        canRedo={canRedo}
        eraserMode={eraserMode}
        eraserSize={eraserSize}
        onToolChange={setActiveTool}
        onColorChange={setDrawingColor}
        onStrokeWidthChange={setStrokeWidth}
        onEraserModeChange={setEraserMode}
        onEraserSizeChange={setEraserSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearDrawing={() => drawingRef.current?.clear()}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onFileUpload={handleFileUpload}
      />

      {/* Canvas Area Container - Handles Events */}
      {(() => {
        // Custom cursor SVGs
        const pencilCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, crosshair`;
        const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 2 22, crosshair`;

        const getCursor = () => {
          if (isPanning) return 'grabbing';
          if (isSpacePressed) return 'grab';
          if (activeTool === 'draw') return pencilCursor;
          if (activeTool === 'eraser') return eraserCursor;
          if (activeTool === 'text') return 'text';
          if (activeTool === 'select') return 'default';
          return 'crosshair';
        };

        return (
          <div
            className="absolute inset-0 w-full h-full touch-none"
            style={{
              cursor: getCursor(),
              backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
              backgroundSize: `${24 * scale}px ${24 * scale}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onContextMenu={(e) => {
              if (isPanning || isSpacePressedRef.current) {
                e.preventDefault();
              }
            }}
          >
            {/* Transformed Content */}
            <div
              style={{
                pointerEvents: activeTool === 'eraser' ? 'none' : 'auto',
                transform: `matrix(${scale}, 0, 0, ${scale}, ${offset.x}, ${offset.y})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                // Keep background pattern size constant or scale it? 
                // Scaling it gives depth perception. 
                // But typically infinite canvas dots stay constant size or scale. 
                // Let's scale it for now as part of the transform.
              }}
            >
              {/* Canvas Items */}
              <AnimatePresence>
                {(activePage.page.canvasItems || []).map((item) => {
                  if (item.type === 'text') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasTextBox
                          item={item as TextBoxType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                          onAddTag={(tag) =>
                            addTagToItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              tag
                            )
                          }
                          onRemoveTag={(tag) =>
                            removeTagFromItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              tag
                            )
                          }
                          onHistorySave={handleHistorySave}
                        />
                      </div>
                    );
                  }

                  if (item.type === 'sticky') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasStickyNote
                          item={item as StickyNoteType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                          onHistorySave={handleHistorySave}
                        />
                      </div>
                    );
                  }

                  if (item.type === 'table') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasTable
                          item={item as TableType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                        />
                      </div>
                    );
                  }

                  if (item.type === 'todo') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasTodoList
                          item={item as TodoListType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                        />
                      </div>
                    );
                  }

                  if (item.type === 'image') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasImage
                          item={item as MediaItemType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                        />
                      </div>
                    );
                  }

                  if (item.type === 'audio' || item.type === 'video' || item.type === 'file') {
                    return (
                      <div key={item.id} className="canvas-item">
                        <CanvasMediaItem
                          item={item as MediaItemType}
                          isSelected={selectedItemId === item.id}
                          scale={scale}
                          onSelect={() => setSelectedItemId(item.id)}
                          onUpdate={(updates) =>
                            updateCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id,
                              updates
                            )
                          }
                          onDelete={() => {
                            pushToUndoStack({ type: 'DELETE', item });
                            deleteCanvasItem(
                              activePage.notebook.id,
                              activePage.section.id,
                              activePage.page.id,
                              item.id
                            );
                          }}
                        />
                      </div>
                    );
                  }

                  // Render drawing as SVG
                  if (item.type === 'drawing') {
                    return (
                      <svg
                        key={item.id}
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: 0,
                          overflow: 'visible'
                        }}
                      >
                        {item.maskPaths && item.maskPaths.length > 0 && (
                          <defs>
                            <mask id={`mask-${item.id}`} maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000">
                              <rect x={-100000} y={-100000} width={200000} height={200000} fill="white" />
                              {item.maskPaths.map((mp, i) => (
                                <path
                                  key={i}
                                  d={mp.path}
                                  stroke="black"
                                  strokeWidth={mp.strokeWidth}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ))}
                            </mask>
                          </defs>
                        )}
                        <path
                          d={item.paths}
                          stroke={item.color || 'hsl(217 91% 60%)'}
                          strokeWidth={item.strokeWidth || 3}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          mask={item.maskPaths?.length ? `url(#mask-${item.id})` : undefined}
                        />
                      </svg>
                    );
                  }

                  return null;
                })}
              </AnimatePresence>
            </div>


          </div>
        );
      })()}
    </div>
  );
}

