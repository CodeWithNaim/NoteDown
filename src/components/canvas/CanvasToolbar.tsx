import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Type,
  Mic,
  Video,
  Paperclip,
  Pencil,
  MousePointer,
  Image,
  Table,
  CheckSquare,
  StickyNote,
  Undo2,
  Redo2,
  Eraser,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export type ToolType = 'select' | 'draw' | 'text' | 'image' | 'table' | 'todo' | 'sticky';

const COLORS = [
  '#000000', '#374151', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'
];

interface CanvasToolbarProps {
  activeTool: ToolType;
  drawingColor: string;
  strokeWidth: number;
  isRecording: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearDrawing: () => void;
  onStartRecording: (type: 'audio' | 'video') => void;
  onStopRecording: () => void;
  onFileUpload: (file: File, type: 'file' | 'image') => void;
}

export function CanvasToolbar({
  activeTool,
  drawingColor,
  strokeWidth,
  isRecording,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClearDrawing,
  onStartRecording,
  onStopRecording,
  onFileUpload,
}: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <TooltipProvider>
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1.5 rounded-xl glass-panel shadow-lg"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Select Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'select' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('select')}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select & Move (V)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Drawing Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'draw' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('draw')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Draw (D)</TooltipContent>
        </Tooltip>

        {/* Color Picker */}
        {activeTool === 'draw' && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-border"
                    style={{ backgroundColor: drawingColor }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="center">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 max-w-[200px]">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                          drawingColor === c ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => onColorChange(c)}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Stroke Width: {strokeWidth}px</label>
                    <Slider
                      value={[strokeWidth]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={([v]) => onStrokeWidthChange(v)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onClearDrawing}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Drawing</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Text Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'text' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('text')}
            >
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Text Box (T)</TooltipContent>
        </Tooltip>

        {/* Sticky Note */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'sticky' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('sticky')}
            >
              <StickyNote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sticky Note (S)</TooltipContent>
        </Tooltip>

        {/* Table */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('table')}
            >
              <Table className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Table</TooltipContent>
        </Tooltip>

        {/* Todo List */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'todo' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToolChange('todo')}
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>To-Do List</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Image Upload */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => imageInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Image</TooltipContent>
        </Tooltip>

        {/* File Attachment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attach File</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Record Audio */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isRecording ? 'destructive' : 'ghost'}
              size="icon"
              className={cn('h-9 w-9', isRecording && 'animate-pulse')}
              onClick={() => isRecording ? onStopRecording() : onStartRecording('audio')}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isRecording ? 'Stop Recording' : 'Record Audio'}</TooltipContent>
        </Tooltip>

        {/* Record Video */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onStartRecording('video')}
              disabled={isRecording}
            >
              <Video className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Record Video</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileUpload(file, 'file');
              e.target.value = '';
            }
          }}
        />

        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileUpload(file, 'image');
              e.target.value = '';
            }
          }}
        />
      </motion.div>
    </TooltipProvider>
  );
}
