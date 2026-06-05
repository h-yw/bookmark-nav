const fs = require('node:fs');
const path = require('node:path');

const version = process.argv[2];

if (!version) {
  throw new Error('Missing release version');
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Chrome extension version must use X.Y.Z, received: ${version}`);
}

const packagePath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = version;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Updated package.json version to ${version}`);
