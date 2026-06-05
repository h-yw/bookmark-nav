import { useState, useEffect, useMemo } from 'react';
import type { BookmarkItem, FolderNode } from '../components/types';
import { flattenBookmarks, buildFolderTree, getBookmarksInFolder, filterBookmarks } from '../components/bookmarks';
import { Sidebar } from '../components/Sidebar';
import { BookmarkGrid } from '../components/BookmarkGrid';
import { SearchBar } from '../components/SearchBar';

function getSelectedFolder(folders: FolderNode[], selectedPath: string[]): FolderNode | null {
  let currentFolders = folders;
  let selected: FolderNode | null = null;

  for (const id of selectedPath) {
    selected = currentFolders.find((folder) => folder.id === id) ?? null;
    if (!selected) return null;
    currentFolders = selected.children;
  }

  return selected;
}

export default function App() {
  const [allBookmarks, setAllBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = () => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    try {
      chrome.bookmarks.getTree((tree) => {
        if (cancelled) return;
        const rootChildren = tree[0]?.children ?? [];
        setAllBookmarks(flattenBookmarks(rootChildren));
        setFolders(buildFolderTree(rootChildren));
        setLoading(false);
      });
    } catch {
      if (!cancelled) {
        setError('Failed to load bookmarks');
        setLoading(false);
      }
    }
    return () => { cancelled = true; };
  };

  useEffect(() => loadBookmarks(), []);

  const displayedBookmarks = useMemo(() => {
    if (searchQuery) {
      return filterBookmarks(allBookmarks, searchQuery);
    }
    return getBookmarksInFolder(allBookmarks, selectedPath);
  }, [allBookmarks, selectedPath, searchQuery]);

  const selectedFolder = useMemo(() => getSelectedFolder(folders, selectedPath), [folders, selectedPath]);
  const pageTitle = searchQuery
    ? 'Search Results'
    : selectedFolder?.title ?? 'All Bookmarks';
  const pageSubtitle = searchQuery
    ? `Matching "${searchQuery}" across all folders`
    : selectedPath.length === 0
      ? 'Every saved bookmark in one place'
      : `${displayedBookmarks.length} bookmark${displayedBookmarks.length === 1 ? '' : 's'} in this folder`;

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F6F5F3] text-stone-900">
        <div className="hidden w-64 shrink-0 bg-[#FAFAF8] border-r border-stone-200 md:block">
          <div className="px-3 py-4 space-y-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-8 skeleton" />
            ))}
          </div>
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-10 px-4 py-4 bg-[#F6F5F3] border-b border-stone-200 md:px-8">
            <div className="h-12 rounded-xl skeleton" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 md:p-8">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-24 rounded-xl skeleton" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-[#F6F5F3] text-stone-900 items-center justify-center">
        <div className="text-center space-y-4">
          <svg className="w-10 h-10 text-stone-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-stone-500 text-sm">{error}</p>
          <button
            onClick={() => { const cleanup = loadBookmarks(); return cleanup; }}
            className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F6F5F3] text-stone-900">
      <Sidebar
        folders={folders}
        selectedPath={selectedPath}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(path) => {
          setSelectedPath(path);
          setSearchQuery('');
          setSidebarOpen(false);
        }}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <SearchBar
          onSearch={setSearchQuery}
          resultCount={searchQuery ? displayedBookmarks.length : undefined}
          title={pageTitle}
          subtitle={pageSubtitle}
          totalCount={allBookmarks.length}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <BookmarkGrid bookmarks={displayedBookmarks} isSearching={!!searchQuery} />
      </main>
    </div>
  );
}
