import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';

interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
}

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
  onSavePath: (pathData: string, color: string, strokeWidth: number, bounds: { x: number; y: number; width: number; height: number }) => void;
}

export const DrawingOverlay = forwardRef<DrawingOverlayRef, DrawingOverlayProps>(
  ({ isActive, color, strokeWidth, onSavePath }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [paths, setPaths] = useState<DrawingPath[]>([]);
    const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);
    const [redoStack, setRedoStack] = useState<DrawingPath[][]>([]);

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (paths.length > 0) {
          const newPaths = [...paths];
          const removed = newPaths.pop();
          if (removed) {
            setRedoStack((prev) => [[...paths], ...prev]);
            setPaths(newPaths);
          }
        }
      },
      redo: () => {
        if (redoStack.length > 0) {
          const [toRestore, ...rest] = redoStack;
          setRedoStack(rest);
          setPaths(toRestore);
        }
      },
      clear: () => {
        if (paths.length > 0) {
          setUndoStack((prev) => [...prev, paths]);
          setPaths([]);
        }
      },
      canUndo: paths.length > 0,
      canRedo: redoStack.length > 0,
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
    }, [paths, currentPath, color, strokeWidth]);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw saved paths
      paths.forEach((path) => {
        if (path.points.length < 2) return;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      });

      // Draw current path
      if (currentPath.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
    }, [paths, currentPath, color, strokeWidth]);

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
      e.preventDefault();
      setIsDrawing(true);
      setCurrentPath([getPoint(e)]);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isActive) return;
      e.preventDefault();
      setCurrentPath((prev) => [...prev, getPoint(e)]);
    };

    const handleEnd = () => {
      if (!isDrawing || !isActive) return;
      setIsDrawing(false);

      if (currentPath.length > 1) {
        const xs = currentPath.map((p) => p.x);
        const ys = currentPath.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const svgPath = currentPath
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(' ');

        onSavePath(svgPath, color, strokeWidth, {
          x: minX,
          y: minY,
          width: maxX - minX + 10,
          height: maxY - minY + 10,
        });

        const newPath: DrawingPath = {
          id: Math.random().toString(36).substring(2),
          points: currentPath,
          color,
          strokeWidth,
        };
        
        setRedoStack([]); // Clear redo on new action
        setPaths((prev) => [...prev, newPath]);
      }

      setCurrentPath([]);
    };

    if (!isActive) return null;

    return (
      <motion.div
        className="absolute inset-0 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
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
