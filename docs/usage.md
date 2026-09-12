# API usage

Import names from `@wieslawsoltes/quikgraphweb`. The package root reexports all modules. The browser's API catalog lists the current runtime exports; `dist/*.d.ts` contains declarations.

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

Methods: `Layout('circle' | 'grid')`, `Fit()`, `Zoom(factor, x?, y?)`, `Refresh()`, `ToSvg()`.

Events bubble and cross the shadow boundary:

| Event | `event.detail` |
| --- | --- |
| `graph-select` | `{ vertex }` |
| `graph-layout-change` | `{ vertex, position: { x, y } }` |
| `graph-create-vertex` | `{ x, y }` in graph coordinates |
| `graph-delete-vertex` | `{ vertex }` |

The host chooses whether to act on edit requests; the viewer itself does not mutate the graph on those events. Customize `--graph-bg`, `--graph-text`, `--graph-edge`, `--graph-node`, and `--graph-dot` CSS variables for themes.

## Module workers

All computation modules and the package root can be imported in a module worker. Send graph data, reconstruct a graph, compute, and post plain results or transferable typed arrays. DOM APIs are only required to instantiate/register the viewer. Algorithms execute synchronously within the worker; terminate a worker when hard cancellation outside event callbacks is needed.
