const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = path.join(process.cwd(), '.output');
const checksumPath = path.join(outputDir, 'checksums.txt');

if (!fs.existsSync(outputDir)) {
  throw new Error('Missing .output directory');
}

const zipFiles = fs
  .readdirSync(outputDir)
  .filter((file) => file.endsWith('.zip'))
  .sort();

if (zipFiles.length === 0) {
  throw new Error('No release zip files found in .output');
}

const lines = zipFiles.map((file) => {
  const filePath = path.join(outputDir, file);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return `${hash}  ${file}`;
});

fs.writeFileSync(checksumPath, `${lines.join('\n')}\n`);

console.log(`Generated ${path.relative(process.cwd(), checksumPath)}`);
