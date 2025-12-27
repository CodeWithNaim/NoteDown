import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Canvas item types for the infinite canvas
export interface CanvasTextBox {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  tags: string[];
}

export interface CanvasMediaItem {
  id: string;
  type: 'audio' | 'video' | 'file' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  fileName: string;
  mimeType?: string;
}

export interface CanvasDrawing {
  id: string;
  type: 'drawing';
  paths: string; // SVG path data
  color: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  maskPaths?: { path: string; strokeWidth: number }[];
}

export interface CanvasStickyNote {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string; // Supports hex colors like '#FEF08A' or legacy names like 'yellow'
  textColor?: string; // Text color, defaults to dark gray if not set
}

export interface CanvasTable {
  id: string;
  type: 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  cells: string[][];
  tableStyle?: 'default' | 'ocean' | 'forest' | 'sunset' | 'purple';
  headerColor?: string; // Custom header/accent color
  textColor?: string; // Custom text color
  bgColor?: string; // Background color - header/footer will be darker shade
  textAlign?: 'left' | 'center' | 'right';
  textSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrike?: boolean;
  isSubscript?: boolean;
  isSuperscript?: boolean;
  cellStyles?: {
    [key: string]: {
      textColor?: string;
      textAlign?: 'left' | 'center' | 'right';
      textSize?: number;
      fontFamily?: string;
      isBold?: boolean;
      isItalic?: boolean;
      isUnderline?: boolean;
      isStrike?: boolean;
      isSubscript?: boolean;
      isSuperscript?: boolean;
    }
  };
  hideBorder?: boolean;
  colWidths?: (number | string)[];
}

export interface CanvasTodoList {
  id: string;
  type: 'todo';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  items: { id: string; text: string; completed: boolean }[];
}

export type CanvasItem = CanvasTextBox | CanvasMediaItem | CanvasDrawing | CanvasStickyNote | CanvasTable | CanvasTodoList;

export interface Page {
  id: string;
  title: string;
  content: string; // Legacy content for backwards compatibility
  canvasItems: CanvasItem[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  title: string;
  pages: Page[];
  isExpanded: boolean;
}

export interface Notebook {
  id: string;
  title: string;
  color: string;
  sections: Section[];
  isExpanded: boolean;
}

interface NotesState {
  notebooks: Notebook[];
  activePageId: string | null;
  sidebarCollapsed: boolean;
  focusMode: boolean;
  searchQuery: string;
  drawingMode: boolean;

  // Actions
  createNotebook: (title: string) => void;
  updateNotebook: (id: string, updates: Partial<Notebook>) => void;
  deleteNotebook: (id: string) => void;
  toggleNotebookExpanded: (id: string) => void;

  createSection: (notebookId: string, title: string) => void;
  updateSection: (notebookId: string, sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (notebookId: string, sectionId: string) => void;
  toggleSectionExpanded: (notebookId: string, sectionId: string) => void;

  createPage: (notebookId: string, sectionId: string, title: string) => void;
  updatePage: (notebookId: string, sectionId: string, pageId: string, updates: Partial<Page>) => void;
  deletePage: (notebookId: string, sectionId: string, pageId: string) => void;
  movePage: (pageId: string, fromNotebookId: string, fromSectionId: string, toNotebookId: string, toSectionId: string) => void;

  // Canvas item actions
  addCanvasItem: (notebookId: string, sectionId: string, pageId: string, item: CanvasItem) => void;
  updateCanvasItem: (notebookId: string, sectionId: string, pageId: string, itemId: string, updates: Partial<CanvasItem>) => void;
  deleteCanvasItem: (notebookId: string, sectionId: string, pageId: string, itemId: string) => void;
  addTagToItem: (notebookId: string, sectionId: string, pageId: string, itemId: string, tag: string) => void;
  removeTagFromItem: (notebookId: string, sectionId: string, pageId: string, itemId: string, tag: string) => void;

  setActivePage: (pageId: string | null) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleDrawingMode: () => void;
  setSearchQuery: (query: string) => void;

  getActivePage: () => { notebook: Notebook; section: Section; page: Page } | null;
  searchPages: (query: string) => { notebook: Notebook; section: Section; page: Page }[];
  searchByTag: (tag: string) => { notebook: Notebook; section: Section; page: Page; item?: CanvasTextBox }[];
  getAllTags: () => string[];
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const NOTEBOOK_COLORS = [
  'hsl(221 83% 53%)', // Blue
  'hsl(142 76% 36%)', // Green
  'hsl(262 83% 58%)', // Purple
  'hsl(24 95% 53%)',  // Orange
  'hsl(346 77% 50%)', // Red
  'hsl(199 89% 48%)', // Cyan
];

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notebooks: [
        {
          id: 'default',
          title: 'My Notebook',
          color: NOTEBOOK_COLORS[0],
          isExpanded: true,
          sections: [
            {
              id: 'getting-started',
              title: 'Getting Started',
              isExpanded: true,
              pages: [
                {
                  id: 'welcome',
                  title: 'Welcome to Notes',
                  content: '',
                  canvasItems: [
                    {
                      id: 'welcome-text',
                      type: 'text',
                      x: 50,
                      y: 50,
                      width: 600,
                      height: 300,
                      content: '<h1>Welcome to Notes ✨</h1><p>This is your modern note-taking workspace with an infinite canvas. Click anywhere to create a new text box, or use the toolbar to add media.</p><h2>Quick Tips</h2><ul><li>Press <code>Cmd+K</code> to open the command palette</li><li>Click anywhere on the canvas to add text</li><li>Drag boxes to reposition them</li><li>Use the drawing tool for freehand sketches</li></ul>',
                      tags: ['welcome', 'guide'],
                    },
                  ],
                  tags: ['welcome', 'guide'],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          ],
        },
      ],
      activePageId: 'welcome',
      sidebarCollapsed: false,
      focusMode: false,
      searchQuery: '',
      drawingMode: false,

      createNotebook: (title) => {
        const newNotebook: Notebook = {
          id: generateId(),
          title,
          color: NOTEBOOK_COLORS[Math.floor(Math.random() * NOTEBOOK_COLORS.length)],
          sections: [],
          isExpanded: true,
        };
        set((state) => ({ notebooks: [...state.notebooks, newNotebook] }));
      },

      updateNotebook: (id, updates) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === id ? { ...nb, ...updates } : nb
          ),
        }));
      },

