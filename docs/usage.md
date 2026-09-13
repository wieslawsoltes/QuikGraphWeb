# API usage

Import names from `@wieslawsoltes/quikgraphweb`. The package root reexports graph algorithms, drawing/serialization models, the viewer and binary APIs. Heavy rendering/layout/schema engines use explicit optional subpaths and load only when imported. The browser's API catalog lists the current runtime exports; `dist/*.d.ts` contains declarations.

## Graph storage and edges

```js
import * as Q from '@wieslawsoltes/quikgraphweb';

const graph = new Q.BidirectionalGraph(false); // no parallel edges
graph.AddVertexRange(['a', 'b', 'c']);
const edge = new Q.TaggedEdge('a', 'b', 5);
graph.AddEdge(edge);
graph.AddVerticesAndEdge(new Q.TaggedEdge('b', 'c', 2));
console.log([...graph.OutEdges('b')], [...graph.InEdges('b')]);
console.log(graph.VertexCount, graph.EdgeCount);

const immutable = Q.GraphExtensions.ToArrayBidirectionalGraph(graph);
const compressed = Q.GraphExtensions.ToCompressedRowGraph(graph);
const reversed = new Q.ReversedBidirectionalGraph(graph);
```

`AddEdge` requires existing vertices. `AddVerticesAndEdge` inserts endpoints as needed. Use `Edge` for reference equality, `EquatableEdge` or value-style variants for endpoint comparisons, and tagged forms for custom payloads. Arrays and compressed forms are snapshots; reversed/filter/delegate views have their documented source-backed behavior.

## Custom vertex equality

Primitive vertices use JavaScript SameValueZero semantics, including `NaN`. Ordinary objects use reference identity. To use value equality for objects, implement `Equals(other)` and optionally `GetHashCode()`:

```js
class Vertex {
  constructor(id) { this.id = id; }
  Equals(other) { return other instanceof Vertex && other.id === this.id; }
  GetHashCode() { return this.id; }
}
const values = new Q.BidirectionalGraph();
values.AddVertex(new Vertex(1));
console.log(values.ContainsVertex(new Vertex(1))); // true
const distances = new Q.EqualityMap();
distances.set(new Vertex(1), 0);
console.log(distances.get(new Vertex(1))); // 0
```

Equality and hash codes must remain stable while a vertex is stored. Equal objects must return equal hashes. Omitting `GetHashCode` is supported through a shared comparison bucket and can make lookups linear. Caller-supplied native Maps keep their native identity rules; use `EqualityMap` when providing algorithm dictionaries for value-equal objects.

## Traversal observers

```js
const search = new Q.BreadthFirstSearchAlgorithm(graph);
const recorder = new Q.VertexPredecessorRecorderObserver();
const attachment = recorder.Attach(search);
try { search.Compute('a'); } finally { attachment.Dispose(); }
console.log(recorder.TryGetPath('c'));
```

Additional observers record edge predecessors, vertex distances, timestamps, and visited vertices/edges. Directed tree events receive an edge. Undirected tree events carry an event-argument object with traversal direction; use the undirected observer classes.

## Components, ordering, and minimum spanning forests

```js
const components = new Q.StronglyConnectedComponentsAlgorithm(graph);
components.Compute();
console.log(components.ComponentCount, components.Components);

const order = Q.AlgorithmExtensions.TopologicalSort(graph);
const undirected = Q.GraphExtensions.ToUndirectedGraph(graph);
const forest = Q.AlgorithmExtensions.MinimumSpanningTreeKruskal(undirected, e => e.Tag);
```

## All pairs and ranked paths

```js
const allPairs = new Q.FloydWarshallAllShortestPathAlgorithm(graph, e => e.Tag);
allPairs.Compute();
console.log(allPairs.TryGetDistance('a', 'c'));

const yen = new Q.YenShortestPathsAlgorithm(graph, 'a', 'c', 3, e => e.Tag);
for (const path of yen.Execute()) console.log(path.Edges);
```

