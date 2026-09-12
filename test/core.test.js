import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../src/core.js';

// Upstream QuikGraph.Tests.Structures.EdgeTests/SEdgeTests/SEquatableEdgeTests/EquatableEdgeTests.Construction, Construction_Throws, ObjectToString.
for (const C of [Q.Edge,Q.SEdge,Q.SEquatableEdge,Q.EquatableEdge]) {
  test(`${C.name}Tests.Construction`, () => { for (const [s,t] of [[1,2],[2,1],[1,1],[{},{}]]) { const e = new C(s,t); assert.equal(e.Source,s); assert.equal(e.Target,t); } });
  test(`${C.name}Tests.Construction_Throws`, () => { for (const [s,t] of [[null,1],[1,null],[null,null]]) assert.throws(() => new C(s,t), TypeError); });
  test(`${C.name}Tests.ObjectToString`, () => { assert.equal(new C(1,2).ToString(),'1 -> 2'); assert.equal(new C(2,1).ToString(),'2 -> 1'); });
}
// Upstream EdgeTests.Equals and EquatableEdgeTests.Equals/Hashcode.
test('EdgeTests.Equals', () => { const a = new Q.Edge(1,2); assert(a.Equals(a)); assert(!a.Equals(new Q.Edge(1,2))); assert(!a.Equals(null)); });
for (const C of [Q.EquatableEdge,Q.SEquatableEdge,Q.EquatableUndirectedEdge]) test(`${C.name}Tests.Equals/Hashcode`, () => { const a = new C(1,2), b = new C(1,2); assert(a.Equals(b)); assert(!a.Equals(null)); assert.equal(a.GetHashCode(),b.GetHashCode()); });
// Upstream UndirectedEdgeTests/SUndirectedEdgeTests/EquatableUndirectedEdgeTests.Construction_Throws.
for (const C of [Q.UndirectedEdge,Q.SUndirectedEdge,Q.EquatableUndirectedEdge]) {
  test(`${C.name}Tests.Construction_Throws`, () => { assert.throws(() => new C(2,1)); assert.throws(() => new C(null,1)); assert.throws(() => new C(1,null)); });
  test(`${C.name}Tests.ObjectToString`, () => assert.equal(new C(1,2).ToString(),'1 <-> 2'));
}
// Upstream TaggedEdgeTests/EquatableTaggedEdgeTests/STaggedEdgeTests/SEquatableTaggedEdgeTests.Tag.
for (const C of [Q.TaggedEdge,Q.EquatableTaggedEdge,Q.STaggedEdge,Q.SEquatableTaggedEdge,Q.TaggedUndirectedEdge,Q.STaggedUndirectedEdge]) test(`${C.name}Tests.Tag`, () => { const e = new C(1,2,42), tags=[]; e.TagChanged.add(sender => tags.push(sender.Tag)); e.Tag = 42; e.Tag = 12; e.Tag = null; e.Tag = null; assert.deepEqual(tags,[12,null]); assert.equal(e.Source,1); assert.equal(e.Target,2); });
// Upstream EquatableTermEdgeTests.Construction/Equals/ObjectToString.
test('EquatableTermEdgeTests.Equals/ObjectToString', () => { const a = new Q.EquatableTermEdge(1,2); assert(a.Equals(new Q.EquatableTermEdge(1,2,0,0))); assert(!a.Equals(new Q.EquatableTermEdge(1,2,0,1))); assert.equal(new Q.TermEdge(1,2,1,5).ToString(),'1 (1) -> 2 (5)'); assert.throws(() => new Q.TermEdge(1,2,-1,0)); });
// Upstream SReversedEdgeTests.Construction/Equals.
test('SReversedEdgeTests.Construction/Equals', () => { const e = new Q.Edge(1,2), r = new Q.SReversedEdge(e); assert.equal(r.Source,2); assert.equal(r.Target,1); assert.equal(r.OriginalEdge,e); assert(r.Equals(new Q.SReversedEdge(e))); assert(!r.Equals(new Q.SReversedEdge(new Q.Edge(1,2)))); });

// Direct adaptation of upstream GraphTestsBase.AddEdge_ParallelEdges_Test.
for (const C of [Q.AdjacencyGraph,Q.BidirectionalGraph,Q.UndirectedGraph]) {
  test(`${C.name}Tests.AddEdge_ParallelEdges`, () => { const g = new C(), added=[]; g.AddVertexRange([1,2]); g.EdgeAdded.add(e => added.push(e)); const e1 = new Q.Edge(1,2), e2 = new Q.Edge(1,2), e3 = new Q.Edge(2,1), e4 = new Q.Edge(2,2); for (const e of [e1,e2,e3,e1,e4]) assert(g.AddEdge(e)); assert.equal(g.EdgeCount,5); assert.deepEqual(added,[e1,e2,e3,e1,e4]); assert.equal(g.Edges.filter(e=>e===e1).length,2); });
  // Upstream GraphTestsBase.AddEdge_NoParallelEdges_Test.
  test(`${C.name}Tests.AddEdge_NoParallelEdges`, () => { const g = new C(false); g.AddVertexRange([1,2]); assert(g.AddEdge(new Q.Edge(1,2))); assert(!g.AddEdge(new Q.Edge(1,2))); assert.equal(g.AddEdge(new Q.Edge(2,1)),g.IsDirected); assert(g.AddEdge(new Q.Edge(2,2))); assert(!g.AddEdge(new Q.Edge(2,2))); });
  // Upstream GraphTestsBase.AddVertexRange_Throws and AddVerticesAndEdgeRange_Throws.
  test(`${C.name}Tests.AddVertexRange_Throws`, () => { const g = new C(); assert.throws(()=>g.AddVertexRange([1,null,2])); assert.equal(g.VertexCount,0); assert.throws(()=>g.AddVerticesAndEdgeRange([new Q.Edge(1,2),null])); assert.equal(g.VertexCount,0); });
  // Upstream GraphTestsBase.RemoveEdge_Test, RemoveVertex_Test, Clear.
  test(`${C.name}Tests.RemoveEdge/RemoveVertex/Clear`, () => { const g = new C(), e = new Q.Edge(1,2), f = new Q.Edge(2,2); const removed=[]; g.EdgeRemoved.add(e=>removed.push(e)); g.AddVerticesAndEdgeRange([e,e,f,new Q.Edge(3,1)]); assert(g.RemoveEdge(e)); assert.equal(g.EdgeCount,3); assert(g.RemoveVertex(2)); assert.equal(g.EdgeCount,1); assert.equal(g.VertexCount,2); assert.equal(removed.length,3); assert(!g.RemoveVertex(2)); g.Clear(); assert.equal(g.VertexCount,0); assert.equal(g.EdgeCount,0); });
  // Upstream respective Clone test: structure copied, edge references retained.
  test(`${C.name}Tests.Clone`, () => { const g = new C(), e = new Q.Edge(1,2); g.AddVerticesAndEdge(e); g.AddVertex(3); const c = g.Clone(); assert.equal(c.EdgeCount,1); assert.equal(c.Edges[0],e); c.RemoveVertex(1); assert.equal(g.VertexCount,3); assert.equal(g.EdgeCount,1); });
}
function fixture() { const g = new Q.BidirectionalGraph(); const es = [[1,2],[1,2],[1,3],[2,2],[2,4],[3,1]].map(([s,t])=>new Q.Edge(s,t)); g.AddVerticesAndEdgeRange(es); return {g,es}; }
// Exact fixture: upstream GraphTestsBase.TryGetEdge_Test / TryGetEdge_ImmutableGraph_Test.
for (const [name,make] of [ ['AdjacencyGraph',g=>Q.ToAdjacencyGraph(g)],['BidirectionalGraph',g=>g],['ArrayAdjacencyGraph',g=>new Q.ArrayAdjacencyGraph(g)],['ArrayBidirectionalGraph',g=>new Q.ArrayBidirectionalGraph(g)],['CompressedSparseRowGraph',g=>Q.CompressedSparseRowGraph.FromGraph(g)],['BidirectionalAdapterGraph',g=>new Q.BidirectionalAdapterGraph(g)] ]) {
  test(`${name}Tests.TryGetEdge`, () => { const {g,es} = fixture(), h = make(g); assert.equal(h.TryGetEdge(0,10),undefined); assert.equal(h.TryGetEdge(0,1),undefined); for (const [s,t,i] of [[2,4,4],[2,2,3],[1,2,0]]) { const e = h.TryGetEdge(s,t); assert.equal(e.Source,s); assert.equal(e.Target,t); if (name!=='CompressedSparseRowGraph') assert.equal(e,es[i]); } assert.equal(h.TryGetEdge(2,1),undefined); });
  // Upstream GraphTestsBase.TryGetEdges_Test: true with empty sequence for existing source.
  test(`${name}Tests.TryGetEdges`, () => { const {g}=fixture(), h=make(g); assert.equal(h.TryGetEdges(0,1),undefined); assert.equal(h.TryGetEdges(1,2).length,2); assert.deepEqual(h.TryGetEdges(2,1),[]); assert.deepEqual(h.TryGetOutEdges(4),[]); assert.equal(h.TryGetOutEdges(10),undefined); });
}
// Upstream UndirectedGraphTests.AdjacentVertices exact parallel/self-loop fixture.
test('UndirectedGraphTests.AdjacentVertices', () => { const g = new Q.UndirectedGraph(); g.AddVertex(7); g.AddVerticesAndEdgeRange([[1,2],[1,3],[1,3],[1,4],[2,4],[3,1],[3,3],[5,1],[6,5],[6,6]].map(([s,t])=>new Q.Edge(s,t))); for (const [v,expected] of [[1,[2,3,4,5]],[2,[1,4]],[3,[1]],[4,[1,2]],[5,[1,6]],[6,[5]],[7,[]]]) assert.deepEqual(g.AdjacentVertices(v).sort(),expected); });
// Upstream BidirectionalGraphTests.MergeVertex.
test('BidirectionalGraphTests.MergeVertex', () => { const g=new Q.BidirectionalGraph(); g.AddVerticesAndEdgeRange([[1,2],[2,3],[2,4],[2,2]].map(([s,t])=>new Q.Edge(s,t))); g.MergeVertex(2,(s,t)=>new Q.Edge(s,t)); assert.deepEqual(g.Vertices,[1,3,4]); assert.equal(g.EdgeCount,2); assert(g.ContainsEdge(1,3)); assert(g.ContainsEdge(1,4)); });
// Upstream BidirectionalMatrixGraphTests.Clear.
test('BidirectionalMatrixGraphTests.Clear', () => { const g = new Q.BidirectionalMatrixGraph(4); g.AddEdge(new Q.Edge(1,2)); assert(!g.AddEdge(new Q.Edge(1,2))); g.Clear(); assert.deepEqual(g.Vertices,[0,1,2,3]); assert.equal(g.EdgeCount,0); assert.throws(()=>g.AddEdge(new Q.Edge(0,4)),Q.VertexNotFoundException); });
// Upstream immutable Array*GraphTests.Clone adapted to observable isolation.
for (const [C,M] of [[Q.ArrayAdjacencyGraph,Q.AdjacencyGraph],[Q.ArrayBidirectionalGraph,Q.BidirectionalGraph],[Q.ArrayUndirectedGraph,Q.UndirectedGraph]]) test(`${C.name}Tests.Clone`, () => { const g = new M(); g.AddVerticesAndEdge(new Q.Edge(1,2)); const a = new C(g), c = a.Clone(); g.RemoveVertex(1); assert.equal(a.VertexCount,2); assert.equal(c.EdgeCount,1); assert.equal(a.AddEdge,undefined); });
// Upstream ReversedBidirectionalGraphTests.OutEdges/InEdges and UndirectedBidirectionalGraphTests.AdjacentEdges.
test('ReversedBidirectionalGraphTests.OutEdges/InEdges', () => { const {g}=fixture(),r=new Q.ReversedBidirectionalGraph(g); assert.equal(r.OutDegree(1),g.InDegree(1)); assert.equal(r.InDegree(1),g.OutDegree(1)); assert(r.ContainsEdge(4,2)); assert(!r.ContainsEdge(2,4)); g.AddVerticesAndEdge(new Q.Edge(4,5)); assert(r.ContainsEdge(5,4)); });
test('UndirectedBidirectionalGraphTests.AdjacentEdges', () => { const {g}=fixture(),u=new Q.UndirectedBidirectionalGraph(g); assert.equal(u.AdjacentDegree(2),5); assert(u.ContainsEdge(4,2)); assert.equal(u.EdgeCount,6); });
// Upstream DelegateImplicitGraphTests / DelegateIncidenceGraphTests.OutEdges_Throws.
test('DelegateImplicitGraphTests.OutEdges_Throws', () => { const map=new Map([[1,[new Q.Edge(1,2)]],[2,[]]]),g=new Q.DelegateIncidenceGraph(v=>map.get(v)); assert.equal(g.OutDegree(1),1); assert.equal(g.OutDegree(2),0); assert.equal(g.TryGetOutEdges(3),undefined); assert.throws(()=>g.OutEdges(3),Q.VertexNotFoundException); assert(g.ContainsEdge(1,2)); map.set(3,[]); assert(g.ContainsVertex(3)); });
// Upstream ClusteredAdjacencyGraphTests.AddVertex / RemoveVertex.
test('ClusteredAdjacencyGraphTests.AddVertex/RemoveVertex', () => { const root=new Q.ClusteredAdjacencyGraph(new Q.AdjacencyGraph()),child=root.AddCluster(),leaf=child.AddCluster(); leaf.AddVerticesAndEdge(new Q.Edge(1,2)); assert.equal(root.EdgeCount,1); assert.equal(child.EdgeCount,1); assert.equal(leaf.EdgeCount,1); root.RemoveVertex(2); assert.equal(leaf.VertexCount,1); assert.equal(child.EdgeCount,0); assert.equal(root.ClustersCount,1); });
// Upstream predicate contract, checked against a changing base graph.
test('FilteredBidirectionalGraph filters both endpoints and reflects mutations', () => { const {g}=fixture(),f=new Q.FilteredBidirectionalGraph(g,v=>v!==3,e=>e.Source!==e.Target); assert.deepEqual(f.Vertices,[1,2,4]); assert.equal(f.EdgeCount,3); assert.equal(f.OutDegree(1),2); assert.equal(f.TryGetOutEdges(3),undefined); g.AddVerticesAndEdge(new Q.Edge(4,1)); assert.equal(f.InDegree(1),1); });
// Upstream EdgeExtensionsTests.IsPath/HasCycles/IsPathWithoutCycles/TryGetPath/IsPredecessor.
test('EdgeExtensionsTests.IsPath/HasCycles/IsPathWithoutCycles', () => { const a=new Q.Edge(1,2),b=new Q.Edge(2,3),c=new Q.Edge(3,1); assert(Q.IsPath([])); assert(Q.IsPath([a,b,c])); assert(!Q.IsPath([b,a])); assert(Q.HasCycles([a,b,c])); assert(!Q.HasCycles([a,b])); assert(Q.IsPathWithoutCycles([a,b])); assert(!Q.IsPathWithoutCycles([a,b,c])); });
test('EdgeExtensionsTests.TryGetPath/IsPredecessor', () => { const a=new Q.Edge(1,2),b=new Q.Edge(2,3),p=new Map([[2,a],[3,b]]); assert.deepEqual(Q.TryGetPath(p,3),[a,b]); assert.equal(Q.TryGetPath(p,1),undefined); assert(Q.IsPredecessor(p,1,3)); assert(Q.IsPredecessor(p,2,2)); assert(!Q.IsPredecessor(p,3,1)); p.set(1,new Q.Edge(3,1)); assert.equal(Q.TryGetPath(p,3),undefined); });
// Regression beyond upstream: mutation invariants against a simple edge-list oracle.
for (const C of [Q.BidirectionalGraph,Q.UndirectedGraph]) test(`${C.name} randomized mutation invariant`, () => { const g=new C(); let seed=42; const rand=n=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)%n; let edges=[]; g.AddVertexRange(Array.from({length:20},(_,i)=>i)); for (let step=0;step<1500;++step) { if (!edges.length||rand(3)) { const e=new Q.Edge(rand(20),rand(20)); g.AddEdge(e); edges.push(e); } else { const i=rand(edges.length); assert(g.RemoveEdge(edges[i])); edges.splice(i,1); } assert.equal(g.EdgeCount,edges.length); for (let v=0;v<20;++v) { assert.equal(g.OutDegree(v),edges.filter(e=>C===Q.UndirectedGraph?e.Source===v||e.Target===v:e.Source===v).length); if(C===Q.BidirectionalGraph) assert.equal(g.InDegree(v),edges.filter(e=>e.Target===v).length); } } });

