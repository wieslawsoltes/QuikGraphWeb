import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = resolve('.');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--tarball'), 'Usage: node scripts/package-test.mjs [--tarball path]');
const supplied = args.length ? resolve(args[1]) : undefined;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(command, argv, cwd, label) {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, npm_config_update_notifier: 'false' } });
  assert.equal(result.status, 0, `${label}:\n${result.stdout ?? ''}${result.stderr ?? ''}${result.error ?? ''}`);
  return result.stdout;
}
await mkdir('test-results', { recursive: true });
const temporary = await mkdtemp(join(project, 'test-results/package-'));
try {
  const [packed] = JSON.parse(run(npm, ['pack', ...(supplied ? [supplied] : []), '--ignore-scripts', '--json', '--pack-destination', temporary], project, 'npm pack'));
  assert.equal(packed.name, pkg.name);
  assert.equal(packed.version, pkg.version);
  const files = new Set(packed.files.map(file => file.path));
  for (const file of ['dist/index.js', 'dist/index.d.ts', 'dist/core-inferred.d.ts', 'dist/shortest-paths-inferred.d.ts', 'dist/cjs/index.js', 'dist/cjs/package.json', 'dist/quikgraphweb.browser.js', 'dist/quikgraphweb.min.js', 'src/index.js', 'LICENSE', 'NOTICE', 'docs/api-inventory.json', 'docs/test-inventory.json']) assert(files.has(file), `Tarball lacks ${file}`);
  for (const file of files) assert(!file.startsWith('node_modules/') && !file.startsWith('test-results/') && !file.startsWith('.git/'), `Unwanted package file ${file}`);
  const consumer = join(temporary, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'quikgraphweb-package-consumer', version: '1.0.0', private: true, type: 'module' }));
  const tarball = join(temporary, packed.filename);
  run(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball], consumer, 'isolated tarball install');
  const exercise = `
const graph = new core.BidirectionalGraph();
graph.AddVertexRange(['A', 'B', 'C']);
const ab = new core.Edge('A', 'B');
const bc = new core.Edge('B', 'C');
graph.AddEdgeRange([ab, bc]);
assert.equal(graph.VertexCount, 3);
assert.equal(graph.EdgeCount, 2);
assert.equal(graph.OutDegree('A'), 1);
assert.equal(graph.InDegree('C'), 1);
assert.equal(ab.Source, 'A');
assert.equal(ab.Target, 'B');
const search = new core.DijkstraShortestPathAlgorithm(graph, () => 2);
search.Compute('A');
assert.equal(search.TryGetDistance('C'), 4);
`;
  await writeFile(join(consumer, 'esm.mjs'), `import assert from 'node:assert/strict';\nimport * as core from ${JSON.stringify(pkg.name)};\n${exercise}\nconsole.log('Installed ESM graph and shortest-path consumer: passed');`);
  await writeFile(join(consumer, 'commonjs.cjs'), `const assert = require('node:assert/strict');\nconst core = require(${JSON.stringify(pkg.name)});\n${exercise}\nconsole.log('Installed CommonJS graph and shortest-path consumer: passed');`);
  process.stdout.write(run(process.execPath, ['esm.mjs'], consumer, 'ESM consumer'));
  process.stdout.write(run(process.execPath, ['commonjs.cjs'], consumer, 'CommonJS consumer'));
  await writeFile(join(consumer, 'browser.mjs'), `import assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nimport { runInNewContext } from 'node:vm';\nimport * as bundled from ${JSON.stringify(pkg.name + '/browser')};\nconst script = await readFile('node_modules/${pkg.name}/dist/quikgraphweb.min.js', 'utf8');\nconst context = {};\nrunInNewContext(script, context);\nassert.equal(typeof context.QuikGraphWeb.BidirectionalGraph, 'function');\nassert.equal(typeof bundled.BidirectionalGraph, 'function');\nconsole.log('Standalone browser ESM and IIFE exports: passed');\n`);
  process.stdout.write(run(process.execPath, ['browser.mjs'], consumer, 'browser bundles'));
  await writeFile(join(consumer, 'consumer.ts'), `import { BidirectionalGraph, Edge, TaggedEdge, DijkstraShortestPathAlgorithm } from ${JSON.stringify(pkg.name)};\nconst graph = new BidirectionalGraph<string, Edge<string>>();\ngraph.AddVertexRange(['A', 'B']);\ngraph.AddEdge(new Edge('A', 'B'));\nconst algorithm = new DijkstraShortestPathAlgorithm(graph, () => 1);\nalgorithm.Compute('A');\nconst count: number = graph.VertexCount;\nconst edges: Edge<string>[] = graph.OutEdges('A');\nconst vertex: string = edges[0].Source;\nconst weighted = new BidirectionalGraph<string, TaggedEdge<string, number>>();\nweighted.AddVerticesAndEdge(new TaggedEdge('A', 'B', 3));\nconst shortest = new DijkstraShortestPathAlgorithm<string, TaggedEdge<string, number>>(weighted, edge => edge.Tag);\nshortest.Compute('A');\nconst distance: number | undefined = shortest.TryGetDistance('B');\nconst path: TaggedEdge<string, number>[] | undefined = shortest.TryGetPath('B');\nweighted.EdgeAdded.subscribe(edge => { const weight: number = edge.Tag; void weight; });\n// @ts-expect-error Graph vertices retain their declared type.\ngraph.AddVertex(42);\n// @ts-expect-error Edge endpoints retain their declared type.\nconst wrong: number = edges[0].Target;\n// @ts-expect-error Tagged edge payloads retain their declared type.\nweighted.AddEdge(new TaggedEdge('B', 'C', 'invalid'));\n// @ts-expect-error Shortest-path roots retain their declared type.\nshortest.Compute(42);\nvoid [count, vertex, distance, path, wrong];\n`);
  await writeFile(join(consumer, 'consumer.cts'), `import core = require(${JSON.stringify(pkg.name)});\nconst graph = new core.AdjacencyGraph<string, core.Edge<string>>();\ngraph.AddVertex('x');\nconst count: number = graph.VertexCount;\nconst edge = new core.TaggedEdge<string, number>('x', 'y', 2);\nconst tag: number = edge.Tag;\n// @ts-expect-error CommonJS retains generic vertex types.\ngraph.AddVertex(12);\nvoid [count, tag];\n`);
  const contractConsumer = `import { BidirectionalGraph, TaggedEdge, type IMutableBidirectionalGraph, type IVertexListGraph, type EdgeAction, type TryFunc } from ${JSON.stringify(pkg.name)};\nconst graph = new BidirectionalGraph<string, TaggedEdge<string, number>>();\nconst mutable: IMutableBidirectionalGraph<string, TaggedEdge<string, number>> = graph;\nconst listed: IVertexListGraph<string, TaggedEdge<string, number>> = graph;\nconst action: EdgeAction<string, TaggedEdge<string, number>> = edge => { const tag: number = edge.Tag; void tag; };\nconst lookup: TryFunc<string, number> = key => key === 'a' ? 1 : undefined;\nconst lookup2: TryFunc<string, number, boolean> = (a, b) => a.length === b;\nvoid [mutable, listed, action, lookup, lookup2];\n`;
  await writeFile(join(consumer, 'contracts.ts'), contractConsumer);
  run(process.execPath, [join(project, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--lib', 'ES2022,DOM', 'consumer.ts', 'consumer.cts', 'contracts.ts'], consumer, 'TypeScript ESM and CommonJS consumers');
  console.log(`Verified exact ${pkg.name}@${pkg.version} tarball (${files.size} files), exports, declarations, graph algorithms and browser bundles.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
