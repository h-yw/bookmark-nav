import { useState, useEffect, useMemo } from 'react';
import { BookmarkItem } from '../components/types.ts';
import { flattenBookmarks, filterBookmarks } from '../components/bookmarks.ts';
import { getFaviconUrl } from '../components/favicon.ts';

function simplifyUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function App() {
  const [allBookmarks, setAllBookmarks] = useState<BookmarkItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      chrome.bookmarks.getTree((tree) => {
        if (cancelled) return;
        const rootChildren = tree[0]?.children ?? [];
        setAllBookmarks(flattenBookmarks(rootChildren));
      });
    } catch {
      if (!cancelled) setError('书签加载失败');
    }
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    if (!query) return [];
    return filterBookmarks(allBookmarks, query).slice(0, 20);
  }, [allBookmarks, query]);

  const handleClick = (url: string) => {
    try {
      chrome.tabs.update({ url });
    } catch {
      window.open(url, '_blank');
    }
    window.close();
  };

  if (error) {
    return (
      <div className="w-96 h-48 flex items-center justify-center bg-[#FAFAF8] text-stone-500 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="w-96 max-h-[480px] flex flex-col bg-[#FAFAF8] text-stone-900">
      <div className="sticky top-0 z-10 px-4 py-3 bg-[#FAFAF8] border-b border-stone-200">
        <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-white border border-stone-200 shadow-sm">
          <svg aria-hidden="true" className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索书签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-stone-900 placeholder-stone-400 outline-none text-sm"
            aria-label="搜索书签"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400 gap-1">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">没有结果</p>
            <p className="text-xs text-stone-400">换个关键词试试</p>
          </div>
        )}
        {!query && (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400 gap-1">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">输入关键词搜索书签</p>
          </div>
        )}
        {results.map((b) => (
          <PopupBookmarkItem key={b.id} bookmark={b} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}

function PopupBookmarkItem({ bookmark, onClick }: { bookmark: BookmarkItem; onClick: (url: string) => void }) {
  const favicon = getFaviconUrl(bookmark.url);
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => onClick(bookmark.url)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-100 transition-colors text-left"
    >
      <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 border border-stone-200">
        {favicon && !imgError ? (
          <img src={favicon} alt="" className="w-4 h-4" onError={() => setImgError(true)} />
        ) : (
          <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-stone-800 truncate">{bookmark.title}</div>
        <div className="text-xs text-stone-400 truncate">{simplifyUrl(bookmark.url)}</div>
      </div>
    </button>
  );
}
