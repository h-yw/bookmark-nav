import type { ReactNode } from 'react';
import type { BookmarkReport as BookmarkReportData, DuplicateUrlGroup } from '../domain/bookmarkAnalysis';
import type { DeadLinkDetectionRecord, DeadLinkDetectionRecordItem } from '../storage/deadLinkRecords';
import type { BookmarkUsage } from '../storage/history';
import type { BookmarkItem } from '../shared/types';
import { openUrl, simplifyUrl } from '../shared/utils';

interface BookmarkReportProps {
  report: BookmarkReportData;
  history: BookmarkUsage[];
  allBookmarks: BookmarkItem[];
  deadLinkRecord: DeadLinkDetectionRecord | null;
  onProcessDuplicate: (group: DuplicateUrlGroup) => void;
  onNavigateToFolder: (folderIdPath: string[]) => void;
  onDetectDeadLinks: () => void;
}

export function BookmarkReport({
  report,
  history,
  allBookmarks,
  deadLinkRecord,
  onProcessDuplicate,
  onNavigateToFolder,
  onDetectDeadLinks,
}: BookmarkReportProps) {
  const totalFindings =
    report.duplicateUrlGroups.length +
    report.similarUrlGroups.length +
    report.emptyFolders.length +
    report.weakTitles.length +
    report.staleBookmarks.length;

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        duplicateUrlGroups: report.duplicateUrlGroups.length,
        similarUrlGroups: report.similarUrlGroups.length,
        emptyFolders: report.emptyFolders.length,
        weakTitles: report.weakTitles.length,
        staleBookmarks: report.staleBookmarks.length,
      },
      duplicateUrlGroups: report.duplicateUrlGroups.map((group) => ({
        normalizedUrl: group.normalizedUrl,
        bookmarks: group.bookmarks.map((b) => ({ title: b.title, url: b.url, folderPath: b.folderPath })),
      })),
      similarUrlGroups: report.similarUrlGroups.map((group) => ({
        domain: group.domain,
        bookmarks: group.bookmarks.map((b) => ({ title: b.title, url: b.url, folderPath: b.folderPath })),
      })),
      emptyFolders: report.emptyFolders.map((f) => ({ title: f.title, path: f.path })),
      weakTitles: report.weakTitles.map((w) => ({ title: w.bookmark.title, url: w.bookmark.url, reason: w.reason })),
      staleBookmarks: report.staleBookmarks.map((s) => ({ title: s.bookmark.title, url: s.bookmark.url, reason: s.reason })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmark-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const historyById = new Map(history.map((u) => [u.id, u]));
  const historyByUrl = new Map(history.map((u) => [u.url, u]));

  function getLastOpened(bookmarkId: string, bookmarkUrl: string): number | undefined {
    return historyById.get(bookmarkId)?.lastOpened ?? historyByUrl.get(bookmarkUrl)?.lastOpened;
  }

  function getOpenCount(bookmarkId: string, bookmarkUrl: string): number {
    return historyById.get(bookmarkId)?.count ?? historyByUrl.get(bookmarkUrl)?.count ?? 0;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="重复链接" value={report.duplicateUrlGroups.length} />
            <MetricCard label="相似链接" value={report.similarUrlGroups.length} />
            <MetricCard label="标题异常" value={report.weakTitles.length} />
            <MetricCard label="长期未打开" value={report.staleBookmarks.length} />
          </div>
          <button
            type="button"
            onClick={onDetectDeadLinks}
            className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            检测失效链接
          </button>
        </div>

        {deadLinkRecord && (
          <DeadLinkRecordPanel record={deadLinkRecord} bookmarkCount={allBookmarks.length} />
        )}

        {totalFindings === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="text-sm font-medium text-stone-800">没有发现需要关注的书签</div>
            <div className="mt-1 text-sm text-stone-400">当前报告只做本地只读分析，不会修改浏览器书签。</div>
          </div>
        ) : (
          <>
            <ReportSection title="重复链接" count={report.duplicateUrlGroups.length}>
              {report.duplicateUrlGroups.slice(0, 20).map((group) => (
                <div key={group.normalizedUrl} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-xs text-stone-400">{group.normalizedUrl}</div>
                    <button
                      type="button"
                      onClick={() => onProcessDuplicate(group)}
                      className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-stone-700"
                    >
                      处理
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {group.bookmarks.map((bookmark) => {
                      const lastOpened = getLastOpened(bookmark.id, bookmark.url);
                      const openCount = getOpenCount(bookmark.id, bookmark.url);
                      return (
                        <BookmarkLine
                          key={bookmark.id}
                          title={bookmark.title}
                          url={bookmark.url}
                          meta={bookmark.folderPath.join(' / ') || '全部书签'}
                          lastOpened={lastOpened}
                          openCount={openCount}
                          folderIdPath={bookmark.folderIdPath}
                          onNavigateToFolder={onNavigateToFolder}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </ReportSection>

            <ReportSection title="相似链接" count={report.similarUrlGroups.length}>
              <p className="mb-3 text-xs text-stone-400">同一域名下有多个书签，可能来自同一网站的不同页面。</p>
              {report.similarUrlGroups.slice(0, 15).map((group) => (
                <div key={group.domain} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm font-medium text-stone-700">{group.domain}</div>
                    <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-500">{group.bookmarks.length} 个</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {group.bookmarks.slice(0, 5).map((bookmark) => {
                      const lastOpened = getLastOpened(bookmark.id, bookmark.url);
                      const openCount = getOpenCount(bookmark.id, bookmark.url);
                      return (
                        <BookmarkLine
                          key={bookmark.id}
                          title={bookmark.title}
                          url={bookmark.url}
                          meta={bookmark.folderPath.join(' / ') || '全部书签'}
                          lastOpened={lastOpened}
                          openCount={openCount}
                          folderIdPath={bookmark.folderIdPath}
                          onNavigateToFolder={onNavigateToFolder}
                        />
                      );
                    })}
                    {group.bookmarks.length > 5 && (
                      <div className="text-xs text-stone-400">另有 {group.bookmarks.length - 5} 个书签</div>
                    )}
                  </div>
                </div>
              ))}
            </ReportSection>

            <ReportSection title="空文件夹" count={report.emptyFolders.length}>
              {report.emptyFolders.slice(0, 30).map((folder) => (
                <SimpleLine key={folder.id} title={folder.path.join(' / ')} />
              ))}
            </ReportSection>

            <ReportSection title="标题异常" count={report.weakTitles.length}>
              {report.weakTitles.slice(0, 30).map(({ bookmark, reason }) => (
                <BookmarkLine
                  key={bookmark.id}
                  title={bookmark.title}
                  url={bookmark.url}
                  meta={reason}
                />
              ))}
            </ReportSection>

            <ReportSection title="长期未打开" count={report.staleBookmarks.length}>
              {report.staleBookmarks.slice(0, 30).map(({ bookmark, reason }) => (
                <BookmarkLine
                  key={bookmark.id}
                  title={bookmark.title}
                  url={bookmark.url}
                  meta={reason}
                  folderIdPath={bookmark.folderIdPath}
                  onNavigateToFolder={onNavigateToFolder}
                />
              ))}
            </ReportSection>
          </>
        )}
      </div>
    </div>
  );
}

function DeadLinkRecordPanel({
  record,
  bookmarkCount,
}: {
  record: DeadLinkDetectionRecord;
  bookmarkCount: number;
}) {
  const attentionItems = record.results
    .filter((item) => item.status !== 'alive')
    .slice(0, 6);
  const coverageLabel =
    record.total === bookmarkCount ? `${record.total} 个书签` : `${record.total} / ${bookmarkCount} 个书签`;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">最近失效检测</h2>
          <div className="mt-1 text-xs text-stone-400">
            {formatDateTime(record.createdAt)} · 覆盖 {coverageLabel}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
          <SmallStat label="可访问" value={record.alive} />
          <SmallStat label="疑似失效" value={record.dead} />
          <SmallStat label="无法确认" value={record.unknown} />
        </div>
      </div>

      {attentionItems.length > 0 && (
        <div className="mt-4 space-y-2">
          {attentionItems.map((item) => (
            <DeadLinkRecordLine key={item.bookmarkId} item={item} />
          ))}
          {record.dead + record.unknown > attentionItems.length && (
            <div className="text-xs text-stone-400">
              另有 {record.dead + record.unknown - attentionItems.length} 个需要关注
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function DeadLinkRecordLine({ item }: { item: DeadLinkDetectionRecordItem }) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => openUrl(item.url)}
          className="group/link min-w-0 cursor-pointer rounded-md text-left transition-colors hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70"
        >
          <div className="truncate text-sm font-medium text-stone-800 group-hover/link:text-stone-950 group-hover/link:underline">
            {item.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-stone-400 group-hover/link:text-stone-600">
            {simplifyUrl(item.url)}
          </div>
        </button>
        <span className="shrink-0 rounded-full bg-stone-200 px-2 py-1 text-xs text-stone-600">
          {formatDeadLinkStatus(item)}
        </span>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
      {count > 30 && (
        <div className="mt-3 text-xs text-stone-400">仅显示前 30 项</div>
      )}
    </section>
  );
}

function BookmarkLine({
  title,
  url,
  meta,
  lastOpened,
  openCount,
  folderIdPath,
  onNavigateToFolder,
}: {
  title: string;
  url: string;
  meta: string;
  lastOpened?: number;
  openCount?: number;
  folderIdPath?: string[];
  onNavigateToFolder?: (folderIdPath: string[]) => void;
}) {
  const handleFolderClick = () => {
    if (folderIdPath && onNavigateToFolder) {
      onNavigateToFolder(folderIdPath);
    }
  };

  return (
    <div className="min-w-0 rounded-lg border border-stone-100 bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => openUrl(url)}
        className="group/link block w-full min-w-0 cursor-pointer rounded-md text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70"
      >
        <div className="truncate text-sm font-medium text-stone-800 group-hover/link:text-stone-950 group-hover/link:underline">
          {title}
        </div>
        <div className="mt-0.5 truncate text-xs text-stone-400 group-hover/link:text-stone-600">
          {simplifyUrl(url)}
        </div>
      </button>
      <div className="mt-1 flex items-center gap-2 truncate text-xs text-stone-500">
        <span className={`flex items-center gap-1 truncate ${folderIdPath && onNavigateToFolder ? 'cursor-pointer hover:text-stone-700' : ''}`}>
          <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h6l1.5 1.5h9A1.5 1.5 0 0 1 21.75 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5H3.75A1.5 1.5 0 0 1 2.25 17.25v-9a1.5 1.5 0 0 1 1.5-1.5Z" />
          </svg>
          {folderIdPath && onNavigateToFolder ? (
            <button
              type="button"
              onClick={handleFolderClick}
              className="cursor-pointer truncate rounded-sm hover:text-stone-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70"
            >
              {meta}
            </button>
          ) : (
            <span className="truncate">{meta}</span>
          )}
        </span>
        {openCount !== undefined && openCount > 0 && (
          <span className="shrink-0 text-stone-400">打开 {openCount} 次</span>
        )}
        {lastOpened !== undefined && (
          <span className="shrink-0 text-stone-400">{formatRelativeTime(lastOpened)}</span>
        )}
      </div>
    </div>
  );
}

function formatDeadLinkStatus(item: DeadLinkDetectionRecordItem): string {
  if (item.status === 'dead') return item.error ? `疑似失效 · ${item.error}` : '疑似失效';
  return item.error ? `无法确认 · ${item.error}` : '无法确认';
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function SimpleLine({ title }: { title: string }) {
  return (
    <div className="truncate rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-700">
      {title}
    </div>
  );
}
