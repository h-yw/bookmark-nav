# Release Troubleshooting

## semantic-release 报 `tag already exists`

典型错误：

```text
fatal: tag 'v1.0.0' already exists
```

常见原因是已有 tag 不在当前 `main` 历史中。semantic-release 无法把这个 tag 识别为上一版 release，于是按首次发布逻辑尝试创建同名 tag，最终冲突。

检查：

```bash
git fetch origin --prune --tags
git show --no-patch --decorate --oneline v1.0.0
git merge-base --is-ancestor v1.0.0 origin/main
```

如果最后一条命令返回非 0，说明 tag 不在 `main` 历史上。确认该 tag 不是需要保留的历史 release 后，可以把它移动到当前基准提交：

```bash
git tag -f v1.0.0 origin/main
git push --force origin v1.0.0
```

## CI 中找不到 `chrome` namespace

典型错误：

```text
Cannot find namespace 'chrome'
Cannot find name 'chrome'
```

项目需要在 `tsconfig.json` 显式引入 Chrome extension 类型：

```json
{
  "compilerOptions": {
    "types": ["chrome"]
  }
}
```

不要依赖本地 WXT 生成类型或 IDE 缓存隐式提供 `chrome` namespace。

## 手动触发 workflow 不会发布版本

`workflow_dispatch` 只用于手动运行质量检查。release job 只在 `push` 到 `main` / `master` 时运行，避免误触发 semantic-release。

如果要发布新版本，合并一个符合 Conventional Commits 的提交到 `main`：

```text
fix: 修复问题
feat: 增加功能
```

## 合并分支时报 unrelated histories

典型错误：

```text
fatal: refusing to merge unrelated histories
```

如果两个分支历史被分别重写，例如改过 commit author，Git 可能找不到共同祖先。不要直接使用 `--allow-unrelated-histories`，否则容易制造大量冲突。

更稳的做法是以 `main` 为准，只同步需要的文件：

```bash
git switch main
git restore --source=dev -- path/to/file another/file
git commit -m "feat: sync required changes"
```

## 发布后没有新 tag

semantic-release 只会在上一版 tag 之后存在可发布提交时生成新版本。

检查：

```bash
git fetch origin --prune --tags
git log --oneline v1.1.1..origin/main
```

如果没有提交，或者只有 `docs:`、`chore:` 这类默认不触发发布的提交，就不会产生新 tag。

## release dry-run 提示 Node 版本过低

典型错误：

```text
node version ^22.14.0 || >= 24.10.0 is required
```

项目使用 semantic-release 25，要求 Node.js `^22.14.0 || >=24.10.0`。本地执行 release dry-run 时需要先切换到满足 semantic-release 要求的 Node 版本：

```bash
nvm install 22.14.0
nvm use 22.14.0
pnpm release:dry-run
```

## release dry-run 提示没有 GitHub token

典型错误：

```text
ENOGHTOKEN No GitHub token specified
```

`@semantic-release/github` 在 dry-run 中也会执行鉴权检查。本地运行时需要先设置 `GH_TOKEN` 或 `GITHUB_TOKEN`。GitHub Actions 中的 release job 已注入 `secrets.GITHUB_TOKEN`，因此这个错误通常只影响本地 dry-run。

## Firefox 数据收集提示

当前 WXT 配置压制了 Firefox 数据收集 warning。正式上架 Firefox 前，需要按 Mozilla 最新政策复核并声明数据收集情况。

## manifest 权限检查失败

CI 和 release 共用 `scripts/check-release-manifest.cjs` 检查扩展权限：

```bash
pnpm check:manifest:chrome
pnpm check:manifest:firefox
pnpm check:manifest:release 1.1.1
```

该脚本会确保权限只有 `bookmarks`，且没有声明 `content_scripts`。传入版本号时，还会校验 manifest version。
