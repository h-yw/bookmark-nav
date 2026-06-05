import { useState } from 'react';
import type { FolderNode } from './types';

interface SidebarProps {
  folders: FolderNode[];
  selectedPath: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string[]) => void;
}

export function Sidebar({ folders, selectedPath, isOpen, onClose, onSelect }: SidebarProps) {
  const panel = (
    <aside aria-label="书签文件夹" className="flex h-full w-72 shrink-0 flex-col bg-[#FAFAF8] border-r border-stone-200">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <div className="text-sm font-semibold text-stone-900">书签导航</div>
          <div className="text-xs text-stone-400">文件夹</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭文件夹列表"
          className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 md:hidden"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => onSelect([])}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            selectedPath.length === 0
              ? 'bg-white text-stone-900 font-medium shadow-sm border border-stone-200'
              : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 border border-transparent'
          }`}
        >
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5" />
          </svg>
          <span className="truncate">全部书签</span>
        </button>
      </div>
      <nav aria-label="文件夹树" className="flex-1 overflow-y-auto px-3 pb-4">
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            selectedPath={selectedPath}
            onSelect={onSelect}
            parentPath={[]}
          />
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{panel}</div>
      {isOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="关闭文件夹遮罩"
            className="absolute inset-0 bg-stone-900/20"
            onClick={onClose}
          />
          <div className="relative h-full w-72 max-w-[86vw] shadow-xl">{panel}</div>
        </div>
      )}
    </>
  );
}

function FolderItem({
  folder,
  selectedPath,
  onSelect,
  parentPath,
}: {
  folder: FolderNode;
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  parentPath: string[];
}) {
  const [expanded, setExpanded] = useState(parentPath.length === 0);
  const hasChildren = folder.children.length > 0;
  const currentPath = [...parentPath, folder.id];
  const isSelected =
    selectedPath.length === currentPath.length &&
    selectedPath.every((id, i) => id === currentPath[i]);

  return (
    <div className="mb-0.5">
      <div
        className={`flex w-full items-center gap-1 rounded-lg border text-sm transition-colors ${
          isSelected
            ? 'bg-white text-stone-900 font-medium shadow-sm border-stone-200'
            : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 border-transparent'
        }`}
        style={{ paddingLeft: `${12 + parentPath.length * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? `收起 ${folder.title}` : `展开 ${folder.title}`}
            aria-expanded={expanded}
            className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-700"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <svg
              className={`h-3 w-3 shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(currentPath)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left"
        >
          <span className="truncate">{folder.title}</span>
          {folder.bookmarkCount > 0 && (
            <span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] leading-none text-stone-400">
              {folder.bookmarkCount}
            </span>
          )}
        </button>
      </div>
      {expanded &&
        hasChildren &&
        folder.children.map((child) => (
          <FolderItem
            key={child.id}
            folder={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
            parentPath={currentPath}
          />
        ))}
    </div>
  );
}
