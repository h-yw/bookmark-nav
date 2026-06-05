import { useState, useEffect, useMemo } from 'react';
import type { BookmarkItem, FolderNode } from '../components/types';
import { flattenBookmarks, buildFolderTree, getBookmarksInFolder, filterBookmarks } from '../components/bookmarks';
import { Sidebar } from '../components/Sidebar';
import { BookmarkGrid } from '../components/BookmarkGrid';
import { SearchBar } from '../components/SearchBar';
import { SettingsDrawer } from '../components/SettingsDrawer';
import type { AppSettings, SearchEngineId } from '../components/settings';
import { loadSettings, saveSettings } from '../components/settings';
import {
  getHistoryBookmarks,
  loadBookmarkHistory,
  recordBookmarkOpen,
  saveBookmarkHistory,
  type BookmarkUsage,
} from '../components/history';

type ViewMode = 'folder' | 'frequent' | 'recent';

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

function getPageTitle(searchQuery: string, viewMode: ViewMode, selectedFolder: FolderNode | null): string {
  if (searchQuery) return '搜索结果';
  if (viewMode === 'frequent') return '常用书签';
  if (viewMode === 'recent') return '最近打开';
  return selectedFolder?.title ?? '全部书签';
}

function getPageSubtitle({
  searchQuery,
  viewMode,
  selectedPath,
  count,
  includeNested,
}: {
  searchQuery: string;
  viewMode: ViewMode;
  selectedPath: string[];
  count: number;
  includeNested: boolean;
}): string {
  if (searchQuery) return `在全部文件夹中搜索“${searchQuery}”`;
  if (viewMode === 'frequent') {
    return count > 0 ? `按打开次数排序，共 ${count} 个书签` : '打开几个书签后会自动生成常用列表';
  }
  if (viewMode === 'recent') {
    return count > 0 ? `按最近打开时间排序，共 ${count} 个书签` : '打开书签后会自动记录最近列表';
  }
  if (selectedPath.length === 0) return '查看所有已保存的书签';
  return includeNested
    ? `当前文件夹及子文件夹包含 ${count} 个书签`
    : `当前文件夹包含 ${count} 个书签`;
}

export default function App() {
  const [allBookmarks, setAllBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<BookmarkUsage[]>(() => loadBookmarkHistory());
  const [viewMode, setViewMode] = useState<ViewMode>('folder');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
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

  const handleOpenBookmark = (bookmark: BookmarkItem) => {
    const nextHistory = recordBookmarkOpen(history, bookmark);
    setHistory(nextHistory);
    saveBookmarkHistory(nextHistory);
    openUrl(bookmark.url);
  };

  const handleOpenSelectedBookmark = (query: string, index: number) => {
    const matches = query ? filterBookmarks(allBookmarks, query) : displayedBookmarks;
    const selected = matches[Math.min(index, matches.length - 1)];
    if (!selected) return false;
    handleOpenBookmark(selected);
    return true;
  };

  const displayedBookmarks = useMemo(() => {
    if (searchQuery) {
      return filterBookmarks(allBookmarks, searchQuery);
    }
    if (viewMode === 'frequent') {
      return getHistoryBookmarks(allBookmarks, history, 'frequent');
    }
    if (viewMode === 'recent') {
      return getHistoryBookmarks(allBookmarks, history, 'recent');
    }
    return getBookmarksInFolder(
      allBookmarks,
      selectedPath,
      settings.bookmarkScope === 'nested'
    );
  }, [allBookmarks, history, selectedPath, searchQuery, settings.bookmarkScope, viewMode]);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedResultIndex >= displayedBookmarks.length) {
      setSelectedResultIndex(Math.max(0, displayedBookmarks.length - 1));
    }
  }, [displayedBookmarks.length, selectedResultIndex]);

  const selectedFolder = useMemo(() => getSelectedFolder(folders, selectedPath), [folders, selectedPath]);
  const pageTitle = getPageTitle(searchQuery, viewMode, selectedFolder);
  const pageSubtitle = getPageSubtitle({
    searchQuery,
    viewMode,
    selectedPath,
    count: displayedBookmarks.length,
    includeNested: settings.bookmarkScope === 'nested',
  });

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
          setViewMode('folder');
          setSelectedPath(path);
          setSearchQuery('');
          setSidebarOpen(false);
        }}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <SearchBar
          onSearch={setSearchQuery}
          onOpenSelectedBookmark={handleOpenSelectedBookmark}
          onWebSearch={handleWebSearch}
          resultCount={searchQuery ? displayedBookmarks.length : undefined}
          selectedIndex={selectedResultIndex}
          onSelectedIndexChange={setSelectedResultIndex}
          title={pageTitle}
          subtitle={pageSubtitle}
          totalCount={allBookmarks.length}
          viewMode={viewMode}
          onViewModeChange={(mode) => {
            setViewMode(mode);
            setSearchQuery('');
          }}
          historyCount={history.length}
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
          selectedBookmarkId={searchQuery ? displayedBookmarks[selectedResultIndex]?.id ?? null : null}
          onOpenBookmark={handleOpenBookmark}
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
