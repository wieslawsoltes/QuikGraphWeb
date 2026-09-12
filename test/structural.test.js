import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Edge, SEdge, SEquatableEdge, EquatableEdge, TaggedEdge, AdjacencyGraph, BidirectionalGraph, UndirectedGraph, DelegateUndirectedGraph } from '../src/core.js';
import * as S from '../src/structural.js';

class EqualVertex {
  constructor(id) { this.id = id; }
  Equals(other) { return other instanceof EqualVertex && this.id === other.id; }
  GetHashCode() { return 7; } // Deliberately collide every distinct vertex.
}
const equalVertex = id => new EqualVertex(id);
function equalGraph(pairs, Type = BidirectionalGraph, ids = [0, 1, 2, 3, 4]) {
  const graph = new Type(); graph.AddVertexRange(ids.map(equalVertex));
  graph.AddEdgeRange(pairs.map(([s,t,w = 1]) => new TaggedEdge(equalVertex(s), equalVertex(t), w)));
  return graph;
}

function graph(pairs = [], Type = BidirectionalGraph, extra = [], EdgeType = Edge) {
  const g = new Type(); g.AddVertexRange(extra); g.AddVerticesAndEdgeRange(pairs.map(([a, b, tag]) => tag === undefined ? new EdgeType(a, b) : new TaggedEdge(a, b, tag))); return g;
}
const pairSet = g => new Set(Array.from(g.Edges, e => `${e.Source}:${e.Target}`));
function reachable(g, start, undirected = false, exclude) {
  const seen = new Set([start]), pending = [start], all = Array.from(g.Edges);
  while (pending.length) { const v = pending.pop(); for (const e of all) { if (e === exclude) continue; const next = e.Source === v ? e.Target : undirected && e.Target === v ? e.Source : undefined; if (next !== undefined && !seen.has(next)) { seen.add(next); pending.push(next); } } }
  return seen;
}
function validTopological(g, order, reverse = false) {
  assert.equal(order.length, g.VertexCount); assert.equal(new Set(order).size, order.length); const index = new Map(order.map((v, i) => [v, i]));
  for (const e of g.Edges) assert.ok(reverse ? index.get(e.Source) > index.get(e.Target) : index.get(e.Source) < index.get(e.Target));
}
function seeded(seed = 42) { return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }

// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::Constructor_Throws
for (const Type of [S.ConnectedComponentsAlgorithm, S.WeaklyConnectedComponentsAlgorithm, S.StronglyConnectedComponentsAlgorithm]) {
  test(`${Type.name} constructors, supplied dictionary, null arguments and repeated compute`, () => {
    const g = graph(), components = new Map();
    for (const a of [new Type(g), new Type(g, components), new Type(null, g, components)]) { assert.equal(a.VisitedGraph, g); assert.equal(a.ComponentCount, 0); assert.equal(a.Components.size, 0); a.Compute(); a.Compute(); assert.equal(a.ComponentCount, 0); }
    for (const args of [[null], [g, null], [null, components], [null, null], [null, g, null], [null, null, components], [null, null, null]]) assert.throws(() => new Type(...args));
  });
}

// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::OneComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::TwoComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::MultipleComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::ConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::OneComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::TwoComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::MultipleComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::WeaklyConnectedComponents
for (const [Type, GraphType] of [[S.ConnectedComponentsAlgorithm, UndirectedGraph], [S.WeaklyConnectedComponentsAlgorithm, BidirectionalGraph]]) {
  for (const count of [1, 2, 5]) test(`${Type.name} ${count} disjoint components`, () => {
    const g = graph([], GraphType), expected = new Map();
    for (let i = 0; i < count; ++i) { g.AddVerticesAndEdge(new Edge(i * 3 + 1, i * 3)); g.AddVerticesAndEdge(new Edge(i * 3 + 1, i * 3 + 2)); for (let j = 0; j < 3; ++j) expected.set(i * 3 + j, i); }
    const a = new Type(g).Compute(); assert.equal(a.ComponentCount, count); for (const [v, c] of expected) assert.equal(a.Components.get(v), c);
    assert.equal(a.Graphs.reduce((n, c) => n + c.VertexCount, 0), g.VertexCount);
  });
}

// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::OneComponent
test('SCC one cycle', () => { const a = new S.StronglyConnectedComponentsAlgorithm(graph([[1, 2], [2, 3], [3, 1]])).Compute(); assert.equal(a.ComponentCount, 1); assert.deepEqual(new Set(a.Components.values()), new Set([0])); });
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::ThreeComponents
test('SCC exact reverse-finish numbering', () => {
  const a = new S.StronglyConnectedComponentsAlgorithm(graph([[1, 2], [2, 3], [2, 4], [3, 1], [4, 5]])).Compute();
  assert.equal(a.ComponentCount, 3); assert.deepEqual(new Map(a.Components), new Map([[1, 2], [2, 2], [3, 2], [4, 1], [5, 0]])); assert.deepEqual(a.Graphs.map(g => new Set(g.Vertices)), [new Set([5]), new Set([4]), new Set([1, 2, 3])]);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::MultipleComponents
test('SCC larger upstream fixture and trace reset', () => {
  const g = graph([[1,2],[2,3],[2,4],[2,5],[3,1],[3,4],[4,6],[5,6],[5,7],[6,4],[7,5],[7,8],[8,6],[8,7]]); g.AddVertex(10);
  const a = new S.StronglyConnectedComponentsAlgorithm(g).Compute(); assert.equal(a.ComponentCount, 4);
  for (const [v, c] of [[1,2],[2,2],[3,2],[4,0],[5,1],[6,0],[7,1],[8,1],[10,3]]) assert.equal(a.Components.get(v), c);
  assert.equal(a.Steps, g.VertexCount * 2); assert.equal(a.Steps, a.ComponentsPerStep.length); assert.equal(a.Steps, a.VerticesPerStep.length); a.Compute(); assert.equal(a.Steps, g.VertexCount * 2);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::StronglyConnectedComponents
test('SCC and weak components agree with independent all-pairs reachability', () => {
  const rng = seeded();
  for (let trial = 0; trial < 35; ++trial) {
    const g = graph([], BidirectionalGraph, Array.from({ length: 12 }, (_, i) => i));
    for (let i = 0; i < 30; ++i) g.AddEdge(new Edge(Math.floor(rng() * 12), Math.floor(rng() * 12)));
    const strong = new S.StronglyConnectedComponentsAlgorithm(g).Compute(), weak = new S.WeaklyConnectedComponentsAlgorithm(g).Compute(), paths = new Map(Array.from(g.Vertices, v => [v, reachable(g, v)]));
    for (const a of g.Vertices) for (const b of g.Vertices) { assert.equal(strong.Components.get(a) === strong.Components.get(b), paths.get(a).has(b) && paths.get(b).has(a)); assert.equal(weak.Components.get(a) === weak.Components.get(b), reachable(g, a, true).has(b)); }
  }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::InvalidUse
test('Incremental components constructors and precompute guards', () => {
  const g = graph(); for (const a of [new S.IncrementalConnectedComponentsAlgorithm(g), new S.IncrementalConnectedComponentsAlgorithm(null, g)]) { assert.equal(a.VisitedGraph, g); assert.throws(() => a.ComponentCount); assert.throws(() => a.GetComponents()); a.Dispose(); }
  assert.throws(() => new S.IncrementalConnectedComponentsAlgorithm(null)); assert.throws(() => new S.IncrementalConnectedComponentsAlgorithm(null, null));
});
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::IncrementalConnectedComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::IncrementalConnectedComponentMultiRun
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::Dispose
test('Incremental components track graph additions and unsubscribe on dispose', () => {
  const g = graph([], BidirectionalGraph, [0,1,2,3]), a = new S.IncrementalConnectedComponentsAlgorithm(g).Compute();
  assert.equal(a.ComponentCount, 4); g.AddEdge(new Edge(0,1)); assert.equal(a.ComponentCount, 3); g.AddEdge(new Edge(2,3)); assert.equal(a.ComponentCount, 2); g.AddEdge(new Edge(1,3)); assert.equal(a.ComponentCount, 1);
  g.AddVerticesAndEdge(new Edge(4,5)); assert.equal(a.ComponentCount, 2); g.AddVertex(6); assert.equal(a.ComponentCount, 3);
  const result = a.GetComponents(); assert.equal(result.Key, 3); assert.deepEqual(new Map(result.Value), new Map([[0,0],[1,0],[2,0],[3,0],[4,1],[5,1],[6,2]]));
  const snapshot = a.GetComponents(); a.Compute(); a.Compute(); assert.equal(g.EdgeAdded.Count, 1); a.Dispose(); a.Dispose(); assert.equal(g.EdgeAdded.Count, 0); g.AddVertex(7); assert.equal(snapshot.Value.size, 7); assert.doesNotThrow(() => g.RemoveVertex(7)); a.Compute(); assert.equal(g.EdgeAdded.Count, 1); a.Dispose();
});
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/IncrementalConnectedComponentsAlgorithmTests.cs::IncrementalConnectedComponent_Throws
test('Incremental components prohibit removals while attached', () => {
  for (const removeEdge of [false, true]) { const g = graph([[1,2]], BidirectionalGraph, [9]), a = new S.IncrementalConnectedComponentsAlgorithm(g).Compute(); assert.throws(() => removeEdge ? g.RemoveEdge(Array.from(g.Edges)[0]) : g.RemoveVertex(9)); a.Dispose(); }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::Constructor_Throws
for (const Type of [S.TopologicalSortAlgorithm, S.SourceFirstTopologicalSortAlgorithm, S.SourceFirstBidirectionalTopologicalSortAlgorithm, S.UndirectedTopologicalSortAlgorithm, S.UndirectedFirstTopologicalSortAlgorithm]) test(`${Type.name} constructors and empty graph`, () => { const a = new Type(graph()); assert.equal(a.SortedVertices, null); a.Compute(); assert.deepEqual(a.SortedVertices, []); assert.throws(() => new Type(null)); });

// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::OneTwo
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::TwoOne
test('DFS topological sort preserves edge direction for either insertion order', () => { for (const pair of [[1,2],[2,1]]) assert.deepEqual(new S.TopologicalSortAlgorithm(graph([pair])).Compute().SortedVertices, pair); });
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::SimpleGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::SimpleGraph
for (const Type of [S.SourceFirstTopologicalSortAlgorithm, S.SourceFirstBidirectionalTopologicalSortAlgorithm]) test(`${Type.name} exact upstream heap order`, () => {
  const g = graph([[1,2],[2,3],[2,6],[2,8],[4,2],[4,5],[5,6],[7,5],[7,8]]), a = new Type(g), events = []; a.VertexAdded.add(v => events.push(v)); a.Compute();
  assert.deepEqual(a.SortedVertices, [1,7,4,2,5,8,3,6]); assert.deepEqual(events, a.SortedVertices); a.Compute(); validTopological(g, a.SortedVertices);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::SimpleGraphOneToAnother
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::SimpleGraphOneToAnother
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::ForestGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::ForestGraph
test('Source-first exact upstream chain and forest orders', () => {
  for (const Type of [S.SourceFirstTopologicalSortAlgorithm, S.SourceFirstBidirectionalTopologicalSortAlgorithm]) {
    const g = graph([[0,1],[1,2],[1,3],[2,3],[3,4]]); assert.deepEqual(new Type(g).Compute().SortedVertices, [0,1,2,3,4]); g.AddVerticesAndEdge(new Edge(5,6)); assert.deepEqual(new Type(g).Compute().SortedVertices, [0,5,1,6,2,3,4]);
  }
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::GraphWithSelfEdge_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::TopologicalSort_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::GraphWithSelfEdge_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::SourceFirstTopologicalSort_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::GraphWithSelfEdge_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::SourceFirstBidirectionalTopologicalSort_Throws
for (const Type of [S.TopologicalSortAlgorithm, S.SourceFirstTopologicalSortAlgorithm, S.SourceFirstBidirectionalTopologicalSortAlgorithm]) test(`${Type.name} rejects directed cycles and self edges`, () => { for (const pairs of [[[1,1]], [[1,2],[2,3],[3,1]]]) assert.throws(() => new Type(graph(pairs)).Compute(), { name: 'NonAcyclicGraphException' }); });
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::GraphWithSelfEdge
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::UndirectedTopologicalSort_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::GraphWithSelfEdge
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::UndirectedFirstTopologicalSort_Throws
for (const Type of [S.UndirectedTopologicalSortAlgorithm, S.UndirectedFirstTopologicalSortAlgorithm]) test(`${Type.name} acyclic, self-edge and cyclic opt-in`, () => {
  for (const pairs of [[[1,1]], [[1,2],[2,3],[3,1]], [[1,2],[1,2]]]) { const a = new Type(graph(pairs, UndirectedGraph)); assert.throws(() => a.Compute(), { name: 'NonAcyclicGraphException' }); a.AllowCyclicGraph = true; a.Compute(); assert.equal(new Set(a.SortedVertices).size, a.VisitedGraph.VertexCount); }
  const a = new Type(graph([[2,1],[2,3],[4,5]], UndirectedGraph)).Compute(); assert.equal(a.SortedVertices.length, 5);
});
test('All directed topological variants satisfy random DAG constraints, including backward order', () => {
  const rng = seeded(98); for (let t = 0; t < 30; ++t) { const g = graph([], BidirectionalGraph, Array.from({length:20},(_,i)=>i)); for (let a = 0; a < 20; ++a) for (let b = a + 1; b < 20; ++b) if (rng() < .16) g.AddEdge(new Edge(a,b)); for (const Type of [S.TopologicalSortAlgorithm,S.SourceFirstTopologicalSortAlgorithm,S.SourceFirstBidirectionalTopologicalSortAlgorithm]) validTopological(g,new Type(g).Compute().SortedVertices); validTopological(g,new S.SourceFirstBidirectionalTopologicalSortAlgorithm(g,S.TopologicalSortDirection.Backward).Compute().SortedVertices,true); }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/KruskalMinimumSpanningTreeTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/KruskalMinimumSpanningTreeTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/PrimMinimumSpanningTreeTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/PrimMinimumSpanningTreeTests.cs::Constructor_Throws
for (const Type of [S.PrimMinimumSpanningTreeAlgorithm, S.KruskalMinimumSpanningTreeAlgorithm]) test(`${Type.name} constructors and empty graph`, () => {
  const g = graph([], UndirectedGraph), w = e => e.Tag; for (const a of [new Type(g,w),new Type(null,g,w)]) { a.Compute(); assert.deepEqual(a.SpanningTree,[]); }
  for (const args of [[null,w],[g,null],[null,null],[null,g,null],[null,null,w]]) assert.throws(() => new Type(...args));
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/MinimumSpanningTreeTestsBase.cs::SimpleComparePrimKruskal
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/MinimumSpanningTreeTestsBase.cs::TestGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/KruskalMinimumSpanningTreeTests.cs::KruskalMinimumSpanningTree
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/PrimMinimumSpanningTreeTests.cs::PrimMinimumSpanningTree
test('Prim and Kruskal produce optimal forests including negative, parallel and self edges', () => {
  const g=graph([[0,1,3],[0,1,1],[1,2,-2],[0,2,6],[0,0,-100],[3,4,4]],UndirectedGraph,[5]);
  for (const Type of [S.PrimMinimumSpanningTreeAlgorithm,S.KruskalMinimumSpanningTreeAlgorithm]) { const a=new Type(g,e=>e.Tag), eventEdges=[]; a.TreeEdge.add(e=>eventEdges.push(e)); a.Compute(); assert.equal(a.SpanningTree.length,3); assert.equal(a.SpanningTree.reduce((s,e)=>s+e.Tag,0),3); assert.deepEqual(eventEdges,a.SpanningTree); a.Compute(); assert.equal(a.SpanningTree.length,3); }
});
test('Minimum spanning trees match independent exhaustive subset optimization', () => {
  const rng=seeded(75);
  for(let trial=0;trial<20;++trial){ const pairs=[[0,1],[1,2],[2,3],[0,2],[0,3],[1,3]].map(([a,b])=>[a,b,Math.floor(rng()*15)-5]),g=graph(pairs,UndirectedGraph),es=Array.from(g.Edges); let best=Infinity;
    for(let mask=0;mask<1<<es.length;++mask){const chosen=es.filter((_,i)=>mask>>i&1);if(chosen.length!==3)continue;const candidate=graph([],UndirectedGraph,[0,1,2,3]);candidate.AddEdgeRange(chosen);if(reachable(candidate,0,true).size===4)best=Math.min(best,chosen.reduce((s,e)=>s+e.Tag,0));}
    for(const Type of [S.PrimMinimumSpanningTreeAlgorithm,S.KruskalMinimumSpanningTreeAlgorithm])assert.equal(new Type(g,e=>e.Tag).Compute().SpanningTree.reduce((s,e)=>s+e.Tag,0),best);
  }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/CondensededEdgeTests.cs::Construction
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/CondensededEdgeTests.cs::Construction_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/CondensededEdgeTests.cs::Edges
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Construction
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Construction_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Edges
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Merge
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Merge_Throws
test('Condensed and merged edge constructors, collections and merge provenance',()=>{
  for(const Type of [S.CondensedEdge,S.MergedEdge]){const a={},b={},e=new Type(a,b);assert.equal(e.Source,a);assert.equal(e.Target,b);assert.deepEqual(e.Edges,[]);assert.throws(()=>new Type(null,b));assert.throws(()=>new Type(a,null));}
  const a=new S.MergedEdge(1,2),b=new S.MergedEdge(2,3),x=new Edge(1,2),y=new Edge(2,3);a.Edges.push(x);b.Edges.push(y);const merged=S.MergedEdge.Merge(a,b);assert.equal(merged.Source,1);assert.equal(merged.Target,3);assert.deepEqual(merged.Edges,[x,y]);assert.throws(()=>S.MergedEdge.Merge(null,b));assert.throws(()=>S.MergedEdge.Merge(a,null));
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/StronglyConnectedCondensationGraphAlgorithmTests.cs::OneStronglyConnectedComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/StronglyConnectedCondensationGraphAlgorithmTests.cs::MultipleStronglyConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/StronglyConnectedCondensationGraphAlgorithmTests.cs::StronglyConnectedCondensation
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::OneWeaklyConnectedComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::MultipleWeaklyConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::WeaklyConnectedCondensation
test('Condensation partitions all original vertices and edges and merges component arcs',()=>{
  const g=graph([[1,2],[2,1],[2,3],[1,3],[3,4],[4,3],[5,6]]),a=new S.CondensationGraphAlgorithm(g).Compute(),c=a.CondensedGraph;
  assert.equal(c.VertexCount,4);assert.equal(c.EdgeCount,2);assert.deepEqual(Array.from(c.Edges,e=>e.Edges.length).sort(),[1,2]);validTopological(c,new S.TopologicalSortAlgorithm(c).Compute().SortedVertices);
  const recovered=[...Array.from(c.Vertices).flatMap(v=>Array.from(v.Edges)),...Array.from(c.Edges).flatMap(e=>e.Edges)];assert.deepEqual(new Set(recovered),new Set(g.Edges));
  a.StronglyConnected=false;a.Compute();assert.equal(a.CondensedGraph.VertexCount,2);assert.equal(a.CondensedGraph.EdgeCount,0);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/EdgeMergeCondensationGraphAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/EdgeMergeCondensationGraphAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/EdgeMergeCondensationGraphAlgorithmTests.cs::EdgeCondensationAllVertices
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/EdgeMergeCondensationGraphAlgorithmTests.cs::EdgeCondensationSomeVertices
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/EdgeMergeCondensationGraphAlgorithmTests.cs::EdgeCondensation
test('Edge-merge condensation retains all paths through filtered vertices',()=>{
  const g=graph([[1,2],[2,3],[2,4],[3,5],[4,5],[2,2]]),out=graph(),a=new S.EdgeMergeCondensationGraphAlgorithm(g,out,v=>v===1||v===5);a.Compute();assert.deepEqual(new Set(out.Vertices),new Set([1,5]));assert.equal(out.EdgeCount,2);for(const e of out.Edges){assert.equal(e.Source,1);assert.equal(e.Target,5);assert.equal(e.Edges.length,3);}
  const all=graph();new S.EdgeMergeCondensationGraphAlgorithm(g,all,()=>true).Compute();assert.equal(all.EdgeCount,g.EdgeCount);assert.equal(all.VertexCount,g.VertexCount);
  for(const args of [[null,out,()=>true],[g,null,()=>true],[g,out,null]])assert.throws(()=>new S.EdgeMergeCondensationGraphAlgorithm(...args));
});

// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveClosureAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveClosureAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveReductionAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveReductionAlgorithmTests.cs::Constructor_Throws
test('Transitive constructor state and argument validation',()=>{const g=graph(),a=new S.TransitiveClosureAlgorithm(g,(a,b)=>new Edge(a,b)),b=new S.TransitiveReductionAlgorithm(g);assert.equal(a.TransitiveClosure.VertexCount,0);assert.equal(b.TransitiveReduction.VertexCount,0);assert.throws(()=>new S.TransitiveClosureAlgorithm(null,()=>{}));assert.throws(()=>new S.TransitiveClosureAlgorithm(g,null));assert.throws(()=>new S.TransitiveReductionAlgorithm(null));});
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveClosureAlgorithmTests.cs::TransitiveClosure_ValueType
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveClosureAlgorithmTests.cs::TransitiveClosure_ReferenceType
for(const EdgeType of [SEquatableEdge,EquatableEdge])test(`Transitive closure upstream ${EdgeType.name} fixtures`,()=>{
  for(const pairs of [[[1,2],[2,3]],[[1,2],[2,3],[3,4],[3,5]]]){const g=graph(pairs,AdjacencyGraph,[],EdgeType),a=new S.TransitiveClosureAlgorithm(g,(a,b)=>new EdgeType(a,b)).Compute(),expected=new Set();for(const v of g.Vertices)for(const w of reachable(g,v))if(v!==w)expected.add(`${v}:${w}`);assert.deepEqual(pairSet(a.TransitiveClosure),expected);const count=a.TransitiveClosure.EdgeCount;a.Compute();assert.equal(a.TransitiveClosure.EdgeCount,count);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveReductionAlgorithmTests.cs::TransitiveReduction_ValueType
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveReductionAlgorithmTests.cs::TransitiveReduction_ReferenceType
for(const EdgeType of [SEdge,Edge])test(`Transitive reduction upstream ${EdgeType.name} fixtures`,()=>{
  const fixtures=[[[[1,2],[1,3],[1,4],[1,5],[2,4],[3,4],[3,5],[4,5]],[[1,2],[1,3],[2,4],[3,4],[4,5]]],[[[0,1],[0,2],[0,3],[2,3],[2,4],[2,5],[3,5],[4,5],[6,5],[6,7],[7,4]],[[0,1],[0,2],[2,3],[2,4],[3,5],[4,5],[6,7],[7,4]]]];
  for(const [pairs,expected]of fixtures){const g=graph(pairs,AdjacencyGraph,[],EdgeType),a=new S.TransitiveReductionAlgorithm(g).Compute();assert.deepEqual(pairSet(a.TransitiveReduction),new Set(expected.map(p=>p.join(':'))));for(const e of a.TransitiveReduction.Edges)assert.ok(Array.from(g.Edges).includes(e));}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveClosureAlgorithmTests.cs::TransitiveClosure_IsolatedVertices
// Upstream: tests/QuikGraph.Tests/Algorithms/TransitiveReductionAlgorithmTests.cs::TransitiveReduction_IsolatedVertices
test('Transitive transforms preserve isolated vertices and reject cycles',()=>{const g=graph([['/test','/test/123'],['/test/123','/test/456']],BidirectionalGraph,['/test/notlinked']);for(const a of [new S.TransitiveClosureAlgorithm(g,(a,b)=>new Edge(a,b)),new S.TransitiveReductionAlgorithm(g)]){a.Compute();assert.equal((a.TransitiveClosure??a.TransitiveReduction).VertexCount,4);}for(const Type of [S.TransitiveClosureAlgorithm,S.TransitiveReductionAlgorithm])assert.throws(()=>new Type(graph([[1,2],[2,1]]),(a,b)=>new Edge(a,b)).Compute(),{name:'NonAcyclicGraphException'});});
test('Transitive reduction preserves reachability and removes every redundant arc on random DAGs',()=>{
  const rng=seeded(291);for(let trial=0;trial<25;++trial){const g=graph([],BidirectionalGraph,[0,1,2,3,4,5,6,7]);for(let i=0;i<8;++i)for(let j=i+1;j<8;++j)if(rng()<.5)g.AddEdge(new Edge(i,j));const r=new S.TransitiveReductionAlgorithm(g).Compute().TransitiveReduction;for(const v of g.Vertices)assert.deepEqual(reachable(r,v),reachable(g,v));for(const e of r.Edges)assert.equal(reachable(r,e.Source,false,e).has(e.Target),false);}
});

// Upstream: tests/QuikGraph.Tests/Algorithms/PageRankAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/PageRankAlgorithmTests.cs::Constructor_Throws
test('PageRank constructor and parameter range validation',()=>{const a=new S.PageRankAlgorithm(graph());assert.equal(a.Ranks.size,0);assert.equal(a.Damping,.85);assert.equal(a.MaxIterations,60);assert.equal(a.Tolerance,2*Number.MIN_VALUE);for(const v of [-10,-.01,1.01,10,NaN])assert.throws(()=>a.Damping=v);for(const v of [-10,-1,NaN])assert.throws(()=>a.Tolerance=v);for(const v of [-10,-1,0,1.5])assert.throws(()=>a.MaxIterations=v);assert.throws(()=>new S.PageRankAlgorithm(null));});
// Upstream: tests/QuikGraph.Tests/Algorithms/PageRankAlgorithmTests.cs::PageRank
test('PageRank exact upstream ranking and sum/mean',()=>{
  const g=graph([['Amazon','Twitter'],['Amazon','Microsoft'],['Microsoft','Amazon'],['Microsoft','Facebook'],['Microsoft','Twitter'],['Microsoft','Apple'],['Facebook','Amazon'],['Facebook','Twitter'],['Twitter','Microsoft'],['Apple','Twitter']]),a=new S.PageRankAlgorithm(g).Compute();assert.deepEqual([...a.Ranks].sort((a,b)=>b[1]-a[1]).map(x=>x[0]),['Microsoft','Twitter','Amazon','Facebook','Apple']);const sum=[...a.Ranks.values()].reduce((a,b)=>a+b,0);assert.equal(a.GetRanksSum(),sum);assert.equal(a.GetRanksMean(),sum/5);
});
test('PageRank retains upstream unnormalized teleportation and sink semantics',()=>{const a=new S.PageRankAlgorithm(graph([[1,2]],BidirectionalGraph,[3]));a.MaxIterations=100;a.Compute();assert.equal(a.Ranks.get(1),.15000000000000002);assert.equal(a.Ranks.get(3),.15000000000000002);assert.ok(Math.abs(a.Ranks.get(2)-.2775)<1e-12);a.Damping=0;a.Compute();assert.deepEqual([...a.Ranks.values()],[1,1,1]);});

// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::TryGetVertexPairs
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::SetVertexPairs
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::SetVertexPairs_Throws
test('Offline LCA constructors and pair validation',()=>{const g=graph([],BidirectionalGraph,[1,2]),a=new S.TarjanOfflineLeastCommonAncestorAlgorithm(g);assert.equal(a.Ancestors.size,0);assert.equal(a.TryGetVertexPairs(),undefined);assert.throws(()=>a.SetVertexPairs(null));assert.throws(()=>a.SetVertexPairs([]));assert.throws(()=>a.SetVertexPairs([new Edge(1,3)]));const pairs=[new SEquatableEdge(1,2),new SEquatableEdge(2,1)];a.SetVertexPairs(pairs);assert.deepEqual(a.TryGetVertexPairs(),pairs);assert.throws(()=>new S.TarjanOfflineLeastCommonAncestorAlgorithm(null));});
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::ComputeWithRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::TarjanOfflineLeastCommonAncestor_Throws
test('Offline LCA root lifecycle and missing-pair guards',()=>{const a=new S.TarjanOfflineLeastCommonAncestorAlgorithm(graph([[1,2]]));assert.equal(a.TryGetRootVertex(),undefined);assert.throws(()=>a.Compute());a.SetRootVertex(1);assert.equal(a.TryGetRootVertex(),1);assert.throws(()=>a.Compute());assert.throws(()=>a.SetRootVertex(null));a.ClearRootVertex();assert.equal(a.TryGetRootVertex(),undefined);const pairs=[new Edge(1,2)];assert.throws(()=>a.Compute(null,pairs));assert.throws(()=>a.Compute(3,pairs));assert.throws(()=>a.Compute(1,null));a.Compute(1,pairs);assert.equal(a.Ancestors.get(pairs[0]),1);});
// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::TarjanOfflineLeastCommonAncestor
test('Offline LCA independently verified on every ordered pair of a branching tree',()=>{
  const g=graph([[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7]],BidirectionalGraph,[99]),parent=new Map(Array.from(g.Edges,e=>[e.Target,e.Source])),pairs=[];for(const a of g.Vertices)for(const b of g.Vertices)pairs.push(new SEquatableEdge(a,b));const a=new S.TarjanOfflineLeastCommonAncestorAlgorithm(g).Compute(0,pairs);
  for(const pair of pairs){if(pair.Source===99||pair.Target===99){assert.equal(a.Ancestors.has(pair),false);continue;}const ancestors=new Set();let v=pair.Source;for(;;){ancestors.add(v);if(!parent.has(v))break;v=parent.get(v);}v=pair.Target;while(!ancestors.has(v))v=parent.get(v);assert.equal(a.Ancestors.get(pair),v);assert.equal(a.Ancestors.get(new SEquatableEdge(pair.Source,pair.Target)),v);}
});

// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::GetVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::GetVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::GetEdge
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::GetEdge_Throws
test('Random element selection supports graph and iterable overloads and .NET Random',()=>{const g=graph([[1,2],[2,3]]),r={Next:n=>n-1};assert.equal(S.RandomGraphFactory.GetVertex(g,r),3);assert.equal(S.RandomGraphFactory.GetVertex([1,2,3],2,r),2);assert.equal(S.RandomGraphFactory.GetEdge(g,r),Array.from(g.Edges)[1]);assert.equal(S.RandomGraphFactory.GetEdge(g.Edges,2,()=>0),Array.from(g.Edges)[0]);for(const fn of [S.RandomGraphFactory.GetVertex,S.RandomGraphFactory.GetEdge]){assert.throws(()=>fn(null,r));assert.throws(()=>fn(g,null));assert.throws(()=>fn([],0,r));assert.throws(()=>fn([],3,r));assert.throws(()=>fn([1],-1,r));}});
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::Create
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::Create_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::Create_Undirected
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomGraphFactoryTests.cs::Create_Undirected_Throws
for(const Type of [AdjacencyGraph,UndirectedGraph])test(`Random ${Type.name} construction, capacity and degenerate RNG handling`,()=>{for(const parallel of [true,false])for(const self of [true,false]){const g=new Type(parallel);let i=0;S.RandomGraphFactory.Create(g,()=>i++,(a,b)=>new Edge(a,b),seeded(),10,30,self);assert.equal(g.VertexCount,10);assert.equal(g.EdgeCount,30);if(!self)for(const e of g.Edges)assert.notEqual(e.Source,e.Target);}let i=0;const g=new Type(false);S.RandomGraphFactory.Create(g,()=>i++,(a,b)=>new Edge(a,b),()=>0,4,6,false);assert.equal(g.EdgeCount,6);assert.throws(()=>S.RandomGraphFactory.Create(new Type(false),()=>0,(a,b)=>new Edge(a,b),()=>0,1,1,false));assert.throws(()=>S.RandomGraphFactory.Create(new Type(false),()=>i++,(a,b)=>new Edge(a,b),()=>0,2,100,true));for(const [v,e]of [[0,1],[-1,1],[1,-1]])assert.throws(()=>S.RandomGraphFactory.Create(new Type(),()=>i++,(a,b)=>new Edge(a,b),seeded(),v,e,false));});

test('Structural traversals support long chains without recursive stack overflow',()=>{const n=15000,g=graph([],BidirectionalGraph,Array.from({length:n},(_,i)=>i));for(let i=1;i<n;++i)g.AddEdge(new Edge(i-1,i));assert.equal(new S.StronglyConnectedComponentsAlgorithm(g).Compute().ComponentCount,n);assert.equal(new S.TopologicalSortAlgorithm(g).Compute().SortedVertices.length,n);const pair=new Edge(n-1,n-2);assert.equal(new S.TarjanOfflineLeastCommonAncestorAlgorithm(g).Compute(0,[pair]).Ancestors.get(pair),n-2);});

// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::SimpleGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::ForestGraph
test('Directed DFS exact upstream sort and forest fixtures',()=>{
  assert.deepEqual(new S.TopologicalSortAlgorithm(graph([[1,2],[2,3],[2,6],[2,8],[4,2],[4,5],[5,6],[7,5],[7,8]])).Compute().SortedVertices,[7,4,5,1,2,8,6,3]);
  assert.deepEqual(new S.TopologicalSortAlgorithm(graph([[0,1],[1,2],[1,3],[2,3],[3,4],[5,6]])).Compute().SortedVertices,[5,6,0,1,2,3,4]);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::SimpleGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::SimpleGraphOneToAnother
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::ForestGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::SimpleGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::SimpleGraphOneToAnother
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::ForestGraph
test('Undirected exact upstream DFS and heap orders',()=>{
  const fixtures=[[[[1,2],[2,3],[4,2],[4,5],[5,6],[7,5],[7,8]],[1,2,4,5,7,8,6,3],[1,8,3,7,2,6,4,5]],[[[0,1],[1,2],[1,3],[3,4]],[0,1,3,4,2],[0,4,2,3,1]],[[[0,1],[1,2],[1,3],[3,4],[5,6]],[5,6,0,1,3,4,2],[0,6,5,4,2,3,1]]];
  for(const [pairs,dfs,heap]of fixtures){const g=graph(pairs,UndirectedGraph);assert.deepEqual(new S.UndirectedTopologicalSortAlgorithm(g).Compute().SortedVertices,dfs);assert.deepEqual(new S.UndirectedFirstTopologicalSortAlgorithm(g).Compute().SortedVertices,heap);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::FacebookSeattleWordPuzzle
test('Topological letter puzzle preserves distinct object vertices with duplicate labels',()=>{
  const [e1,e2,s,i1,i2,n,t,v]=['e','e','s','i','i','n','t','v'].map(letter=>({letter}));const g=graph([[e1,s],[i1,n],[i1,i2],[n,e1],[n,e2],[e1,e2],[i1,v],[n,e1],[n,v],[i1,s],[t,s],[v,s],[v,e1],[v,e2],[t,e1],[t,e2],[i1,e1],[i1,e2],[v,t],[n,t],[v,i2],[i1,t],[n,s]],AdjacencyGraph,[e1,e2,s,i1,i2,n,t,v]);assert.equal(new S.TopologicalSortAlgorithm(g).Compute().SortedVertices.map(v=>v.letter).join(''),'invitees');
});
test('NaN and object vertices preserve JavaScript Map identity without hanging',()=>{
  const v={},g=graph([[NaN,v],[v,1]]);const a=new S.StronglyConnectedComponentsAlgorithm(g).Compute();assert.equal(a.ComponentCount,3);assert.equal(new S.WeaklyConnectedComponentsAlgorithm(g).Compute().ComponentCount,1);assert.deepEqual(new S.TopologicalSortAlgorithm(g).Compute().SortedVertices,[NaN,v,1]);const pair=new Edge(v,1);assert.equal(new S.TarjanOfflineLeastCommonAncestorAlgorithm(g).Compute(NaN,[pair]).Ancestors.get(pair),v);const mst=new S.KruskalMinimumSpanningTreeAlgorithm(graph([[NaN,v,1],[v,1,2]],UndirectedGraph),e=>e.Tag).Compute();assert.equal(mst.SpanningTree.length,2);
});

// Exact directed fixture from upstream tests/QuikGraph.Tests/GraphML/DCT8.graphml.
const dct8Nodes = ["255","256","257","258","259","260","261","262","263","264","265","266","267","268","269","270","271","272","273","274","275","276","277","278","279","280","281","282","283","284","285","286","287","288","289","290","291","292","293","294","295","296","297","298","299","300","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","318","319","320","321","322","323","324","325","326","327","328","329","330","331","332","333","334","335","336","337","338"];
const dct8Edges = [["255","278"],["256","271"],["257","277"],["258","276"],["259","275"],["260","274"],["261","272"],["262","273"],["263","284"],["264","281"],["265","308"],["266","307"],["267","282"],["268","283"],["269","306"],["270","311"],["271","264"],["271","266"],["272","264"],["272","266"],["273","263"],["273","270"],["274","267"],["274","269"],["275","265"],["275","268"],["276","268"],["276","265"],["277","267"],["277","269"],["278","263"],["278","270"],["279","290"],["280","300"],["281","279"],["281","280"],["282","280"],["282","279"],["283","286"],["283","285"],["284","285"],["284","286"],["285","289"],["286","299"],["287","291"],["288","295"],["289","287"],["289","288"],["290","287"],["290","288"],["299","300"],["299","304"],["300","301"],["301","305"],["302","293"],["303","297"],["304","302"],["304","303"],["305","302"],["305","303"],["306","308"],["306","309"],["307","309"],["307","310"],["308","317"],["309","312"],["310","318"],["311","310"],["311","315"],["312","316"],["313","333"],["314","332"],["315","313"],["315","314"],["316","313"],["316","314"],["317","319"],["317","321"],["318","320"],["318","321"],["319","323"],["320","324"],["321","322"],["322","325"],["323","331"],["324","330"],["325","323"],["325","324"],["326","294"],["327","292"],["328","296"],["329","298"],["330","327"],["330","329"],["331","326"],["331","328"],["332","326"],["332","328"],["333","327"],["333","329"],["334","301"],["335","312"],["336","319"],["337","322"],["338","320"]];
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::TopologicalSort_DCT8
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::SourceFirstTopologicalSort_DCT8
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::SourceFirstBidirectionalTopologicalSort_DCT8
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::UndirectedTopologicalSort_DCT8
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::UndirectedFirstTopologicalSort_DCT8
test('All topological variants run the exact upstream DCT8 fixture',()=>{for(const Type of [S.TopologicalSortAlgorithm,S.SourceFirstTopologicalSortAlgorithm,S.SourceFirstBidirectionalTopologicalSortAlgorithm]){const g=graph(dct8Edges,AdjacencyGraph,dct8Nodes);validTopological(g,new Type(g).Compute().SortedVertices);}for(const Type of [S.UndirectedTopologicalSortAlgorithm,S.UndirectedFirstTopologicalSortAlgorithm]){const g=graph(dct8Edges,UndirectedGraph,dct8Nodes),a=new Type(g);a.AllowCyclicGraph=true;a.Compute();assert.equal(a.SortedVertices.length,84);assert.equal(new Set(a.SortedVertices).size,84);}});

// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/TopologicalSortAlgorithmTests.cs::TopologicalSort
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstTopologicalSortAlgorithmTests.cs::SourceFirstTopologicalSort
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/SourceFirstBidirectionalTopologicalSortAlgorithmTests.cs::SourceFirstBidirectionalTopologicalSort
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedTopologicalSortAlgorithmTests.cs::UndirectedTopologicalSort
// Upstream: tests/QuikGraph.Tests/Algorithms/TopologicalSort/UndirectedFirstTopologicalSortAlgorithmTests.cs::UndirectedFirstTopologicalSort
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/ConnectedComponentsAlgorithmTests.cs::ConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/WeaklyConnectedComponentsAlgorithmTests.cs::WeaklyConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/ConnectedComponents/StronglyConnectedComponentsAlgorithmTests.cs::StronglyConnectedComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/StronglyConnectedCondensationGraphAlgorithmTests.cs::StronglyConnectedCondensation
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::WeaklyConnectedCondensation
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/KruskalMinimumSpanningTreeTests.cs::Kruskal
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/PrimMinimumSpanningTreeTests.cs::Prim
test('Every original GraphML algorithm fixture: structural conformance matrix',async t=>{
  const directory=new URL('./fixtures/GraphML/',import.meta.url),files=readdirSync(directory).filter(n=>/^g\.\d+\.\d+\.graphml$/.test(n)).sort();assert.ok(files.length>1200);
  for(const filename of files)await t.test(filename,()=>{
    // Independent extraction of this fixed legacy test corpus; never resolve its external DTD.
    const xml=readFileSync(new URL(filename,directory),'utf8'),vs=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]),pairs=[...xml.matchAll(/<edge\b[^>]*\bsource="([^"]+)"[^>]*\btarget="([^"]+)"/g)].map(m=>[m[1],m[2]]),g=graph(pairs,BidirectionalGraph,vs),u=graph(pairs,UndirectedGraph,vs);
    const directed=new Map(vs.map(v=>[v,[]])),undirected=new Map(vs.map(v=>[v,[]]));for(const [a,b]of pairs){directed.get(a).push(b);undirected.get(a).push(b);undirected.get(b).push(a);}
    const reach=(adj,start)=>{const seen=new Set([start]),stack=[start];while(stack.length){const v=stack.pop();for(const w of adj.get(v))if(!seen.has(w)){seen.add(w);stack.push(w);}}return seen;};
    const paths=new Map(vs.map(v=>[v,reach(directed,v)])),weakPaths=new Map(vs.map(v=>[v,reach(undirected,v)])),strong=new S.StronglyConnectedComponentsAlgorithm(g).Compute(),weak=new S.WeaklyConnectedComponentsAlgorithm(g).Compute(),connected=new S.ConnectedComponentsAlgorithm(u).Compute();
    for(const a of vs)for(const b of vs){assert.equal(strong.Components.get(a)===strong.Components.get(b),paths.get(a).has(b)&&paths.get(b).has(a));assert.equal(weak.Components.get(a)===weak.Components.get(b),weakPaths.get(a).has(b));assert.equal(connected.Components.get(a)===connected.Components.get(b),weakPaths.get(a).has(b));}
    for(const Type of [S.TopologicalSortAlgorithm,S.SourceFirstTopologicalSortAlgorithm,S.SourceFirstBidirectionalTopologicalSortAlgorithm])validTopological(g,new Type(g).Compute().SortedVertices);
    validTopological(g,new S.SourceFirstBidirectionalTopologicalSortAlgorithm(g,S.TopologicalSortDirection.Backward).Compute().SortedVertices,true);
    for(const Type of [S.UndirectedTopologicalSortAlgorithm,S.UndirectedFirstTopologicalSortAlgorithm]){const a=new Type(u);a.AllowCyclicGraph=true;a.Compute();assert.equal(new Set(a.SortedVertices).size,vs.length);}
    const c=new S.CondensationGraphAlgorithm(g).Compute().CondensedGraph;assert.equal(c.VertexCount,strong.ComponentCount);assert.equal([...c.Vertices].reduce((s,v)=>s+v.VertexCount,0),vs.length);assert.equal([...c.Vertices].reduce((s,v)=>s+v.EdgeCount,0)+[...c.Edges].reduce((s,e)=>s+e.Edges.length,0),pairs.length);validTopological(c,new S.TopologicalSortAlgorithm(c).Compute().SortedVertices);
    const wc=new S.CondensationGraphAlgorithm(g);wc.StronglyConnected=false;wc.Compute();assert.equal(wc.CondensedGraph.VertexCount,weak.ComponentCount);assert.equal(wc.CondensedGraph.EdgeCount,0);
    const weights=new Map([...u.Edges].map((e,i)=>[e,(i*17)%43-10])),prim=new S.PrimMinimumSpanningTreeAlgorithm(u,e=>weights.get(e)).Compute(),kruskal=new S.KruskalMinimumSpanningTreeAlgorithm(u,e=>weights.get(e)).Compute();assert.equal(prim.SpanningTree.length,vs.length-connected.ComponentCount);assert.equal(kruskal.SpanningTree.length,prim.SpanningTree.length);assert.equal(prim.SpanningTree.reduce((s,e)=>s+weights.get(e),0),kruskal.SpanningTree.reduce((s,e)=>s+weights.get(e),0));
    const closure=new S.TransitiveClosureAlgorithm(g,(a,b)=>new Edge(a,b)).Compute().TransitiveClosure;for(const a of vs)for(const b of vs)if(a!==b)assert.equal(closure.ContainsEdge(a,b),paths.get(a).has(b));
    const reduction=new S.TransitiveReductionAlgorithm(g).Compute().TransitiveReduction;const reduced=new Map(vs.map(v=>[v,[]]));for(const e of reduction.Edges)reduced.get(e.Source).push(e.Target);for(const a of vs)assert.deepEqual(reach(reduced,a),paths.get(a));
  });
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/MinimumSpanningTreeTestsBase.cs::SimpleComparePrimKruskal
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/MinimumSpanningTreeTestsBase.cs::DelegateComparePrimKruskal
test('MST exact source-degree weighting on materialized and delegate graphs',()=>{
  const materialized=graph([[1,2],[3,2],[3,4],[1,4]],UndirectedGraph),lists=new Map([[1,[[1,2],[1,4]]],[2,[[1,2],[3,1]]],[3,[[3,2],[3,4]]],[4,[[1,4],[3,4]]]]),delegate=new DelegateUndirectedGraph([1,2,3,4],v=>lists.get(v)?.map(([a,b])=>new EquatableEdge(a,b)));
  for(const g of [materialized,delegate])for(const Type of [S.PrimMinimumSpanningTreeAlgorithm,S.KruskalMinimumSpanningTreeAlgorithm]){const weight=e=>g.AdjacentDegree(e.Source)+1;assert.equal(new Type(g,weight).Compute().SpanningTree.reduce((sum,e)=>sum+weight(e),0),9);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MinimumSpanningTree/MinimumSpanningTreeTestsBase.cs::TestGraph
test('MST exact original testGraph.xml fixture has cost 63',()=>{
  const xml=readFileSync(new URL('./fixtures/GraphML/testGraph.xml',import.meta.url),'utf8'),vs=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]),pairs=[...xml.matchAll(/<edge\b[^>]*\bsource="([^"]+)"[^>]*\btarget="([^"]+)"[^>]*\bweight="([^"]+)"/g)].map(m=>[m[1],m[2],Number(m[3])]),g=graph(pairs,UndirectedGraph,vs);
  for(const Type of [S.PrimMinimumSpanningTreeAlgorithm,S.KruskalMinimumSpanningTreeAlgorithm])assert.equal(new Type(g,e=>e.Tag).Compute().SpanningTree.reduce((s,e)=>s+e.Tag,0),63);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/WeaklyConnectedCondensationGraphAlgorithmTests.cs::Constructor_Throws
test('Condensation constructor generic graph factories and strong/weak flags',()=>{
  const g=graph([[1,2],[2,1]]);for(const GraphType of [AdjacencyGraph,BidirectionalGraph])for(const strong of [true,false]){const a=new S.CondensationGraphAlgorithm(g,()=>new GraphType());assert.equal(a.CondensedGraph,null);assert.equal(a.StronglyConnected,true);a.StronglyConnected=strong;a.Compute();assert.equal(a.CondensedGraph.VertexCount,1);assert.ok([...a.CondensedGraph.Vertices][0] instanceof GraphType);}assert.throws(()=>new S.CondensationGraphAlgorithm(null));assert.throws(()=>new S.CondensationGraphAlgorithm(g,null));
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::Equals
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/MergedEdgeTests.cs::ObjectToString
// Upstream: tests/QuikGraph.Tests/Algorithms/Condensation/CondensededEdgeTests.cs::Equals
test('Merged and condensed edges preserve reference equality and textual endpoints',()=>{
  for(const Type of [S.MergedEdge,S.CondensedEdge]){const a={},b={},e1=new Type(a,b),e2=new Type(a,b),e3=new Type(b,a),e4=new Type(a,b);e4.Edges.push(e1);assert.equal(e1,e1);for(const e of [e2,e3,e4,null])assert.notEqual(e1,e);}
  assert.equal(new S.MergedEdge(1,2).ToString(),'1 -> 2');assert.equal(new S.MergedEdge(2,1).ToString(),'2 -> 1');
});

// Upstream: tests/QuikGraph.Tests/Algorithms/TarjanOfflineLeastCommonAncestorAlgorithmTests.cs::TarjanOfflineLeastCommonAncestor
test('Offline LCA original slow-corpus sampling, first 12 roots and every ordered vertex pair',()=>{
  const directory=new URL('./fixtures/GraphML/',import.meta.url),files=readdirSync(directory).filter(n=>/^g\.\d+\.\d+\.graphml$/.test(n)).sort();
  for(let index=0;index<files.length;index+=5){
    const xml=readFileSync(new URL(files[index],directory),'utf8'),vs=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]),es=[...xml.matchAll(/<edge\b[^>]*\bsource="([^"]+)"[^>]*\btarget="([^"]+)"/g)].map(m=>[m[1],m[2]]),g=graph(es,AdjacencyGraph,vs),adj=new Map(vs.map(v=>[v,[]])),pairs=[];
    for(const [a,b]of es)adj.get(a).push(b);for(const a of vs)for(const b of vs)if(a!==b)pairs.push(new SEquatableEdge(a,b));
    for(const root of vs.slice(0,12)){
      const parent=new Map(),seen=new Set([root]),stack=[{v:root,i:0}];while(stack.length){const frame=stack[stack.length-1],children=adj.get(frame.v);if(frame.i===children.length){stack.pop();continue;}const next=children[frame.i++];if(!seen.has(next)){seen.add(next);parent.set(next,frame.v);stack.push({v:next,i:0});}}
      const chains=new Map();for(const v of seen){const chain=new Set();let current=v;for(;;){chain.add(current);if(!parent.has(current))break;current=parent.get(current);}chains.set(v,chain);}
      const a=new S.TarjanOfflineLeastCommonAncestorAlgorithm(g).Compute(root,pairs);
      for(const pair of pairs){let expected;if(seen.has(pair.Source)&&seen.has(pair.Target)){expected=pair.Target;while(!chains.get(pair.Source).has(expected))expected=parent.get(expected);}assert.equal(a.Ancestors.get(pair),expected,`${files[index]}, root ${root}, pair ${pair.Source}/${pair.Target}`);}
    }
  }
});

test('Structural components preserve Equals/GetHashCode across copied endpoints and colliding hashes', () => {
  const pairs = [[0,1],[1,2],[2,0],[2,3]], g = equalGraph(pairs);
  for (const [Type,count] of [[S.ConnectedComponentsAlgorithm,2],[S.WeaklyConnectedComponentsAlgorithm,2],[S.StronglyConnectedComponentsAlgorithm,3]]) {
    const algorithm = new Type(g).Compute();
    assert.equal(algorithm.ComponentCount,count); assert.equal(algorithm.Components.size,5);
    assert.equal(algorithm.Components.get(equalVertex(0)),algorithm.Components.get(equalVertex(2)));
    assert.notEqual(algorithm.Components.get(equalVertex(0)),algorithm.Components.get(equalVertex(4)));
    assert.equal(algorithm.Graphs.reduce((n,part)=>n+part.EdgeCount,0),Type===S.StronglyConnectedComponentsAlgorithm?3:4);
    const native = new globalThis.Map([['stale',99]]), supplied = new Type(g,native).Compute();
    assert.equal(supplied.Components,native); assert.equal(native.size,5); assert.equal(native.has('stale'),false);
    for (const canonical of g.Vertices) assert.equal(native.get(canonical),algorithm.Components.get(canonical));
    assert.equal(native.has(equalVertex(0)),false,'Caller native Map retains native reference semantics');
    assert.equal(supplied.Graphs.length,count); supplied.Compute(); assert.equal(native.size,5);
  }
  const incremental = new S.IncrementalConnectedComponentsAlgorithm(g).Compute();
  assert.equal(incremental.ComponentCount,2);g.AddEdge(new Edge(equalVertex(3),equalVertex(4)));
  assert.equal(incremental.ComponentCount,1);assert.equal(incremental.GetComponents().Value.get(equalVertex(4)),0);incremental.Dispose();
  for (const stronglyConnected of [true,false]) {
    const algorithm = new S.CondensationGraphAlgorithm(g);algorithm.StronglyConnected=stronglyConnected;algorithm.Compute();
    assert.equal(algorithm.CondensedGraph.VertexCount,stronglyConnected?3:1);
    assert.equal([...algorithm.CondensedGraph.Vertices].reduce((n,part)=>n+part.VertexCount,0),5);
  }
});

test('Structural ordering, forests, transitive graphs and ranks use value-equal vertices without merging hash collisions', () => {
  const pairs=[[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5]],g=equalGraph(pairs),numeric=graph(pairs,BidirectionalGraph,[0,1,2,3,4]);
  for (const [Type,backward] of [[S.TopologicalSortAlgorithm,false],[S.SourceFirstTopologicalSortAlgorithm,false],[S.SourceFirstBidirectionalTopologicalSortAlgorithm,false],[S.SourceFirstBidirectionalTopologicalSortAlgorithm,true]]) {
    const algorithm=new Type(g,backward?S.TopologicalSortDirection.Backward:undefined).Compute(),positions=new globalThis.Map(algorithm.SortedVertices.map((v,i)=>[v.id,i]));
    assert.equal(positions.size,5);for(const [s,t]of pairs)assert.ok(backward?positions.get(s)>positions.get(t):positions.get(s)<positions.get(t));
  }
  const forest=equalGraph([[0,1],[1,2],[1,3]],UndirectedGraph);
  for (const Type of [S.UndirectedTopologicalSortAlgorithm,S.UndirectedFirstTopologicalSortAlgorithm]) assert.equal(new Type(forest).Compute().SortedVertices.length,5);
  forest.AddEdge(new Edge(equalVertex(0),equalVertex(0)));
  for (const Type of [S.UndirectedTopologicalSortAlgorithm,S.UndirectedFirstTopologicalSortAlgorithm]) assert.throws(()=>new Type(forest).Compute(),/acyclic/i);
  for (const Type of [S.KruskalMinimumSpanningTreeAlgorithm,S.PrimMinimumSpanningTreeAlgorithm]) {
    const algorithm=new Type(g,e=>e.Tag).Compute();assert.equal(algorithm.SpanningTree.length,3);assert.equal(algorithm.SpanningTree.reduce((n,e)=>n+e.Tag,0),4);
  }
  const closure=new S.TransitiveClosureAlgorithm(g,(s,t)=>new Edge(s,t)).Compute().TransitiveClosure,reduction=new S.TransitiveReductionAlgorithm(g).Compute().TransitiveReduction;
  assert.equal(closure.EdgeCount,6);assert.ok(closure.ContainsEdge(equalVertex(0),equalVertex(3)));assert.equal(reduction.EdgeCount,3);assert.equal(reduction.ContainsEdge(equalVertex(0),equalVertex(1)),false);
  const ranked=new S.PageRankAlgorithm(g).Compute(),expected=new S.PageRankAlgorithm(numeric).Compute();
  for(const [id,rank]of expected.Ranks)assert.equal(ranked.Ranks.get(equalVertex(id)),rank);
  const merged=new S.EdgeMergeCondensationGraphAlgorithm(equalGraph([[0,1],[1,2]]),new BidirectionalGraph(),v=>v.id!==1).Compute().CondensedGraph;
  assert.ok(merged.ContainsEdge(equalVertex(0),equalVertex(2)));assert.equal(merged.ContainsVertex(equalVertex(1)),false);
});

test('Offline LCA and random generation recognize equal copies and keep distinct colliding values', () => {
  const g=equalGraph([[0,1],[0,2],[1,3],[1,4]],BidirectionalGraph,[0,1,2,3,4,5]);
  const pairs=[new SEquatableEdge(equalVertex(3),equalVertex(4)),new SEquatableEdge(equalVertex(2),equalVertex(3)),new SEquatableEdge(equalVertex(4),equalVertex(4)),new SEquatableEdge(equalVertex(3),equalVertex(5))];
  const algorithm=new S.TarjanOfflineLeastCommonAncestorAlgorithm(g).Compute(equalVertex(0),pairs);
  assert.equal(algorithm.Ancestors.get(new SEquatableEdge(equalVertex(3),equalVertex(4))).id,1);
  assert.equal(algorithm.Ancestors.get(new SEquatableEdge(equalVertex(2),equalVertex(3))).id,0);
  assert.equal(algorithm.Ancestors.get(new SEquatableEdge(equalVertex(4),equalVertex(4))).id,4);
  assert.equal(algorithm.Ancestors.get(new SEquatableEdge(equalVertex(3),equalVertex(5))),undefined);
  const duplicates=new BidirectionalGraph(false);assert.throws(()=>S.RandomGraphFactory.Create(duplicates,()=>equalVertex(0),(s,t)=>new Edge(s,t),()=>0,3,1,false),/distinct vertices/);
  const generated=new BidirectionalGraph(false);let id=0;S.RandomGraphFactory.Create(generated,()=>equalVertex(id++%2),(s,t)=>new Edge(equalVertex(s.id),equalVertex(t.id)),()=>0,4,2,false);
  assert.equal(generated.VertexCount,2);assert.equal(generated.EdgeCount,2);assert.ok(generated.ContainsEdge(equalVertex(0),equalVertex(1)));assert.ok(generated.ContainsEdge(equalVertex(1),equalVertex(0)));
});
