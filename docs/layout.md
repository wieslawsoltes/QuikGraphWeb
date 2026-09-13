# Automatic graph layout

The optional `@wieslawsoltes/quikgraphweb/layout` entry runs Microsoft's published **MSAGL.js 1.1.24** geometry engine. It supplies Sugiyama layered layout, multidimensional scaling (MDS), IPSepCola force layout, disconnected-component packing, nested clusters, node boundaries, edge-label placement, arrowheads, and routed edge curves. Applications do not need to implement an adapter or install an additional engine. The engine is bundled in this optional entry; importing the main algorithm library does not load it.

```js
import { AdjacencyGraph, Edge } from '@wieslawsoltes/quikgraphweb';
import { LayoutGraph } from '@wieslawsoltes/quikgraphweb/layout';

const graph = new AdjacencyGraph();
graph.AddVerticesAndEdge(new Edge('Read', 'Transform'));
graph.AddVerticesAndEdge(new Edge('Transform', 'Write'));

const layout = LayoutGraph(graph, {
  algorithm: 'Sugiyama',
  direction: 'LR',
  routing: 'Spline',
  vertexLabel: vertex => vertex,
  nodeWidth: 100,
  nodeHeight: 40,
  layerSeparation: 60,
});

console.log(layout.Positions.get('Transform')); // { x, y }
const svg = layout.ToSvg({ title: 'Data processing' });
```

For an existing MSAGL drawing graph, the original adapter entry point accepts the supplied engine:

```js
import { ToMsaglGraph } from '@wieslawsoltes/quikgraphweb';
import { MsaglLayoutEngine } from '@wieslawsoltes/quikgraphweb/layout';

const drawing = ToMsaglGraph(graph);
const engine = new MsaglLayoutEngine({ algorithm: 'Sugiyama', direction: 'TB' });
const layout = drawing.Layout(engine, { routing: 'Rectilinear' });
```

`LayoutGraphAsync()` and `engine.LayoutAsync()` provide Promise-based integration, including the graph viewer's `LayoutAsync(engine, options)` method. They execute the same engine on the calling thread. Put the optional module inside a Web Worker when a large layout must not block the UI. `layout.ToJSON()` returns a serializable geometry snapshot for transferring results; it deliberately omits cyclic engine objects and application-owned vertex objects.

## Algorithms and routing

| Option | Values | Behavior |
| --- | --- | --- |
| `algorithm` | `Sugiyama`, `MDS`, `IPsepCola` | Defaults to Sugiyama for directed graphs and MDS for undirected graphs. |
| `direction` | `TB`, `BT`, `LR`, `RL` | Layer direction for Sugiyama. |
| `routing` | `Spline`, `SplineBundling`, `StraightLine`, `SugiyamaSplines`, `Rectilinear`, `None` | Defaults to obstacle-aware splines. `None` returns positions without edge curves. |
| `nodeWidth`, `nodeHeight` | Positive numbers | Fixed dimensions, otherwise determined from label size and padding. |
| `nodeSeparation`, `layerSeparation` | Finite nonnegative / positive numbers | Node spacing and Sugiyama layer spacing. |
| `aspectRatio` | Positive number | Aspect ratio used when packing disconnected components. |
| `iterations` | Nonnegative MDS / positive IPSepCola count | Controls iterative refinement. |
| `pivots` | Positive number | MDS landmark count. |
| `arrows`, `arrowLength` | Boolean / positive number | Target arrowheads on directed edges. |
| `padding`, `edgePadding` | Nonnegative numbers | Graph margin and engine edge-routing padding. |

Spline bundling and rectilinear routing are more expensive than straight-line routing. MSAGL's `SugiyamaSplines` mode uses the layered algorithm's paths where available and the engine's spline fallback for other layouts. The published engine does not route `RectilinearToCenter` distinctly, so this wrapper rejects that option rather than substituting a different mode. Newer unpublished routing modes are not represented as available in the pinned package.

Node boundary shapes are `Ellipse`, `Circle`, `DoubleCircle`, `Box`, `Rectangle`, `Rect`, `RoundedBox`, `RoundRect`, `Diamond`, `Triangle`, `Hexagon`, `Octagon`, and `Parallelogram`. Circle names use the supplied width and height as ellipse diameters; the drawing model's decorative double outline is not an additional layout obstacle. Unknown shapes throw. Use `nodeShape(vertex, drawingNode)` to select a supported boundary. `nodeSize(vertex, drawingNode)` supplies per-node dimensions and runs once per node.

Labels use a deterministic text estimate by default because Node and Workers have no browser font renderer. For exact metrics, pass `measureLabel(text, entity, kind)` returning `{width, height}` measured in the font you render. `kind` is `node`, `edge`, or `cluster`. `vertexLabel` and `edgeLabel` select the text. The built-in SVG writer escapes text and attribute values and writes multiline labels as SVG `tspan` elements.

