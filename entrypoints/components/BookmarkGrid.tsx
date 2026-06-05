import { useRef, useState, useEffect, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BookmarkItem } from './types';
import { BookmarkCard } from './BookmarkCard';

interface BookmarkGridProps {
  bookmarks: BookmarkItem[];
  isSearching?: boolean;
}

const ROW_HEIGHT = 130;
const GAP = 16;
const PADDING = 24;
const MIN_VIRTUALIZE = 50;

function getColumns(width: number): number {
  if (width < 640) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  if (width < 1280) return 5;
  return 6;
}

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
        {isSearching ? 'No matching bookmarks found' : 'This folder is empty'}
      </p>
      {isSearching && (
        <p className="mt-1 text-xs text-stone-400">Try a different search term</p>
      )}
    </div>
  );
}

export function BookmarkGrid({ bookmarks, isSearching = false }: BookmarkGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCols(getColumns(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (bookmarks.length === 0) {
    return <EmptyState isSearching={isSearching} />;
  }

  if (bookmarks.length < MIN_VIRTUALIZE) {
    return (
      <div
        ref={scrollRef}
        className="grid flex-1 items-start gap-3 overflow-y-auto p-4 sm:gap-4 md:p-8"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {bookmarks.map((b) => (
          <BookmarkCard key={b.id} bookmark={b} showFolderPath={isSearching} />
        ))}
      </div>
    );
  }

  const rows = Math.ceil(bookmarks.length / cols);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <VirtualizedContent
        scrollEl={scrollRef}
        rows={rows}
        cols={cols}
        bookmarks={bookmarks}
        showFolderPath={isSearching}
      />
    </div>
  );
}

function VirtualizedContent({
  scrollEl,
  rows,
  cols,
  bookmarks,
  showFolderPath,
}: {
  scrollEl: RefObject<HTMLDivElement | null>;
  rows: number;
  cols: number;
  bookmarks: BookmarkItem[];
  showFolderPath: boolean;
}) {
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollEl.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 2,
  });

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((vr) => {
        const start = vr.index * cols;
        const items = bookmarks.slice(start, start + cols);
        return (
          <div
            key={vr.index}
            className="grid items-start gap-3 px-4 sm:gap-4 md:px-8"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vr.start}px)`,
              paddingTop: vr.index === 0 ? PADDING : GAP / 2,
              paddingBottom: vr.index === rows - 1 ? PADDING : GAP / 2,
            }}
          >
            {items.map((b) => (
              <BookmarkCard key={b.id} bookmark={b} showFolderPath={showFolderPath} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