// Shared fixture ported from GraphTestsBase.OutEdges.cs, InEdges.cs, Degree.cs,
// ContainsVertex.cs, ContainsEdge.cs. Tests below instantiate each upstream graph form.
const incidenceFactories = [
  ['AdjacencyGraph', g => Q.ToAdjacencyGraph(g)],
  ['BidirectionalGraph', g => g],
  ['ArrayAdjacencyGraph', g => new Q.ArrayAdjacencyGraph(g)],
  ['ArrayBidirectionalGraph', g => new Q.ArrayBidirectionalGraph(g)],
  ['CompressedSparseRowGraph', g => new Q.CompressedSparseRowGraph(g)],
  ['BidirectionalGraphAdapter', g => new Q.BidirectionalAdapterGraph(g)],
  ['DelegateImplicitGraph', g => new Q.DelegateImplicitGraph(v=>g.TryGetOutEdges(v))],
  ['DelegateIncidenceGraph', g => new Q.DelegateIncidenceGraph(v=>g.TryGetOutEdges(v))],
  ['DelegateVertexAndEdgeListGraph', g => new Q.DelegateVertexAndEdgeListGraph(g.Vertices,v=>g.TryGetOutEdges(v))],
  ['DelegateBidirectionalIncidenceGraph', g => new Q.DelegateBidirectionalIncidenceGraph(v=>g.TryGetOutEdges(v),v=>g.TryGetInEdges(v))],
  ['ClusteredAdjacencyGraph', g => new Q.ClusteredAdjacencyGraph(g)],
  ['BidirectionalMatrixGraph', g => {const m=new Q.BidirectionalMatrixGraph(6);m.AddEdgeRange(g.Edges);return m;}],
];
const outFixture = () => {const g=new Q.BidirectionalGraph();g.AddVertex(5);const edges=[[1,1],[1,2],[1,3],[2,4],[3,3],[4,1]].map(([s,t])=>new Q.Edge(s,t));g.AddVerticesAndEdgeRange(edges);return {g,edges};};
for (const [name,make] of incidenceFactories) {
  // Upstream GraphTestsBase.OutEdge_Test and OutEdge_ImmutableGraph_Test.
  test(`${name}Tests.OutEdge`,()=>{const {g,edges}=outFixture(),h=make(g);for(const [v,i,e] of [[1,0,edges[0]],[1,2,edges[2]],[2,0,edges[3]],[3,0,edges[4]],[4,0,edges[5]]]){const actual=h.OutEdge(v,i);assert.equal(actual.Source,e.Source);assert.equal(actual.Target,e.Target);if(name!=='CompressedSparseRowGraph')assert.equal(actual,e);}});
  // Upstream GraphTestsBase.OutEdge_Throws_Test.
  test(`${name}Tests.OutEdge_Throws`,()=>{const {g}=outFixture(),h=make(g);assert.throws(()=>h.OutEdge(20,0));assert.throws(()=>h.OutEdge(1,-1));assert.throws(()=>h.OutEdge(1,3));assert.throws(()=>h.OutEdge(5,0));});
  // Upstream GraphTestsBase.OutEdges_Test.
  test(`${name}Tests.OutEdges`,()=>{const {g}=outFixture(),h=make(g);assert.deepEqual(h.OutEdges(1).map(e=>e.Target),[1,2,3]);assert.deepEqual(h.OutEdges(2).map(e=>e.Target),[4]);assert.deepEqual(h.OutEdges(5),[]);});
  // Upstream GraphTestsBase.OutEdges_Throws_Test.
  test(`${name}Tests.OutEdges_Throws`,()=>{const {g}=outFixture(),h=make(g);assert.throws(()=>h.OutEdges(null));assert.throws(()=>h.OutEdges(10),Q.VertexNotFoundException);});
  // Upstream GraphTestsBase.TryGetOutEdges_Test.
  test(`${name}Tests.TryGetOutEdges`,()=>{const {g}=outFixture(),h=make(g);assert.equal(h.TryGetOutEdges(20),undefined);assert.deepEqual(h.TryGetOutEdges(5),[]);assert.equal(h.TryGetOutEdges(1).length,3);});
  // Upstream GraphTestsBase.OutDegree_Test and IsOutEdgesEmpty_Test.
  test(`${name}Tests.OutDegree/IsOutEdgesEmpty`,()=>{const {g}=outFixture(),h=make(g);for(const [v,n] of [[1,3],[2,1],[3,1],[4,1],[5,0]]){assert.equal(h.OutDegree(v),n);assert.equal(h.IsOutEdgesEmpty(v),n===0);}assert.throws(()=>h.OutDegree(20));});
  // Upstream GraphTestsBase.ContainsVertex_Test.
  test(`${name}Tests.ContainsVertex`,()=>{const {g}=outFixture(),h=make(g);for(const v of [1,2,3,4,5])assert(h.ContainsVertex(v));assert(!h.ContainsVertex(20));});
}
const bidirectionalNames=new Set(['BidirectionalGraph','ArrayBidirectionalGraph','BidirectionalGraphAdapter','DelegateBidirectionalIncidenceGraph','BidirectionalMatrixGraph']);
for(const [name,make]of incidenceFactories.filter(([n])=>bidirectionalNames.has(n))){
  // Upstream GraphTestsBase.InEdges_Test.
  test(`${name}Tests.InEdges`,()=>{const {g}=outFixture(),h=make(g);assert.deepEqual(h.InEdges(1).map(e=>e.Source),[1,4]);assert.deepEqual(h.InEdges(3).map(e=>e.Source),[1,3]);assert.deepEqual(h.InEdges(5),[]);});
  // Upstream GraphTestsBase.InEdge_Test / InEdge_Throws_Test.
  test(`${name}Tests.InEdge`,()=>{const {g}=outFixture(),h=make(g);assert.equal(h.InEdge(1,1).Source,4);assert.equal(h.InEdge(2,0).Source,1);assert.throws(()=>h.InEdge(1,2));assert.throws(()=>h.InEdge(5,0));});
  // Upstream GraphTestsBase.TryGetInEdges_Test.
  test(`${name}Tests.TryGetInEdges`,()=>{const {g}=outFixture(),h=make(g);assert.equal(h.TryGetInEdges(20),undefined);assert.equal(h.TryGetInEdges(1).length,2);assert.deepEqual(h.TryGetInEdges(5),[]);});
  // Upstream GraphTestsBase.InDegree_Test / Degree_Test.
  test(`${name}Tests.InDegree/Degree`,()=>{const {g}=outFixture(),h=make(g);assert.equal(h.InDegree(1),2);assert.equal(h.InDegree(3),2);assert.equal(h.Degree(1),5);assert.equal(h.Degree(3),3);assert.equal(h.Degree(5),0);assert.throws(()=>h.InDegree(20));});
}
// Constructor overload assertions directly from AdjacencyGraphTests/BidirectionalGraphTests.Construction.
for(const C of [Q.AdjacencyGraph,Q.BidirectionalGraph])test(`${C.name}Tests.Construction`,()=>{for(const args of [[],[true],[false],[true,12],[false,12],[true,42,12],[false,42,12]]){const g=new C(...args);assert.equal(g.IsDirected,true);assert.equal(g.AllowParallelEdges,args[0]??true);assert.equal(g.EdgeCapacity,args[2]??0);assert.equal(g.VertexCount,0);assert.equal(g.EdgeCount,0);assert(g.IsVerticesEmpty);assert(g.IsEdgesEmpty);}});
// Upstream UndirectedGraphTests.Construction.
test('UndirectedGraphTests.Construction',()=>{for(const p of [true,false]){const cmp=(e,s,t)=>e.Source===s&&e.Target===t,g=new Q.UndirectedGraph(p,cmp);assert.equal(g.AllowParallelEdges,p);assert.equal(g.IsDirected,false);assert.equal(g.EdgeCapacity,-1);assert.equal(g.EdgeEqualityComparer,cmp);assert.equal(g.VertexCount,0);}});
// Upstream Array*GraphTests.Construction, preserving edge comparer and flags.
for(const [A,M]of [[Q.ArrayAdjacencyGraph,Q.AdjacencyGraph],[Q.ArrayBidirectionalGraph,Q.BidirectionalGraph],[Q.ArrayUndirectedGraph,Q.UndirectedGraph]]){
 test(`${A.name}Tests.Construction`,()=>{const g=new M(false);g.AddVertexRange([2,3,1]);g.AddVerticesAndEdgeRange([[1,2],[2,2],[3,4],[1,4]].map(([s,t])=>new Q.Edge(s,t)));const a=new A(g);assert.equal(a.VertexCount,4);assert.equal(a.EdgeCount,4);assert.equal(a.AllowParallelEdges,false);assert.equal(a.IsDirected,g.IsDirected);if(A===Q.ArrayUndirectedGraph)assert.equal(a.EdgeEqualityComparer,g.EdgeEqualityComparer);});
 test(`${A.name}Tests.Construction_Throws`,()=>assert.throws(()=>new A(null)));
}
// Upstream immutable graph AddVertex/AddEdge tests: changes to source do not update snapshots.
for(const [A,M]of [[Q.ArrayAdjacencyGraph,Q.AdjacencyGraph],[Q.ArrayBidirectionalGraph,Q.BidirectionalGraph],[Q.ArrayUndirectedGraph,Q.UndirectedGraph]]){
 test(`${A.name}Tests.AddVertex`,()=>{const g=new M(),a=new A(g);g.AddVertex(1);assert.equal(a.VertexCount,0);});
 test(`${A.name}Tests.AddEdge`,()=>{const g=new M();g.AddVertexRange([1,2]);const a=new A(g);g.AddEdge(new Q.Edge(1,2));assert.equal(a.EdgeCount,0);});
}
// Upstream GraphTestsBase mutable removal predicates with retained isolated vertices.
for(const C of [Q.AdjacencyGraph,Q.BidirectionalGraph,Q.UndirectedGraph]){
 test(`${C.name}Tests.RemoveEdgeIf`,()=>{const g=new C();g.AddVerticesAndEdgeRange([[1,2],[1,3],[2,2],[2,3],[3,1]].map(([s,t])=>new Q.Edge(s,t)));assert.equal(g.RemoveEdgeIf(e=>e.Source===1),2);assert.equal(g.EdgeCount,3);assert.equal(g.VertexCount,3);assert.equal(g.RemoveEdgeIf(()=>false),0);});
 test(`${C.name}Tests.RemoveVertexIf`,()=>{const g=new C();g.AddVerticesAndEdgeRange([[1,2],[2,3],[3,4],[4,4]].map(([s,t])=>new Q.Edge(s,t)));assert.equal(g.RemoveVertexIf(v=>v%2===0),2);assert.deepEqual(g.Vertices,[1,3]);assert.equal(g.EdgeCount,0);});
 test(`${C.name}Tests.ClearEdges`,()=>{const g=new C();g.AddVerticesAndEdgeRange([[1,2],[2,3],[2,2],[3,4]].map(([s,t])=>new Q.Edge(s,t)));g.ClearEdges(2);assert.equal(g.VertexCount,4);assert.equal(g.EdgeCount,1);assert.equal(g.Edges[0].Source,3);g.ClearEdges(99);assert.equal(g.EdgeCount,1);});
 test(`${C.name}Tests.RemoveEdge_EquatableEdge`,()=>{const g=new C();g.AddVerticesAndEdge(new Q.EquatableEdge(1,2));assert(g.ContainsEdge(new Q.EquatableEdge(1,2)));assert(g.RemoveEdge(new Q.EquatableEdge(1,2)));assert.equal(g.EdgeCount,0);});
 test(`${C.name}Tests.AddEdge_Throws`,()=>{const g=new C();assert.throws(()=>g.AddEdge(null));assert.throws(()=>g.AddEdge(new Q.Edge(1,2)),Q.VertexNotFoundException);g.AddVertex(1);assert.throws(()=>g.AddEdge(new Q.Edge(1,2)),Q.VertexNotFoundException);assert.equal(g.EdgeCount,0);});
}
for(const C of [Q.AdjacencyGraph,Q.BidirectionalGraph]){
 test(`${C.name}Tests.ClearOutEdges`,()=>{const {g}=outFixture(),h=new C();h.AddVertexRange(g.Vertices);h.AddEdgeRange(g.Edges);h.ClearOutEdges(1);assert.equal(h.OutDegree(1),0);assert.equal(h.InDegree(1),1);assert.equal(h.EdgeCount,3);});
 test(`${C.name}Tests.RemoveOutEdgeIf`,()=>{const g=new C();g.AddVerticesAndEdgeRange([[1,1],[1,2],[1,3],[2,1]].map(([s,t])=>new Q.Edge(s,t)));assert.equal(g.RemoveOutEdgeIf(1,e=>e.Target!==2),2);assert.equal(g.OutDegree(1),1);assert.equal(g.InDegree(1),1);assert.equal(g.EdgeCount,2);});
}
// Upstream EdgeListGraphTests.AddEdge_ParallelEdges/RemoveEdge.
test('EdgeListGraphTests.AddEdge_ParallelEdges',()=>{const g=new Q.EdgeListGraph(),e=new Q.Edge(1,2);assert(g.AddEdge(e));assert(!g.AddEdge(e));assert(g.AddEdge(new Q.Edge(1,2)));assert.equal(g.VertexCount,2);assert.equal(g.EdgeCount,2);g.Clear();assert.equal(g.VertexCount,0);});
test('EdgeListGraphTests.AddEdge_NoParallelEdges',()=>{for(const directed of [true,false]){const g=new Q.EdgeListGraph(directed,false);assert(g.AddEdge(new Q.Edge(1,2)));assert(!g.AddEdge(new Q.Edge(1,2)));assert.equal(g.AddEdge(new Q.Edge(2,1)),directed);}});
// Upstream delegate explicit-vertex filtering tests include delegates returning nonexistent endpoints.
test('DelegateVertexAndEdgeListGraphTests.OutEdges filters external edges',()=>{const es=[new Q.Edge(1,2),new Q.Edge(1,99),new Q.Edge(2,1)],g=new Q.DelegateVertexAndEdgeListGraph([1,2],()=>es);assert.deepEqual(g.OutEdges(1),[es[0]]);assert.deepEqual(g.OutEdges(2),[es[2]]);assert.equal(g.EdgeCount,2);assert(!g.ContainsVertex(99));assert(!g.ContainsEdge(1,99));});
test('DelegateUndirectedGraphTests.AdjacentEdges filters external edges',()=>{const es=[new Q.Edge(1,2),new Q.Edge(1,99),new Q.Edge(2,2)],g=new Q.DelegateUndirectedGraph([1,2],()=>es);assert.deepEqual(g.AdjacentEdges(1),[es[0]]);assert.deepEqual(g.AdjacentEdges(2),[es[0],es[2]]);assert.equal(g.EdgeCount,2);assert(!g.ContainsVertex(99));});
// Upstream EdgeExtensionsTests public methods and null-argument fixture.
test('EdgeExtensionsTests.IsSelfEdge',()=>{assert(Q.IsSelfEdge(new Q.Edge(1,1)));assert(!Q.IsSelfEdge(new Q.Edge(1,2)));});
test('EdgeExtensionsTests.GetOtherVertex',()=>{const e=new Q.Edge(1,2);assert.equal(Q.GetOtherVertex(e,1),2);assert.equal(Q.GetOtherVertex(e,2),1);assert.equal(Q.GetOtherVertex(e,99),1);});
test('EdgeExtensionsTests.IsAdjacent',()=>{const e=new Q.Edge(1,2);assert(Q.IsAdjacent(e,1));assert(Q.IsAdjacent(e,2));assert(!Q.IsAdjacent(e,3));});
test('EdgeExtensionsTests.HasCycles_OnlyForPath',()=>assert(Q.HasCycles([[1,4],[2,1],[4,3]].map(([s,t])=>new Q.Edge(s,t)))));
test('EdgeExtensionsTests.ToVertexPair',()=>{const e=new Q.Edge(1,2),p=Q.ToVertexPair(e);assert(p instanceof Q.SEquatableEdge);assert.equal(p.Source,1);assert.equal(p.Target,2);});
test('EdgeExtensionsTests.UndirectedVertexEquality',()=>{const e=new Q.Edge(1,2);assert(Q.UndirectedVertexEquality(e,1,2));assert(Q.UndirectedVertexEquality(e,2,1));assert(!Q.UndirectedVertexEquality(e,2,2));});
test('EdgeExtensionsTests.SortedVertexEquality',()=>{const e=new Q.Edge(1,2);assert(Q.SortedVertexEquality(e,1,2));assert(!Q.SortedVertexEquality(e,2,1));assert(!Q.SortedVertexEquality(e,2,2));});
test('EdgeExtensionsTests.ReverseEdges',()=>{const a=new Q.Edge(1,2),b=new Q.Edge(2,3),r=Q.ReverseEdges([a,b]);assert.equal(r[0].OriginalEdge,a);assert.equal(r[0].Source,2);assert.equal(r[1].Target,2);assert.deepEqual(Q.ReverseEdges([]),[]);});
for(const name of ['IsSelfEdge','GetOtherVertex','IsAdjacent','IsPath','HasCycles','IsPathWithoutCycles','ToVertexPair','IsPredecessor','TryGetPath','UndirectedVertexEquality','SortedVertexEquality','ReverseEdges'])test(`EdgeExtensionsTests.${name}_Throws`,()=>assert.throws(()=>Q[name](null)));