Yen requires an existing nonempty path. Bellman–Ford exposes `FoundNegativeCycle`; callers must inspect it before interpreting paths in a graph with negative cycles.

## DOT and GraphML

```js
const dot = new Q.GraphvizAlgorithm(graph);
dot.FormatVertex.add((_sender, args) => { args.VertexFormat.Label = String(args.Vertex); });
dot.FormatEdge.add((_sender, args) => { args.EdgeFormat.Label.Value = String(args.Edge.Tag); });
console.log(dot.Generate());

const xml = Q.SerializeToGraphML(graph);
const roundTrip = Q.DeserializeFromGraphML(xml);
```

Default GraphML identities reconstruct string vertex IDs. Supply explicit metadata and factories when retaining richer payloads. See executable serialization tests for typed metadata, XML callbacks, DGML models, special characters, and long-integer examples. Modern XML parsing rejects DTDs by default; the explicit legacy option strips the old upstream external DTD without fetching any resource.

## Render with bundled Graphviz

```js
import { CreateGraphvizEngine } from '@wieslawsoltes/quikgraphweb/graphviz-runtime';

const engine = await CreateGraphvizEngine({ engine: 'dot' });
try {
  const svg = engine.RenderSvg(graph, { graphAttributes: { rankdir: 'LR' } });
  const geometry = engine.RenderJson('digraph { Read -> Transform -> Write }');
  console.log(svg, geometry);
} finally { engine.Dispose(); }
```

Graphviz accepts a QuikGraph graph, DOT text or a native graph description and retains formatting events. The browser's `RenderImage` returns PNG/JPEG/WebP blobs; Node exposes the bundled native text/vector formats. See [rendering, formats and lifecycle](graphviz-runtime.md).

## Automatic layout and routing

```js
import { LayoutGraph, MsaglLayoutEngine } from '@wieslawsoltes/quikgraphweb/layout';

const layout = LayoutGraph(graph, {
  algorithm: 'Sugiyama', direction: 'LR', routing: 'Spline',
  vertexLabel: vertex => String(vertex),
});
console.log(layout.Positions.get('a'));
console.log(layout.ToSvg());

// When a viewer is available, retain native shapes, curves, labels and clusters:
viewer.Graph = graph;
await viewer.LayoutAsync(new MsaglLayoutEngine(), {
  algorithm: 'MDS', routing: 'Rectilinear',
});
```

`LayoutGraphAsync` and viewer adapters provide Promise-based integration; the actual native JavaScript computation runs on the calling thread. Use a worker for large layouts. The viewer validates a full layout before applying it and ignores results superseded by edits, replacement graphs or newer requests. See [algorithms, clusters, constraints and geometry](layout.md).

## Validate GraphML against the bundled XSD

```js
import { CreateGraphMLSchemaValidator } from '@wieslawsoltes/quikgraphweb/xml-validation';

const validator = await CreateGraphMLSchemaValidator();
try {
  const xml = validator.Serialize(graph);
  const result = validator.Validate(xml, { filename: 'network.graphml' });
  console.log(result.IsValid, result.Errors);
  const checkedGraph = validator.Deserialize(xml); // validates before conversion
} finally { validator.Dispose(); }
```

Initialization loads libxml2 WebAssembly; subsequent calls reuse a compiled GraphML schema. For a one-shot operation, use `await DeserializeAndValidateGraphML(xml)`. The older synchronous `Q.DeserializeAndValidateFromGraphML` accepts `validateSchema: text => validator.Validate(text)` after initialization and rejects Promise/thenable callbacks before graph mutation. See [XML Schema validity, diagnostics and disposal](xml-validation.md).

## MS-NRBF binary interchange

```js
import {
  SerializeNrbfGraph, DeserializeNrbfGraph,
} from '@wieslawsoltes/quikgraphweb/binary-serialization';

const bytes = SerializeNrbfGraph(graph); // Uint8Array containing actual MS-NRBF records
const restored = DeserializeNrbfGraph(bytes);
console.log(restored.VertexCount, restored.EdgeCount);

// In a browser: const bytes = new Uint8Array(await file.arrayBuffer());
// In Node: const bytes = await readFile('graph.nrbf');
```

