# Current Work

## TODO

- [x] Add restore helpers for operation snapshots.
- [x] Add settings UI to view recent snapshots and confirm restore.
- [x] Add tests for restore planning and snapshot management.
- [x] Run `pnpm verify` with `nvm use v22`.
- [x] Record the result.

## Result

- Added operation snapshot restore planning for batch-delete and batch-move snapshots.
- Added a settings dialog to preview, restore, or remove recent operation snapshots.
- Restore recreates deleted bookmarks in their original folder when possible, and moves existing bookmarks back for move snapshots.
- Added tests for restore plans and snapshot removal.
- `source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify` passed.
