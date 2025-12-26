import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

export interface DrawingOverlayRef {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface DrawingOverlayProps {
  isActive: boolean;
  color: string;
  strokeWidth: number;
  scale: number;
  offset: { x: number; y: number };
  cursor?: string;
  onSavePath: (pathData: string, color: string, strokeWidth: number, bounds: { x: number; y: number; width: number; height: number }) => void;
  onErase?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const DrawingOverlay = forwardRef<DrawingOverlayRef, DrawingOverlayProps>(
  ({ isActive, color, strokeWidth, scale, offset, cursor, onSavePath, onErase }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);

    // Undo/Redo is disabled for direct canvas drawing as we persist items immediately to the store.
    // Store-level undo/redo should be implemented if needed.
    useImperativeHandle(ref, () => ({
      undo: () => { },
      redo: () => { },
      clear: () => { },
      canUndo: false,
      canRedo: false,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        redraw();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    useEffect(() => {
      redraw();
    }, [currentPath, color, strokeWidth]);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw current path (Screen Coordinates)
      if (currentPath.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth * scale; // Adjust stroke width visually? Or keep constant? 
        // If we want WYSIWYG, visual stroke should scale if items scale.
        // But active stroke is on screen overlay.
        // If the canvas is zoomed out (scale < 1), a 3px stroke looks thin.
        // If we draw 3px screen, it becomes massive in canvas?
        // Let's stick to simple Visual = standard.
        // Wait, if I zoom in (scale 2), and draw a 3px line.
        // The saved line will be 3px "Canvas Units".
        // Rendering that SVG at scale 2 will look like 6px.
        // So visually, we should draw at strokeWidth * scale on screen.
        ctx.lineWidth = strokeWidth * scale;

        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
    }, [currentPath, color, strokeWidth, scale]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isActive) return;
      // e.preventDefault(); // Prevented by parent if needed? 
      // Drawing needs preventDefault to stop scrolling/etc
      // But if we are in "Draw Mode", we assume gestures are for drawing.
      // preventDefault here might stop touch-scroll which is correct.
      // e.preventDefault(); 
      setIsDrawing(true);
      setCurrentPath([getPoint(e)]);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isActive) return;
      e.preventDefault();
      setCurrentPath((prev) => [...prev, getPoint(e)]);
      if (onErase) onErase(e);
    };

    const handleEnd = () => {
      if (!isDrawing || !isActive) return;
      setIsDrawing(false);

      if (currentPath.length > 1) {
        // Transform points from Screen to Canvas coordinates
        const transformedPath = currentPath.map(p => ({
          x: (p.x - offset.x) / scale,
          y: (p.y - offset.y) / scale
        }));

        const xs = transformedPath.map((p) => p.x);
        const ys = transformedPath.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const svgPath = transformedPath
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(' ');

        onSavePath(svgPath, color, strokeWidth, {
          x: minX,
          y: minY,
          width: maxX - minX + 10,
          height: maxY - minY + 10,
        });
      }

      setCurrentPath([]);
    };

    if (!isActive) return null;

    return (
      <motion.div
        className="absolute inset-0 z-30 pointer-events-auto"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.05 }}
        style={{ cursor: cursor || 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          style={{ cursor: cursor || 'crosshair' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </motion.div>
    );
  }
);

DrawingOverlay.displayName = 'DrawingOverlay';
