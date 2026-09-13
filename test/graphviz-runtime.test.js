import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { AdjacencyGraph, UndirectedGraph, Edge, ArgumentException, ArgumentNullException, InvalidOperationException, NotSupportedException } from '../src/core.js';
import { GraphvizAlgorithm, GraphvizImageType, ToSvg } from '../src/graphviz.js';
import { CreateGraphvizEngine, GraphvizWasmEngine, GraphvizRenderException } from '../src/graphviz-runtime.js';

const engine = await CreateGraphvizEngine();
test.after(() => engine.Dispose());
const example = 'digraph { a [label="Source"]; b [label="Destination"]; a -> b [label="route"]; }';

test('Graphviz WASM performs real layout with every advertised layout engine', () => {
  assert.match(engine.GraphvizVersion, /^\d+\.\d+/);
  assert.equal(engine.IsInitialized, true);
  assert.equal(engine.State, 'Ready');
  assert.ok(Object.isFrozen(engine.Engines));
  assert.ok(Object.isFrozen(engine.Formats));
  for (const name of ['dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork']) assert.ok(engine.Engines.includes(name), name);
  for (const name of engine.Engines) {
    const svg = engine.RenderSvg(example, { engine: name });
    assert.match(svg, /<svg[\s>]/, name);
    assert.match(svg, />Source<\/text>/, name);
    assert.match(svg, /class="node"/, name);
  }
});

test('Graphviz output contains independently checkable node, edge and label geometry', () => {
  const result = engine.RenderJson(example, { graphAttributes: { rankdir: 'LR' } });
  assert.equal(result.directed, true);
  assert.equal(result.objects.length, 2);
  assert.equal(result.edges.length, 1);
  const [source, target] = result.objects;
  assert.equal(source.name, 'a');
  assert.equal(target.name, 'b');
  const a = source.pos.split(',').map(Number), b = target.pos.split(',').map(Number);
  assert.ok(a.every(Number.isFinite));
  assert.ok(b.every(Number.isFinite));
  assert.ok(b[0] > a[0]);
  assert.equal(b[1], a[1]);
  assert.equal(result.edges[0].tail, source._gvid);
  assert.equal(result.edges[0].head, target._gvid);
  assert.match(result.edges[0].pos, /^e,/);
  assert.ok(source._draw_.length > 0);
  assert.ok(result.edges[0]._draw_.length > 0);
});

test('Graphviz renders QuikGraph inputs through formatting events and existing ToSvg/Generate APIs', () => {
  const graph = new AdjacencyGraph();
  graph.AddVerticesAndEdge(new Edge('α', 'β'));
  const configure = algorithm => algorithm.FormatVertex.add((_, args) => { args.VertexFormat.Label = args.Vertex; });
  const svg = engine.RenderSvg(graph, {}, configure);
  assert.match(svg, />α<\/text>/);
  assert.match(svg, />β<\/text>/);
  assert.equal((svg.match(/class="edge"/g) ?? []).length, 1);
  assert.match(ToSvg(graph, engine, configure), />α<\/text>/);
  const algorithm = new GraphvizAlgorithm(graph, GraphvizImageType.Svg);
  configure(algorithm);
  assert.equal(algorithm.Generate(engine, 'graph.svg'), svg);
  assert.match(engine.Run(GraphvizImageType.PlainText, 'graph { a -- b }', 'graph.txt'), /^graph /);
});

test('Graphviz renders native graph descriptions, clusters, HTML labels, self loops and parallel edges', () => {
  const native = {
    directed: true,
    subgraphs: [{ name: 'cluster_group', nodes: [{ name: 'a', attributes: { label: { html: '<b>HTML label</b>' } } }, { name: 'b' }] }],
    edges: [{ tail: 'a', head: 'a' }, { tail: 'a', head: 'b' }, { tail: 'a', head: 'b' }],
  };
  const svg = engine.RenderSvg(native);
  assert.equal((svg.match(/class="edge"/g) ?? []).length, 3);
  assert.equal((svg.match(/class="cluster"/g) ?? []).length, 1);
  assert.match(svg, /font-weight="bold"[^>]*>HTML label<\/text>/);
  const graph = new UndirectedGraph();
  graph.AddVerticesAndEdge(new Edge('a', 'b'));
  assert.equal(engine.RenderJson(graph).directed, false);
});

