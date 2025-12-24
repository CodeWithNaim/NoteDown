import { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const { selection } = editor.state;
    const { from, to } = selection;
    
    // Only show if there's actual text selection
    if (from === to) {
      setIsVisible(false);
      return;
    }

    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    
    setPosition({
      top: start.top - 50,
      left: (start.left + end.right) / 2,
    });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    const handleSelectionChange = () => {
      requestAnimationFrame(updatePosition);
    };

    editor.on('selectionUpdate', handleSelectionChange);
    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
    };
  }, [editor, updatePosition]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50 glass-panel rounded-lg shadow-lg flex items-center gap-1 p-1 animate-scale-in"
      style={{
        top: Math.max(10, position.top),
        left: position.left,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('bold') && 'bg-primary/20 text-primary'
        )}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('italic') && 'bg-primary/20 text-primary'
        )}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('heading', { level: 1 }) && 'bg-primary/20 text-primary'
        )}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('heading', { level: 2 }) && 'bg-primary/20 text-primary'
        )}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('heading', { level: 3 }) && 'bg-primary/20 text-primary'
        )}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('bulletList') && 'bg-primary/20 text-primary'
        )}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('orderedList') && 'bg-primary/20 text-primary'
        )}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('taskList') && 'bg-primary/20 text-primary'
        )}
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('blockquote') && 'bg-primary/20 text-primary'
        )}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('codeBlock') && 'bg-primary/20 text-primary'
        )}
      >
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );
}