// Upstream FilteredGraphTestsBase.Vertices_Test, ContainsVertex_Test, Edges_Test.
const filteredTypes=[Q.FilteredGraph,Q.FilteredImplicitVertexSet,Q.FilteredImplicitGraph,Q.FilteredIncidenceGraph,Q.FilteredVertexListGraph,Q.FilteredVertexAndEdgeListGraph,Q.FilteredEdgeListGraph,Q.FilteredBidirectionalGraph,Q.FilteredUndirectedGraph];
for(const C of filteredTypes){
 const make=()=>new (C===Q.FilteredUndirectedGraph?Q.UndirectedGraph:Q.BidirectionalGraph)();
 test(`${C.name}Tests.Construction`,()=>{const g=make(),v=x=>x<3,e=x=>x.Source!==x.Target,f=new C(g,v,e);assert.equal(f.BaseGraph,g);assert.equal(f.VertexPredicate,v);assert.equal(f.EdgePredicate,e);assert.equal(f.IsDirected,g.IsDirected);assert.equal(f.AllowParallelEdges,g.AllowParallelEdges);});
 test(`${C.name}Tests.Construction_Throws`,()=>{assert.throws(()=>new C(null,()=>true,()=>true));assert.throws(()=>new C(make(),null,()=>true));assert.throws(()=>new C(make(),()=>true,null));});
 if(C!==Q.FilteredGraph){
 test(`${C.name}Tests.ContainsVertex`,()=>{const g=make(),f=new C(g,v=>v<=2,()=>true);assert(!f.ContainsVertex(1));g.AddVertex(1);assert(f.ContainsVertex(1));assert(!f.ContainsVertex(2));g.AddVertex(2);g.AddVertex(3);assert(f.ContainsVertex(2));assert(!f.ContainsVertex(3));g.RemoveVertex(1);assert(!f.ContainsVertex(1));});
 test(`${C.name}Tests.ContainsVertex_Throws`,()=>assert.throws(()=>new C(make(),()=>true,()=>true).ContainsVertex(null)));
 }
 if([Q.FilteredVertexListGraph,Q.FilteredVertexAndEdgeListGraph,Q.FilteredEdgeListGraph,Q.FilteredBidirectionalGraph,Q.FilteredUndirectedGraph].includes(C)){
 test(`${C.name}Tests.Vertices`,()=>{const g=make(),f=new C(g,v=>v<3,()=>true);assert.deepEqual(f.Vertices,[]);g.AddVertexRange([1,2,3]);assert.deepEqual(f.Vertices,[1,2]);assert.equal(f.VertexCount,2);assert(!f.IsVerticesEmpty);g.Clear();assert(f.IsVerticesEmpty);});
 }
 if([Q.FilteredVertexAndEdgeListGraph,Q.FilteredEdgeListGraph,Q.FilteredBidirectionalGraph,Q.FilteredUndirectedGraph].includes(C)){
 test(`${C.name}Tests.Edges`,()=>{const g=make(),es=[[1,2],[1,3],[2,2],[3,1],[3,3],[4,1]].map(([s,t])=>new Q.Edge(s,t));for(const [vp,ep,indices]of [[()=>true,()=>true,[0,1,2,3,4,5]],[v=>v<=3,()=>true,[0,1,2,3,4]],[()=>true,e=>e.Source!==e.Target,[0,1,3,5]],[v=>v<=3,e=>e.Source!==e.Target,[0,1,3]]]){g.Clear();const f=new C(g,vp,ep);assert.equal(f.EdgeCount,0);g.AddVerticesAndEdgeRange(es);assert.equal(f.EdgeCount,indices.length);assert.deepEqual(new Set(f.Edges),new Set(indices.map(i=>es[i])));}});
 test(`${C.name}Tests.ContainsEdge`,()=>{const g=make(),f=new C(g,v=>v>0&&v<3,e=>e.Source!==e.Target),a=new Q.Edge(1,2),b=new Q.Edge(1,3),c=new Q.Edge(2,2);assert(!f.ContainsEdge(a));g.AddVerticesAndEdgeRange([a,b,c]);assert(f.ContainsEdge(a));assert(!f.ContainsEdge(b));assert(!f.ContainsEdge(c));assert(!f.ContainsEdge(new Q.Edge(1,2)));});
 test(`${C.name}Tests.ContainsEdge_EquatableEdge`,()=>{const g=make(),f=new C(g,v=>v<=2,()=>true);g.AddVerticesAndEdge(new Q.EquatableEdge(1,2));assert(f.ContainsEdge(new Q.EquatableEdge(1,2)));assert(!f.ContainsEdge(new Q.EquatableEdge(1,3)));});
 }
 if([Q.FilteredImplicitGraph,Q.FilteredIncidenceGraph,Q.FilteredVertexListGraph,Q.FilteredVertexAndEdgeListGraph,Q.FilteredBidirectionalGraph].includes(C)){
 test(`${C.name}Tests.OutEdges`,()=>{const g=make();g.AddVerticesAndEdgeRange([[1,2],[1,3],[1,1],[2,3]].map(([s,t])=>new Q.Edge(s,t)));const f=new C(g,v=>v<=2,e=>e.Source!==e.Target);assert.deepEqual(f.OutEdges(1).map(e=>e.Target),[2]);assert.deepEqual(f.OutEdges(2),[]);assert.equal(f.OutDegree(1),1);});
 test(`${C.name}Tests.OutEdge`,()=>{const g=make(),e=new Q.Edge(1,2);g.AddVerticesAndEdgeRange([new Q.Edge(1,1),e]);const f=new C(g,()=>true,e=>e.Source!==e.Target);assert.equal(f.OutEdge(1,0),e);});
 test(`${C.name}Tests.OutEdges_Throws`,()=>{const g=make();g.AddVertex(3);const f=new C(g,v=>v<3,()=>true);assert.throws(()=>f.OutEdges(3),Q.VertexNotFoundException);assert.throws(()=>f.OutEdges(1),Q.VertexNotFoundException);assert.throws(()=>f.OutEdges(null));});
 test(`${C.name}Tests.TryGetOutEdges`,()=>{const g=make();g.AddVertexRange([1,2,3]);const f=new C(g,v=>v<3,()=>true);assert.deepEqual(f.TryGetOutEdges(1),[]);assert.equal(f.TryGetOutEdges(3),undefined);assert.equal(f.TryGetOutEdges(20),undefined);});
 }
 if([Q.FilteredIncidenceGraph,Q.FilteredVertexListGraph,Q.FilteredVertexAndEdgeListGraph,Q.FilteredBidirectionalGraph].includes(C)){
 test(`${C.name}Tests.TryGetEdge`,()=>{const g=make(),a=new Q.Edge(1,2);g.AddVerticesAndEdgeRange([a,new Q.Edge(1,3),new Q.Edge(2,2)]);const f=new C(g,v=>v<=2,e=>e.Source!==e.Target);assert.equal(f.TryGetEdge(1,2),a);assert.equal(f.TryGetEdge(1,3),undefined);assert.equal(f.TryGetEdge(2,2),undefined);});
 test(`${C.name}Tests.TryGetEdges`,()=>{const g=make();g.AddVertexRange([1,2,3]);g.AddEdge(new Q.Edge(1,2));const f=new C(g,v=>v<=2,()=>false);assert.deepEqual(f.TryGetEdges(1,2),[]);assert.equal(f.TryGetEdges(1,3),undefined);assert.equal(f.TryGetEdges(3,1),undefined);});
 }
}
// Upstream GraphTestsBase.AdjacentEdge_Test / AdjacentEdges_Test (one adjacency entry per self loop; materialized degree counts it twice).
for(const [name,make]of [['UndirectedGraph',g=>g],['ArrayUndirectedGraph',g=>new Q.ArrayUndirectedGraph(g)],['DelegateImplicitUndirectedGraph',g=>new Q.DelegateImplicitUndirectedGraph(v=>g.TryGetAdjacentEdges(v))],['DelegateUndirectedGraph',g=>new Q.DelegateUndirectedGraph(g.Vertices,v=>g.TryGetAdjacentEdges(v))]]){
 const fixture=()=>{const g=new Q.UndirectedGraph();g.AddVertex(5);const es=[[1,1],[1,2],[1,3],[2,4],[3,3],[4,1]].map(([s,t])=>new Q.Edge(s,t));g.AddVerticesAndEdgeRange(es);return {g,es};};
 test(`${name}Tests.AdjacentEdge`,()=>{const {g,es}=fixture(),h=make(g);for(const [v,i,j]of [[1,0,0],[1,2,2],[1,3,5],[3,0,2],[3,1,4],[4,0,3]])assert.equal(h.AdjacentEdge(v,i),es[j]);});
 test(`${name}Tests.AdjacentEdges`,()=>{const {g,es}=fixture(),h=make(g);assert.deepEqual(h.AdjacentEdges(1),[es[0],es[1],es[2],es[5]]);assert.deepEqual(h.AdjacentEdges(3),[es[2],es[4]]);assert.deepEqual(h.AdjacentEdges(5),[]);assert.equal(h.AdjacentDegree(1),name.startsWith('Delegate')?4:5);assert.equal(h.AdjacentDegree(3),name.startsWith('Delegate')?2:3);assert(h.IsAdjacentEdgesEmpty(5));});
 test(`${name}Tests.AdjacentEdges_Throws`,()=>{const {g}=fixture(),h=make(g);assert.throws(()=>h.AdjacentEdges(20),Q.VertexNotFoundException);assert.throws(()=>h.AdjacentEdges(null));});
 test(`${name}Tests.AdjacentEdge_Throws`,()=>{const {g}=fixture(),h=make(g);assert.throws(()=>h.AdjacentEdge(1,-1));assert.throws(()=>h.AdjacentEdge(1,4));assert.throws(()=>h.AdjacentEdge(5,0));});
 test(`${name}Tests.ContainsEdge_SourceTarget`,()=>{const {g}=fixture(),h=make(g);assert(h.ContainsEdge(1,2));assert(h.ContainsEdge(2,1));assert(h.ContainsEdge(1,1));assert(!h.ContainsEdge(2,3));});
}
// Upstream scalar predicate fixture: live graph degree/map/capacity updates.
for(const C of [Q.SinkVertexPredicate,Q.IsolatedVertexPredicate]){
 test(`${C.name}Tests.Construction_Throws`,()=>assert.throws(()=>new C(null)));
 test(`${C.name}Tests.Predicate`,()=>{const g=new Q.BidirectionalGraph(),p=new C(g);g.AddVertexRange([1,2,3]);assert(p.Test(1));assert(p.Test(2));const e=new Q.Edge(1,3);g.AddEdge(e);assert(!p.Test(1));assert(p.Test(2));assert.equal(p.Test(3),C===Q.SinkVertexPredicate);g.RemoveEdge(e);assert(p.Test(1));assert(p.Test(3));});
 test(`${C.name}Tests.Predicate_Throws`,()=>{const p=new C(new Q.BidirectionalGraph());assert.throws(()=>p.Test(null));assert.throws(()=>p.Test(1),Q.VertexNotFoundException);});
}
test('InDictionaryVertexPredicateTests.Predicate',()=>{const m=new Map(),p=new Q.InDictionaryVertexPredicate(m);assert(!p.Test(1));m.set(1,0);assert(p.Test(1));m.delete(1);assert(!p.Test(1));});
test('ResidualEdgePredicateTests.Predicate',()=>{const e=new Q.Edge(1,2),m=new Map([[e,0]]),p=new Q.ResidualEdgePredicate(m);assert(!p.Test(e));m.set(e,2);assert(p.Test(e));m.set(e,-1);assert(!p.Test(e));});
test('ReversedResidualEdgePredicateTests.Predicate',()=>{const e=new Q.Edge(1,2),r=new Q.Edge(2,1),m=new Map([[e,0],[r,3]]),p=new Q.ReversedResidualEdgePredicate(m,new Map([[e,r],[r,e]]));assert(p.Test(e));assert(!p.Test(r));});
// Upstream GraphExtensionsTests overload fixtures, dictionary conversion callback receives KeyValuePair.
test('GraphExtensionsTests.ToDelegateVertexAndEdgeListGraph_ConverterEdges',()=>{const m=new Map([[1,[2,3]],[2,[]],[3,[]]]),g=Q.ToDelegateVertexAndEdgeListGraph(m,p=>p.Value.map(t=>new Q.Edge(p.Key,t)));assert.equal(g.VertexCount,3);assert.deepEqual(g.OutEdges(1).map(e=>e.Target),[2,3]);m.set(4,[]);assert.equal(g.VertexCount,4);});
test('GraphExtensionsTests.ToAdjacencyGraph_EdgeArray',()=>{const g=Q.ToAdjacencyGraph([[1,2,3],[2,3,1]]);assert.equal(g.VertexCount,3);assert.equal(g.EdgeCount,3);assert(g.ContainsEdge(3,1));});
test('GraphExtensionsTests.ToAdjacencyGraph_EdgeArray_Throws',()=>{assert.throws(()=>Q.ToAdjacencyGraph([[1,2],[2]]));assert.throws(()=>Q.ToAdjacencyGraph([[1],[2],[3]]));assert.throws(()=>Q.ToAdjacencyGraph(null));});
for(const fn of ['ToAdjacencyGraph','ToBidirectionalGraph']){
 test(`GraphExtensionsTests.${fn}_EdgeSetWithFactory`,()=>{const g=Q[fn]([1,2,3],v=>v<3?[new Q.Edge(v,v+1)]:[]);assert.equal(g.VertexCount,3);assert.equal(g.EdgeCount,2);assert(g.ContainsEdge(1,2));assert(g.ContainsEdge(2,3));});
 test(`GraphExtensionsTests.${fn}_EdgeSet`,()=>{const es=[new Q.Edge(1,2),new Q.Edge(1,2),new Q.Edge(2,3)],g=Q[fn](es,false);assert.equal(g.EdgeCount,2);assert.equal(g.AllowParallelEdges,false);});
 test(`GraphExtensionsTests.${fn}_VertexPairs`,()=>{const g=Q[fn]([new Q.SEquatableEdge(1,2),new Q.SEquatableEdge(2,3)]);assert(g.ContainsEdge(new Q.SEquatableEdge(1,2)));assert.equal(g.VertexCount,3);});
}
test('GraphExtensionsTests.ToBidirectionalGraph_FromUndirectedGraph',()=>{const g=new Q.UndirectedGraph();g.AddVerticesAndEdge(new Q.Edge(2,1));g.AddVertex(3);const b=Q.ToBidirectionalGraph(g);assert(b.IsDirected);assert.equal(b.VertexCount,3);assert(b.ContainsEdge(2,1));assert(!b.ContainsEdge(1,2));});
test('GraphExtensionsTests.ToBidirectionalGraph_FromDirectedGraph',()=>{const g=new Q.BidirectionalGraph();assert.equal(Q.ToBidirectionalGraph(g),g);const a=new Q.AdjacencyGraph();a.AddVerticesAndEdge(new Q.Edge(1,2));const b=Q.ToBidirectionalGraph(a);assert.equal(b.InDegree(2),1);});
// Upstream UndirectedGraphTests.ContainsEdge_Undirected: sorted endpoint type can be queried in either direction.
test('UndirectedGraphTests.ContainsEdge_Undirected',()=>{const g=new Q.UndirectedGraph(false,Q.SortedVertexEquality);g.AddVerticesAndEdge(new Q.UndirectedEdge(1,2));assert(g.ContainsEdge(1,2));assert(g.ContainsEdge(2,1));assert(!g.ContainsEdge(1,3));});
// Upstream UndirectedGraph self-loop degree contract differs from adjacency entry count.
test('UndirectedGraph loop degree contract',()=>{const g=new Q.UndirectedGraph();g.AddVerticesAndEdge(new Q.Edge(1,1));assert.equal(g.AdjacentEdges(1).length,1);assert.equal(g.AdjacentDegree(1),2);const a=new Q.ArrayUndirectedGraph(g);assert.equal(a.AdjacentDegree(1),2);const f=new Q.FilteredUndirectedGraph(g,()=>true,()=>true);assert.equal(f.AdjacentDegree(1),2);});

