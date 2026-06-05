import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { BookmarkItem, FolderNode } from './types';

interface EditBookmarkDialogProps {
  bookmark: BookmarkItem | null;
  error?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: { title: string; url: string }) => void;
}

interface DeleteBookmarkDialogProps {
  bookmark: BookmarkItem | null;
  error?: string | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface DeleteBookmarksDialogProps {
  bookmarks: BookmarkItem[];
  error?: string | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface MoveBookmarksDialogProps {
  bookmarks: BookmarkItem[];
  folders: FolderNode[];
  error?: string | null;
  moving?: boolean;
  onClose: () => void;
  onConfirm: (folderId: string) => void;
}

interface ClearLocalDataDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface ResetSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface ClearHistoryDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}

interface FolderOption {
  id: string;
  label: string;
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
        className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
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

export function EditBookmarkDialog({ bookmark, error, saving = false, onClose, onSave }: EditBookmarkDialogProps) {
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
            disabled={saving}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

export function DeleteBookmarkDialog({ bookmark, error, deleting = false, onClose, onConfirm }: DeleteBookmarkDialogProps) {
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
            disabled={deleting}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? '删除中...' : '删除'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function DeleteBookmarksDialog({
  bookmarks,
  error,
  deleting = false,
  onClose,
  onConfirm,
}: DeleteBookmarksDialogProps) {
  if (bookmarks.length === 0) return null;

  return (
    <DialogShell title="批量删除书签" onClose={onClose}>
      <div className="space-y-4">
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          {bookmarks.slice(0, 8).map((bookmark) => (
            <div key={bookmark.id}>
              <div className="truncate text-sm font-medium text-stone-800">{bookmark.title}</div>
              <div className="truncate text-xs text-stone-400">{bookmark.url}</div>
            </div>
          ))}
          {bookmarks.length > 8 && (
            <div className="text-xs text-stone-400">另有 {bookmarks.length - 8} 个书签</div>
          )}
        </div>
        <p className="text-sm leading-6 text-stone-500">将删除 {bookmarks.length} 个浏览器书签，无法在本页面内撤销。</p>
        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? '删除中...' : '删除'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function MoveBookmarksDialog({
  bookmarks,
  folders,
  error,
  moving = false,
  onClose,
  onConfirm,
}: MoveBookmarksDialogProps) {
  const [folderId, setFolderId] = useState('');
  const folderOptions = useMemo(() => flattenFolderOptions(folders), [folders]);

  useEffect(() => {
    setFolderId(folderOptions[0]?.id ?? '');
  }, [bookmarks, folderOptions]);

  if (bookmarks.length === 0) return null;

  return (
    <DialogShell title="移动书签" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="text-sm text-stone-700">将移动 {bookmarks.length} 个书签到：</div>
          <select
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400"
          >
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(folderId)}
            disabled={moving || !folderId}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {moving ? '移动中...' : '移动'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function ClearLocalDataDialog({ open, onClose, onConfirm }: ClearLocalDataDialogProps) {
  if (!open) return null;

  return (
    <DialogShell title="清理本地数据" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="text-sm font-medium text-stone-800">将恢复默认设置并清空常用/最近记录</div>
          <div className="mt-1 text-sm leading-6 text-stone-500">
            浏览器书签不会被删除，也不会修改书签文件夹结构。
          </div>
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
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500"
          >
            清理
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function ResetSettingsDialog({ open, onClose, onConfirm }: ResetSettingsDialogProps) {
  if (!open) return null;

  return (
    <DialogShell title="恢复默认设置" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="text-sm font-medium text-stone-800">将搜索和展示配置恢复为默认值</div>
          <div className="mt-1 text-sm leading-6 text-stone-500">
            常用/最近记录和浏览器书签不会被清理。
          </div>
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
            onClick={onConfirm}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-700"
          >
            恢复
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

export function ClearHistoryDialog({ open, count, onClose, onConfirm }: ClearHistoryDialogProps) {
  if (!open) return null;

  return (
    <DialogShell title="清空打开记录" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div className="text-sm font-medium text-stone-800">将清空 {count} 条常用/最近打开记录</div>
          <div className="mt-1 text-sm leading-6 text-stone-500">
            这只会影响常用书签和最近打开视图，不会删除浏览器书签。
          </div>
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
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500"
          >
            清空
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

function flattenFolderOptions(folders: FolderNode[], level = 0): FolderOption[] {
  return folders.flatMap((folder) => [
    {
      id: folder.id,
      label: `${'　'.repeat(level)}${folder.title}`,
    },
    ...flattenFolderOptions(folder.children, level + 1),
  ]);
}
