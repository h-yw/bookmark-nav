# 当前工作

## 待办

- [x] 检查 `docs/` 下的英文内容。
- [x] 将非必要英文文档内容改为中文。
- [x] 保留必要的产品名、平台名、命令、权限字段和商店关键词。
- [x] 使用 `nvm use v22` 运行验证。
- [x] 记录结果。

## 结果

- 已将 `docs/store-listing.md` 改为中文维护，保留 Chrome Web Store、Microsoft Edge Add-ons、权限字段和商店关键词等必要英文。
- 已将 `docs/release-checklist.md` 改为中文。
- 已将 `docs/screenshots/README.md` 改为中文。
- 已将 `docs/ci-cd-release.md`、`docs/release-troubleshooting.md`、`docs/plan.md` 中非必要英文标题和描述改为中文。
- 保留了命令、文件名、manifest 字段、权限名、平台名、产品名和商店关键词等必要原文。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`。
- Manifest 抽查确认 Chrome permissions 只有 `bookmarks`，且不存在 `content_scripts`。
- 空白检查通过：`git diff --check`。
