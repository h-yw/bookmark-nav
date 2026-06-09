# Current Work

## TODO

- [x] Move WXT source files under `src/` with `srcDir: 'src'`.
- [x] Split React components, domain logic, storage, and shared utilities.
- [x] Update imports, tests, and project instructions for the new structure.
- [x] Run verification with `nvm use v22`.
- [x] Record the result.

## Result

- Enabled WXT `srcDir: 'src'` in `wxt.config.ts`.
- Moved WXT pages to `src/entrypoints/newtab` and `src/entrypoints/popup`.
- Split UI into `src/components`, bookmark/report logic into `src/domain`, local persistence into `src/storage`, and common types/utilities into `src/shared`.
- Moved tests next to their module layer under `src/components/__tests__`, `src/domain/__tests__`, and `src/storage/__tests__`.
- Updated `AGENTS.md`, `CLAUDE.md`, `README.md`, and `docs/spec.md` to reference the new structure.
- Validation passed: `source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`.
- Manifest check confirmed Chrome permissions are only `bookmarks` and `content_scripts` is absent.
- Whitespace check passed: `git diff --check`.
