# 当前工作

## 待办

- [x] 撤销书签卡片上的标签角标和 hover 浮层。
- [x] 保留标签编辑入口、侧边栏标签筛选和本地标签数据能力。
- [x] 确认卡片恢复为标题、URL、搜索结果文件夹路径的简洁结构。
- [x] 运行类型检查、lint、构建和 manifest 抽查。
- [x] 记录结果。

## 结果

- 已移除书签卡片上的标签角标和 hover 浮层。
- 已移除 `BookmarkGrid` 到 `BookmarkCard` 的标签展示传参。
- 标签编辑入口、侧边栏标签筛选、本地标签存储、导入/导出能力保持不变。
- 卡片恢复为标题、URL，以及搜索结果中的文件夹路径展示，不再因标签产生额外视觉元素。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm compile && pnpm lint && pnpm build && pnpm check:manifest:chrome`。
- 验证通过：`git diff --check`。
- manifest 抽查通过：`.output/chrome-mv3/manifest.json` 的 `permissions` 只有 `bookmarks`，没有 `content_scripts`。