// Viewer regressions from graph lifecycle review; no DOM required for graph/event/export behavior.
test('Viewer reconnect reattaches graph mutation subscriptions',async()=>{const {QuikGraphViewer}=await import('../src/web-component.js');const viewer=new QuikGraphViewer(),g=new Q.BidirectionalGraph();viewer.Graph=g;assert.equal(g.EdgeAdded.Count,1);viewer.disconnectedCallback();assert.equal(g.EdgeAdded.Count,0);viewer.connectedCallback();assert.equal(g.EdgeAdded.Count,1);viewer.connectedCallback();assert.equal(g.EdgeAdded.Count,1);viewer.disconnectedCallback();});
test('Viewer SVG synchronizes graph mutations and preserves parallel paths',async()=>{const {QuikGraphViewer}=await import('../src/web-component.js');const viewer=new QuikGraphViewer(),g=new Q.BidirectionalGraph();g.AddVerticesAndEdgeRange([new Q.TaggedEdge('a','b','one'),new Q.TaggedEdge('a','b','two'),new Q.TaggedEdge('a','a','loop')]);viewer.Graph=g;const svg=viewer.ToSvg();assert(svg.includes('loop'));const curves=[...svg.matchAll(/d="(M[^\"]+Q[^\"]+)"/g)].map(m=>m[1]);assert.equal(curves.length,2);assert.notEqual(curves[0],curves[1]);g.RemoveVertex('b');const after=viewer.ToSvg();assert(!after.includes('>b</text>'));assert.equal(viewer.Positions.has('b'),false);g.AddVertex('c');assert(viewer.ToSvg().includes('>c</text>'));});
test('Viewer camera rejects invalid zoom without changing state',async()=>{const {QuikGraphViewer}=await import('../src/web-component.js');const viewer=new QuikGraphViewer();for(const factor of [NaN,Infinity,0,-1])assert.throws(()=>viewer.Zoom(factor),RangeError);assert.equal(viewer._scale,1);viewer.Zoom(2);assert.equal(viewer._scale,2);assert(Number.isFinite(viewer._pan.x));});

