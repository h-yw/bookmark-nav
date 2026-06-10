import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { checkManifestObject } = require('./check-release-manifest.cjs') as {
  checkManifestObject: (
    manifest: Record<string, unknown>,
    manifestPath: string,
    expectedVersion?: string
  ) => void;
};

describe('check-release-manifest', () => {
  it('accepts the minimal bookmark permission manifest', () => {
    expect(() => checkManifestObject({
      version: '1.2.3',
      permissions: ['bookmarks'],
    }, 'manifest.json', '1.2.3')).not.toThrow();
  });

  it('rejects extra permissions', () => {
    expect(() => checkManifestObject({
      version: '1.2.3',
      permissions: ['bookmarks', 'tabs'],
    }, 'manifest.json')).toThrow('unexpected permissions');
  });

  it('rejects content scripts', () => {
    expect(() => checkManifestObject({
      version: '1.2.3',
      permissions: ['bookmarks'],
      content_scripts: [],
    }, 'manifest.json')).toThrow('must not declare content_scripts');
  });

  it('rejects mismatched release versions', () => {
    expect(() => checkManifestObject({
      version: '1.2.3',
      permissions: ['bookmarks'],
    }, 'manifest.json', '1.2.4')).toThrow('does not match');
  });
});
