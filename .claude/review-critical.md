# 代码审查：关键问题（Bug 和可访问性）

> 状态: 已完成
> 更新日期: 2026-06-04

## P0 -- 功能 Bug

### [x] C-01: selectedPath 基于 title 而非 id
- **文件**: `bookmarks.ts`, `Sidebar.tsx`, `types.ts`, `newtab/App.tsx`
- **修复**: BookmarkItem 增加 `folderIdPath: string[]`；flattenBookmarks/buildFolderTree 传递 id 路径；Sidebar 改用 id 比较；getBookmarksInFolder 改用 folderIdPath 匹配

### [x] C-02: chrome.tabs.update 缺少错误处理
- **文件**: `BookmarkCard.tsx`, `popup/App.tsx`
- **修复**: try/catch 包裹，fallback 到 window.open

### [x] C-03: favicon img 无 onError 处理
- **文件**: `BookmarkCard.tsx`, `popup/App.tsx`
- **修复**: 添加 onError 隐藏破损图片

### [x] C-04: chrome.bookmarks.getTree 无错误处理和卸载保护
- **文件**: `newtab/App.tsx`, `popup/App.tsx`
- **修复**: 添加 `let cancelled = false` 守卫

### [x] C-05: Ctrl/Cmd+Click 被拦截
- **文件**: `BookmarkCard.tsx`
- **修复**: 检测修饰键直接 return

### [x] C-06: 空标题书签/文件夹被当作 falsy 处理
- **文件**: `bookmarks.ts`
- **修复**: 统一使用 `node.title || 'Untitled'`

## P1 -- 可访问性

### [x] C-07: 搜索输入框缺少 aria-label
- **文件**: `SearchBar.tsx`, `popup/App.tsx`
- **修复**: 添加 `aria-label="Search bookmarks"`

### [x] C-08: 清除按钮缺少 aria-label
- **文件**: `SearchBar.tsx`
- **修复**: 添加 `aria-label="Clear search"`

### [x] C-09: 装饰性 SVG 未标记 aria-hidden
- **文件**: `SearchBar.tsx`, `BookmarkCard.tsx`, `popup/App.tsx`
- **修复**: 添加 `aria-hidden="true"`

### [x] C-10: nav/aside 元素缺少 aria-label
- **文件**: `Sidebar.tsx`
- **修复**: 添加 `aria-label="Bookmark folders"` 和 `aria-label="Folder tree"`

### [x] C-11: 文件夹展开/折叠缺少 aria-expanded
- **文件**: `Sidebar.tsx`
- **修复**: 添加 `aria-expanded={expanded}`

### [x] C-12: 空状态缺少 role="status"
- **文件**: `BookmarkGrid.tsx`
- **修复**: 添加 `role="status"` 和 `aria-live="polite"`

### [x] C-13: favicon alt 应包含网站名称
- **文件**: `BookmarkCard.tsx`, `popup/App.tsx`
- **修复**: `alt={bookmark.title + ' favicon'}`

### [x] C-14: 截断标题需要 title 属性
- **文件**: `BookmarkCard.tsx`
- **修复**: 添加 `title={bookmark.title}`
