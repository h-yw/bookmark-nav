# Bookmark Nav

浏览器书签 → 网址导航页（覆盖新标签页）。WXT + React 19 + Tailwind CSS v4。

@docs/spec.md 原始需求规格。
@wxt.config.ts 项目配置。
@package.json 依赖和脚本。

## 命令

```bash
pnpm dev          # 开发模式，Edge Dev，HMR
pnpm build        # 生产构建 → .output/chrome-mv3/
pnpm compile      # TypeScript 类型检查（node_modules 错误忽略）
pnpm test         # 运行测试（vitest）
pnpm lint         # 代码检查（biome）
pnpm lint:fix     # 自动修复 lint 问题
```

## IMPORTANT: 书签 API 坑

- `chrome.bookmarks.getTree()` 返回树，`tree[0].children` 是根节点（书签栏、其他书签等）
- `flattenBookmarks()` 从 `tree[0].children` 开始递归，不是 `tree[0]`
- 所有书签的 `folderPath` 都不为空（根节点 title 会加入路径）
- `selectedPath=[]` 表示"全部书签"，返回所有数据，不能过滤 `folderPath.length === 0`

## IMPORTANT: Favicon

用 `chrome://favicon/size/32@2x/{origin}`，不要用外部 API。传 `new URL(url).origin`（不是完整 URL）。这是扩展内部协议，无限流，不需要额外权限。

## 性能

- BookmarkGrid 使用 @tanstack/react-virtual 虚拟化，< 50 条书签时跳过虚拟化直接渲染
- favicon.ts 有模块级 Map 缓存，相同 URL 只解析一次
- SearchBar 有 200ms 防抖

## 代码规范

- 组件用具名导出 `export function Xxx()`，放 `entrypoints/components/`
- 页面级 `App.tsx` 用默认导出 `export default function App()`
- 样式只用 Tailwind className，不写 CSS 文件，不用 CSS-in-JS
- Tailwind v4：用 `@import 'tailwindcss'`，不要用 v3 的 `@tailwind base/components/utilities`
- 书签操作用 `bookmarks.ts` 的工具函数，不要在组件里直接调 `chrome.bookmarks`
- 跳转用 `chrome.tabs.update({ url })`，不用 `<a>` 标签默认行为
- 导入路径：入口文件（main.tsx）带 `.tsx` 后缀，组件间导入省略后缀
- 不要用 `any` 类型
- 不要添加 content_scripts — 本扩展不注入页面
- 权限只声明 `bookmarks`，不要加多余的

## 浅色主题色值

```
bg=#F6F5F3  sidebar=#FAFAF8  card=#FFFFFF  border=#E7E5E4
```

文字层级：`text-stone-900` > `text-stone-500` > `text-stone-400`
hover：`shadow-md`、`border-stone-300`、`translate-y-[-1px]`

## 验证

每次改动后：
1. `pnpm build` 必须成功
2. 检查 `.output/chrome-mv3/manifest.json` — permissions 只有 `bookmarks`，无 content_scripts
