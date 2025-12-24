import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { CommandPalette } from '@/components/CommandPalette';
import { useNotesStore } from '@/store/useNotesStore';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return true;
    }
    return true;
  });

  const { sidebarCollapsed, focusMode } = useNotesStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <>
      <Helmet>
        <title>Notes - Modern Note-Taking</title>
        <meta name="description" content="A beautiful, modern note-taking app with hierarchical organization and infinite canvas." />
      </Helmet>
      
      <div className="flex min-h-screen h-screen bg-background overflow-hidden">
        <Sidebar
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
        
        <main className={`flex-1 relative overflow-hidden ${
          focusMode ? 'ml-0' : sidebarCollapsed ? 'ml-0' : ''
        }`}>
          <InfiniteCanvas />
        </main>

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </>
  );
};

export default Index;
