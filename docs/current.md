# Current Work

## TODO

- [x] Update `docs/plan.md` for v1.2 release-prep scope and current test count.
- [x] Add MIT license file and package metadata.
- [x] Expand README with install paths, permission explanation, FAQ, native manager comparison, release artifacts, and screenshot placeholders.
- [x] Add release checklist documentation.
- [x] Run verification with `nvm use v22`.
- [x] Record the result.

## Result

- Updated `docs/plan.md` with v1.2 release-prep scope, 80 passing tests, recent health-check additions, and source structure migration status.
- Added MIT license metadata in `package.json` and a root `LICENSE` file.
- Expanded `README.md` with screenshot checklist link, corrected Node.js requirement, release checklist link, MIT license section, and CI release Node.js note.
- Added `docs/release-checklist.md` for automated verification, manifest review, smoke testing, release artifacts, documentation, and store submission prep.
- Added `docs/screenshots/README.md` with required product screenshot placeholders and privacy notes.
- Updated CI release job to use Node.js `22.14.0` for semantic-release 25 while keeping quality checks on `.nvmrc`.
- Updated release docs/troubleshooting to explain the quality/release Node.js version split.
- Validation passed: `source ~/.nvm/nvm.sh && nvm use v22 && pnpm verify`.
- Manifest check confirmed Chrome permissions are only `bookmarks` and `content_scripts` is absent.
- Whitespace check passed: `git diff --check`.
