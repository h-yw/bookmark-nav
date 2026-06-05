# Bookmark Nav

浏览器书签导航页扩展。它会覆盖浏览器新标签页，把 Chrome / Edge 书签转换成一个可搜索、可分组、可管理的网址导航页。

## 功能亮点

- 新标签页导航：打开新标签页即可浏览所有浏览器书签。
- 文件夹侧边栏：按浏览器书签文件夹展示，支持当前文件夹或包含子文件夹两种范围。
- 书签卡片：favicon、标题、域名和文件夹路径清晰展示，支持舒适/紧凑密度。
- 书签管理：单个书签支持复制链接、编辑、移动、删除；多选后支持批量复制、批量移动和批量删除。
- 搜索增强：按标题、域名、URL、文件夹路径匹配，并按相关性排序。
- 网页搜索：可在 Google、Bing、DuckDuckGo、百度之间切换，书签无结果时可继续网页搜索。
- 常用/最近：自动记录打开历史，生成常用书签和最近打开视图。
- 设置页：配置搜索、展示和数据管理；支持导出/导入本地设置与历史记录。
- 安全确认：删除、批量删除、移动、清空记录、恢复默认和清理本地数据均使用应用内确认弹窗。

## 搜索语法

搜索框支持普通关键词，也支持组合语法：

```text
react docs              # 同时匹配 react 和 docs
react -redux            # 匹配 react，但排除 redux
site:github.com react   # 只搜索 github.com 域名下的书签
@工作 react             # 只搜索文件夹路径包含“工作”的书签
```

快捷键：

- `/`：聚焦搜索框
- `Enter`：打开选中的书签，或执行网页搜索
- `↑ / ↓`：在搜索结果中移动选中项
- `Ctrl K` / `Cmd K`：切换书签搜索和网页搜索
- `Esc`：关闭弹窗/设置面板，或清空并退出搜索框

## 安装使用

### 开发模式

```bash
pnpm install
pnpm dev
```

`pnpm dev` 会以 Edge 开发模式启动 WXT。启动后按终端提示安装或加载扩展。

### 手动加载生产构建

```bash
pnpm build
```

构建产物在 `.output/chrome-mv3/`。在 Chrome / Edge 扩展管理页打开“开发者模式”，选择“加载已解压的扩展”，然后选择该目录。

## 开发命令

```bash
pnpm dev          # Edge 开发模式，支持 HMR
pnpm dev:firefox  # Firefox 开发模式
pnpm build        # Chrome MV3 生产构建
pnpm build:firefox # Firefox 生产构建
pnpm zip          # 打包 Chrome 扩展
pnpm compile      # TypeScript 类型检查
pnpm test         # 运行 Vitest
pnpm test:watch   # 监听模式运行测试
pnpm lint         # Biome 检查
pnpm lint:fix     # 自动修复可修复问题
```

## CI/CD 与发布

仓库包含两条 GitHub Actions 工作流：

- `CI`：在 PR 以及 `main` / `master` push 时运行类型检查、测试、lint、生产构建和 manifest 权限检查，并上传 Chrome MV3 构建产物。
- `Release`：在 `main` / `master` push 后运行 semantic-release，根据 Conventional Commits 自动计算版本、生成 release notes、创建 `vX.Y.Z` tag、打包 Chrome / Firefox 扩展，并创建 GitHub Release。

提交信息需要遵循 Conventional Commits：

```text
fix: 修复搜索结果排序
feat: 支持批量移动书签
docs: 更新 README
chore: 调整构建配置
```

版本规则：

- `fix:` 触发 patch 版本，例如 `0.1.0` -> `0.1.1`
- `feat:` 触发 minor 版本，例如 `0.1.0` -> `0.2.0`
- 含 `BREAKING CHANGE:` 的提交触发 major 版本
- `docs:`、`chore:` 等默认不会触发发布

发布产物：

- `.output/*chrome.zip`
- `.output/*firefox.zip`
- `.output/*sources.zip`

semantic-release 会在发布时把 `package.json` 写入新版本号，再执行 `pnpm zip` 和 `pnpm zip:firefox`。Chrome 扩展 manifest 的版本号必须是 `X.Y.Z` 数字段格式，因此当前 release 配置只启用稳定分支，不启用 `beta` / `alpha` 预发布分支。

首次启用 semantic-release 时，如果希望从当前 `0.1.0` 继续递增，需要先在当前基准提交创建并推送 `v0.1.0` tag。否则 semantic-release 在没有历史 release tag 时会按首次发布规则计算版本。

## 技术栈

- WXT 0.20
- React 19
- Tailwind CSS v4
- TypeScript
- Vitest
- Biome

## 权限说明

扩展只声明 `bookmarks` 权限，用于读取和管理浏览器书签。

当前设计不注入页面，不包含 `content_scripts`，也不需要网络权限。favicon 使用浏览器内部的 `chrome://favicon/size/32@2x/{origin}` 方案，并带本地缓存和兜底图标。

## 数据说明

- 浏览器书签：来自 `chrome.bookmarks`，编辑、移动、删除会直接作用于浏览器书签。
- 常用/最近记录：保存在扩展本地 `localStorage`，书签失效后会自动剔除。
- 设置数据：保存在扩展本地 `localStorage`。
- 导出/导入：只包含设置和常用/最近记录，不包含浏览器书签树。

## 项目结构

```text
entrypoints/
├── newtab/                 # 新标签页主应用
├── popup/                  # 工具栏弹窗快速搜索
└── components/             # 共享组件和工具
    ├── bookmarks.ts        # 书签树解析、搜索、编辑/删除/移动封装
    ├── favicon.ts          # favicon URL 和缓存
    ├── history.ts          # 常用/最近记录
    ├── settings.ts         # 设置归一化和持久化
    ├── BookmarkCard.tsx    # 书签卡片
    ├── BookmarkGrid.tsx    # 书签列表布局
    ├── BookmarkManageDialog.tsx
    ├── SearchBar.tsx
    ├── SettingsDrawer.tsx
    └── Sidebar.tsx
```

更多需求细节见 [docs/spec.md](docs/spec.md)。

## 验证要求

改动后至少运行：

```bash
pnpm build
```

并检查 `.output/chrome-mv3/manifest.json`：

- `permissions` 只能包含 `bookmarks`
- 不应存在 `content_scripts`
