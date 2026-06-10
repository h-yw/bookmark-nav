import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookmarkItem } from '../shared/types';
import type { BookmarkUsage } from '../storage/history';
import type { DuplicateUrlGroup } from '../domain/bookmarkAnalysis';

interface DuplicateBookmarksDialogProps {
  group: DuplicateUrlGroup | null;
  history: BookmarkUsage[];
  onClose: () => void;
  onConfirm: (keepBookmark: BookmarkItem, removeBookmarks: BookmarkItem[]) => void;
}

function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="关闭弹窗遮罩"
        className="absolute inset-0 bg-stone-900/25"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-stone-900">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

interface RankedBookmark {
  bookmark: BookmarkItem;
  lastOpened?: number;
  openCount: number;
  rank: number;
}

function rankDuplicates(bookmarks: BookmarkItem[], history: BookmarkUsage[]): RankedBookmark[] {
  const historyById = new Map(history.map((u) => [u.id, u]));
  const historyByUrl = new Map(history.map((u) => [u.url, u]));

  const ranked: RankedBookmark[] = bookmarks.map((bookmark) => {
    const usage = historyById.get(bookmark.id) ?? historyByUrl.get(bookmark.url);
    return {
      bookmark,
      lastOpened: usage?.lastOpened,
      openCount: usage?.count ?? 0,
      rank: 0,
    };
  });

  // Sort by: lastOpened (desc), then openCount (desc), then dateAdded (desc)
  ranked.sort((a, b) => {
    const aTime = a.lastOpened ?? 0;
    const bTime = b.lastOpened ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    if (a.openCount !== b.openCount) return b.openCount - a.openCount;
    return b.bookmark.dateAdded - a.bookmark.dateAdded;
  });

  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });

  return ranked;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

export function DuplicateBookmarksDialog({
  group,
  history,
  onClose,
  onConfirm,
}: DuplicateBookmarksDialogProps) {
  const [keepId, setKeepId] = useState<string | null>(null);
  const ranked = group ? rankDuplicates(group.bookmarks, history) : [];

  useEffect(() => {
    if (ranked.length > 0) {
      // Default to keeping the top-ranked bookmark
      setKeepId(ranked[0].bookmark.id);
    }
  }, [group]);

  if (!group) return null;

  const keepBookmark = ranked.find((r) => r.bookmark.id === keepId)?.bookmark;
  const removeBookmarks = ranked
    .filter((r) => r.bookmark.id !== keepId)
    .map((r) => r.bookmark);

  const handleConfirm = () => {
    if (!keepBookmark || removeBookmarks.length === 0) return;
    onConfirm(keepBookmark, removeBookmarks);
  };

  return (
    <DialogShell title="处理重复链接" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="truncate text-xs text-stone-400">重复 URL</div>
          <div className="mt-0.5 truncate text-sm text-stone-700">{group.normalizedUrl}</div>
          <div className="mt-1 text-xs text-stone-400">共 {group.bookmarks.length} 个重复书签</div>
        </div>

        <p className="text-sm text-stone-500">选择要保留的书签，其他重复项将被删除。已按最近访问和打开次数排序推荐。</p>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {ranked.map((item) => (
            <label
              key={item.bookmark.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                keepId === item.bookmark.id
                  ? 'border-stone-400 bg-white ring-2 ring-stone-300/70'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <input
                type="radio"
                name="keep-bookmark"
                checked={keepId === item.bookmark.id}
                onChange={() => setKeepId(item.bookmark.id)}
                className="mt-0.5 accent-stone-800"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-stone-800">{item.bookmark.title}</span>
                  {item.rank === 1 && (
                    <span className="shrink-0 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      推荐
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-stone-400">{item.bookmark.url}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h6l1.5 1.5h9A1.5 1.5 0 0 1 21.75 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 17.25v-9a1.5 1.5 0 0 1 1.5-1.5Z" />
                    </svg>
                    {item.bookmark.folderPath.join(' / ') || '全部书签'}
                  </span>
                  {item.openCount > 0 && (
                    <span>打开 {item.openCount} 次</span>
                  )}
                  {item.lastOpened !== undefined && (
                    <span>{formatRelativeTime(item.lastOpened)}</span>
                  )}
                  <span>添加于 {new Date(item.bookmark.dateAdded).toLocaleDateString()}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!keepBookmark || removeBookmarks.length === 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            删除 {removeBookmarks.length} 个重复项
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
