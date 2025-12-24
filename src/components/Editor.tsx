import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotesStore } from '@/store/useNotesStore';
import { SlashCommandMenu } from './SlashCommandMenu';
import { FloatingToolbar } from './FloatingToolbar';
import { cn } from '@/lib/utils';

export function Editor() {
  const { getActivePage, updatePage, notebooks } = useNotesStore();
  const activePage = getActivePage();
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading';
          }
          return "Type '/' for commands...";
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: activePage?.page.content || '',
    editorProps: {
      attributes: {
        class: 'editor-content outline-none min-h-[calc(100vh-200px)]',
      },
    },
    onUpdate: ({ editor }) => {
      if (activePage) {
        const content = editor.getHTML();
        for (const notebook of notebooks) {
          for (const section of notebook.sections) {
            if (section.pages.some((p) => p.id === activePage.page.id)) {
              updatePage(notebook.id, section.id, activePage.page.id, { content });
              break;
            }
          }
        }
      }
    },
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === '/' && editor && !showSlashMenu) {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      setSlashMenuPosition({
        top: coords.bottom + 8,
        left: coords.left,
      });
      setShowSlashMenu(true);
    } else if (event.key === 'Escape') {
      setShowSlashMenu(false);
    }
  }, [editor, showSlashMenu]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (editor && activePage) {
      const currentContent = editor.getHTML();
      if (currentContent !== activePage.page.content) {
        editor.commands.setContent(activePage.page.content);
      }
    }
  }, [editor, activePage?.page.id]);

  const handleSlashCommand = (command: string) => {
    if (!editor) return;
    
    editor.commands.deleteRange({
      from: editor.state.selection.from - 1,
      to: editor.state.selection.from,
    });

    switch (command) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'numbered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'todo':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
    setShowSlashMenu(false);
  };

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
    <div className="relative w-full max-w-[var(--editor-max-width)] mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-6">
        <input
          type="text"
          value={activePage.page.title}
          onChange={(e) => {
            for (const notebook of notebooks) {
              for (const section of notebook.sections) {
                if (section.pages.some((p) => p.id === activePage.page.id)) {
                  updatePage(notebook.id, section.id, activePage.page.id, {
                    title: e.target.value,
                  });
                  break;
                }
              }
            }
          }}
          className="w-full text-4xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <span>{activePage.notebook.title}</span>
          <span>/</span>
          <span>{activePage.section.title}</span>
        </div>
      </div>

      {/* Floating Toolbar */}
      {editor && <FloatingToolbar editor={editor} />}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu
          position={slashMenuPosition}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
    </div>
  );
}
