import { useState, useEffect, useRef } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  position: { top: number; left: number };
  onSelect: (command: string) => void;
  onClose: () => void;
}

const commands = [
  { id: 'h1', label: 'Heading 1', description: 'Large section heading', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', description: 'Small section heading', icon: Heading3 },
  { id: 'bullet', label: 'Bullet List', description: 'Create a simple bullet list', icon: List },
  { id: 'numbered', label: 'Numbered List', description: 'Create a numbered list', icon: ListOrdered },
  { id: 'todo', label: 'To-do List', description: 'Track tasks with checkboxes', icon: CheckSquare },
  { id: 'quote', label: 'Quote', description: 'Capture a quote', icon: Quote },
  { id: 'code', label: 'Code Block', description: 'Display code with syntax', icon: Code },
  { id: 'divider', label: 'Divider', description: 'Visual separator', icon: Minus },
];

export function SlashCommandMenu({ position, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key.length === 1 && e.key !== '/') {
        setFilter((prev) => prev + e.key);
      } else if (e.key === 'Backspace') {
        if (filter.length > 0) {
          setFilter((prev) => prev.slice(0, -1));
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, filter, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 glass-panel rounded-lg shadow-lg overflow-hidden animate-scale-in w-72"
      style={{
        top: Math.min(position.top, window.innerHeight - 400),
        left: Math.min(position.left, window.innerWidth - 300),
      }}
    >
      <div className="p-2 border-b border-border">
        <div className="text-xs text-muted-foreground px-2 py-1">
          {filter ? `Filter: ${filter}` : 'Type to filter...'}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No commands found
          </div>
        ) : (
          filteredCommands.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <cmd.icon className="h-5 w-5 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{cmd.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {cmd.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