The original `Q.SerializeToBinary`/`Q.DeserializeFromBinary` APIs use the built-in formatter unless an explicit formatter is supplied. The `nrbf` subpath exposes raw `DecodeNrbf`/`EncodeNrbf` records and explicit `NrbfTypeRegistry` schemas; `SerializeNrbf`/`DeserializeNrbf` also handle supported non-graph values. Original user classes need registered factories/population rules, and fresh generic values may need explicit type metadata. See [supported records, CLR types and interoperability](nrbf.md).

For browser files without a bundler, serve the complete `dist` directory and import `dist/quikgraphweb-graphviz.js`, `dist/quikgraphweb-layout.js` or `dist/quikgraphweb-xml-validation.js`. Keep the XML bundle's `dist/vendor` directory alongside it. Core/binary APIs are also available from `dist/index.js`. These modules include their engines and do not require a CDN or runtime package installation.

## Petri nets

```js
const net = new Q.PetriNet();
const input = net.AddPlace('Input'), output = net.AddPlace('Output');
const transition = net.AddTransition('Move');
input.Marking.push('work');
net.AddArc(input, transition);
net.AddArc(transition, output);
const simulation = new Q.PetriNetSimulator(net);
simulation.Initialize();
simulation.SimulateStep();
console.log(output.Marking); // ['work']
```

Transitions accept conditions and arcs accept annotations. Upstream PetriGraph stores both input and output arc endpoints as Place→Transition; `IsInputArc` controls simulation orientation. Shared-input token conflicts follow upstream's four-phase simulator semantics.

## Viewer integration

`defineQuikGraphViewer(name?)` registers the custom element. Set `.Graph`, `.VertexLabel`, `.EdgeLabel`, `.Positions` (Map), `.VertexColors` (Map), and `.HighlightedEdges` (Set). Call `.Refresh()` after changing style/labels/highlights. Graph mutation events trigger redraw automatically.

Methods: `Layout('circle' | 'grid')`, `LayoutAsync(adapterOrFunction, options?)`, `CancelLayout()`, `SelectVertex(vertex)`, `SelectEdge(edge)`, `Fit()`, `Zoom(factor, x?, y?)`, `Refresh()`, `ToSvg()`. The last applied native geometry is available as `.LayoutResult`.

Events bubble and cross the shadow boundary:

| Event | `event.detail` |
| --- | --- |
| `graph-select` | `{ vertex }` |
| `graph-select-edge` | `{ edge }` |
| `graph-layout-change` | `{ vertex, position: { x, y } }` for movement, or `{ positions, result }` for applied layout |
| `graph-create-vertex` | `{ x, y }` in graph coordinates |
| `graph-delete-vertex` | `{ vertex }` |
| `graph-delete-edge` | `{ edge }` |

The host chooses whether to act on create/delete requests; the viewer does not mutate graph topology on those events. Movement updates viewer positions and emits the change. Dragging or keyboard movement invalidates native curves until another layout is applied. Customize `--graph-bg`, `--graph-text`, `--graph-edge`, `--graph-node`, and `--graph-dot` CSS variables for themes.

The collapsed **Inspect graph** panel supplies searchable vertex/edge lists, 50-item pages, ARIA item counts/positions and keyboard controls. List arrows, Home/End and Page Up/Down navigate; Enter selects, Delete requests removal and Escape returns focus to the canvas. On the canvas, arrows navigate vertices, Shift+arrows move the selected vertex, Control/Command+arrows pan, plus/minus zoom and zero fits. These are native DOM controls alongside the canvas; host applications can also provide their own accessible views using the selection APIs and events.

## Module workers

All computation modules and the package root can be imported in a module worker. Send graph data, reconstruct a graph, compute, and post plain results or transferable typed arrays. DOM APIs are only required to instantiate/register the viewer. Algorithms execute synchronously within the worker; terminate a worker when hard cancellation outside event callbacks is needed.
