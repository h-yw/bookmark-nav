# GitHub Actions 与发布说明

本项目使用一条 `.github/workflows/ci.yml` 工作流完成质量检查、构建产物上传和 semantic-release 自动发布。

CI 的 `quality` job 使用 `.nvmrc` 指定 Node.js 版本。当前 semantic-release 版本要求 Node.js `^22.14.0 || >=24.10.0`，因此 `release` job 显式使用 Node.js `22.14.0`。

## 触发方式

- `pull_request`：运行质量检查和 PR 标题校验，不发布版本。
- `push` 到 `main` / `master`：运行质量检查，通过后执行 release job。
- `workflow_dispatch`：手动运行质量检查，不发布版本。

## Quality checks

`quality` job 会依次执行：

```bash
pnpm install --frozen-lockfile
pnpm compile
pnpm test
pnpm lint
pnpm build
pnpm check:manifest:chrome
pnpm build:firefox
pnpm check:manifest:firefox
```

PR 事件会额外校验 PR 标题是否符合 Conventional Commits。

构建成功后，workflow 会上传两个临时 artifact，保留 7 天：

- `chrome-mv3`：Chrome / Edge 可加载的 MV3 构建目录。
- `firefox-mv2`：Firefox MV2 构建目录。

## Release job

`release` job 只在 push 事件中执行，并依赖 `quality` 通过。

正式发布前会先运行：

```bash
pnpm release:dry-run
```

dry-run 用于检查 semantic-release 配置、远端 tag、提交分析和 release notes 生成流程。该步骤不会创建 tag、不会提交文件、不会上传 GitHub Release。

dry-run 通过后，workflow 执行：

```bash
pnpm release
```

semantic-release 会根据 Conventional Commits 自动决定是否发布新版本：

- `fix:` 触发 patch 版本。
- `feat:` 触发 minor 版本。
- `BREAKING CHANGE:` 触发 major 版本。
- `docs:`、`chore:`、`test:` 等默认不发布。

GitHub Release 内容使用 `scripts/release-notes-template.cjs` 中的模板生成。模板会固定展示安装包说明、SHA-256 校验和说明、浏览器兼容性和权限约束，同时保留 semantic-release 根据提交自动生成的变更列表。

## Release artifacts

发布时会生成并上传：

- `.output/*chrome.zip`
- `.output/*firefox.zip`
- `.output/*sources.zip`
- `.output/checksums.txt`

`checksums.txt` 包含 release zip 的 SHA-256 校验和。

## Manifest 约束

CI 和 release 都会校验 manifest：

- `permissions` 必须只有 `bookmarks`
- 不能声明 `content_scripts`
- release 阶段还会检查 manifest version 是否等于 semantic-release 计算出的版本号

本地可运行：

```bash
pnpm verify
pnpm release:dry-run
```

`pnpm release:dry-run` 需要能访问 GitHub 远端 tag 和 release 信息，并需要 `GH_TOKEN` 或 `GITHUB_TOKEN` 通过 `@semantic-release/github` 的鉴权检查。如果本地网络或权限不足，以 GitHub Actions 中的检查结果为准。

如果本地提示 Node 版本过低，先切换到 `.nvmrc` 中声明的版本后再重试：

```bash
nvm install
nvm use
pnpm release:dry-run
```