      deleteNotebook: (id) => {
        set((state) => ({
          notebooks: state.notebooks.filter((nb) => nb.id !== id),
          activePageId: state.notebooks.find((nb) => nb.id === id)?.sections
            .flatMap((s) => s.pages)
            .some((p) => p.id === state.activePageId)
            ? null
            : state.activePageId,
        }));
      },

      toggleNotebookExpanded: (id) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === id ? { ...nb, isExpanded: !nb.isExpanded } : nb
          ),
        }));
      },

      createSection: (notebookId, title) => {
        const newSection: Section = {
          id: generateId(),
          title,
          pages: [],
          isExpanded: true,
        };
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? { ...nb, sections: [...nb.sections, newSection] }
              : nb
          ),
        }));
      },

      updateSection: (notebookId, sectionId, updates) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId ? { ...s, ...updates } : s
                ),
              }
              : nb
          ),
        }));
      },

      deleteSection: (notebookId, sectionId) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? { ...nb, sections: nb.sections.filter((s) => s.id !== sectionId) }
              : nb
          ),
          activePageId: state.notebooks
            .find((nb) => nb.id === notebookId)
            ?.sections.find((s) => s.id === sectionId)
            ?.pages.some((p) => p.id === state.activePageId)
            ? null
            : state.activePageId,
        }));
      },

      toggleSectionExpanded: (notebookId, sectionId) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s
                ),
              }
              : nb
          ),
        }));
      },

      createPage: (notebookId, sectionId, title) => {
        const newPage: Page = {
          id: generateId(),
          title,
          content: '',
          canvasItems: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId ? { ...s, pages: [...s.pages, newPage] } : s
                ),
              }
              : nb
          ),
          activePageId: newPage.id,
        }));
      },

      updatePage: (notebookId, sectionId, pageId, updates) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? { ...p, ...updates, updatedAt: new Date() }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      deletePage: (notebookId, sectionId, pageId) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? { ...s, pages: s.pages.filter((p) => p.id !== pageId) }
                    : s
                ),
              }
              : nb
          ),
          activePageId: state.activePageId === pageId ? null : state.activePageId,
        }));
      },

      movePage: (pageId, fromNotebookId, fromSectionId, toNotebookId, toSectionId) => {
        const { notebooks } = get();
        let pageToMove: Page | null = null;

        // Find the page
        for (const nb of notebooks) {
          if (nb.id === fromNotebookId) {
            for (const section of nb.sections) {
              if (section.id === fromSectionId) {
                pageToMove = section.pages.find(p => p.id === pageId) || null;
                break;
              }
            }
          }
        }

        if (!pageToMove) return;

        set((state) => ({
          notebooks: state.notebooks.map((nb) => {
            // Remove from source
            if (nb.id === fromNotebookId) {
              return {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === fromSectionId
                    ? { ...s, pages: s.pages.filter((p) => p.id !== pageId) }
                    : s
                ),
              };
            }
            // Add to destination
            if (nb.id === toNotebookId) {
              return {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === toSectionId
                    ? { ...s, pages: [...s.pages, pageToMove!] }
                    : s
                ),
              };
            }
            return nb;
          }),
        }));
      },

      addCanvasItem: (notebookId, sectionId, pageId, item) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? { ...p, canvasItems: [...p.canvasItems, item], updatedAt: new Date() }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      updateCanvasItem: (notebookId, sectionId, pageId, itemId, updates) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? {
                            ...p,
                            canvasItems: p.canvasItems.map((item): CanvasItem =>
                              item.id === itemId ? ({ ...item, ...updates } as CanvasItem) : item
                            ),
                            updatedAt: new Date(),
                          }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      deleteCanvasItem: (notebookId, sectionId, pageId, itemId) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? {
                            ...p,
                            canvasItems: p.canvasItems.filter((item) => item.id !== itemId),
                            updatedAt: new Date(),
                          }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      addTagToItem: (notebookId, sectionId, pageId, itemId, tag) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? {
                            ...p,
                            canvasItems: p.canvasItems.map((item): CanvasItem =>
                              item.id === itemId && item.type === 'text'
                                ? { ...item, tags: [...(item as CanvasTextBox).tags, tag] } as CanvasTextBox
                                : item
                            ),
                          }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      removeTagFromItem: (notebookId, sectionId, pageId, itemId, tag) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) =>
            nb.id === notebookId
              ? {
                ...nb,
                sections: nb.sections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      pages: s.pages.map((p) =>
                        p.id === pageId
                          ? {
                            ...p,
                            canvasItems: p.canvasItems.map((item): CanvasItem =>
                              item.id === itemId && item.type === 'text'
                                ? { ...item, tags: (item as CanvasTextBox).tags.filter((t) => t !== tag) } as CanvasTextBox
                                : item
                            ),
                          }
                          : p
                      ),
                    }
                    : s
                ),
              }
              : nb
          ),
        }));
      },

      setActivePage: (pageId) => set({ activePageId: pageId }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleDrawingMode: () => set((state) => ({ drawingMode: !state.drawingMode })),
      setSearchQuery: (query) => set({ searchQuery: query }),

      getActivePage: () => {
        const { notebooks, activePageId } = get();
        if (!activePageId) return null;

        for (const notebook of notebooks) {
          for (const section of notebook.sections) {
            const page = section.pages.find((p) => p.id === activePageId);
            if (page) {
              return { notebook, section, page };
            }
          }
        }
        return null;
      },

      searchPages: (query) => {
        const { notebooks } = get();
        const results: { notebook: Notebook; section: Section; page: Page }[] = [];
        const lowerQuery = query.toLowerCase();

        for (const notebook of notebooks) {
          for (const section of notebook.sections) {
            for (const page of section.pages) {
              const hasMatchInTitle = page.title.toLowerCase().includes(lowerQuery);
              const hasMatchInTags = page.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
              const hasMatchInContent = page.canvasItems.some((item) => {
                if (item.type === 'text') {
                  return item.content.toLowerCase().includes(lowerQuery) ||
                    (item as CanvasTextBox).tags.some((t) => t.toLowerCase().includes(lowerQuery));
                }
                if (item.type === 'file' || item.type === 'audio' || item.type === 'video') {
                  return item.fileName.toLowerCase().includes(lowerQuery);
                }
                return false;
              });

              if (hasMatchInTitle || hasMatchInTags || hasMatchInContent) {
                results.push({ notebook, section, page });
              }
            }
          }
        }

        return results;
      },

      searchByTag: (tag) => {
        const { notebooks } = get();
        const results: { notebook: Notebook; section: Section; page: Page; item?: CanvasTextBox }[] = [];
        const lowerTag = tag.toLowerCase();

        for (const notebook of notebooks) {
          for (const section of notebook.sections) {
            for (const page of section.pages) {
              // Check page-level tags
              if (page.tags.some((t) => t.toLowerCase() === lowerTag)) {
                results.push({ notebook, section, page });
              }
              // Check item-level tags
              for (const item of page.canvasItems) {
                if (item.type === 'text' && (item as CanvasTextBox).tags.some((t) => t.toLowerCase() === lowerTag)) {
                  results.push({ notebook, section, page, item: item as CanvasTextBox });
                }
              }
            }
          }
        }

        return results;
      },

      getAllTags: () => {
        const { notebooks } = get();
        const tagSet = new Set<string>();

        for (const notebook of notebooks) {
          for (const section of notebook.sections) {
            for (const page of section.pages) {
              page.tags.forEach((t) => tagSet.add(t));
              for (const item of page.canvasItems) {
                if (item.type === 'text') {
                  (item as CanvasTextBox).tags.forEach((t) => tagSet.add(t));
                }
              }
            }
          }
        }

        return Array.from(tagSet);
      },
    }),
    {
      name: 'notes-storage',
    }
  )
);
