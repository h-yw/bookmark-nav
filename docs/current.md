# Current Work

## TODO

- [x] Improve batch delete/move reliability with per-item results and refresh after completion.
- [x] Add search ranking history boosts for frequent and recent bookmarks.
- [x] Add stable-release tests for search ranking, batch operation result handling, settings import/export helpers, and manifest checks.
- [x] Update README release documentation for user install paths, permissions, FAQs, native bookmark manager comparison, release artifacts, and screenshots.
- [x] Run verification commands and record results.

## Result

- Batch delete/move now executes sequentially, reports partial success/failure counts, clears successful selections, and refreshes the bookmark tree after completion.
- Search ranking now adds a small frequent/recent history boost without overriding exact title matches.
- Added tests for history-boosted search ranking, batch operation partial failures, local data import/export normalization, and manifest permission checks.
- README now includes install paths, screenshot guidance, permission FAQ, native bookmark manager comparison, and release artifact notes.
- Verification:
  - `corepack pnpm test` passed.
  - `corepack pnpm build` passed.
  - `corepack pnpm check:manifest:chrome` passed.
  - `corepack pnpm compile` passed.
  - `corepack pnpm lint` passed.
  - `corepack pnpm build:firefox` passed.
  - `corepack pnpm check:manifest:firefox` passed.
  - `corepack pnpm verify` failed because the script invokes bare `pnpm`, but this shell only exposes pnpm through `corepack pnpm`.
