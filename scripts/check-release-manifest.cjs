const path = require('node:path');

const expectedVersion = process.argv[2];

if (!expectedVersion) {
  throw new Error('Missing expected release version');
}

const manifests = [
  '.output/chrome-mv3/manifest.json',
  '.output/firefox-mv2/manifest.json',
];

for (const manifestPath of manifests) {
  const manifest = require(path.join(process.cwd(), manifestPath));
  const permissions = manifest.permissions ?? [];

  if (manifest.version !== expectedVersion) {
    throw new Error(`${manifestPath} version ${manifest.version} does not match ${expectedVersion}`);
  }

  if (JSON.stringify(permissions) !== JSON.stringify(['bookmarks'])) {
    throw new Error(`${manifestPath} has unexpected permissions: ${JSON.stringify(permissions)}`);
  }

  if (manifest.content_scripts) {
    throw new Error(`${manifestPath} must not declare content_scripts`);
  }
}

console.log(`Release manifests OK for ${expectedVersion}`);
