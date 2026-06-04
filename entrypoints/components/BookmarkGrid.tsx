import { useEffect, useRef } from 'react';
import type { BookmarkItem } from './types';
import { BookmarkCard } from './BookmarkCard';
import type { CardDensity, FaviconSource } from './settings';

interface BookmarkGridProps {
  bookmarks: BookmarkItem[];
  isSearching?: boolean;
  density?: CardDensity;
  faviconSource?: FaviconSource;
  selectedBookmarkId?: string | null;
  onOpenBookmark?: (bookmark: BookmarkItem) => void;
}

const CARD_WIDTH: Record<CardDensity, string> = {
  comfortable: 'clamp(150px, calc((100% - 16px) / 2), 220px)',
  compact: 'clamp(136px, calc((100% - 16px) / 2), 188px)',
};

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center px-6 text-center text-stone-400">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
        <svg className="h-7 w-7 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isSearching ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        )}
      </svg>
      </div>
      <p className="text-sm text-stone-500">
        {isSearching ? '没有找到匹配的书签' : '当前文件夹为空'}
      </p>
      {isSearching && (
        <p className="mt-1 text-xs text-stone-400">换个关键词试试</p>
      )}
    </div>
  );
}

export function BookmarkGrid({
  bookmarks,
  isSearching = false,
  density = 'comfortable',
  faviconSource = 'site',
  selectedBookmarkId = null,
  onOpenBookmark,
}: BookmarkGridProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedBookmarkId) return;
    cardRefs.current[selectedBookmarkId]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedBookmarkId]);

  if (bookmarks.length === 0) {
    return <EmptyState isSearching={isSearching} />;
  }

  return (
    <div className="flex flex-1 flex-wrap content-start items-start justify-center gap-3 overflow-y-auto p-4 sm:gap-4 md:p-8">
      {bookmarks.map((b) => (
        <div
          key={b.id}
          ref={(node) => {
            cardRefs.current[b.id] = node;
          }}
          className="shrink-0"
          style={{ width: CARD_WIDTH[density] }}
        >
          <BookmarkCard
            bookmark={b}
            showFolderPath={isSearching}
            density={density}
            faviconSource={faviconSource}
            selected={selectedBookmarkId === b.id}
            onOpen={onOpenBookmark}
          />
        </div>
      ))}
    </div>
  );
}
