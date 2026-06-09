import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookmarkItem } from './types';
import type { DeadLinkResult, DeadLinkDetectionProgress } from './deadLinkDetection';
import { detectDeadLinks } from './deadLinkDetection';
import { simplifyUrl } from './utils';

interface DeadLinkDetectionDialogProps {
  bookmarks: BookmarkItem[];
  onClose: () => void;
  onComplete: (progress: DeadLinkDetectionProgress, results: DeadLinkResult[]) => void;
  onDeleteDeadLinks: (bookmarks: BookmarkItem[]) => void;
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

type DetectionPhase = 'confirm' | 'detecting' | 'done';

export function DeadLinkDetectionDialog({
  bookmarks,
  onClose,
  onComplete,
  onDeleteDeadLinks,
}: DeadLinkDetectionDialogProps) {
  const [phase, setPhase] = useState<DetectionPhase>('confirm');
  const [progress, setProgress] = useState<DeadLinkDetectionProgress | null>(null);
  const [results, setResults] = useState<DeadLinkResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (bookmarks.length === 0) return null;

  const handleStart = async () => {
    setPhase('detecting');
    setError(null);
    setCancelling(false);
    abortRef.current = new AbortController();

    try {
      const detectionResults = await detectDeadLinks(
        bookmarks,
        (p, r) => {
          setProgress(p);
          setResults([...r]);
        },
        abortRef.current.signal
      );
      setResults(detectionResults);
      const finalProgress = detectionResults.reduce<DeadLinkDetectionProgress>(
        (summary, result) => ({
          ...summary,
          checked: summary.checked + 1,
          alive: summary.alive + (result.status === 'alive' ? 1 : 0),
          dead: summary.dead + (result.status === 'dead' ? 1 : 0),
          unknown: summary.unknown + (result.status === 'unknown' ? 1 : 0),
        }),
        { total: bookmarks.length, checked: 0, alive: 0, dead: 0, unknown: 0 }
      );
      setProgress(finalProgress);
      onComplete(finalProgress, detectionResults);
      setPhase('done');
      setCancelling(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测失败');
      setPhase('done');
      setCancelling(false);
    }
  };

  const handleCancel = () => {
    setCancelling(true);
    abortRef.current?.abort();
  };

  const deadLinks = results.filter((r) => r.status === 'dead');
  const unknownLinks = results.filter((r) => r.status === 'unknown');

  const handleDeleteDead = () => {
    onDeleteDeadLinks(deadLinks.map((r) => r.bookmark));
  };

  return (
    <DialogShell title="检测失效链接" onClose={onClose}>
      {phase === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
            <div className="text-sm font-medium text-stone-800">将检测 {bookmarks.length} 个书签</div>
            <div className="mt-1 text-sm leading-6 text-stone-500">
              检测会向每个链接发送网络请求，以确认是否可访问。
            </div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            部分网站可能因跨域限制无法检测，会标记为"未知"。
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
            >
              开始检测
            </button>
          </div>
        </div>
      )}

      {phase === 'detecting' && progress && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-stone-600">检测中...</span>
              <span className="text-stone-500">{progress.checked} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-900 transition-all"
                style={{ width: `${(progress.checked / progress.total) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-stone-400">
              <span>可达 {progress.alive}</span>
              <span>失效 {progress.dead}</span>
              <span>未知 {progress.unknown}</span>
            </div>
          </div>

          {results.length > 0 && (
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {results.slice(-10).reverse().map((result) => (
                <div
                  key={result.bookmark.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    result.status === 'dead'
                      ? 'border-red-100 bg-red-50 text-red-700'
                      : result.status === 'alive'
                        ? 'border-green-100 bg-green-50 text-green-700'
                        : 'border-stone-100 bg-stone-50 text-stone-500'
                  }`}
                >
                  <span className="shrink-0">
                    {result.status === 'dead' ? '!' : result.status === 'alive' ? '✓' : '?'}
                  </span>
                  <span className="truncate">{result.bookmark.title}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              {cancelling ? '正在取消...' : '取消检测'}
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && progress && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-green-700">{progress.alive}</div>
              <div className="text-xs text-green-600">可达</div>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-red-700">{progress.dead}</div>
              <div className="text-xs text-red-600">疑似失效</div>
            </div>
            <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-stone-700">{progress.unknown}</div>
              <div className="text-xs text-stone-500">未知</div>
            </div>
          </div>

          {deadLinks.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium text-stone-700">疑似失效链接</div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {deadLinks.map((result) => (
                  <div
                    key={result.bookmark.id}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                  >
                    <div className="truncate text-sm font-medium text-red-800">{result.bookmark.title}</div>
                    <div className="mt-0.5 truncate text-xs text-red-500">{simplifyUrl(result.bookmark.url)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unknownLinks.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium text-stone-700">未知状态</div>
              <div className="max-h-32 space-y-1.5 overflow-y-auto">
                {unknownLinks.slice(0, 10).map((result) => (
                  <div
                    key={result.bookmark.id}
                    className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
                  >
                    <div className="truncate text-sm text-stone-700">{result.bookmark.title}</div>
                    <div className="mt-0.5 truncate text-xs text-stone-400">{result.error}</div>
                  </div>
                ))}
                {unknownLinks.length > 10 && (
                  <div className="text-xs text-stone-400">另有 {unknownLinks.length - 10} 个</div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              关闭
            </button>
            {deadLinks.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteDead}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500"
              >
                删除 {deadLinks.length} 个疑似失效链接
              </button>
            )}
          </div>
        </div>
      )}
    </DialogShell>
  );
}
