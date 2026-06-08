import type { ReactNode } from 'react';
import type { BookmarkReport as BookmarkReportData } from './bookmarkAnalysis';
import { simplifyUrl } from './utils';

interface BookmarkReportProps {
  report: BookmarkReportData;
}

export function BookmarkReport({ report }: BookmarkReportProps) {
  const totalFindings =
    report.duplicateUrlGroups.length +
    report.emptyFolders.length +
    report.weakTitles.length +
    report.staleBookmarks.length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="重复链接" value={report.duplicateUrlGroups.length} />
          <MetricCard label="空文件夹" value={report.emptyFolders.length} />
          <MetricCard label="标题异常" value={report.weakTitles.length} />
          <MetricCard label="长期未打开" value={report.staleBookmarks.length} />
        </div>

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
                  <div className="truncate text-xs text-stone-400">{group.normalizedUrl}</div>
                  <div className="mt-2 space-y-2">
                    {group.bookmarks.map((bookmark) => (
                      <BookmarkLine
                        key={bookmark.id}
                        title={bookmark.title}
                        url={bookmark.url}
                        meta={bookmark.folderPath.join(' / ') || '全部书签'}
                      />
                    ))}
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
                />
              ))}
            </ReportSection>
          </>
        )}
      </div>
    </div>
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
}: {
  title: string;
  url: string;
  meta: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-100 bg-white px-3 py-2">
      <div className="truncate text-sm font-medium text-stone-800">{title}</div>
      <div className="mt-0.5 truncate text-xs text-stone-400">{simplifyUrl(url)}</div>
      <div className="mt-1 truncate text-xs text-stone-500">{meta}</div>
    </div>
  );
}

function SimpleLine({ title }: { title: string }) {
  return (
    <div className="truncate rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-700">
      {title}
    </div>
  );
}