test('Graphviz renders multiple formats with one public operation and exposes raw diagnostics', () => {
  const result = engine.RenderFormats(example, ['svg', 'json', 'plain']);
  assert.equal(result.status, 'success');
  assert.deepEqual(Object.keys(result.output).sort(), ['json', 'plain', 'svg']);
  assert.match(result.output.svg, /<svg /);
  assert.equal(JSON.parse(result.output.json).objects.length, 2);
  assert.match(result.output.plain, /^graph /);
  const invalid = engine.Render('digraph { invalid -> }');
  assert.equal(invalid.status, 'failure');
  assert.ok(invalid.errors.some(error => /syntax error/.test(error.message)));
  assert.throws(() => engine.RenderSvg('digraph { invalid -> }'), error => {
    assert.ok(error instanceof GraphvizRenderException);
    assert.ok(Object.isFrozen(error.Diagnostics));
    assert.ok(Object.isFrozen(error.Diagnostics[0]));
    assert.match(error.message, /syntax error/);
    return true;
  });
  assert.match(engine.RenderSvg(example), /<svg /, 'an invalid graph does not poison subsequent renders');
});

test('Graphviz reports unavailable native output plugins and layout engines precisely', () => {
  assert.throws(() => engine.Run('png', example), GraphvizRenderException);
  const result = engine.Render(example, { engine: 'nonexistent' });
  assert.equal(result.status, 'failure');
  assert.ok(result.errors.length > 0);
  assert.throws(() => engine.RenderString(example, { format: 'nonexistent' }), GraphvizRenderException);
});

test('Graphviz renders every advertised native output format and retains successful-layout warnings', () => {
  for (const format of engine.Formats) {
    const result = engine.Render('digraph { a [URL="https://example.test/a"]; a -> b; }', { format });
    assert.equal(result.status, 'success', `${format}: ${JSON.stringify(result.errors)}`);
    assert.equal(typeof result.output, 'string', format);
  }
  const warning = engine.Render('graph { a [shape=unknown_shape]; }', { format: 'svg' });
  assert.equal(warning.status, 'success');
  assert.ok(warning.errors.some(item => item.level === 'warning' && /shape/.test(item.message)));
});

test('Graphviz default options are copied and per-render attributes merge without mutation', async () => {
  const defaults = { graphAttributes: { rankdir: 'LR', bgcolor: '#ff0000' }, nodeAttributes: { shape: 'box' } };
  const local = await CreateGraphvizEngine(defaults);
  defaults.graphAttributes.bgcolor = '#0000ff';
  try {
    const result = local.RenderJson(example, { graphAttributes: { label: 'Merged' } });
    assert.equal(result.rankdir, 'LR');
    assert.equal(result.bgcolor, '#ff0000');
    assert.equal(result.label, 'Merged');
    assert.equal(result.objects[0].shape, 'box');
    assert.equal(local.RenderJson(example).label, undefined);
  } finally { local.Dispose(); }
});

test('Graphviz node/edge defaults preserve explicit DOT and graph-description overrides', () => {
  const options = { nodeAttributes: { shape: 'box' }, edgeAttributes: { color: 'blue' } };
  const graph = engine.RenderJson('/* { is in a comment */ digraph "{ name" { a [shape=diamond]; a->b [color=red]; b->c; }', options);
  assert.deepEqual(graph.objects.map(node => node.shape), ['diamond', 'box', 'box']);
  assert.deepEqual(graph.edges.map(edge => edge.color), ['red', 'blue']);
  const native = engine.RenderJson({ nodes: [{ name: 'a', attributes: { shape: 'diamond' } }], edges: [{ tail: 'a', head: 'b', attributes: { color: 'red' } }, { tail: 'b', head: 'c' }] }, options);
  assert.deepEqual(native.objects.map(node => node.shape), ['diamond', 'box', 'box']);
  assert.deepEqual(native.edges.map(edge => edge.color), ['red', 'blue']);
});

