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
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [drawingColor, setDrawingColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<DrawingOverlayRef>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'd' || e.key === 'D') setActiveTool('draw');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 's' || e.key === 'S') setActiveTool('sticky');

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        drawingRef.current?.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        drawingRef.current?.redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId && activePage) {
          deleteCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, selectedItemId);
          setSelectedItemId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, activePage, deleteCanvasItem]);

  // Update undo/redo state
  useEffect(() => {
    const interval = setInterval(() => {
      if (drawingRef.current) {
        setCanUndo(drawingRef.current.canUndo);
        setCanRedo(drawingRef.current.canRedo);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'draw') return;
    if ((e.target as HTMLElement).closest('.canvas-item')) return;
    if (!activePage) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);

    if (activeTool === 'text') {
      const newTextBox: TextBoxType = {
        id: generateId(),
        type: 'text',
        x, y,
        width: 300,
        height: 150,
        content: '',
        tags: [],
      };
      addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newTextBox);
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
      setSelectedItemId(newTodo.id);
      setActiveTool('select');
    } else if (activeTool === 'select') {
      setSelectedItemId(null);
    }
  }, [activePage, addCanvasItem, activeTool]);

  const handleSaveDrawing = useCallback((pathData: string, color: string, strokeWidth: number, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!activePage) return;

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
  }, [activePage, addCanvasItem]);

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

          const newMediaItem: MediaItemType = {
            id: generateId(),
            type,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: type === 'video' ? 400 : 250,
            height: type === 'video' ? 300 : 150,
            url,
            fileName: `recording-${Date.now()}.webm`,
            mimeType: type === 'video' ? 'video/webm' : 'audio/webm',
          };

          addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newMediaItem);
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
  }, [activePage, addCanvasItem]);

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
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width,
            height,
            url,
            fileName: file.name,
            mimeType: file.type,
          };

          addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newImageItem);
          toast.success(`Image "${file.name}" added`);
        };
        img.src = url;
      } else {
        const newFileItem: MediaItemType = {
          id: generateId(),
          type: 'file',
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
          width: 200,
          height: 150,
          url,
          fileName: file.name,
          mimeType: file.type,
        };

        addCanvasItem(activePage.notebook.id, activePage.section.id, activePage.page.id, newFileItem);
        toast.success(`File "${file.name}" added`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    }
  }, [activePage, addCanvasItem]);

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

  return (
    <div className="relative w-full h-full">
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

      {/* Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        drawingColor={drawingColor}
        strokeWidth={strokeWidth}
        isRecording={isRecording}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setActiveTool}
        onColorChange={setDrawingColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={() => drawingRef.current?.undo()}
        onRedo={() => drawingRef.current?.redo()}
        onClearDrawing={() => drawingRef.current?.clear()}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onFileUpload={handleFileUpload}
      />

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-auto bg-background"
        style={{
          cursor: activeTool === 'draw' ? 'crosshair' : activeTool === 'select' ? 'default' : 'crosshair',
          backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Drawing Overlay */}
        <AnimatePresence>
          {activeTool === 'draw' && (
            <DrawingOverlay
              ref={drawingRef}
              isActive={activeTool === 'draw'}
              color={drawingColor}
              strokeWidth={strokeWidth}
              onSavePath={handleSaveDrawing}
            />
          )}
        </AnimatePresence>

        {/* Canvas Items */}
        <AnimatePresence>
          {(activePage.page.canvasItems || []).map((item) => {
            if (item.type === 'text') {
              return (
                <div key={item.id} className="canvas-item">
                  <CanvasTextBox
                    item={item as TextBoxType}
                    isSelected={selectedItemId === item.id}
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    onDelete={() =>
                      deleteCanvasItem(
                        activePage.notebook.id,
                        activePage.section.id,
                        activePage.page.id,
                        item.id
                      )
                    }
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
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <path
                    d={item.paths}
                    stroke={item.color || 'hsl(217 91% 60%)'}
                    strokeWidth={item.strokeWidth || 3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
}
