import test from 'node:test';
import assert from 'node:assert/strict';
import { integrityOf, assertRegistryArtifact, fetchRegistryJson } from '../scripts/npm-registry.mjs';

const pkg = { name: '@wieslawsoltes/quikgraphweb', version: '0.1.0' };
const bytes = Buffer.from('immutable graph library release');
const integrity = integrityOf(bytes);
const metadata = () => ({ ...pkg, dist: { integrity, tarball: 'https://registry.npmjs.org/@wieslawsoltes/quikgraphweb/-/quikgraphweb-0.1.0.tgz' } });

test('npm integrity identifies exact bytes with SHA-512', () => {
  assert.match(integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  assert.equal(integrity, integrityOf(Buffer.from(bytes)));
  assert.notEqual(integrity, integrityOf(Buffer.concat([bytes, Buffer.from('\n')])));
});

test('npm immutable metadata accepts exact package, version and integrity', () => {
  const url = assertRegistryArtifact(metadata(), pkg, integrity);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'registry.npmjs.org');
});

for (const [property, value] of [['name', '@another/package'], ['version', '0.1.1']]) {
  test(`npm immutable metadata rejects wrong ${property}`, () => {
    assert.throws(() => assertRegistryArtifact({ ...metadata(), [property]: value }, pkg, integrity), assert.AssertionError);
  });
}

test('npm refuses replacement of an existing immutable version with different bytes', () => {
  const data = metadata(); data.dist.integrity = integrityOf(Buffer.from('different bytes'));
  assert.throws(() => assertRegistryArtifact(data, pkg, integrity), /different bytes/);
});

for (const url of ['http://registry.npmjs.org/package.tgz', 'https://example.org/package.tgz', 'https://user:secret@registry.npmjs.org/package.tgz']) {
  test(`npm rejects unsafe or unexpected tarball address ${new URL(url).protocol}//${new URL(url).hostname}`, () => {
    const data = metadata(); data.dist.tarball = url;
    assert.throws(() => assertRegistryArtifact(data, pkg, integrity), assert.AssertionError);
  });
}

test('npm metadata 404 is the only response classified as absent', async () => {
  assert.equal(await fetchRegistryJson('https://registry.npmjs.org/not-here', async () => new Response('', { status: 404 })), null);
  for (const status of [401, 403, 429, 500, 503]) {
    await assert.rejects(fetchRegistryJson('https://registry.npmjs.org/package', async () => new Response('', { status })), error => error.message.includes(`HTTP ${status}`) && error.retryable === (status === 429 || status >= 500));
  }
});

test('npm metadata requests are public, reject redirects, and bypass caches', async () => {
  const result = await fetchRegistryJson('https://registry.npmjs.org/package', async (url, options) => {
    assert.equal(url, 'https://registry.npmjs.org/package');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert(options.signal instanceof AbortSignal);
    assert.equal(options.headers, undefined);
    return Response.json(metadata());
  });
  assert.deepEqual(result, metadata());
});

test('npm malformed JSON metadata cannot be mistaken for a published package', async () => {
  for (const value of [null, [], 'package']) await assert.rejects(fetchRegistryJson('https://registry.npmjs.org/package', async () => Response.json(value)), /malformed metadata/);
});
