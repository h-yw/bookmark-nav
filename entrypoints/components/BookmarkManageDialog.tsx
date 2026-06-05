import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { BookmarkItem } from './types';

interface EditBookmarkDialogProps {
  bookmark: BookmarkItem | null;
  error?: string | null;
  onClose: () => void;
  onSave: (input: { title: string; url: string }) => void;
}

interface DeleteBookmarkDialogProps {
  bookmark: BookmarkItem | null;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="关闭弹窗遮罩"
        className="absolute inset-0 bg-stone-900/25"
        onClick={onClose}
      />
      <section className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <button
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

export function EditBookmarkDialog({ bookmark, error, onClose, onSave }: EditBookmarkDialogProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(bookmark?.title ?? '');
    setUrl(bookmark?.url ?? '');
    setValidationError(null);
  }, [bookmark]);

  if (!bookmark) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim() || '未命名';
    const nextUrl = url.trim();

    try {
      const parsed = new URL(nextUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setValidationError('请输入 http 或 https 开头的网址');
        return;
      }
    } catch {
      setValidationError('请输入有效的网址');
      return;
    }

    setValidationError(null);
    onSave({ title: nextTitle, url: nextUrl });
  };

  return (
    <DialogShell title="编辑书签" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-stone-700">标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-stone-700">网址</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400"
          />
        </label>
        {(validationError || error) && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {validationError ?? error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
          >
            保存
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

export function DeleteBookmarkDialog({ bookmark, error, onClose, onConfirm }: DeleteBookmarkDialogProps) {
  if (!bookmark) return null;

  return (
    <DialogShell title="删除书签" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="line-clamp-2 text-sm font-medium text-stone-800">{bookmark.title}</div>
          <div className="mt-1 truncate text-xs text-stone-400">{bookmark.url}</div>
        </div>
        <p className="text-sm leading-6 text-stone-500">删除后会从浏览器书签中移除，无法在本页面内撤销。</p>
        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
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
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500"
          >
            删除
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