// Upstream graph argument-validation test methods, using the shared NUnit fixture contract.
const graphArgumentCases = {
  "BidirectionalMatrixGraphTests": [
    "Construction_Throws",
    "AddEdge_Throws",
    "AddEdgeRange_Throws",
    "ContainsEdge_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws",
    "RemoveOutEdgeIf_Throws",
    "RemoveInEdgeIf_Throws"
  ],
  "DelegateBidirectionalIncidenceGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws"
  ],
  "CompressedSparseRowGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "UndirectedBidirectionalGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "AdjacentEdge_Throws",
    "AdjacentEdges_Throws",
    "TryGetEdge_Throws"
  ],
  "BidirectionalGraphTests": [
    "AddVertex_Throws",
    "AddEdgeRange_Throws",
    "AddVerticesAndEdge_Throws",
    "AddVerticesAndEdgeRange_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws",
    "Merge_Throws",
    "MergeIf_Throws",
    "RemoveVertex_Throws",
    "RemoveVertexIf_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws",
    "RemoveOutEdgeIf_Throws",
    "RemoveInEdgeIf_Throws",
    "ClearOutEdges_Throws",
    "ClearInEdges_Throws",
    "ClearEdges_Throws",
    "Clone_Throws"
  ],
  "ArrayAdjacencyGraphTests": [
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "UndirectedGraphTests": [
    "Construction_Throws",
    "AddVertex_Throws",
    "AddEdgeRange_Throws",
    "AddVerticesAndEdge_Throws",
    "AddVerticesAndEdgeRange_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "AdjacentVertices_Throws",
    "TryGetEdge_Throws",
    "RemoveVertex_Throws",
    "RemoveVertexIf_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws",
    "RemoveEdges_Throws",
    "RemoveAdjacentEdgeIf_Throws"
  ],
  "DelegateImplicitUndirectedGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetAdjacentEdges_Throws"
  ],
  "DelegateIncidenceGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "ArrayUndirectedGraphTests": [
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws"
  ],
  "AdjacencyGraphTests": [
    "AddVertex_Throws",
    "AddEdgeRange_Throws",
    "AddVerticesAndEdge_Throws",
    "AddVerticesAndEdgeRange_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "RemoveVertex_Throws",
    "RemoveVertexIf_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws",
    "RemoveOutEdgeIf_Throws",
    "ClearEdges_Throws"
  ],
  "DelegateImplicitGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "TryGetOutEdges_Throws"
  ],
  "ArrayBidirectionalGraphTests": [
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws"
  ],
  "BidirectionalAdapterGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "OutEdges_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws"
  ],
  "ClusteredAdjacencyGraphTests": [
    "Construction_Throws",
    "AddVertex_Throws",
    "AddVertexRange_Throws",
    "AddEdge_Throws",
    "AddEdgeRange_Throws",
    "AddVerticesAndEdge_Throws",
    "AddVerticesAndEdgeRange_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "RemoveVertex_Throws",
    "RemoveVertexIf_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws",
    "RemoveOutEdgeIf_Throws",
    "ClearOutEdges_Throws",
    "RemoveCluster_Throws"
  ],
  "DelegateUndirectedGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "ContainsEdge_SourceTarget_Throws",
    "TryGetEdge_Throws",
    "TryGetAdjacentEdges_Throws"
  ],
  "EdgeListGraphTests": [
    "AddEdge_Throws",
    "AddEdgeRange_Throws",
    "AddVerticesAndEdge_Throws",
    "AddVerticesAndEdgeRange_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "RemoveEdge_Throws",
    "RemoveEdgeIf_Throws"
  ],
  "ReversedBidirectionalGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "OutEdges_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws"
  ],
  "DelegateVertexAndEdgeListGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws",
    "ContainsEdge_Throws",
    "ContainsEdge_SourceTarget_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "FilteredUndirectedGraphTests": [
    "ContainsEdge_Throws",
    "AdjacentEdge_Throws",
    "AdjacentEdges_Throws",
    "TryGetEdge_Throws"
  ],
  "FilteredImplicitGraphTests": [
    "OutEdge_Throws",
    "TryGetOutEdges_Throws"
  ],
  "FilteredVertexAndEdgeListGraphTests": [
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "FilteredImplicitVertexSetGraphTests": [
    "Construction_Throws",
    "ContainsVertex_Throws"
  ],
  "FilteredVertexListGraphTests": [
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ],
  "FilteredBidirectionalGraphTests": [
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "InEdge_Throws",
    "InEdges_Throws",
    "Degree_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws",
    "TryGetInEdges_Throws"
  ],
  "FilteredIncidenceGraphTests": [
    "ContainsEdge_Throws",
    "OutEdge_Throws",
    "TryGetEdge_Throws",
    "TryGetEdges_Throws",
    "TryGetOutEdges_Throws"
  ]
};
function validationGraph(name) {
 const type=name.replace(/Tests$/,''),g=new (type.includes('Undirected')?Q.UndirectedGraph:Q.BidirectionalGraph)();g.AddVertexRange([1,2]);
 if(type.startsWith('Filtered'))return new Q[type==='FilteredImplicitVertexSetGraph'?'FilteredImplicitVertexSet':type](g,()=>true,()=>true);
 if(type==='BidirectionalMatrixGraph')return new Q.BidirectionalMatrixGraph(3);
 if(type==='DelegateBidirectionalIncidenceGraph')return new Q[type](v=>g.TryGetOutEdges(v),v=>g.TryGetInEdges(v));
 if(type==='DelegateVertexAndEdgeListGraph'||type==='DelegateUndirectedGraph')return new Q[type](g.Vertices,v=>g.TryGetOutEdges(v));
 if(type.startsWith('Delegate'))return new Q[type](v=>g.TryGetOutEdges(v));
 if(type.startsWith('Array')||['CompressedSparseRowGraph','UndirectedBidirectionalGraph','ReversedBidirectionalGraph','BidirectionalAdapterGraph','ClusteredAdjacencyGraph'].includes(type))return new Q[type](g);
 const result=new Q[type]();if(result.AddVertexRange)result.AddVertexRange([1,2]);return result;
}
for(const [className,methods]of Object.entries(graphArgumentCases))for(const method of methods)test(`${className}.${method}`,()=>{
 const g=validationGraph(className),name=method.replace(/_Throws$/,'');
 if(name==='Construction'){
  const type=className.replace(/Tests$/,'');
  if(type==='BidirectionalMatrixGraph')assert.throws(()=>new Q[type](-1));
  else if(type==='UndirectedGraph')assert.throws(()=>new Q[type](true,null));
  else if(type.startsWith('Filtered')){const C=Q[type==='FilteredImplicitVertexSetGraph'?'FilteredImplicitVertexSet':type];assert.throws(()=>new C(null,()=>true,()=>true));assert.throws(()=>new C(new Q.BidirectionalGraph(),null,()=>true));assert.throws(()=>new C(new Q.BidirectionalGraph(),()=>true,null));}
  else if(type==='DelegateVertexAndEdgeListGraph'||type==='DelegateUndirectedGraph'){assert.throws(()=>new Q[type](null,()=>[]));assert.throws(()=>new Q[type]([],null));}
  else if(type==='DelegateBidirectionalIncidenceGraph'){assert.throws(()=>new Q[type](null,()=>[]));assert.throws(()=>new Q[type](()=>[],null));}
  else assert.throws(()=>new Q[type](null));
 }else if(name==='Clone')assert.throws(()=>new Q.BidirectionalGraph(null));
 else if(name==='Merge'){assert.throws(()=>g.MergeVertex(null,(s,t)=>new Q.Edge(s,t)));assert.throws(()=>g.MergeVertex(1,null));assert.throws(()=>g.MergeVertex(99,(s,t)=>new Q.Edge(s,t)));}
 else if(name==='MergeIf'){assert.throws(()=>g.MergeVerticesIf(null,(s,t)=>new Q.Edge(s,t)));assert.throws(()=>g.MergeVerticesIf(()=>true,null));}
 else if(['OutEdge','InEdge','AdjacentEdge'].includes(name)){assert.throws(()=>g[name](null,0));assert.throws(()=>g[name](99,0));assert.throws(()=>g[name](1,-1));assert.throws(()=>g[name](1,1));}
 else if(['TryGetEdge','TryGetEdges','ContainsEdge_SourceTarget'].includes(name)){const fn=name==='ContainsEdge_SourceTarget'?'ContainsEdge':name;assert.throws(()=>g[fn](null,1));assert.throws(()=>g[fn](1,null));assert.throws(()=>g[fn](null,null));}
 else if(['AddVertexRange','AddEdgeRange','AddVerticesAndEdgeRange','RemoveEdges'].includes(name)){assert.throws(()=>g[name](null));assert.throws(()=>g[name]([null]));}
 else if(['RemoveOutEdgeIf','RemoveInEdgeIf','RemoveAdjacentEdgeIf'].includes(name)){assert.throws(()=>g[name](null,()=>true));assert.throws(()=>g[name](1,null));}
 else {assert.equal(typeof g[name],'function');assert.throws(()=>g[name](null));if(['OutEdges','InEdges','AdjacentEdges','AdjacentVertices','Degree'].includes(name))assert.throws(()=>g[name](99));}
});

