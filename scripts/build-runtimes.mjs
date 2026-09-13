import { build } from 'esbuild';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';

const sourceRoot = resolve('src');
const sourceFiles = new Set(await readdir(sourceRoot));
const entries = [
  ['graphviz-runtime', 'quikgraphweb-graphviz'],
  ['layout', 'quikgraphweb-layout'],
  ['xml-validation', 'quikgraphweb-xml-validation'],
];
const externalCore = {
  name: 'shared-quikgraph-core',
  setup(builder) {
    builder.onResolve({ filter: /^\.\// }, args => {
      if (dirname(args.importer) === sourceRoot && sourceFiles.has(basename(args.path))) return { path: args.path, external: true };
    });
  },
};
// libxml2 uses top-level await. Keep one ESM vendor file so native dynamic import
// works from both CommonJS and ESM without changing the parser initialization.
const xmlVendor = {
  name: 'libxml2-esm-vendor',
  setup(builder) {
    builder.onResolve({ filter: /^libxml2-wasm$/ }, () => ({ path: './vendor/libxml2-wasm.mjs', external: true }));
  },
};

export async function buildRuntimes() {
  if (sourceFiles.has('xml-validation.js')) {
    await mkdir('dist/vendor', { recursive: true });
    await mkdir('dist/cjs/vendor', { recursive: true });
    await build({ entryPoints: ['node_modules/libxml2-wasm/lib/index.mjs'], outfile: 'dist/vendor/libxml2-wasm.mjs', bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', minify: true, sourcemap: true });
    await cp('dist/vendor/libxml2-wasm.mjs', 'dist/cjs/vendor/libxml2-wasm.mjs');
    await cp('dist/vendor/libxml2-wasm.mjs.map', 'dist/cjs/vendor/libxml2-wasm.mjs.map');
  }
  for (const [module, browserName] of entries) {
    if (!sourceFiles.has(module + '.js')) continue;
    const shared = { entryPoints: ['src/' + module + '.js'], bundle: true, mainFields: ['module', 'main'], target: 'es2022', sourcemap: true, minify: false, pure: ['console.time', 'console.timeEnd'] };
    await build({ ...shared, outfile: 'dist/' + module + '.js', platform: 'neutral', format: 'esm', plugins: [externalCore, xmlVendor] });
    await build({ ...shared, outfile: 'dist/cjs/' + module + '.js', platform: 'node', format: 'cjs', plugins: [externalCore, xmlVendor] });
    await build({ ...shared, outfile: 'dist/' + browserName + '.js', platform: 'browser', format: 'esm', minify: true, plugins: [xmlVendor] });
  }
  await mkdir('dist/licenses', { recursive: true });
  const licenses = [
    ['@msagl/core', 'LICENSE'],
    ['libxml2-wasm', 'LICENSE'], ['libxml2-wasm', 'LICENSE.libxml2'],
    ['queue-typescript', 'LICENSE'], ['reliable-random', 'LICENSE.txt'],
    ['stack-typescript', 'LICENSE'],
  ];
  for (const [name, file] of licenses) {
    const path = 'node_modules/' + name + '/' + file;
    await cp(path, 'dist/licenses/' + name.replaceAll('/', '-').replace('@', '') + '-' + file + '.txt');
  }
  await cp('third_party/licenses', 'dist/licenses', { recursive: true });
  const notice = await readFile('THIRD_PARTY_NOTICES.md', 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return ''; });
  if (notice) await writeFile('dist/licenses/THIRD_PARTY_NOTICES.md', notice);
}

export async function copyRuntimeDeclarations() {
  for (const file of await readdir('types').catch(() => [])) if (file.endsWith('.d.ts')) await cp('types/' + file, 'dist/' + file);
}