## Geometry and identity

`MsaglLayoutResult` has the following fields:

| Field | Contents |
| --- | --- |
| `Positions` | Equality-aware map from original graph vertices to `{x, y}` centers. |
| `Nodes` | Original vertex and drawing-node references, ID, center, rectangle, exact SVG boundary path, label rectangle. |
| `Edges` | Original edge reference, endpoint IDs, exact SVG route, typed curve JSON, label geometry, source/target arrowheads. |
| `Clusters` | Cluster IDs, rectangles, boundary paths and labels. |
| `Bounds` | Overall `{x, y, width, height}`. |
| `GeometryGraph`, `EngineGraph` | Live native MSAGL geometry and graph instances for advanced engine operations. |

Application-facing coordinates use **Y increasing downward**. Values may be negative; `Bounds` gives the complete viewport. Edge curve JSON is reflected into that same coordinate system. The live native geometry retains MSAGL's upward Y axis. Paths preserve native lines, cubic Béziers, ellipse arcs and closed polylines instead of flattening curves into low-resolution samples. `MsaglCurveToSvgPath(nativeCurve)` performs that conversion independently.

`ToJSON()` omits caller-owned identities; node IDs and endpoint IDs connect its arrays. Keep `Positions` and `Nodes[].Vertex` when preserving object identity in one process. Vertices with QuikGraphWeb `Equals` / `GetHashCode` semantics can be queried with equivalent instances.

## Nested clusters

```js
const layout = LayoutGraph(graph, {
  clusters: [
    { id: 'pipeline', nodes: ['Write'], label: 'Pipeline', padding: 16 },
    { id: 'processing', parentId: 'pipeline', nodes: ['Read', 'Transform'] },
  ],
});
```

Cluster node references accept original vertices or drawing node IDs. Each node may belong directly to one cluster; clusters may have parents. Duplicate IDs, duplicate membership, missing references and cyclic parent relationships throw before the native engine receives an invalid graph. Edges are preserved across cluster boundaries, including edges that leave nested groups.

Empty leaf clusters use a private one-unit geometry anchor to avoid a published-engine defect when transforming nested empty groups. These anchors are absent from `Nodes`, `Positions`, exported JSON and SVG; they exist only in the exposed native engine graph.

## Position constraints

MSAGL.js's published native vertical-constraint entry point is unfinished. QuikGraphWeb therefore implements its own explicit **post-layout axis constraints**, followed by native MSAGL rerouting. These are web layout features and do not claim to complete the original C# engine's constraint solver.

```js
const layout = LayoutGraph(graph, {
  constraints: [
    { type: 'pin', axis: 'x', node: 'Read', coordinate: 0 },
    { type: 'pin', axis: 'y', node: 'Read', coordinate: 0 },
    { type: 'align', axis: 'y', nodes: ['Read', 'Transform'] },
    { type: 'separate', axis: 'x', before: 'Read', after: 'Transform', gap: 160 },
  ],
});
```

The solver merges aligned centers and solves difference constraints for minimum center separation and fixed coordinates. Contradictory constraints throw. An alignment may supply `coordinate` to fix the whole group. Gaps measure center-to-center distance, so account for node dimensions when choosing spacing. User constraints can intentionally overlap nodes or change the original layer arrangement. Combining these post-layout constraints with nested clusters is rejected because moving child nodes independently would invalidate cluster bounds. Use a compatible native configuration through `configure(context)` for engine-specific settings; that callback exposes live native objects and inherits the pinned engine's capabilities and limitations.

## Execution and verification

Every call creates a new native graph. Results are published to `drawing.LayoutResult` only after the entire calculation, conversion and cancellation check succeed. A failed or canceled call preserves the previous result. An already-aborted `AbortSignal` rejects before layout; cancellation checks also run while creating geometry and at native engine checkpoints. A signal cannot interrupt synchronous CPU work from the same JavaScript event loop. Terminating a dedicated Worker is the reliable way to stop a running off-thread layout immediately.

Executable integration tests run the bundled engine across all three layout algorithms and all six supported routing modes. They check finite geometry, non-overlapping component packing, all four layer directions, configured dimensions, loops, parallel routes, labels, nested cluster containment, equality-aware identities, constraints, SVG escaping, empty graphs, cancellation and repeated layout. These tests execute the actual published MSAGL implementation, not an injected fake.

The engine is licensed by Microsoft under MIT; its license is included with the optional distribution. Reference sources: [Microsoft MSAGL.js repository](https://github.com/microsoft/msagljs), [official core-layout guide](https://github.com/microsoft/msagljs/blob/main/skills/msagljs/references/core-layout.md), [official routing guide](https://github.com/microsoft/msagljs/blob/main/skills/msagljs/references/layout-and-routing.md), and [published 1.1.24 package](https://www.npmjs.com/package/@msagl/core/v/1.1.24).
