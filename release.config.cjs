module.exports = {
  branches: ['main', 'master'],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          'node scripts/set-release-version.cjs ${nextRelease.version} && pnpm zip && pnpm zip:firefox && node scripts/check-release-manifest.cjs ${nextRelease.version} && node scripts/generate-checksums.cjs',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json'],
        message: 'chore(release): v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: '.output/*chrome.zip', label: 'Chrome MV3 extension' },
          { path: '.output/*firefox.zip', label: 'Firefox extension' },
          { path: '.output/*sources.zip', label: 'Firefox source archive' },
          { path: '.output/checksums.txt', label: 'SHA-256 checksums' },
        ],
      },
    ],
  ],
};
