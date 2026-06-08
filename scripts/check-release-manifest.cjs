const path = require('node:path');

const defaultManifests = [
  '.output/chrome-mv3/manifest.json',
  '.output/firefox-mv2/manifest.json',
];

function checkManifestObject(manifest, manifestPath, expectedVersion = '') {
  const permissions = manifest.permissions ?? [];

  if (expectedVersion && manifest.version !== expectedVersion) {
    throw new Error(`${manifestPath} version ${manifest.version} does not match ${expectedVersion}`);
  }

  if (JSON.stringify(permissions) !== JSON.stringify(['bookmarks'])) {
    throw new Error(`${manifestPath} has unexpected permissions: ${JSON.stringify(permissions)}`);
  }

  if (manifest.content_scripts) {
    throw new Error(`${manifestPath} must not declare content_scripts`);
  }
}

function checkManifestFile(manifestPath, expectedVersion = '') {
  const manifest = require(path.join(process.cwd(), manifestPath));
  checkManifestObject(manifest, manifestPath, expectedVersion);
}

function main() {
  const expectedVersion = process.argv[2];
  const requestedManifest = process.argv[3];
  const manifests = requestedManifest ? [requestedManifest] : defaultManifests;

  for (const manifestPath of manifests) {
    checkManifestFile(manifestPath, expectedVersion);
  }

  console.log(`Manifest checks OK${expectedVersion ? ` for ${expectedVersion}` : ''}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkManifestFile,
  checkManifestObject,
};
