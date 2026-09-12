import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const registry = 'https://registry.npmjs.org';
const project = resolve('.');

export function integrityOf(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export function assertRegistryArtifact(metadata, pkg, integrity) {
  assert.equal(metadata.name, pkg.name, 'Registry package name differs from the release');
  assert.equal(metadata.version, pkg.version, 'Registry package version differs from the release');
  assert.equal(metadata.dist?.integrity, integrity, 'Published version has different bytes; immutable versions cannot be replaced');
  const tarball = new URL(metadata.dist.tarball);
  assert.equal(tarball.protocol, 'https:', 'Registry tarball must use HTTPS');
  assert.equal(tarball.host, 'registry.npmjs.org', 'Unexpected registry tarball host');
  assert.equal(tarball.username + tarball.password, '', 'Registry tarball URL must not contain credentials');
  return tarball;
}

// These requests deliberately use no npm configuration or authentication token.
// Only a confirmed 404 means that a version does not exist.
export async function fetchRegistryJson(url, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(15_000), cache: 'no-store', redirect: 'error' });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Public npm metadata request returned HTTP ${response.status}`);
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  const metadata = await response.json();
  assert(metadata && typeof metadata === 'object' && !Array.isArray(metadata), 'Registry returned malformed metadata');
  return metadata;
}

async function output(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

async function readPackage() {
  return JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
}

async function prepare(directory) {
  const pkg = await readPackage();
  const filename = `${pkg.name.replace(/^@/, '').replaceAll('/', '-')}-${pkg.version}.tgz`;
  const tarball = resolve(directory, filename);
  const manifest = await readFile(resolve(directory, 'SHA256SUMS.txt'), 'utf8');
  const entries = manifest.split(/\r?\n/).filter(Boolean).map(line => {
    const match = /^([a-f0-9]{64}) [ *](.+)$/.exec(line);
    assert(match, 'Malformed release SHA256SUMS.txt');
    return { digest: match[1], filename: match[2] };
  }).filter(entry => entry.filename === filename);
  assert.equal(entries.length, 1, `Expected one checksum for ${filename}`);
  const bytes = await readFile(tarball);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entries[0].digest, 'Release tarball checksum mismatch');
  await output('tarball', tarball);
  console.log(`Verified release checksum for ${filename}.`);
}

async function check(tarball) {
  const pkg = await readPackage();
  const integrity = integrityOf(await readFile(resolve(tarball)));
  const url = `${registry}/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`;
  let metadata;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      metadata = await fetchRegistryJson(url);
      break;
    } catch (error) {
      if (error.retryable === false || (error.retryable === undefined && !(error instanceof TypeError) && error.name !== 'TimeoutError') || attempt === 2) throw error;
      await delay(2_000 * (attempt + 1));
    }
  }
  if (metadata) assertRegistryArtifact(metadata, pkg, integrity);
  await output('exists', String(metadata !== null));
  console.log(metadata
    ? `${pkg.name}@${pkg.version} is already published with the exact release bytes; skipping publication.`
    : `${pkg.name}@${pkg.version} is absent from the public registry and can be published.`);
}

async function verify(tarball, distTag) {
  assert(['latest', 'next'].includes(distTag), 'Distribution tag must be latest or next');
  const pkg = await readPackage();
  const expectedIntegrity = integrityOf(await readFile(resolve(tarball)));
  const packageUrl = `${registry}/${encodeURIComponent(pkg.name)}`;
  const versionUrl = `${packageUrl}/${encodeURIComponent(pkg.version)}`;
  const deadline = Date.now() + 300_000;
  let metadata;
  let lastError;
  while (Date.now() < deadline) {
    try {
      metadata = await fetchRegistryJson(versionUrl);
      if (!metadata) throw new Error('Published version is not visible yet');
      // A visible version with different bytes is a permanent failure.
      assertRegistryArtifact(metadata, pkg, expectedIntegrity);
      const tags = await fetchRegistryJson(`${registry}/-/package/${encodeURIComponent(pkg.name)}/dist-tags`);
      if (tags?.[distTag] !== pkg.version) throw new Error(`npm ${distTag} currently points to ${tags?.[distTag] ?? 'no version'}; waiting for ${pkg.version}`);
      const packument = await fetchRegistryJson(packageUrl);
      const indexedVersion = packument?.versions?.[pkg.version];
      if (!indexedVersion) throw new Error('Published version is not visible in the npm install package index yet');
      assertRegistryArtifact(indexedVersion, pkg, expectedIntegrity);
      if (packument?.['dist-tags']?.[distTag] !== pkg.version) throw new Error(`npm install package index ${distTag} is not updated yet`);
      if (!metadata.dist.attestations?.provenance) throw new Error('npm provenance metadata is not visible yet');
      lastError = undefined;
      break;
    } catch (error) {
      if (error instanceof assert.AssertionError || error.retryable === false) throw error;
      lastError = error;
      console.log(`Waiting for npm registry propagation: ${error.message}`);
      if (Date.now() < deadline) await delay(5_000);
    }
  }
  if (lastError) throw lastError;
  assert(metadata, 'Published registry metadata was not available');
  const downloadUrl = assertRegistryArtifact(metadata, pkg, expectedIntegrity);
  let bytes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000), cache: 'no-store', redirect: 'error' });
      assert(response.ok, `Public npm tarball request returned HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      await delay(2_000 * (attempt + 1));
    }
  }
  assert.equal(integrityOf(bytes), expectedIntegrity, 'Downloaded npm tarball differs from the release');
  await mkdir(join(project, 'test-results'), { recursive: true });
  const temporary = await mkdtemp(join(project, 'test-results/registry-'));
  try {
    const downloaded = join(temporary, basename(tarball));
    await writeFile(downloaded, bytes);
    const result = spawnSync(process.execPath, [join(project, 'scripts/package-test.mjs'), '--tarball', downloaded], {
      cwd: project,
      stdio: 'inherit',
      timeout: 180_000,
      env: { ...process.env, NODE_AUTH_TOKEN: '', NPM_TOKEN: '' },
    });
    assert.equal(result.status, 0, `Published npm consumer verification failed: ${result.error?.message ?? result.signal ?? result.status}`);
    const fresh = join(temporary, 'fresh');
    await mkdir(fresh);
    await writeFile(join(fresh, 'package.json'), JSON.stringify({ name: 'quikgraphweb-public-registry-consumer', version: '1.0.0', private: true, type: 'module' }));
    await writeFile(join(fresh, '.npmrc'), `registry=${registry}\n@wieslawsoltes:registry=${registry}\n`);
    const installed = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', `${pkg.name}@${pkg.version}`, '--registry=' + registry, '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: fresh, stdio: 'inherit', timeout: 180_000, env: { ...process.env, NODE_AUTH_TOKEN: '', NPM_TOKEN: '', NPM_CONFIG_USERCONFIG: join(fresh, '.npmrc') } });
    assert.equal(installed.status, 0, `Fresh public npm install by package name failed: ${installed.error?.message ?? installed.status}`);
    const smoke = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import { BidirectionalGraph, Edge } from ${JSON.stringify(pkg.name)}; const graph = new BidirectionalGraph(); graph.AddVertexRange(['A', 'B']); graph.AddEdge(new Edge('A', 'B')); assert.equal(graph.EdgeCount, 1);`], { cwd: fresh, stdio: 'inherit', timeout: 30_000 });
    assert.equal(smoke.status, 0, 'Fresh npm installation must execute the graph API');
    console.log(`Verified public ${pkg.name}@${pkg.version}: integrity, ${distTag} tag, package index, provenance metadata, downloaded tarball, installed consumers, and fresh npm installation.`);
    await summary(`Published and verified **${pkg.name}@${pkg.version}** on npm (${distTag}).\n\nRelease and registry tarballs have identical SHA512 integrity. Public download, provenance metadata, ESM/CommonJS/TypeScript consumers, standalone browser ESM/IIFE, graph algorithm execution, and fresh npm installation checks passed.\n\n[View npm package](https://www.npmjs.com/package/${pkg.name}/v/${pkg.version})`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, path, distTag = 'latest'] = process.argv.slice(2);
  assert(path, 'Usage: node scripts/npm-registry.mjs prepare <release-directory> | check <tarball> | verify <tarball> [latest|next]');
  if (command === 'prepare') await prepare(path);
  else if (command === 'check') await check(path);
  else if (command === 'verify') await verify(path, distTag);
  else throw new Error(`Unknown npm registry command: ${command}`);
}