// Additional upstream GraphTestsBase mutation/query fixtures by concrete graph class.
const graphBehaviorCases = {
  "BidirectionalMatrixGraphTests": [
    "AddEdge",
    "AddEdge_EquatableEdge",
    "AddEdgeRange",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "TryGetEdge",
    "TryGetEdges",
    "RemoveEdge",
    "RemoveEdge_EquatableEdge",
    "RemoveOutEdgeIf",
    "RemoveInEdgeIf",
    "ClearOutEdges",
    "ClearInEdges",
    "ClearEdges",
    "Clone"
  ],
  "CompressedSparseRowGraphTests": [
    "ContainsEdge",
    "ContainsEdge_SourceTarget",
    "Clone"
  ],
  "UndirectedBidirectionalGraphTests": [
    "AddVertex",
    "AddEdge",
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "TryGetEdge"
  ],
  "BidirectionalGraphTests": [
    "AddVertex",
    "AddVertexRange",
    "AddEdge_ParallelEdges_EquatableEdge",
    "AddEdge_NoParallelEdges_EquatableEdge",
    "AddEdgeRange",
    "AddVerticesAndEdge",
    "AddVerticesAndEdgeRange",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "RemoveInEdgeIf",
    "ClearInEdges",
    "TrimEdgeExcess"
  ],
  "ArrayAdjacencyGraphTests": [
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget"
  ],
  "UndirectedGraphTests": [
    "AddVertex",
    "AddVertexRange",
    "AddEdge_ParallelEdges_EquatableEdge",
    "AddEdge_NoParallelEdges_EquatableEdge",
    "AddEdgeRange",
    "AddVerticesAndEdge",
    "AddVerticesAndEdgeRange",
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "TryGetEdge",
    "RemoveEdges",
    "RemoveAdjacentEdgeIf",
    "ClearAdjacentEdges",
    "TrimEdgeExcess"
  ],
  "DelegateImplicitUndirectedGraphTests": [
    "ContainsVertex",
    "ContainsEdge",
    "TryGetEdge",
    "TryGetAdjacentEdges"
  ],
  "DelegateIncidenceGraphTests": [
    "ContainsEdge",
    "TryGetEdge",
    "TryGetEdges"
  ],
  "ArrayUndirectedGraphTests": [
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "TryGetEdge"
  ],
  "AdjacencyGraphTests": [
    "AddVertex",
    "AddVertexRange",
    "AddEdge_ParallelEdges_EquatableEdge",
    "AddEdge_NoParallelEdges_EquatableEdge",
    "AddEdgeRange",
    "AddVerticesAndEdge",
    "AddVerticesAndEdgeRange",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "TrimEdgeExcess"
  ],
  "ArrayBidirectionalGraphTests": [
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget"
  ],
  "BidirectionalAdapterGraphTests": [
    "AddVertex",
    "AddEdge",
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "OutEdge",
    "OutEdges",
    "InEdge",
    "InEdges",
    "Degree",
    "TryGetOutEdges",
    "TryGetInEdges"
  ],
  "ClusteredAdjacencyGraphTests": [
    "AddVertexRange",
    "AddEdge_ParallelEdges",
    "AddEdge_ParallelEdges_EquatableEdge",
    "AddEdge_NoParallelEdges",
    "AddEdge_NoParallelEdges_EquatableEdge",
    "AddEdgeRange",
    "AddVerticesAndEdge",
    "AddVerticesAndEdgeRange",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "TryGetEdge",
    "TryGetEdges",
    "RemoveVertexIf",
    "RemoveEdge",
    "RemoveEdge_EquatableEdge",
    "RemoveEdgeIf",
    "RemoveOutEdgeIf",
    "Clear",
    "ClearOutEdges"
  ],
  "DelegateUndirectedGraphTests": [
    "Vertices",
    "Edges",
    "ContainsVertex",
    "ContainsEdge",
    "TryGetEdge",
    "TryGetAdjacentEdges"
  ],
  "EdgeListGraphTests": [
    "AddEdge_ParallelEdges_EquatableEdge",
    "AddEdge_NoParallelEdges_EquatableEdge",
    "AddEdgeRange",
    "AddVerticesAndEdge_ParallelEdges",
    "AddVerticesAndEdge_ParallelEdges_EquatableEdge",
    "AddVerticesAndEdge_NoParallelEdges",
    "AddVerticesAndEdge_NoParallelEdges_EquatableEdge",
    "AddVerticesAndEdgeRange",
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "RemoveEdge",
    "RemoveEdge_EquatableEdge",
    "RemoveEdgeIf",
    "Clear",
    "Clone"
  ],
  "ReversedBidirectionalGraphTests": [
    "AddVertex",
    "AddEdge",
    "ContainsVertex",
    "ContainsEdge",
    "ContainsEdge_EquatableEdge",
    "ContainsEdge_SourceTarget",
    "OutEdge",
    "InEdge",
    "Degree",
    "TryGetEdge",
    "TryGetEdges",
    "TryGetOutEdges",
    "TryGetInEdges"
  ],
  "DelegateVertexAndEdgeListGraphTests": [
    "Vertices",
    "Edges",
    "ContainsEdge",
    "ContainsEdge_SourceTarget",
    "TryGetEdge",
    "TryGetEdges"
  ],
  "FilteredUndirectedGraphTests": [
    "ContainsEdge_SourceTarget",
    "AdjacentEdge",
    "AdjacentEdges",
    "TryGetEdge"
  ],
  "FilteredVertexAndEdgeListGraphTests": [
    "ContainsEdge_SourceTarget"
  ],
  "FilteredImplicitVertexSetGraphTests": [
    "ContainsVertex"
  ],
  "FilteredVertexListGraphTests": [
    "ContainsEdge"
  ],
  "FilteredBidirectionalGraphTests": [
    "ContainsEdge_SourceTarget",
    "InEdge",
    "InEdges",
    "Degree",
    "TryGetInEdges"
  ],
  "FilteredIncidenceGraphTests": [
    "ContainsEdge"
  ]
};
function behaviorGraph(className,{parallel=true,equatable=false}={}){
 const type=className.replace(/Tests$/,''),undirected=type.includes('Undirected'),base=new (undirected?Q.UndirectedGraph:Q.BidirectionalGraph)(parallel),E=equatable?Q.EquatableEdge:Q.Edge;
 base.AddVertexRange([1,2,3,4,5]);const es=[[1,2],[1,3],[2,2],[3,1],[4,1]].map(([s,t])=>new E(s,t));base.AddEdgeRange(es);
 let g;
 if(type==='BidirectionalMatrixGraph'){g=new Q.BidirectionalMatrixGraph(6);g.AddEdgeRange(es);}
 else if(type.startsWith('Filtered'))g=new Q[type==='FilteredImplicitVertexSetGraph'?'FilteredImplicitVertexSet':type](base,()=>true,()=>true);
 else if(type==='DelegateBidirectionalIncidenceGraph')g=new Q[type](v=>base.TryGetOutEdges(v),v=>base.TryGetInEdges(v));
 else if(type==='DelegateVertexAndEdgeListGraph'||type==='DelegateUndirectedGraph')g=new Q[type](()=>base.Vertices,v=>base.TryGetOutEdges(v));
 else if(type.startsWith('Delegate'))g=new Q[type](v=>base.TryGetOutEdges(v));
 else if(type.startsWith('Array')||['CompressedSparseRowGraph','UndirectedBidirectionalGraph','ReversedBidirectionalGraph','BidirectionalAdapterGraph','ClusteredAdjacencyGraph'].includes(type))g=new Q[type](base);
 else {g=new Q[type](...(type==='EdgeListGraph'?[true,parallel]:[parallel]));if(g.AddVertexRange)g.AddVertexRange([1,2,3,4,5]);g.AddEdgeRange(es);}
 return {g,base,es,E,type,snapshot:type.startsWith('Array')||type==='CompressedSparseRowGraph'};
}
for(const [className,methods]of Object.entries(graphBehaviorCases))for(const method of methods)test(`${className}.${method}`,()=>{
 const {g,base,es,E,type,snapshot}=behaviorGraph(className,{parallel:!method.includes('NoParallel'),equatable:method.includes('EquatableEdge')});
 if(method==='AddVertex'){
  if(typeof g.AddVertex==='function'){const n=g.VertexCount;assert(g.AddVertex(99));assert(!g.AddVertex(99));assert.equal(g.VertexCount,n+1);}
  else {const n=g.VertexCount;base.AddVertex(99);assert.equal(g.VertexCount,n+(snapshot?0:1));assert.equal(g.ContainsVertex(99),!snapshot);}
 }else if(method==='AddVertexRange'){const n=g.VertexCount;assert.equal(g.AddVertexRange([6,7,6,1]),2);assert.equal(g.VertexCount,n+2);}
 else if(method==='AddEdge'&&!g.AddEdge){const n=g.EdgeCount;base.AddEdge(new E(2,3));assert.equal(g.EdgeCount,n+(snapshot?0:1));}
 else if(method==='AddEdgeRange'){const n=g.EdgeCount;assert.equal(g.AddEdgeRange([new E(2,3),new E(3,4)]),2);assert.equal(g.EdgeCount,n+2);}
 else if(method==='AddVerticesAndEdgeRange'){const n=g.EdgeCount;assert.equal(g.AddVerticesAndEdgeRange([new E(6,7),new E(7,8)]),2);assert.equal(g.EdgeCount,n+2);assert(g.ContainsVertex(8));}
 else if(method.startsWith('AddEdge')||method.startsWith('AddVerticesAndEdge')){
  const fn=method.startsWith('AddVerticesAndEdge')?'AddVerticesAndEdge':'AddEdge',e=new E(2,3),n=g.EdgeCount;assert(g[fn](e));const duplicate=g[fn](new E(2,3));assert.equal(duplicate,g.AllowParallelEdges&&!(type==='EdgeListGraph'&&equatableEdge(e)));assert.equal(g.EdgeCount,n+1+Number(duplicate));
 }else if(method==='ContainsVertex'){assert(g.ContainsVertex(1));assert(g.ContainsVertex(2));assert(!g.ContainsVertex(99));}
 else if(method==='Vertices'){assert.deepEqual(new Set(g.Vertices),new Set([1,2,3,4,5]));assert.equal(g.VertexCount,5);}
 else if(method==='Edges'){assert.equal(g.EdgeCount,5);assert.equal(g.Edges.length,5);assert(g.Edges.some(e=>e.Source===2&&e.Target===2));}
 else if(method==='ContainsEdge'||method==='ContainsEdge_EquatableEdge'){
  if(type==='DelegateIncidenceGraph'||type==='DelegateImplicitUndirectedGraph'){assert(g.ContainsEdge(1,2));assert(!g.ContainsEdge(98,99));return;}
  const e=g.Edges[0];assert(g.ContainsEdge(e));const same=method.includes('EquatableEdge')?(e instanceof Q.SReversedEdge?new Q.SReversedEdge(new E(e.Target,e.Source)):new E(e.Source,e.Target)):new Q.Edge(e.Source,e.Target);assert.equal(g.ContainsEdge(same),method.includes('EquatableEdge'));assert(!g.ContainsEdge(new E(98,99)));
 }else if(method==='ContainsEdge_SourceTarget'||method==='TryGetEdge'){
  const source=type==='ReversedBidirectionalGraph'?2:1,target=type==='ReversedBidirectionalGraph'?1:2;assert(g.ContainsEdge(source,target));const e=g.TryGetEdge(source,target);assert(e);assert.equal(e.Source,source);assert.equal(e.Target,target);assert.equal(g.TryGetEdge(99,1),undefined);
 }else if(method==='TryGetEdges'){assert.equal(g.TryGetEdges(99,1),undefined);assert.equal(g.TryGetEdges(1,1).length,0);assert.equal(g.TryGetEdges(2,2).length,1);}
 else if(method==='TryGetAdjacentEdges'){assert.equal(g.TryGetAdjacentEdges(99),undefined);assert.deepEqual(g.TryGetAdjacentEdges(5),[]);assert.equal(g.TryGetAdjacentEdges(1).length,4);}
 else if(method==='TryGetOutEdges'){assert.equal(g.TryGetOutEdges(99),undefined);assert.deepEqual(g.TryGetOutEdges(5),[]);assert.equal(g.TryGetOutEdges(1).length,2);}
 else if(method==='TryGetInEdges'){assert.equal(g.TryGetInEdges(99),undefined);assert.deepEqual(g.TryGetInEdges(5),[]);assert.equal(g.TryGetInEdges(1).length,2);}
 else if(['OutEdges','InEdges','AdjacentEdges'].includes(method)){const actual=g[method](1);assert.equal(actual.length,method==='AdjacentEdges'?4:2);assert.deepEqual(g[method](5),[]);}
 else if(['OutEdge','InEdge','AdjacentEdge'].includes(method)){const es=g[method.replace('Edge','Edges')](1);assert.equal(g[method](1,0).Source,es[0].Source);assert.equal(g[method](1,0).Target,es[0].Target);}
 else if(method==='Degree'){assert.equal(g.Degree(1),4);assert.equal(g.Degree(2),3);assert.equal(g.Degree(5),0);}
 else if(method==='RemoveVertex'){assert(g.RemoveVertex(1));assert(!g.ContainsVertex(1));assert.equal(g.EdgeCount,1);assert(!g.RemoveVertex(99));}
 else if(method==='RemoveVertexIf'){assert.equal(g.RemoveVertexIf(v=>v>=3),3);assert.equal(g.VertexCount,2);assert.equal(g.EdgeCount,2);}
 else if(method==='RemoveEdge'||method==='RemoveEdge_EquatableEdge'){const before=g.EdgeCount,e=method.includes('EquatableEdge')?new E(1,2):g.Edges.find(e=>e.Source===1&&e.Target===2);assert(g.RemoveEdge(e));assert.equal(g.EdgeCount,before-1);assert(!g.RemoveEdge(e));}
 else if(method==='RemoveEdgeIf'){assert.equal(g.RemoveEdgeIf(e=>e.Source===1),2);assert.equal(g.EdgeCount,3);}
 else if(method==='RemoveOutEdgeIf'){assert.equal(g.RemoveOutEdgeIf(1,e=>e.Target===2),1);assert.equal(g.EdgeCount,4);assert.equal(g.OutDegree(1),1);}
 else if(method==='RemoveInEdgeIf'){assert.equal(g.RemoveInEdgeIf(1,e=>e.Source===4),1);assert.equal(g.EdgeCount,4);assert.equal(g.InDegree(1),1);}
 else if(method==='RemoveAdjacentEdgeIf'){assert.equal(g.RemoveAdjacentEdgeIf(1,e=>e.Source===1),2);assert.equal(g.EdgeCount,3);assert.equal(g.AdjacentEdges(1).length,2);}
 else if(method==='RemoveEdges'){assert.equal(g.RemoveEdges([es[0],es[1]]),2);assert.equal(g.EdgeCount,3);}
 else if(method==='Clear'){g.Clear();assert.equal(g.EdgeCount,0);assert.equal(g.VertexCount,type==='BidirectionalMatrixGraph'?6:0);}
 else if(method==='ClearOutEdges'){g.ClearOutEdges(1);assert.equal(g.OutDegree(1),0);assert.equal(g.EdgeCount,3);}
 else if(method==='ClearInEdges'){g.ClearInEdges(1);assert.equal(g.InDegree(1),0);assert.equal(g.EdgeCount,3);}
 else if(method==='ClearEdges'||method==='ClearAdjacentEdges'){g[method](1);assert.equal(g.EdgeCount,1);assert.equal(g.Edges[0].Source,2);}
 else if(method==='TrimEdgeExcess'){const vs=g.Vertices,edges=g.Edges;g.TrimEdgeExcess();assert.deepEqual(g.Vertices,vs);assert.deepEqual(g.Edges,edges);}
 else if(method==='Clone'){const c=g.Clone();assert.notEqual(c,g);assert.equal(c.VertexCount,g.VertexCount);assert.equal(c.EdgeCount,g.EdgeCount);assert.deepEqual(c.Edges.map(e=>[e.Source,e.Target]),g.Edges.map(e=>[e.Source,e.Target]));}
 else throw new Error(`Missing actual fixture for ${method}`);
});
function equatableEdge(e){return e instanceof Q.EquatableEdge;}

