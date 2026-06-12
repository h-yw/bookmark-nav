# 当前工作

## 待办

- [x] 审视现有工作区入口、管理弹窗和筛选展示。
- [x] 优化工作区空状态，提供明确创建入口。
- [x] 增加从当前文件夹/标签快速创建工作区的入口和预填逻辑。
- [x] 优化工作区标题、副标题和管理列表摘要展示。
- [x] 补充工作区快速创建和摘要测试。
- [x] 更新 README 和 `docs/plan.md`。
- [x] 使用 `nvm use v22` 运行验证。
- [x] 记录结果。

## 结果

- 侧边栏工作区空状态已从“暂无工作区”改为可点击的“创建工作区”入口。
- 当前文件夹或当前标签筛选下会显示“创建工作区”快捷入口，并自动预填名称和条件。
- 工作区管理弹窗已支持预填草稿，并补充工作区用途说明。
- 工作区视图副标题和管理列表会展示文件夹、标签、搜索词摘要。
- 已补充从文件夹/标签生成工作区输入、文件夹 label map 和工作区摘要测试。
- 已更新 README 工作区使用说明和 `docs/plan.md` 工作区状态。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm test`，14 个测试文件、106 个测试通过。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`。
- 验证通过：`git diff --check`。
- manifest 抽查通过：`.output/chrome-mv3/manifest.json` 的 `permissions` 只有 `bookmarks`，没有 `content_scripts`。
