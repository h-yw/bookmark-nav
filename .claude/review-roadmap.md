# 代码审查：架构改进路线图

> 状态: 完成
> 更新日期: 2026-06-04

## P3 -- 长期改进

### [x] R-01: 初始化 git 仓库
- **操作**: 已初始化，所有文件已暂存

### [x] R-02: 添加测试框架 (vitest)
- **操作**: 安装 vitest + @testing-library/react + happy-dom
- **测试文件**: `entrypoints/components/__tests__/bookmarks.test.ts`（19 个测试用例）

### [x] R-03: 添加 linter (biome)
- **操作**: 安装 biome，配置 biome.json
- **脚本**: `pnpm lint` / `pnpm lint:fix`

### [x] R-04: 虚拟滚动
- **操作**: 安装 @tanstack/react-virtual，重写 BookmarkGrid
- **实现**: 少量书签（<50）直接渲染；大量书签使用虚拟化行，响应式列数（2~6）
- **修改文件**: `BookmarkGrid.tsx`, `App.tsx`（main 布局调整）

### [x] R-05: Favicon 缓存层
- **操作**: 在 favicon.ts 中添加模块级 Map 缓存
- **效果**: 相同 URL 只解析一次 new URL()，后续直接返回缓存

## 已完成的所有改进

### P0 功能 Bug (6/6)
C-01 ~ C-06 全部修复

### P1 可访问性 (8/8)
C-07 ~ C-14 全部修复

### P2 代码质量与性能 (12/14)
Q-02 ~ Q-06, Q-08 ~ Q-11, Q-13 ~ Q-14 全部修复
Q-07（颜色变量）保持现状

### P3 架构改进 (5/5)
R-01 ~ R-05 全部完成