// Upstream tagged and undirected edge constructor/equality/tag-event/string fixtures.
for(const C of [Q.TaggedEdge,Q.TaggedUndirectedEdge,Q.EquatableTaggedEdge,Q.STaggedEdge,Q.STaggedUndirectedEdge,Q.SEquatableTaggedEdge]){
 test(`${C.name}Tests.Construction`,()=>{const tag={value:42},e=new C(1,2,tag);assert.equal(e.Source,1);assert.equal(e.Target,2);assert.equal(e.Tag,tag);});
 test(`${C.name}Tests.Construction_Throws`,()=>{assert.throws(()=>new C(null,1,null));assert.throws(()=>new C(1,null,null));assert.throws(()=>new C(null,null,null));if(C===Q.TaggedUndirectedEdge||C===Q.STaggedUndirectedEdge)assert.throws(()=>new C(2,1,null));});
 test(`${C.name}Tests.TagChanged`,()=>{const e=new C(1,2,'a'),events=[];const sub=e.TagChanged.subscribe((sender,args)=>events.push([sender,args]));e.Tag='a';assert.equal(events.length,0);e.Tag='b';assert.equal(events.length,1);assert.equal(events[0][0],e);sub.Dispose();e.Tag='c';assert.equal(events.length,1);});
 test(`${C.name}Tests.ObjectToString`,()=>assert.equal(new C(1,2,'tag').ToString(),`1 ${C===Q.TaggedUndirectedEdge||C===Q.STaggedUndirectedEdge?'<->':'->'} 2 (tag)`));
 test(`${C.name}Tests.Equals`,()=>{const a=new C(1,2,'a'),b=new C(1,2,'a'),differentTag=new C(1,2,'b');assert(a.Equals(a));assert(!a.Equals(null));const reference=C===Q.TaggedEdge||C===Q.TaggedUndirectedEdge;assert.equal(a.Equals(b),!reference);assert.equal(a.Equals(differentTag),C===Q.EquatableTaggedEdge||C===Q.SEquatableTaggedEdge);});
}
for(const C of [Q.EquatableTaggedEdge,Q.SEquatableTaggedEdge])test(`${C.name}Tests.Hashcode`,()=>{const a=new C(1,2,'a'),b=new C(1,2,'b');assert.equal(a.GetHashCode(),b.GetHashCode());assert.notEqual(a.GetHashCode(),new C(2,1,'a').GetHashCode());});
for(const C of [Q.UndirectedEdge,Q.SUndirectedEdge,Q.EquatableUndirectedEdge])test(`${C.name}Tests.Construction`,()=>{const e=new C(1,2),loop=new C(1,1);assert.equal(e.Source,1);assert.equal(e.Target,2);assert.equal(loop.Target,1);});
for(const C of [Q.SEdge,Q.SUndirectedEdge,Q.UndirectedEdge])test(`${C.name}Tests.Equals`,()=>{const a=new C(1,2),b=new C(1,2);assert(a.Equals(a));assert(!a.Equals(null));assert.equal(a.Equals(b),C!==Q.UndirectedEdge);});
for(const C of [Q.TermEdge,Q.EquatableTermEdge]){
 test(`${C.name}Tests.Construction`,()=>{const a=new C(1,2),b=new C(1,2,3,4);assert.equal(a.SourceTerminal,0);assert.equal(a.TargetTerminal,0);assert.equal(b.SourceTerminal,3);assert.equal(b.TargetTerminal,4);});
 test(`${C.name}Tests.Construction_Throws`,()=>{for(const args of [[null,1],[1,null],[1,2,-1,0],[1,2,0,-1]])assert.throws(()=>new C(...args));});
}
test('TermEdgeTests.Equals',()=>{const a=new Q.TermEdge(1,2);assert(a.Equals(a));assert(!a.Equals(new Q.TermEdge(1,2)));});
test('TermEdgeTests.ObjectToString',()=>assert.equal(new Q.TermEdge(1,2,1,5).ToString(),'1 (1) -> 2 (5)'));
test('EquatableTermEdgeTests.Hashcode',()=>{assert.equal(new Q.EquatableTermEdge(1,2).GetHashCode(),new Q.EquatableTermEdge(1,2).GetHashCode());assert.notEqual(new Q.EquatableTermEdge(1,2).GetHashCode(),new Q.EquatableTermEdge(2,1).GetHashCode());});
// JS no-argument struct constructors represent reference-type default endpoints (null).
// Numeric generic defaults cannot be inferred from erased JS types; construct (0, 0) explicitly.
for(const C of [Q.SEdge,Q.SEquatableEdge,Q.SUndirectedEdge,Q.STaggedEdge,Q.STaggedUndirectedEdge,Q.SEquatableTaggedEdge,Q.SReversedEdge])test(`${C.name}Tests.EqualsDefaultEdge_ReferenceTypeExtremities`,()=>{const a=new C(),b=new C();assert(a.Equals(b));assert(b.Equals(a));assert.equal(a.Source,null);assert.equal(a.Target,null);});
for(const C of [Q.SEquatableEdge,Q.SEquatableTaggedEdge,Q.SReversedEdge])test(`${C.name}Tests.HashcodeDefaultEdge_ReferenceTypeExtremities`,()=>assert.equal(new C().GetHashCode(),new C().GetHashCode()));
test('SReversedEdgeTests.Construction_Throws',()=>assert.throws(()=>new Q.SReversedEdge(null)));
test('SReversedEdgeTests.Equals2',()=>{const a=new Q.SReversedEdge(new Q.EquatableEdge(1,2)),b=new Q.SReversedEdge(new Q.EquatableEdge(1,2));assert(a.Equals(b));assert(!a.Equals(new Q.SReversedEdge(new Q.EquatableEdge(2,1))));});
test('SReversedEdgeTests.Hashcode',()=>{const e=new Q.Edge(1,2),a=new Q.SReversedEdge(e),b=new Q.SReversedEdge(e);assert.equal(a.GetHashCode(),b.GetHashCode());assert.notEqual(a.GetHashCode(),new Q.SReversedEdge(new Q.Edge(1,2)).GetHashCode());});
test('SReversedEdgeTests.ObjectToString',()=>{assert.equal(new Q.SReversedEdge(new Q.Edge(1,2)).ToString(),'R(1 -> 2)');assert.equal(new Q.SReversedEdge(new Q.UndirectedEdge(1,2)).ToString(),'R(1 <-> 2)');});
