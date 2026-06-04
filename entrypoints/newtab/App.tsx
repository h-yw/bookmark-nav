import { useState, useEffect, useMemo } from 'react';
import type { BookmarkItem, FolderNode } from '../components/types';
import { flattenBookmarks, buildFolderTree, getBookmarksInFolder, filterBookmarks } from '../components/bookmarks';
import { Sidebar } from '../components/Sidebar';
import { BookmarkGrid } from '../components/BookmarkGrid';
import { SearchBar } from '../components/SearchBar';
import { SettingsDrawer } from '../components/SettingsDrawer';
import type { AppSettings, SearchEngineId } from '../components/settings';
import { loadSettings, saveSettings } from '../components/settings';

const SEARCH_URLS: Record<SearchEngineId, (query: string) => string> = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  bing: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  duckduckgo: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  baidu: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
};

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
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        setError('书签加载失败');
        setLoading(false);
      }
    }
    return () => { cancelled = true; };
  };

  useEffect(() => loadBookmarks(), []);

  const handleSettingsChange = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleWebSearch = (query: string) => {
    const url = SEARCH_URLS[settings.searchEngine](query);
    openUrl(url);
  };

  const openUrl = (url: string) => {
    try {
      chrome.tabs.update({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleOpenFirstBookmark = (query: string) => {
    const matches = query ? filterBookmarks(allBookmarks, query) : displayedBookmarks;
    const first = matches[0];
    if (!first) return false;
    openUrl(first.url);
    return true;
  };

  const displayedBookmarks = useMemo(() => {
    if (searchQuery) {
      return filterBookmarks(allBookmarks, searchQuery);
    }
    return getBookmarksInFolder(
      allBookmarks,
      selectedPath,
      settings.bookmarkScope === 'nested'
    );
  }, [allBookmarks, selectedPath, searchQuery, settings.bookmarkScope]);

  const selectedFolder = useMemo(() => getSelectedFolder(folders, selectedPath), [folders, selectedPath]);
  const pageTitle = searchQuery
    ? '搜索结果'
    : selectedFolder?.title ?? '全部书签';
  const pageSubtitle = searchQuery
    ? `在全部文件夹中搜索“${searchQuery}”`
    : selectedPath.length === 0
      ? '查看所有已保存的书签'
      : settings.bookmarkScope === 'nested'
        ? `当前文件夹及子文件夹包含 ${displayedBookmarks.length} 个书签`
        : `当前文件夹包含 ${displayedBookmarks.length} 个书签`;

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
          <div className="flex flex-wrap content-start items-start gap-3 p-4 sm:gap-4 md:p-8">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="h-24 shrink-0 rounded-xl skeleton"
                style={{ width: 'clamp(150px, calc((100% - 16px) / 2), 220px)' }}
              />
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
            重试
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
          onOpenFirstBookmark={handleOpenFirstBookmark}
          onWebSearch={handleWebSearch}
          resultCount={searchQuery ? displayedBookmarks.length : undefined}
          title={pageTitle}
          subtitle={pageSubtitle}
          totalCount={allBookmarks.length}
          defaultMode={settings.defaultSearchMode}
          searchEngine={settings.searchEngine}
          noResultWebSearch={settings.noResultWebSearch}
          onSearchEngineChange={(searchEngine) => handleSettingsChange({ ...settings, searchEngine })}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <BookmarkGrid
          bookmarks={displayedBookmarks}
          isSearching={!!searchQuery}
          density={settings.cardDensity}
          faviconSource={settings.faviconSource}
        />
      </main>
      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
      />
    </div>
  );
}