test('Graphviz initialization is explicit, reusable and coalesced; disposal is terminal', async () => {
  const local = new GraphvizWasmEngine();
  assert.equal(local.State, 'Uninitialized');
  assert.equal(local.IsInitialized, false);
  assert.throws(() => local.RenderSvg(example), InvalidOperationException);
  assert.throws(() => local.GraphvizVersion, InvalidOperationException);
  const first = local.Initialize();
  assert.equal(local.State, 'Initializing');
  assert.equal(local.Initialize(), first);
  assert.equal(await first, local);
  assert.equal(await local.Initialize(), local);
  assert.match(local.renderString(example, { format: 'svg' }), /<svg /);
  local.Dispose(); local.dispose();
  assert.equal(local.State, 'Disposed');
  assert.equal(local.IsDisposed, true);
  assert.equal(local.IsInitialized, false);
  assert.throws(() => local.RenderSvg(example), InvalidOperationException);
  await assert.rejects(local.Initialize(), InvalidOperationException);
});

test('Graphviz disposal during initialization cannot resurrect an engine', async () => {
  const local = new GraphvizWasmEngine();
  const pending = local.Initialize();
  local.Dispose();
  await assert.rejects(pending, InvalidOperationException);
  assert.equal(local.State, 'Disposed');
  assert.equal(local.IsInitialized, false);
});

test('Graphviz portable entry is usable inside a Node worker with an independent real WASM instance', async () => {
  const url = new URL('../src/graphviz-runtime.js', import.meta.url).href;
  const script = `import {parentPort} from 'node:worker_threads'; import {CreateGraphvizEngine} from ${JSON.stringify(url)}; const engine=await CreateGraphvizEngine(); const graph=engine.RenderJson('digraph {a->b->c}'); parentPort.postMessage({vertices:graph.objects.length,edges:graph.edges.length,version:engine.GraphvizVersion}); engine.Dispose();`;
  const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(script)));
  try {
    const result = await new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject); worker.once('exit', code => { if (code) reject(new Error(`Worker exited ${code}`)); }); });
    assert.equal(result.vertices, 3);
    assert.equal(result.edges, 2);
    assert.equal(result.version, engine.GraphvizVersion);
  } finally { await worker.terminate(); }
});

test('Graphviz validates input contracts and browser-only raster/DOM capabilities', async () => {
  assert.throws(() => new GraphvizWasmEngine(null), ArgumentNullException);
  assert.throws(() => engine.Render(null), ArgumentNullException);
  assert.throws(() => engine.Render(42), ArgumentException);
  assert.throws(() => engine.Render([]), ArgumentException);
  assert.throws(() => engine.Render(example, null), ArgumentNullException);
  assert.throws(() => engine.RenderSvg(example, null), ArgumentNullException);
  assert.throws(() => engine.RenderJson(example, null), ArgumentNullException);
  for (const formats of [[], [''], [2], 'svg']) assert.throws(() => engine.RenderFormats(example, formats), ArgumentException);
  assert.throws(() => engine.RenderFormats(example, null), ArgumentNullException);
  assert.throws(() => engine.RenderSvgElement(example), NotSupportedException);
  await assert.rejects(engine.RenderImage(example), NotSupportedException);
  await assert.rejects(engine.RenderImage(example, { type: 'image/gif' }), ArgumentException);
  await assert.rejects(engine.RenderImage(example, { scale: NaN }), RangeError);
  await assert.rejects(engine.RenderImage(example, { quality: 2 }), RangeError);
});
