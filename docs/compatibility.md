# JavaScript compatibility

The reference is QuikGraph commit `9cd6b49292e09041258708a37bed99c56177b0ef`, covering the six maintained projects: Core, Graphviz, Serialization, Data, MSAGL and Petri. Historical projects under `src/Tmp` and .NET build infrastructure are outside those shipped modules. Framework compatibility shims such as legacy `ISet` and `SortedSet` use native JavaScript facilities or declarations rather than exporting another CLR.

## API conventions

| C# pattern | JavaScript pattern |
| --- | --- |
| `new AdjacencyGraph<TVertex, TEdge>()` | `new AdjacencyGraph()`; optional TypeScript generic arguments |
| `edge.Source`, `graph.VertexCount` | Same PascalCase names |
| `dictionary[vertex]` | `dictionary.get(vertex)` / `.set(vertex, value)` |
| `IEnumerable<T>` | JavaScript iterable; use `Array.from()` or spread when indexing is needed |
| `TryGet*(..., out value)` | Value on success; `undefined` on failure |
| `SomeEvent += handler` | `SomeEvent.add(handler)` or `.subscribe(handler)` |
| `SomeEvent -= handler` | `.remove(handler)`; subscription supports `.Dispose()`, `.dispose()`, `.unsubscribe()` |
| `using(observer.Attach(algorithm))` | Keep attachment and call `.Dispose()` in a `finally` block |
| Extension method | Named export or static object, e.g. `AlgorithmExtensions.ShortestPathsDijkstra(graph, ...)` |
| CLR generic graph factory | JavaScript callback, e.g. `() => new BidirectionalGraph()` |
| Multiple `out` values | Documented result record or metadata on a returned function |

The `ShortestPathsBellmanFord` lookup has `hasNegativeCycle` and `algorithm` properties. `MaximumFlow` returns `{ value, predecessors, algorithm }`. Incremental components `GetComponents()` returns `{ Key, Value }`, with the count and component Map. Empty paths and missing paths retain the individual upstream method's behavior; an empty array does not necessarily mean success for every `TryGetPath` API.

`TreeCyclePoppingRandom(graph, root)` returns a lookup for the final directed path **from the queried vertex toward `root`**. It reads the final successor tree after loops have been erased. The requested root, vertices outside its rooted tree, and unknown vertices return `undefined`. The lookup exposes `.algorithm` and `.successors`; sampled `TreeEdge` events are not treated as a final predecessor tree.

Vertices use SameValueZero for primitive keys and reference identity for ordinary objects. Objects that explicitly implement `Equals(other)` use that equality contract; an optional `GetHashCode()` supplies hash buckets. `EqualityMap` and `EqualitySet` preserve the first inserted representative, support collisions, and retain a native fast path for primitive and ordinary object keys. Graphs, algorithms, and the viewer use these collections internally. Equal objects must have equal, stable hashes, and equality must be reflexive, symmetric, and transitive. Caller-supplied native Maps retain native identity semantics; use `EqualityMap` for caller-owned dictionaries that need custom equality. JavaScript does not provide CLR value-type copying, generic variance, attribute reflection, or binary layout. Algorithms are synchronous and support cooperative cancellation through events/services. To keep a UI responsive on large inputs, run computation in a module worker.

## External-engine adapters

The MSAGL integration creates and populates drawing models and retains formatting events. It requires a supplied `Layout(graph, options)` adapter for actual MSAGL-compatible layout. It does not embed the native/.NET MSAGL engine.

Graphviz generates DOT text and supports renderer/engine interfaces. An actual Graphviz process or WebAssembly renderer is supplied by the consumer when an image is required; the package does not include Graphviz binaries.

GraphML supports explicit JavaScript metadata, typed values, defaults, BigInt Int64 values, and structural/lexical validation. CLR attribute reflection is replaced with options. Empty array content represents `[]`, while a quoted empty string preserves `['']`; this intentionally fixes the upstream encoding ambiguity and avoids losing empty elements. Full XSD validation requires a supplied validator. Generic XML offers writer/factory callbacks. CLR binary serialization requires an explicit compatible serialization adapter; a JavaScript JSON encoding is not presented as BinaryFormatter compatibility.

