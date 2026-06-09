# Release Checklist

Use this checklist before publishing a GitHub Release or submitting a browser store package.

## Local Environment

- [ ] Use the project Node version for quality checks: `source ~/.nvm/nvm.sh && nvm use v22`
- [ ] Install dependencies with the locked package manager: `pnpm install --frozen-lockfile`
- [ ] Confirm the working tree only contains intended release changes.
- [ ] If running semantic-release locally, switch to Node.js `22.14.0` first: `nvm use 22.14.0`

## Automated Verification

- [ ] Run `pnpm verify`
- [ ] Confirm all tests pass.
- [ ] Confirm Chrome and Firefox builds complete.
- [ ] Confirm manifest checks pass.

## Manifest Review

Inspect `.output/chrome-mv3/manifest.json`:

- [ ] `permissions` is exactly `["bookmarks"]`
- [ ] `content_scripts` is absent
- [ ] No host permissions are introduced
- [ ] `chrome_url_overrides.newtab` points to `newtab.html`

Inspect `.output/firefox-mv2/manifest.json`:

- [ ] Required permissions are minimal
- [ ] New tab override is present
- [ ] Firefox data collection statements are still accurate

## Manual Smoke Test

Chrome or Edge:

- [ ] Run `pnpm build`
- [ ] Load `.output/chrome-mv3/` as an unpacked extension
- [ ] Open a new tab and confirm Bookmark Nav loads
- [ ] Search bookmarks and open a result
- [ ] Open report view and verify clickable report links
- [ ] Trigger dead-link detection manually and confirm it can be closed
- [ ] Confirm latest detection record appears in the report after detection
- [ ] Test export and import of local data

Firefox:

- [ ] Run `pnpm build:firefox`
- [ ] Load `.output/firefox-mv2/` temporarily
- [ ] Confirm new tab and popup entrypoints load

## Release Artifacts

- [ ] Run `pnpm zip`
- [ ] Run `pnpm zip:firefox`
- [ ] Run `pnpm check:manifest:release`
- [ ] Run `pnpm release:checksums`
- [ ] Confirm `.output/checksums.txt` includes every release zip
- [ ] Confirm `.output/*chrome.zip`, `.output/*firefox.zip`, and `.output/*sources.zip` exist

## Documentation

- [ ] README install steps match the generated output directories
- [ ] README permission explanation still says bookmarks-only
- [ ] README FAQ matches current behavior
- [ ] Screenshot placeholders have either been replaced with safe product screenshots or are clearly marked as pending
- [ ] `docs/plan.md` reflects the release scope

## Store Submission Prep

- [ ] Chrome Web Store description prepared
- [ ] Edge Add-ons description prepared
- [ ] Store screenshots prepared with demo data only
- [ ] Privacy statement matches local-only behavior
- [ ] Permission justification explains `bookmarks` usage
