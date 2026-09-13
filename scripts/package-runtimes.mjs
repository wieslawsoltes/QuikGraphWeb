/** Installed-package consumers. These run outside the repository dependency tree. */
export const optionalRuntimeChecks = [
  {
    name: 'nrbf',
    runtime: `
const record = new runtime.NrbfClass('Installed.Envelope', { answer: 42, text: 'Unicode \\u03b1', next: null }, {}, 'Installed');
record.Members.next = record;
const bytes = runtime.EncodeNrbf(record);
assert.ok(bytes instanceof Uint8Array);
const decoded = runtime.DecodeNrbf(bytes).Root;
assert.ok(decoded instanceof runtime.NrbfClass);
assert.equal(decoded.Members.answer, 42);
assert.equal(decoded.Members.text, 'Unicode \\u03b1');
assert.equal(decoded.Members.next, decoded);
assert.throws(() => runtime.DecodeNrbf(bytes.subarray(0, bytes.length - 1)), runtime.NrbfFormatError);
assert.equal(core.DecodeNrbf, runtime.DecodeNrbf);
assert.ok(new runtime.NrbfFormatter().Deserialize(bytes) instanceof core.NrbfClass);
`,
    types: `
const record = new runtime.NrbfClass('Installed.Envelope', { answer: 42 });
const bytes: Uint8Array = runtime.EncodeNrbf(record, { maxDepth: 128 });
const document: runtime.NrbfDocument<runtime.NrbfClass> = runtime.DecodeNrbf<runtime.NrbfClass>(bytes);
const root: runtime.NrbfClass = document.Root;
const vector = new runtime.NrbfArray<number>([1, 2, 3]);
const item: number = vector.GetValue(1);
const primitive = new runtime.NrbfPrimitive<bigint>(runtime.NrbfPrimitiveType.Int64, 42n);
const integer: bigint = primitive.valueOf();
const formatter = new runtime.NrbfFormatter({ maxBytes: 1024 });
const restored: runtime.NrbfClass = formatter.Deserialize<runtime.NrbfClass>(bytes);
// @ts-expect-error NRBF decoding requires bytes, not text.
runtime.DecodeNrbf('invalid');
// @ts-expect-error Resource bounds are numeric.
runtime.EncodeNrbf(record, { maxDepth: 'unlimited' });
// @ts-expect-error Typed NRBF arrays retain their element type.
const wrong: string = vector.GetValue(0);
// @ts-expect-error Array indices are numeric.
vector.GetValue('0');
// @ts-expect-error Generic documents retain their root type.
const wrongRoot: number = document.Root;
void [root, item, integer, restored, wrong, wrongRoot];
`,
  },
  {
    name: 'binary-serialization',
    runtime: `
const bytes = runtime.SerializeNrbfGraph(graph);
assert.ok(bytes instanceof Uint8Array);
const restored = runtime.DeserializeNrbfGraph(bytes);
assert.ok(restored instanceof core.BidirectionalGraph);
assert.equal(restored.VertexCount, 3);
assert.equal(restored.EdgeCount, 2);
assert.deepEqual([...restored.Vertices], ['A', 'B', 'C']);
assert.ok([...restored.Edges].every(edge => edge instanceof core.Edge));
const metadata = runtime.GetNrbfMetadata(restored);
assert.ok(metadata instanceof core.NrbfClass);
const formatter = new runtime.QuikGraphNrbfFormatter();
const copy = formatter.Deserialize(formatter.Serialize(graph));
assert.ok(copy instanceof core.BidirectionalGraph);
assert.equal(copy.EdgeCount, 2);
assert.equal(core.SerializeNrbfGraph, runtime.SerializeNrbfGraph);
`,
    types: `
const bytes: Uint8Array = runtime.SerializeNrbfGraph(graph, { vertexType: 'System.String' });
const restored: typeof graph = runtime.DeserializeNrbfGraph<typeof graph>(bytes);
const vertex: string = [...restored.Vertices][0];
const formatter = new runtime.QuikGraphNrbfFormatter({ maxDepth: 128 });
const formatted: Uint8Array = formatter.Serialize(graph);
const decoded: typeof graph = formatter.Deserialize<typeof graph>(formatted);
const raw: unknown = runtime.ToNrbfRecord(graph);
// @ts-expect-error A graph serializer requires a graph, not a scalar.
runtime.SerializeNrbfGraph(42);
// @ts-expect-error CLR type names are strings or name/library descriptors.
runtime.SerializeNrbfGraph(graph, { vertexType: 42 });
// @ts-expect-error Binary deserialization does not accept text.
runtime.DeserializeNrbfGraph('invalid');
// @ts-expect-error The selected graph type retains its vertex type.
const wrong: number = [...restored.Vertices][0];
// @ts-expect-error Byte limits are numeric.
new runtime.QuikGraphNrbfFormatter({ maxBytes: 'unlimited' });
void [vertex, decoded, raw, wrong];
`,
  },
  {
    name: 'graphviz-runtime',
    browser: 'dist/quikgraphweb-graphviz.js',
    runtime: `
const engine = await runtime.CreateGraphvizEngine({ graphAttributes: { rankdir: 'LR' } });
try {
  assert.match(engine.GraphvizVersion, /^\\d+\\.\\d+/);
  const layout = engine.RenderJson(graph);
  assert.equal(layout.objects.length, 3);
  assert.equal(layout.edges.length, 2);
  assert.ok(layout.objects[1].pos.split(',').map(Number)[0] > layout.objects[0].pos.split(',').map(Number)[0]);
  const svg = core.ToSvg(graph, engine);
  assert.match(svg, /<svg[\\s>]/);
  assert.equal((svg.match(/class="node"/g) ?? []).length, 3);
  assert.throws(() => engine.RenderSvg('digraph { a -> }'), runtime.GraphvizRenderException);
} finally { engine.Dispose(); }
assert.throws(() => engine.RenderSvg(graph), core.InvalidOperationException);
`,
    types: `
const engine: runtime.GraphvizWasmEngine = await runtime.CreateGraphvizEngine({ engine: 'dot', nodeAttributes: { shape: 'box' } });
const svg: string = engine.RenderSvg(graph);
const json: runtime.GraphvizJsonGraph = engine.RenderJson(graph);
const objects: runtime.GraphvizJsonObject[] | undefined = json.objects;
const result: runtime.GraphvizRenderResult = engine.Render(graph, { format: 'svg' });
if (result.status === 'success') { const text: string = result.output; void text; }
else { const empty: undefined = result.output; void empty; }
const image: Blob = await engine.RenderImage(graph, { type: 'image/png', scale: 2 });
const formats: readonly string[] = engine.Formats;
const description: runtime.GraphvizDescription = { nodes: [{ name: 'a', attributes: { label: { html: '<b>One</b>' } } }], edges: [{ tail: 'a', head: 'b' }] };
engine.RenderFormats(description, ['svg', 'json']);
const error: runtime.GraphvizRenderException = new runtime.GraphvizRenderException([{ level: 'warning', message: 'warning' }]);
const diagnostics: readonly Readonly<runtime.GraphvizDiagnostic>[] = error.Diagnostics;
// @ts-expect-error A graph input cannot be a numeric scalar.
engine.RenderSvg(42);
// @ts-expect-error Raster formats are limited to supported browser MIME types.
engine.RenderImage(graph, { type: 'image/gif' });
// @ts-expect-error Format metadata is immutable.
engine.Formats.push('invalid');
// @ts-expect-error Render output remains a string, never an untyped value.
const wrong: number = engine.RenderSvg(graph);
// @ts-expect-error Node descriptions require string names.
engine.RenderSvg({ nodes: [{ name: 42 }] });
void [svg, objects, image, formats, diagnostics, wrong];
`,
  },
  {
    name: 'layout',
    browser: 'dist/quikgraphweb-layout.js',
    viewerTypes: `
const viewer = new core.QuikGraphViewer<string, core.Edge<string>>();
viewer.Graph = graph;
viewer.VertexLabel = vertex => vertex.toUpperCase();
viewer.EdgeLabel = edge => edge.Source.toUpperCase();
viewer.addEventListener('graph-select', event => { const name: string = event.detail.vertex; void name; });
viewer.addEventListener('graph-select-edge', event => { const edge: core.Edge<string> = event.detail.edge; void edge; });
viewer.addEventListener('graph-layout-change', event => {
  if ('vertex' in event.detail) { const vertex: string = event.detail.vertex; void vertex; }
  else { const x: number = event.detail.positions.get('A')!.x; void x; }
});
const viewerResult = await viewer.LayoutAsync(new runtime.MsaglLayoutEngine<string, core.Edge<string>>(), { algorithm: 'Sugiyama', direction: 'LR' });
const viewerSvg: string = viewerResult.ToSvg();
const directResult = await viewer.LayoutAsync(g => runtime.LayoutGraph(g, { algorithm: 'MDS' }));
const directSvg: string = directResult.ToSvg();
await viewer.LayoutAsync(g => new Map([...g.Vertices].map((vertex, index) => [vertex, { x: index, y: 0 }])));
// @ts-expect-error Viewer vertices retain the declared type.
viewer.SelectVertex(42);
// @ts-expect-error Position coordinates are numeric.
viewer.Positions.set('A', { x: 'bad', y: 3 });
// @ts-expect-error Viewer edge selection preserves endpoint types.
viewer.SelectEdge(new core.Edge(1, 2));
// @ts-expect-error Layout adapter options retain the engine's direction union.
await viewer.LayoutAsync(new runtime.MsaglLayoutEngine<string, core.Edge<string>>(), { direction: 'wrong' });
void [viewerSvg, directSvg];
`,
    runtime: `
const layout = runtime.LayoutGraph(graph, { algorithm: 'Sugiyama', direction: 'LR', routing: 'Spline' });
assert.equal(layout.Nodes.length, 3);
assert.equal(layout.Edges.length, 2);
assert.ok(layout.Bounds.width > 0 && layout.Bounds.height > 0);
assert.ok(layout.Positions.get('B').x > layout.Positions.get('A').x);
assert.ok(layout.Positions.get('C').x > layout.Positions.get('B').x);
assert.equal(layout.Edges[0].Edge, ab);
assert.ok(layout.Positions instanceof core.EqualityMap);
assert.ok(layout.Edges.every(edge => edge.Path.length > 0 && edge.TargetArrowhead));
assert.match(layout.ToSvg(), /^<svg /);
assert.doesNotThrow(() => JSON.stringify(layout.ToJSON()));
const again = await runtime.LayoutGraphAsync(graph, { direction: 'TB' });
assert.ok(again.Positions.get('B').y > again.Positions.get('A').y);
const drawing = new core.MsaglDrawingGraph('installed');
drawing.AddEdge('x', 'y');
assert.equal(drawing.Layout(new runtime.MsaglLayoutEngine()).Nodes.length, 2);
`,
    types: `
const layout: runtime.MsaglLayoutResult<string, core.Edge<string>> = runtime.LayoutGraph(graph, { algorithm: 'Sugiyama', direction: 'LR', routing: 'Spline', vertexLabel: vertex => vertex });
const position: runtime.LayoutPoint | undefined = layout.Positions.get('A');
const vertex: string = layout.Nodes[0].Vertex;
const edge: core.Edge<string> = layout.Edges[0].Edge;
const svg: string = layout.ToSvg({ title: 'A graph' });
const bounds: runtime.LayoutBounds = layout.Bounds;
const engine = new runtime.MsaglLayoutEngine<string, core.Edge<string>>({ nodeWidth: 80 });
const asynchronous: runtime.MsaglLayoutResult<string, core.Edge<string>> = await engine.LayoutAsync(graph);
const constraints: runtime.LayoutConstraint<string>[] = [{ type: 'pin', axis: 'x', node: 'A', coordinate: 0 }, { type: 'separate', axis: 'x', before: 'A', after: 'B', gap: 100 }];
engine.Layout(graph, { constraints });
// @ts-expect-error Layout algorithms use the supported literal union.
runtime.LayoutGraph(graph, { algorithm: 'Unknown' });
// @ts-expect-error Routing modes use the supported literal union.
engine.Layout(graph, { routing: 'Unknown' });
// @ts-expect-error Layout positions retain their vertex key type.
layout.Positions.get(42);
// @ts-expect-error Layout results retain their vertex value type.
const wrong: number = layout.Nodes[0].Vertex;
// @ts-expect-error Layout sizing callbacks require both width and height.
engine.Layout(graph, { nodeSize: () => ({ width: 80 }) });
void [position, vertex, edge, svg, bounds, asynchronous, wrong];
`,
  },
  {
    name: 'xml-validation',
    browser: 'dist/quikgraphweb-xml-validation.js',
    assets: ['dist/vendor/libxml2-wasm.mjs', 'dist/cjs/vendor/libxml2-wasm.mjs'],
    runtime: `
const validator = await runtime.CreateGraphMLSchemaValidator();
try {
  assert.equal(validator.SchemaVersion, '1.1');
  const xml = validator.Serialize(graph, { vertexIdentity: String });
  assert.equal(validator.Validate(new TextEncoder().encode(xml)).IsValid, true);
  const restored = validator.Deserialize(xml);
  assert.ok(restored instanceof core.AdjacencyGraph);
  assert.equal(restored.VertexCount, 3);
  assert.equal(restored.EdgeCount, 2);
  const invalid = '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed" parse.nodes="-1"/></graphml>';
  const result = validator.Validate(invalid, { filename: 'installed.graphml' });
  assert.equal(result.IsValid, false);
  assert.ok(result.Errors.some(error => error.Message.includes('parse.nodes')));
  assert.equal(result.Errors[0].FileName, 'installed.graphml');
  assert.throws(() => validator.ValidateAndThrow(invalid), runtime.GraphMLValidationError);
  assert.equal((await runtime.ValidateGraphMLSchema(xml)).IsValid, true);
  assert.equal((await runtime.DeserializeAndValidateGraphML(xml)).EdgeCount, 2);
} finally { validator.Dispose(); }
assert.equal(validator.IsDisposed, true);
assert.throws(() => validator.Validate('<graphml/>'), /disposed/);
`,
    types: `
const validator: runtime.GraphMLSchemaValidator = await runtime.CreateGraphMLSchemaValidator();
const xml: string = validator.Serialize<string, core.Edge<string>>(graph, { vertexIdentity: vertex => vertex });
const result: runtime.GraphMLValidationResult = validator.Validate(xml, { filename: 'typed.graphml' });
const valid: boolean = result.IsValid;
const errors: readonly runtime.GraphMLValidationDiagnostic[] = result.Errors;
const restored: typeof graph = validator.Deserialize<string, core.Edge<string>, typeof graph>(xml, { graph, vertexFactory: id => id, edgeFactory: (source, target) => new core.Edge(source, target) });
const awaited: typeof graph = await runtime.DeserializeAndValidateGraphML<string, core.Edge<string>, typeof graph>(xml, { graph, vertexFactory: id => id, edgeFactory: (source, target) => new core.Edge(source, target) });
const scalar: runtime.GraphMLPropertyType = 'double[]';
const namespace: 'http://graphml.graphdrawing.org/xmlns' = validator.SchemaNamespace;
// @ts-expect-error Validation input must contain XML text or bytes.
validator.Validate(42);
// @ts-expect-error Diagnostic collections are immutable.
result.Errors.push({});
// @ts-expect-error Loader URL cannot be a numeric value.
runtime.CreateGraphMLSchemaValidator({ engineUrl: 42 });
// @ts-expect-error XML property types use the declared scalar/array vocabulary.
const wrong: runtime.GraphMLPropertyType = 'decimal';
// @ts-expect-error Validation filenames are strings.
validator.Validate(xml, { filename: 42 });
void [valid, errors, restored, awaited, scalar, namespace, wrong];
`,
  },
];