Data adapters accept `{ Tables, Relations }` objects with table/column/relation properties instead of `System.Data.DataSet`. Browser file paths use strings, streams, or writer callbacks appropriate to the API. .NET assembly loading, native process invocation, GDI font objects, and framework serialization services are not built into the package.

## Algorithms and numerical behavior

Edge weights are JavaScript numbers. Doubles use IEEE 754; CLR Int64 data can use BigInt in supported serializers. Floating-point roundoff still applies. Callers should supply finite weights/capacities unless an individual algorithm explicitly documents another contract. Nonnegative-weight algorithms reject negative weights; Bellman–Ford handles reachable negative cycles.

PageRank retains QuikGraph's unnormalized `(1 - Damping) + Damping * incomingContribution` recurrence and original sink behavior. The result is not a probability distribution summing to one. Transitive closure/reduction retain the directed-acyclic-graph requirement. Exact TSP, Hamiltonian, and clique algorithms have exponential worst-case cost. No arbitrary size limit silently replaces their result with a heuristic.

Fibonacci heap cells use the standard direct-child count for `Degree`. Upstream uses a height-like rank in some operations, so valid heap topology and `DrawHeap` spacing after `ChangeKey` can differ while priority order and contents remain correct. Stable JavaScript heap tie ordering can choose a different equal-cost route from .NET. Random APIs do not reproduce the .NET Random byte sequence. CryptoRandom intentionally ignores its constructor seed and uses Web Crypto. Thread locks are not reproduced in the single-threaded object model; share serialized graph data between workers rather than a mutable graph instance.

`GetVertexIdentity` retains string representations for homogeneous primitive graphs (including `True`/`False` for booleans). Mixed-type and object graphs use allocated IDs, and IDs remain distinct when unlike JavaScript values stringify alike. `GetEdgeIdentity` honors the supplied edge's value-equality contract where present. `EquateGraphs.Equate` uses edge equality by default; pass explicit vertex/edge predicates or `{ Equals(a, b) }` comparers for structural comparison by endpoints.

## Correctness changes

The port intentionally fixes source defects found during independent validation, including empty/disconnected Prim forests, Tarjan LCA postorder union, repeated-compute result resets, redundant parallel transitive arcs, infeasible random generation, reverse/residual edge pairing in multigraph flows, missing graph-balancer edges, soft-heap linkage, unreachable-cycle best-first searches, ranked-path deviation pruning, and cycle-popping path lookups that previously retained erased predecessor edges. Source-compatible naming does not mean reproducing those incorrect outputs.

## Test coverage and limits

The source inventory contains 1,939 declared NUnit test methods, before inherited fixtures and parameter expansion. JavaScript tests combine source-linked ports, all valid upstream algorithm GraphML fixtures, generated formatter cases, and independent mathematical oracles. Copied C# files are not runnable JavaScript tests.

The [platform-test disposition list](platform-test-boundaries.json) records 22 specific source methods with pinned links and reasons: 21 execute BinaryFormatter contracts and one tests Reflection.Emit IL generation. These are explicit CLR runtime boundaries, not passing JavaScript tests or removals from the source inventory. Null and unreadable/unwritable-stream validation remains portable and is not classified as a CLR-only test.

The [conformance audit](conformance-audit.json) records export-name presence and source test mappings, with a compact [count summary](conformance-summary.json). `npm run audit` regenerates these files and identical `test-results/conformance-audit.json` evidence for CI. A mapped test means executable JavaScript checks refer to the source method; it does not automatically verify every source assertion, parameter combination, exception type, or .NET runtime behavior. Full assertion-for-assertion NUnit conformance is not claimed. Runtime member presence and TypeScript declaration checks are additional evidence, not proof of complete overload equivalence. See `test-inventory.json` for every original method and the current report for remaining unmapped methods. The source inventory retains its initial unverified status; the generated report contains current mappings. [Verification](verification.md) describes the test methodology, performance observations, and qualification limits.

The viewer uses Canvas 2D with requestAnimationFrame invalidation, device-pixel-ratio scaling, and vertex culling. It does not implement WebGPU or a replacement for a specialized graph-layout engine. Keyboard zoom/fit and native controls are available; the canvas is summarized for assistive technology, while rich per-edge screen-reader navigation remains outside the current viewer.
