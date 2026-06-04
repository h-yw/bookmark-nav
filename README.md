# Bookmark Nav

浏览器书签导航页扩展 — 将收藏夹变成美观的网址导航，覆盖新标签页。

## 技术栈

- WXT 0.20+ + React 19 + Tailwind CSS v4
- TypeScript, Vitest, Biome

## 开发

```bash
pnpm dev          # 开发模式（Edge Dev）
pnpm build        # 生产构建
pnpm test         # 运行测试
pnpm compile      # 类型检查
pnpm lint         # 代码检查
```

## 功能

- 书签按文件夹分组展示，侧边栏可折叠文件夹树
- 书签卡片网格，支持舒适/紧凑两种密度
- 搜索过滤（标题 + URL），200ms 防抖
- 常用书签和最近打开视图
- 网页搜索模式（Google / Bing / DuckDuckGo / 百度）
- 弹窗快速搜索（popup）
- 设置面板（搜索引擎、文件夹范围、卡片密度等）
- 移动端响应式适配
