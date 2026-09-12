# QuikGraphWeb

[![CI](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/ci.yml/badge.svg)](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/ci.yml)
[![npm publication](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/npm-publish.yml)
[![npm version](https://img.shields.io/npm/v/@wieslawsoltes/quikgraphweb)](https://www.npmjs.com/package/@wieslawsoltes/quikgraphweb)
[![npm downloads](https://img.shields.io/npm/dm/@wieslawsoltes/quikgraphweb)](https://www.npmjs.com/package/@wieslawsoltes/quikgraphweb)
[![MS-PL license](https://img.shields.io/badge/license-MS--PL-blue)](LICENSE)

Graph data structures, algorithms, and a reusable HTML viewer for JavaScript. QuikGraphWeb adapts [QuikGraph](https://github.com/KeRNeLith/QuikGraph) to browsers, workers, and Node, retaining its PascalCase class and member names and event-driven algorithm model.

**[Open the graph laboratory](https://wieslawsoltes.github.io/QuikGraphWeb/)** · [API and usage](docs/usage.md) · [Compatibility](docs/compatibility.md) · [Verification](docs/verification.md) · [Source/test inventories](docs/api-inventory.json) · [Releases](https://github.com/wieslawsoltes/QuikGraphWeb/releases)

The library has no runtime dependencies. The package includes native ES modules, CommonJS, standalone browser bundles, TypeScript declarations, source, documentation, and 38 executable examples. See the compatibility document and generated audit for the exact distinction between available APIs, source-linked tests, and full .NET conformance.

## Install

```sh
npm install @wieslawsoltes/quikgraphweb
```

```js
import {
  BidirectionalGraph,
  TaggedEdge,
  DijkstraShortestPathAlgorithm
} from '@wieslawsoltes/quikgraphweb';

const graph = new BidirectionalGraph();
graph.AddVerticesAndEdgeRange([
  new TaggedEdge('A', 'B', 4),
  new TaggedEdge('A', 'C', 1),
  new TaggedEdge('C', 'B', 2)
]);

const shortest = new DijkstraShortestPathAlgorithm(graph, edge => edge.Tag);
shortest.Compute('A');

console.log(shortest.Distances.get('B')); // 3
console.log(shortest.TryGetPath('B'));   // A → C → B, as original edges
```

CommonJS consumers can use `require('@wieslawsoltes/quikgraphweb')`. Node 22 and later are supported; current browsers need ES modules, Map/Set, and standard web APIs. Browser code does not require Node polyfills.

## Included functionality

| Area | Implementations |
| --- | --- |
| Graphs | Adjacency, bidirectional, undirected, edge-list, matrix, immutable array graphs, compressed sparse row, clustered, delegate, filtered and reversed views |
| Edges and collections | Reference/value-style, tagged, undirected, terminal and reversed edges; binary/Fibonacci/soft heaps, priority queues, vertex/edge collections, union-find |
| Traversal | Directed, undirected, bidirectional and implicit BFS/DFS; edge traversals; best-first frontier search; traversal observers |
| Paths | Dijkstra, A*, Bellman–Ford, DAG shortest paths, Floyd–Warshall, Yen, Hoffman–Pavley |
| Structure | Connected/weak/strong/incremental components, topological sorting, condensation, transitive closure/reduction, offline least common ancestors |
| Optimization | Prim/Kruskal spanning forests, Edmonds–Karp flow, graph augmentation/balancing, bipartite matching, Hungarian assignment, exact TSP, Kernighan–Lin partitioning |
| Analysis | PageRank, coloring, vertex-cover approximation, Euler/Hamilton predicates and trails, random walks, cycle-popping trees, state-space exploration, additional Bron–Kerbosch clique search |
| Formats | Graphviz DOT and formatters, GraphML with typed metadata, generic XML, Directed Graph Markup Language models |
| Integrations | DataSet-shaped JavaScript relational objects, Petri-net simulation, MSAGL drawing-model adapters |
| Browser component | Canvas graph viewer, custom labels/colors, highlights, pan/zoom, vertex dragging, selection/edit events, SVG export |

## Use the web component

The viewer is an optional rendering surface. The graph and algorithm modules also work without a document or rendering engine.

```html
<quikgraph-viewer style="display:block;height:500px"></quikgraph-viewer>
<script type="module">
  import {
    defineQuikGraphViewer, BidirectionalGraph, TaggedEdge,
    DijkstraShortestPathAlgorithm
  } from 'https://cdn.jsdelivr.net/npm/@wieslawsoltes/quikgraphweb@0.1.0/dist/index.js';

  defineQuikGraphViewer();
  const graph = new BidirectionalGraph();
  graph.AddVerticesAndEdgeRange([
    new TaggedEdge('A', 'B', 2), new TaggedEdge('B', 'C', 3)
  ]);
  const viewer = document.querySelector('quikgraph-viewer');
  viewer.Graph = graph;
  const algorithm = new DijkstraShortestPathAlgorithm(graph, e => e.Tag);
  algorithm.Compute('A');
  viewer.HighlightedEdges = new Set(algorithm.TryGetPath('C'));
  viewer.Refresh();
  viewer.addEventListener('graph-select', event => console.log(event.detail.vertex));
</script>
```

For a script-tag global, load `dist/quikgraphweb.min.js` and use `QuikGraphWeb`. Registration is explicit through `defineQuikGraphViewer()`; importing the library does not register a custom element automatically.

## .NET-style events and extension methods

```js
import { BreadthFirstSearchAlgorithm, AlgorithmExtensions } from '@wieslawsoltes/quikgraphweb';

const search = new BreadthFirstSearchAlgorithm(graph);
const subscription = search.DiscoverVertex.subscribe(vertex => console.log(vertex));
search.Compute('A');
subscription.Dispose();

const tryPath = AlgorithmExtensions.ShortestPathsDijkstra(graph, edge => edge.Tag, 'A');
const path = tryPath('C'); // Edge array, or undefined when no path is available
```

Map-compatible dictionaries replace .NET dictionary indexers. Internal `EqualityMap` and `EqualitySet` collections also support vertices that provide `Equals` and `GetHashCode`; ordinary objects retain reference identity. Extension methods are exported functions and members of `AlgorithmExtensions`, `GraphExtensions`, or `EdgeExtensions`. JavaScript cannot express CLR `out` arguments or generic overload resolution verbatim; the mapped conventions are documented in [compatibility](docs/compatibility.md).

## Develop and verify

```sh
npm ci
npm run check          # build, unit/corpus tests, audit, packed consumers, demo
npm run dev            # graph laboratory at http://127.0.0.1:4173
npx playwright install chromium
npm run test:browser   # built showcase interactions, exports, workers, responsive layouts
npm run benchmark     # timed correctness-checked sparse graph workload
```

The source is pinned to QuikGraph commit `9cd6b49292e09041258708a37bed99c56177b0ef`. The repository retains the original graph fixtures and a compressed C# reference-test corpus. Those C# files are reference material; `npm test` runs the JavaScript ports and independent regression/property checks. `npm run audit` reports source mappings without equating a matching name to complete behavioral coverage.

## Publish

The CI workflow verifies Node 22 and 24, checks installed tarball consumers, runs Chromium tests, and builds release archives. A passing `main` commit with a new package version creates a GitHub release and publishes the exact release tarball to npm with `NPM_TOKEN` and provenance. Checksums and public-registry artifact verification run before/after publication. Existing versions and release assets are preserved. The showcase is deployed through an independent GitHub Pages job.

For an explicit retry, use the **Publish npm registry** workflow with the existing release tag and its full commit SHA. See [release process](docs/publishing.md).

## License and attribution

Microsoft Public License (MS-PL), preserving QuikGraph's upstream license. See [LICENSE](LICENSE) and [NOTICE](NOTICE). QuikGraph originated as QuickGraph by Jonathan “Peli” de Halleux, continued as YC.QuickGraph, and is maintained by KeRNeLith and contributors. QuikGraphWeb is an independent JavaScript adaptation.
