# 当前工作

## 待办

- [x] 核对 `.github/workflows/ci.yml` 和 `release.config.cjs` 中的真实构建产物。
- [x] 修正 README 中关于 Release 下载包和加载目录的描述。
- [x] 保持 README 面向用户，不恢复大段开发/CI 细节。
- [x] 使用 `nvm use v22` 运行验证。
- [x] 记录结果。

## 结果

- 已核对 `.github/workflows/ci.yml`：CI 临时构建产物是 `chrome-mv3` 和 `firefox-mv2` artifact，内容分别来自 `.output/chrome-mv3/` 和 `.output/firefox-mv2/`。
- 已核对 `release.config.cjs`：GitHub Release 附件匹配 `.output/*chrome.zip`、`.output/*firefox.zip`、`.output/*sources.zip` 和 `.output/checksums.txt`。
- 已通过 `pnpm zip` 和 `pnpm zip:firefox` 确认实际包名为 `bookmark-nav-<version>-chrome.zip`、`bookmark-nav-<version>-firefox.zip`、`bookmark-nav-<version>-sources.zip`，且 Chrome/Firefox zip 内部直接是扩展文件根目录，不包含 `.output/chrome-mv3/` 或 `.output/firefox-mv2/` 这一层。
- 已修正 `README.md` 中 Chrome / Edge 和 Firefox 的 Release 安装说明，并区分 GitHub Release zip 与 GitHub Actions 临时 artifact。
- 验证通过：`source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`。
- Manifest 抽查确认 Chrome permissions 只有 `bookmarks`，且不存在 `content_scripts`。
- 空白检查通过：`git diff --check`。
