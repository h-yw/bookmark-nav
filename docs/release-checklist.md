# 发布检查清单

发布 GitHub Release 或提交浏览器商店审核前，按此清单检查。

## 本地环境

- [ ] 质量检查使用项目 Node 版本：`source ~/.nvm/nvm.sh && nvm use v22`
- [ ] 使用锁定依赖安装：`pnpm install --frozen-lockfile`
- [ ] 确认工作区只包含本次发布需要的改动
- [ ] 如果本地运行 semantic-release，先切换到 Node.js `22.14.0`：`nvm use 22.14.0`

## 自动验证

- [ ] 运行 `pnpm verify`
- [ ] 确认所有测试通过
- [ ] 确认 Chrome 和 Firefox 构建完成
- [ ] 确认 manifest 检查通过

## Manifest 检查

检查 `.output/chrome-mv3/manifest.json`：

- [ ] `permissions` 只有 `["bookmarks"]`
- [ ] 不存在 `content_scripts`
- [ ] 没有新增 host permissions
- [ ] `chrome_url_overrides.newtab` 指向 `newtab.html`

检查 `.output/firefox-mv2/manifest.json`：

- [ ] 权限保持最小化
- [ ] 新标签页覆盖配置存在
- [ ] Firefox 数据收集声明仍然准确

## 手动冒烟测试

Chrome 或 Edge：

- [ ] 运行 `pnpm build`
- [ ] 将 `.output/chrome-mv3/` 作为未打包扩展加载
- [ ] 打开新标签页，确认 Bookmark Nav 正常加载
- [ ] 搜索书签并打开结果
- [ ] 打开整理报告，确认报告链接可点击
- [ ] 手动触发失效链接检测，确认检测弹窗可以关闭
- [ ] 检测完成后，确认报告展示最近一次检测记录
- [ ] 测试本地数据导出和导入

Firefox：

- [ ] 运行 `pnpm build:firefox`
- [ ] 临时加载 `.output/firefox-mv2/`
- [ ] 确认新标签页和 popup 入口都能加载

## Release 产物

- [ ] 运行 `pnpm zip`
- [ ] 运行 `pnpm zip:firefox`
- [ ] 运行 `pnpm check:manifest:release`
- [ ] 运行 `pnpm release:checksums`
- [ ] 确认 `.output/checksums.txt` 包含所有 release zip
- [ ] 确认 `.output/*chrome.zip`、`.output/*firefox.zip` 和 `.output/*sources.zip` 存在

## 文档

- [ ] README 安装步骤与实际输出目录一致
- [ ] README 权限说明仍然是 bookmarks-only
- [ ] README FAQ 与当前行为一致
- [ ] 截图占位已替换为安全的产品截图，或明确标记为待补
- [ ] `docs/plan.md` 已反映发布范围

## 商店提交准备

- [ ] Chrome Web Store 描述从 `docs/store-listing.md` 准备
- [ ] Edge Add-ons 描述从 `docs/store-listing.md` 准备
- [ ] 商店截图使用演示数据，不包含私人链接
- [ ] 隐私说明符合本地优先行为
- [ ] 权限说明解释了 `bookmarks` 用途
