# 代码审查：代码质量与性能

> 状态: 部分完成
> 更新日期: 2026-06-04

## P2 -- 代码质量

### [ ] Q-01: API 风格不一致 (browser vs chrome)
- **文件**: 已删除 `background.ts`（空壳），问题自动解决
- **备注**: 其余文件统一使用 `chrome` API

### [x] Q-02: 模板占位符未清理
- **修复**: package.json name/description 已更新，popup title 改为 "Bookmark Search"

### [x] Q-03: popup/App.css 是空文件
- **修复**: 已删除

### [x] Q-04: Inter 字体引用但未引入
- **修复**: 两个 style.css 中移除 Inter，改用 `system-ui, -apple-system, sans-serif`

### [x] Q-05: wxt.config.ts 硬编码 Edge 路径
- **修复**: 改为 `process.env.EDGE_BINARY`

### [x] Q-06: background.ts 是空壳
- **修复**: 已删除

### [ ] Q-07: 硬编码颜色值散布多处
- **状态**: 保留。颜色值在 CLAUDE.md 中有文档，Tailwind arbitrary values 是可接受的模式。

### [x] Q-08: tsconfig 未显式设置 strict 模式
- **修复**: 添加 `"strict": true`

### [x] Q-09: .env 未加入 .gitignore
- **修复**: 添加 `.env` 和 `.env.*`

### [x] Q-10: manifest.icons 未配置
- **修复**: 添加 icons 配置（16/32/48/96/128）

## P2 -- 性能

### [x] Q-11: SearchBar 缺少防抖
- **修复**: 添加 200ms debounce（useRef + setTimeout）

### [ ] Q-12: BookmarkGrid 缺少虚拟化
- **状态**: 延后。spec.md 明确 MVP 不做虚拟滚动。

### [x] Q-13: flattenBookmarks 使用 push 展开有栈溢出风险
- **修复**: 改为 for...of 循环 push

### [x] Q-14: 所有文件夹默认展开
- **修复**: 顶层文件夹默认展开，子文件夹默认折叠
