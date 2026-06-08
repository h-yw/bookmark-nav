# Current Work

## TODO

- [x] Allow snapshot restore when the original folder no longer exists by using a fallback folder.
- [x] Update restore preview reasons.
- [x] Add tests for fallback restore behavior.
- [x] Run `pnpm verify` with `nvm use v22`.
- [x] Record the result.

## Result

- Snapshot restore now falls back to the first root folder when the original folder no longer exists.
- Restore preview explains fallback restores with `原文件夹不存在，将恢复到默认文件夹`.
- Added tests for fallback recreation and fallback move restore.
- `source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify` passed.
