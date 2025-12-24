import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Book, FolderOpen } from 'lucide-react';
import { useNotesStore } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { searchPages, setActivePage } = useNotesStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchPages(query);
  }, [query, searchPages]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          setActivePage(results[selectedIndex].page.id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, setActivePage, onClose]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="glass-panel rounded-xl shadow-2xl overflow-hidden border border-border">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {query.trim() && results.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No results found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Try searching with different keywords
                    </p>
                  </div>
                ) : !query.trim() ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">Start typing to search your notes</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Search across all notebooks, sections, and pages
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <button
                        key={result.page.id}
                        onClick={() => {
                          setActivePage(result.page.id);
                          onClose();
                        }}
                        className={cn(
                          'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                          index === selectedIndex
                            ? 'bg-primary/10'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">
                            {highlightMatch(result.page.title || 'Untitled', query)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <Book className="h-3 w-3" />
                            <span>{result.notebook.title}</span>
                            <span>/</span>
                            <FolderOpen className="h-3 w-3" />
                            <span>{result.section.title}</span>
                          </div>
                          {result.page.tags.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {result.page.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded">↑↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded">↵</kbd>
                    <span>Open</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
