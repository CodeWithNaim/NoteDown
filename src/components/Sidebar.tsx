import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Book,
  FolderOpen,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Search,
  Maximize2,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotesStore, Notebook, Section, Page } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onOpenCommandPalette: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function Sidebar({ onOpenCommandPalette, isDarkMode, toggleDarkMode }: SidebarProps) {
  const {
    notebooks,
    activePageId,
    sidebarCollapsed,
    focusMode,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    toggleNotebookExpanded,
    createSection,
    updateSection,
    deleteSection,
    toggleSectionExpanded,
    createPage,
    deletePage,
    setActivePage,
    toggleSidebar,
    toggleFocusMode,
  } = useNotesStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const finishEditing = (
    type: 'notebook' | 'section' | 'page',
    notebookId?: string,
    sectionId?: string
  ) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }

    if (type === 'notebook' && editingId) {
      updateNotebook(editingId, { title: editValue });
    } else if (type === 'section' && notebookId && editingId) {
      updateSection(notebookId, editingId, { title: editValue });
    }
    setEditingId(null);
  };

  const handleCreateNotebook = () => {
    createNotebook('New Notebook');
  };

  const handleCreateSection = (notebookId: string) => {
    createSection(notebookId, 'New Section');
  };

  const handleCreatePage = (notebookId: string, sectionId: string) => {
    createPage(notebookId, sectionId, 'Untitled');
  };

  if (focusMode) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleFocusMode}
        className="fixed top-4 left-4 z-50 h-10 w-10 rounded-xl glass-panel"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <AnimatePresence>
      {!sidebarCollapsed && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="h-screen border-r border-border bg-sidebar flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="NoteDown" className="w-8 h-8 rounded-lg dark:invert" />
              <span className="font-semibold text-foreground">NoteDown</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="h-8 w-8"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 px-3"
              onClick={onOpenCommandPalette}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Search</span>
              <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 px-3"
              onClick={toggleFocusMode}
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Focus Mode</span>
            </Button>
          </div>

          {/* Notebooks List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notebooks
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateNotebook}
                className="h-6 w-6"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-0.5">
              {notebooks.map((notebook) => (
                <NotebookItem
                  key={notebook.id}
                  notebook={notebook}
                  activePageId={activePageId}
                  editingId={editingId}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  startEditing={startEditing}
                  finishEditing={finishEditing}
                  onToggleExpanded={() => toggleNotebookExpanded(notebook.id)}
                  onDelete={() => deleteNotebook(notebook.id)}
                  onCreateSection={() => handleCreateSection(notebook.id)}
                  onToggleSectionExpanded={(sectionId) =>
                    toggleSectionExpanded(notebook.id, sectionId)
                  }
                  onDeleteSection={(sectionId) =>
                    deleteSection(notebook.id, sectionId)
                  }
                  onCreatePage={(sectionId) =>
                    handleCreatePage(notebook.id, sectionId)
                  }
                  onDeletePage={(sectionId, pageId) =>
                    deletePage(notebook.id, sectionId, pageId)
                  }
                  onSelectPage={setActivePage}
                />
              ))}
            </div>
          </div>
        </motion.aside>
      )}

      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 h-10 w-10 rounded-xl glass-panel shadow-md"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}
    </AnimatePresence>
  );
}

interface NotebookItemProps {
  notebook: Notebook;
  activePageId: string | null;
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: (id: string, value: string) => void;
  finishEditing: (type: 'notebook' | 'section' | 'page', notebookId?: string, sectionId?: string) => void;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onCreateSection: () => void;
  onToggleSectionExpanded: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onCreatePage: (sectionId: string) => void;
  onDeletePage: (sectionId: string, pageId: string) => void;
  onSelectPage: (pageId: string) => void;
}

function NotebookItem({
  notebook,
  activePageId,
  editingId,
  editValue,
  setEditValue,
  startEditing,
  finishEditing,
  onToggleExpanded,
  onDelete,
  onCreateSection,
  onToggleSectionExpanded,
  onDeleteSection,
  onCreatePage,
  onDeletePage,
  onSelectPage,
}: NotebookItemProps) {
  return (
    <div className="space-y-0.5">
      {/* Notebook Header */}
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
        <button onClick={onToggleExpanded} className="shrink-0">
          {notebook.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: notebook.color + '20' }}
        >
          <Book className="h-3 w-3" style={{ color: notebook.color }} />
        </div>
        {editingId === notebook.id ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => finishEditing('notebook')}
            onKeyDown={(e) => e.key === 'Enter' && finishEditing('notebook')}
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{notebook.title}</span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateSection}
            className="h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => startEditing(notebook.id, notebook.title)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sections */}
      <AnimatePresence>
        {notebook.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pl-5 space-y-0.5 overflow-hidden"
          >
            {notebook.sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                notebookId={notebook.id}
                activePageId={activePageId}
                editingId={editingId}
                editValue={editValue}
                setEditValue={setEditValue}
                startEditing={startEditing}
                finishEditing={finishEditing}
                onToggleExpanded={() => onToggleSectionExpanded(section.id)}
                onDelete={() => onDeleteSection(section.id)}
                onCreatePage={() => onCreatePage(section.id)}
                onDeletePage={(pageId) => onDeletePage(section.id, pageId)}
                onSelectPage={onSelectPage}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SectionItemProps {
  section: Section;
  notebookId: string;
  activePageId: string | null;
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEditing: (id: string, value: string) => void;
  finishEditing: (type: 'notebook' | 'section' | 'page', notebookId?: string, sectionId?: string) => void;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  onSelectPage: (pageId: string) => void;
}

function SectionItem({
  section,
  notebookId,
  activePageId,
  editingId,
  editValue,
  setEditValue,
  startEditing,
  finishEditing,
  onToggleExpanded,
  onDelete,
  onCreatePage,
  onDeletePage,
  onSelectPage,
}: SectionItemProps) {
  return (
    <div className="space-y-0.5">
      {/* Section Header */}
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
        <button onClick={onToggleExpanded} className="shrink-0">
          {section.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        {editingId === section.id ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => finishEditing('section', notebookId)}
            onKeyDown={(e) => e.key === 'Enter' && finishEditing('section', notebookId)}
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm truncate text-foreground/80">{section.title}</span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreatePage}
            className="h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => startEditing(section.id, section.title)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pages */}
      <AnimatePresence>
        {section.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pl-5 space-y-0.5 overflow-hidden"
          >
            {section.pages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                isActive={page.id === activePageId}
                onSelect={() => onSelectPage(page.id)}
                onDelete={() => onDeletePage(page.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PageItemProps {
  page: Page;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function PageItem({ page, isActive, onSelect, onDelete }: PageItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm truncate">{page.title || 'Untitled'}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
