import type { ReactNode } from 'react';
import type { AppSettings, CardDensity, SearchEngineId, SearchMode } from './settings';
import { DEFAULT_SETTINGS, SEARCH_ENGINES } from './settings';

interface SettingsDrawerProps {
  open: boolean;
  settings: AppSettings;
  historyCount: number;
  onClose: () => void;
  onChange: (settings: AppSettings) => void;
  onClearHistory: () => void;
}

function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-stone-200 px-5 py-4">
      <h3 className="mb-3 text-sm font-medium text-stone-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm text-stone-700">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs leading-5 text-stone-400">{hint}</div>}
    </label>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-stone-100 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDrawer({
  open,
  settings,
  historyCount,
  onClose,
  onChange,
  onClearHistory,
}: SettingsDrawerProps) {
  if (!open) return null;

  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="关闭设置遮罩"
        className="absolute inset-0 bg-stone-900/20"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-[360px] max-w-[92vw] flex-col border-l border-stone-200 bg-[#FAFAF8] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">设置</h2>
            <p className="mt-0.5 text-xs text-stone-400">配置会立即生效</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SettingGroup title="搜索">
            <Field label="默认搜索模式">
              <Segment<SearchMode>
                value={settings.defaultSearchMode}
                onChange={(value) => update({ defaultSearchMode: value })}
                options={[
                  { value: 'bookmarks', label: '书签' },
                  { value: 'web', label: '网页' },
                ]}
              />
            </Field>
            <Field label="默认搜索引擎">
              <select
                value={settings.searchEngine}
                onChange={(e) => update({ searchEngine: e.target.value as SearchEngineId })}
                className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
              >
                {SEARCH_ENGINES.map((engine) => (
                  <option key={engine.id} value={engine.id}>
                    {engine.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5">
              <input
                type="checkbox"
                checked={settings.noResultWebSearch}
                onChange={(e) => update({ noResultWebSearch: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm text-stone-700">书签无结果时允许网页搜索</span>
                <span className="block text-xs leading-5 text-stone-400">书签模式按 Enter 时生效。</span>
              </span>
            </label>
          </SettingGroup>

          <SettingGroup title="书签展示">
            <Field label="文件夹范围">
              <Segment
                value={settings.bookmarkScope}
                onChange={(value) => update({ bookmarkScope: value })}
                options={[
                  { value: 'direct', label: '仅当前文件夹' },
                  { value: 'nested', label: '包含子文件夹' },
                ]}
              />
            </Field>
            <Field label="卡片密度">
              <Segment<CardDensity>
                value={settings.cardDensity}
                onChange={(value) => update({ cardDensity: value })}
                options={[
                  { value: 'comfortable', label: '舒适' },
                  { value: 'compact', label: '紧凑' },
                ]}
              />
            </Field>
          </SettingGroup>

          <SettingGroup title="历史记录">
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-stone-700">常用和最近打开</div>
                  <div className="mt-0.5 text-xs text-stone-400">已记录 {historyCount} 条书签打开记录</div>
                </div>
                <button
                  type="button"
                  disabled={historyCount === 0}
                  onClick={onClearHistory}
                  className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  清空
                </button>
              </div>
            </div>
          </SettingGroup>
        </div>

        <div className="border-t border-stone-200 px-5 py-4">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SETTINGS)}
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            恢复默认设置
          </button>
        </div>
      </aside>
    </div>
  );
}
