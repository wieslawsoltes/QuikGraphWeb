/** Structural graph algorithms ported from QuikGraph (MS-PL).
 * Iterative traversals avoid browser call-stack limits. Explicit vertex equality is retained.
 */
import { EqualityMap as Map, EqualitySet as Set, valueEquals as same } from './equality.js';
import { AlgorithmBase, RootedAlgorithmBase } from './algorithm-base.js';
import { Edge, BidirectionalGraph, EventHook, ArgumentNullException, ArgumentException,
  ArgumentOutOfRangeException, InvalidOperationException, NonAcyclicGraphException } from './core.js';

const required = (value, name) => { if (value == null) throw new ArgumentNullException(name); return value; };
const other = (edge, vertex) => same(edge.Source, vertex) ? edge.Target : edge.Source;
const vertices = graph => Array.from(graph.Vertices);
const edges = graph => Array.from(graph.Edges);
const adjacency = (graph, undirected = false, backward = false) => {
  const result = new Map(vertices(graph).map(v => [v, []]));
  for (const edge of graph.Edges) {
    result.get(backward ? edge.Target : edge.Source).push(edge);
    if (undirected && !same(edge.Source, edge.Target)) result.get(edge.Target).push(edge);
  }
  return result;
};

class DisjointSets {
  constructor(values = []) { this.parents = new Map(); this.ranks = new Map(); this.count = 0; for (const v of values) this.add(v); }
  add(v) { if (!this.parents.has(v)) { this.parents.set(v, v); this.ranks.set(v, 0); ++this.count; } }
  find(v) {
    if (!this.parents.has(v)) throw new ArgumentException('Vertex is not in the disjoint set.');
    let root = this.parents.get(v);
    while (!same(this.parents.get(root), root)) root = this.parents.get(root);
    while (!same(v, root)) { const next = this.parents.get(v); this.parents.set(v, root); v = next; }
    return root;
  }
  union(a, b) {
    a = this.find(a); b = this.find(b); if (same(a, b)) return false;
    if (this.ranks.get(a) < this.ranks.get(b)) [a, b] = [b, a];
    this.parents.set(b, a);
    if (this.ranks.get(a) === this.ranks.get(b)) this.ranks.set(a, this.ranks.get(a) + 1);
    --this.count; return true;
  }
}

// Same strict-less heap tie behavior as QuikGraph BinaryHeap, with indexed O(log n) updates.
class MinQueue {
  constructor(weight) { this.weight = weight; this.items = []; this.positions = new Map(); }
  get size() { return this.items.length; }
  has(v) { return this.positions.has(v); }
  swap(a, b) { [this.items[a], this.items[b]] = [this.items[b], this.items[a]]; this.positions.set(this.items[a].v, a); this.positions.set(this.items[b].v, b); }
  up(i) { while (i > 0) { const p = (i - 1) >> 1; if (!(this.items[i].w < this.items[p].w)) break; this.swap(i, p); i = p; } }
  down(i) { for (;;) { let s = i; const l = i * 2 + 1, r = l + 1; if (l < this.size && this.items[l].w < this.items[s].w) s = l; if (r < this.size && this.items[r].w < this.items[s].w) s = r; if (s === i) break; this.swap(i, s); i = s; } }
  push(v) { this.positions.set(v, this.size); this.items.push({ v, w: this.weight(v) }); this.up(this.size - 1); }
  pop() { const first = this.items[0]; if (!first) throw new InvalidOperationException('Heap is empty.'); const last = this.items.pop(); this.positions.delete(first.v); if (this.size) { this.items[0] = last; this.positions.set(last.v, 0); this.down(0); } return first.v; }
  update(v) { const i = this.positions.get(v); if (i === undefined) return this.push(v); const old = this.items[i].w; this.items[i].w = this.weight(v); this.items[i].w < old ? this.up(i) : this.down(i); }
}

function componentArguments(args) {
  if (args.length >= 3) return { host: args[0], graph: args[1], components: required(args[2], 'components') };
  return { host: null, graph: args[0], components: args.length === 2 ? required(args[1], 'components') : new Map() };
}

class ComponentsBase extends AlgorithmBase {
  constructor(...args) { const { host, graph, components } = componentArguments(args); super(host, graph); this.Components = components; this._componentMap = components instanceof Map ? components : new Map(); this.ComponentCount = 0; }
  Initialize() { super.Initialize(); this.Components.clear(); this._componentMap.clear(); this.ComponentCount = 0; }
  Clean() {
    // Caller-supplied native Maps keep their own identity semantics. Compute using
    // value equality, then expose their results with the graph's canonical keys.
    if (this.Components !== this._componentMap) for (const vertex of this.VisitedGraph.Vertices) if (this._componentMap.has(vertex)) this.Components.set(vertex, this._componentMap.get(vertex));
    super.Clean();
  }
  get Graphs() {
    const graphs = Array.from({ length: this.ComponentCount }, () => new BidirectionalGraph());
    for (const [v, i] of this._componentMap) graphs[i].AddVertex(v);
    for (const e of this.VisitedGraph.Edges) if (this._componentMap.get(e.Source) === this._componentMap.get(e.Target)) graphs[this._componentMap.get(e.Source)].AddEdge(e);
    return graphs;
  }
}

export class ConnectedComponentsAlgorithm extends ComponentsBase {
  InternalCompute() {
    const adjacent = adjacency(this.VisitedGraph, true);
    for (const start of this.VisitedGraph.Vertices) {
      this.ThrowIfCancellationRequested();
      if (this._componentMap.has(start)) continue;
      const component = this.ComponentCount++, pending = [start]; this._componentMap.set(start, component);
      while (pending.length) {
        this.ThrowIfCancellationRequested();
        const vertex = pending.pop();
        for (const edge of adjacent.get(vertex)) { const next = other(edge, vertex); if (!this._componentMap.has(next)) { this._componentMap.set(next, component); pending.push(next); } }
      }
    }
  }
}

export class WeaklyConnectedComponentsAlgorithm extends ConnectedComponentsAlgorithm {}

export class StronglyConnectedComponentsAlgorithm extends ComponentsBase {
  constructor(...args) { super(...args); this.Roots = new Map(); this.DiscoverTimes = new Map(); this.Steps = 0; this.ComponentsPerStep = null; this.VerticesPerStep = null; }
  Initialize() { super.Initialize(); this.Roots.clear(); this.DiscoverTimes.clear(); this.Steps = 0; this.ComponentsPerStep = []; this.VerticesPerStep = []; }
  InternalCompute() {
    const stack = [], pending = [], out = adjacency(this.VisitedGraph);
    const discover = vertex => {
      this.Roots.set(vertex, vertex); this._componentMap.set(vertex, 2147483647);
      this.ComponentsPerStep.push(this.ComponentCount); this.VerticesPerStep.push(vertex); ++this.Steps;
      this.DiscoverTimes.set(vertex, this.DiscoverTimes.size); stack.push(vertex); pending.push({ vertex, index: 0 });
    };
    for (const start of this.VisitedGraph.Vertices) {
      if (this.DiscoverTimes.has(start)) continue; discover(start);
      while (pending.length) {
        this.ThrowIfCancellationRequested();
        const frame = pending[pending.length - 1], list = out.get(frame.vertex);
        if (frame.index < list.length) { const next = list[frame.index++].Target; if (!this.DiscoverTimes.has(next)) discover(next); continue; }
        pending.pop();
        for (const edge of list) if (this._componentMap.get(edge.Target) === 2147483647) {
          const a = this.Roots.get(frame.vertex), b = this.Roots.get(edge.Target);
          if (this.DiscoverTimes.get(b) <= this.DiscoverTimes.get(a)) this.Roots.set(frame.vertex, b);
        }
        if (same(this.Roots.get(frame.vertex), frame.vertex)) {
          let vertex;
          do { vertex = stack.pop(); this._componentMap.set(vertex, this.ComponentCount); this.ComponentsPerStep.push(this.ComponentCount); this.VerticesPerStep.push(vertex); ++this.Steps; } while (!same(vertex, frame.vertex));
          ++this.ComponentCount;
        }
      }
    }
  }
}

export class IncrementalConnectedComponentsAlgorithm extends AlgorithmBase {
  constructor(...args) { super(...args); this._sets = null; this._subscriptions = []; }
  InternalCompute() {
    this._sets = new DisjointSets(this.VisitedGraph.Vertices);
    for (const edge of this.VisitedGraph.Edges) this._sets.union(edge.Source, edge.Target);
    if (this._subscriptions.length) return;
    const hook = (name, handler) => { this.VisitedGraph[name].add(handler); this._subscriptions.push([name, handler]); };
    hook('VertexAdded', v => this._sets.add(v));
    hook('EdgeAdded', e => this._sets.union(e.Source, e.Target));
    hook('VertexRemoved', () => { throw new InvalidOperationException('Vertex removal is not supported for incremental connected components.'); });
    hook('EdgeRemoved', () => { throw new InvalidOperationException('Edge removal is not supported for incremental connected components.'); });
  }
  get ComponentCount() { if (!this._sets) throw new InvalidOperationException('Run the algorithm before getting components.'); return this._sets.count; }
  GetComponents() {
    const count = this.ComponentCount, representatives = new Map(), components = new Map();
    for (const vertex of this.VisitedGraph.Vertices) { const root = this._sets.find(vertex); if (!representatives.has(root)) representatives.set(root, representatives.size); components.set(vertex, representatives.get(root)); }
    return { Key: count, Value: components };
  }
  Dispose() { for (const [name, handler] of this._subscriptions) this.VisitedGraph[name].remove(handler); this._subscriptions = []; }
}

export const TopologicalSortDirection = Object.freeze({ Forward: 0, Backward: 1 });

export class TopologicalSortAlgorithm extends AlgorithmBase {
  constructor(graph, capacity = -1) { super(graph); this.SortedVertices = null; this.DiscoverVertex = new EventHook(); this.FinishVertex = new EventHook(); }
  Initialize() { super.Initialize(); this.SortedVertices = null; }
  InternalCompute() {
    const colors = new Map(), sorted = [], out = adjacency(this.VisitedGraph, !!this._undirected);
    const discover = (v, parentEdge) => { colors.set(v, 1); this.DiscoverVertex.emit(v); return { v, index: 0, parentEdge, skippedParent: false }; };
    try {
      for (const start of this.VisitedGraph.Vertices) {
        if (colors.has(start)) continue;
        const stack = [discover(start)];
        while (stack.length) {
          this.ThrowIfCancellationRequested();
          const f = stack[stack.length - 1], list = out.get(f.v);
          if (f.index < list.length) {
            const edge = list[f.index++];
            if (this._undirected && edge === f.parentEdge && !f.skippedParent) { f.skippedParent = true; continue; }
            const next = this._undirected ? other(edge, f.v) : edge.Target, color = colors.get(next);
            if (color === undefined) stack.push(discover(next, edge));
            else if (color === 1 && !this.AllowCyclicGraph) throw new NonAcyclicGraphException();
          } else { stack.pop(); colors.set(f.v, 2); sorted.push(f.v); this.FinishVertex.emit(f.v); }
        }
      }
    } finally { this.SortedVertices = sorted.reverse(); }
  }
}

export class UndirectedTopologicalSortAlgorithm extends TopologicalSortAlgorithm {
  constructor(graph, capacity = -1) { super(graph, capacity); this._undirected = true; this.AllowCyclicGraph = false; }
}

export class SourceFirstTopologicalSortAlgorithm extends AlgorithmBase {
  constructor(graph, capacity = -1) { super(graph); this.SortedVertices = null; this.InDegrees = new Map(); this.VertexAdded = new EventHook(); this._direction = TopologicalSortDirection.Forward; }
  Initialize() {
    super.Initialize(); this.SortedVertices = null; this.InDegrees.clear();
    for (const v of this.VisitedGraph.Vertices) this.InDegrees.set(v, 0);
    for (const edge of this.VisitedGraph.Edges) {
      if (same(edge.Source, edge.Target)) throw new NonAcyclicGraphException();
      const next = this._direction === TopologicalSortDirection.Backward ? edge.Source : edge.Target;
      this.InDegrees.set(next, this.InDegrees.get(next) + 1);
    }
  }
  InternalCompute() {
    const backward = this._direction === TopologicalSortDirection.Backward, out = adjacency(this.VisitedGraph, false, backward), heap = new MinQueue(v => this.InDegrees.get(v)), sorted = [];
    for (const v of this.VisitedGraph.Vertices) heap.push(v);
    while (heap.size) {
      this.ThrowIfCancellationRequested();
      const v = heap.pop(); if (this.InDegrees.get(v) !== 0) throw new NonAcyclicGraphException(); sorted.push(v); this.VertexAdded.emit(v);
      for (const e of out.get(v)) { const next = backward ? e.Source : e.Target; this.InDegrees.set(next, this.InDegrees.get(next) - 1); heap.update(next); }
    }
    this.SortedVertices = sorted;
  }
}

export class SourceFirstBidirectionalTopologicalSortAlgorithm extends SourceFirstTopologicalSortAlgorithm {
  constructor(graph, direction = TopologicalSortDirection.Forward, capacity = -1) { super(graph, capacity); this._direction = direction === TopologicalSortDirection.Backward || direction === 'Backward' ? TopologicalSortDirection.Backward : TopologicalSortDirection.Forward; }
}

export class UndirectedFirstTopologicalSortAlgorithm extends AlgorithmBase {
  constructor(graph, capacity = -1) { super(graph); this.SortedVertices = null; this.Degrees = new Map(); this.AllowCyclicGraph = false; this.VertexAdded = new EventHook(); }
  Initialize() { super.Initialize(); this.SortedVertices = null; this.Degrees.clear(); }
  InternalCompute() {
    const adjacent = adjacency(this.VisitedGraph, true), heap = new MinQueue(v => this.Degrees.get(v)), sorted = [];
    if (!this.AllowCyclicGraph && edges(this.VisitedGraph).some(e => same(e.Source, e.Target))) throw new NonAcyclicGraphException();
    for (const [v, list] of adjacent) { this.Degrees.set(v, typeof this.VisitedGraph.AdjacentDegree === 'function' ? this.VisitedGraph.AdjacentDegree(v) : list.length); heap.push(v); }
    while (heap.size) {
      this.ThrowIfCancellationRequested();
      const v = heap.pop(), degree = this.Degrees.get(v); if (degree > 1 && !this.AllowCyclicGraph) throw new NonAcyclicGraphException();
      sorted.push(v); this.VertexAdded.emit(v);
      for (const e of adjacent.get(v)) if (!same(e.Source, e.Target)) { const next = other(e, v); this.Degrees.set(next, this.Degrees.get(next) - 1); if (heap.has(next)) heap.update(next); }
    }
    this.SortedVertices = sorted;
  }
}

class MinimumSpanningTreeBase extends AlgorithmBase {
  constructor(...args) { const hosted = args.length >= 3; super(hosted ? args[0] : null, hosted ? args[1] : args[0]); this._edgeWeights = required(hosted ? args[2] : args[1], 'edgeWeights'); this.ExamineEdge = new EventHook(); this.TreeEdge = new EventHook(); this.SpanningTree = []; }
  Initialize() { super.Initialize(); this.SpanningTree = []; }
  _add(edge) { this.SpanningTree.push(edge); this.TreeEdge.emit(edge); }
}

export class KruskalMinimumSpanningTreeAlgorithm extends MinimumSpanningTreeBase {
  InternalCompute() {
    const sets = new DisjointSets(this.VisitedGraph.Vertices), heap = new MinQueue(this._edgeWeights);
    for (const edge of this.VisitedGraph.Edges) heap.push(edge);
    while (heap.size) { this.ThrowIfCancellationRequested(); const edge = heap.pop(); this.ExamineEdge.emit(edge); if (sets.union(edge.Source, edge.Target)) this._add(edge); }
  }
}

export class PrimMinimumSpanningTreeAlgorithm extends MinimumSpanningTreeBase {
  InternalCompute() {
    const adjacent = adjacency(this.VisitedGraph, true), visited = new Set(), queued = new Set(), heap = new MinQueue(this._edgeWeights), count = adjacent.size;
    const visit = vertex => { visited.add(vertex); for (const edge of adjacent.get(vertex)) if (!queued.has(edge)) { queued.add(edge); heap.push(edge); } };
    for (const start of this.VisitedGraph.Vertices) {
      if (visited.has(start)) continue; visit(start);
      while (heap.size && visited.size < count) {
        this.ThrowIfCancellationRequested(); const edge = heap.pop(); this.ExamineEdge.emit(edge);
        const source = visited.has(edge.Source), target = visited.has(edge.Target);
        if (source !== target) { this._add(edge); visit(source ? edge.Target : edge.Source); }
      }
    }
  }
}

export class CondensedEdge extends Edge {
  constructor(source, target) { super(source, target); this.Edges = []; }
}

export class MergedEdge extends Edge {
  constructor(source, target) { super(source, target); this.Edges = []; }
  static Merge(inEdge, outEdge) { required(inEdge, 'inEdge'); required(outEdge, 'outEdge'); const result = new MergedEdge(inEdge.Source, outEdge.Target); result.Edges.push(...inEdge.Edges, ...outEdge.Edges); return result; }
}

export class CondensationGraphAlgorithm extends AlgorithmBase {
  constructor(graph, graphFactory = () => new BidirectionalGraph()) { super(graph); this.StronglyConnected = true; this.CondensedGraph = null; this.GraphFactory = required(graphFactory, 'graphFactory'); }
  InternalCompute() {
    this.CondensedGraph = new BidirectionalGraph(false);
    const algorithm = this.StronglyConnected ? new StronglyConnectedComponentsAlgorithm(this.VisitedGraph) : new WeaklyConnectedComponentsAlgorithm(this.VisitedGraph);
    algorithm.Compute(); const graphs = Array.from({ length: algorithm.ComponentCount }, () => this.GraphFactory());
    this.CondensedGraph.AddVertexRange(graphs);
    for (const vertex of this.VisitedGraph.Vertices) graphs[algorithm.Components.get(vertex)].AddVertex(vertex);
    const merged = new Map();
    for (const edge of this.VisitedGraph.Edges) {
      this.ThrowIfCancellationRequested(); const a = algorithm.Components.get(edge.Source), b = algorithm.Components.get(edge.Target);
      if (a === b) { graphs[a].AddEdge(edge); continue; }
      let row = merged.get(a); if (!row) merged.set(a, row = new Map());
      let condensed = row.get(b); if (!condensed) { condensed = new CondensedEdge(graphs[a], graphs[b]); row.set(b, condensed); this.CondensedGraph.AddEdge(condensed); }
      condensed.Edges.push(edge);
    }
  }
}

export class EdgeMergeCondensationGraphAlgorithm extends AlgorithmBase {
  constructor(graph, condensedGraph, vertexPredicate) { super(graph); this.CondensedGraph = required(condensedGraph, 'condensedGraph'); this.VertexPredicate = required(vertexPredicate, 'vertexPredicate'); }
  InternalCompute() {
    const filtered = [], graph = this.CondensedGraph;
    for (const vertex of this.VisitedGraph.Vertices) { graph.AddVertex(vertex); if (!this.VertexPredicate(vertex)) filtered.push(vertex); }
    for (const edge of this.VisitedGraph.Edges) { const merged = new MergedEdge(edge.Source, edge.Target); merged.Edges.push(edge); graph.AddEdge(merged); }
    for (const vertex of filtered) {
      this.ThrowIfCancellationRequested(); const incoming = Array.from(graph.InEdges(vertex)), outgoing = Array.from(graph.OutEdges(vertex)); graph.RemoveVertex(vertex);
      for (const a of incoming) if (!same(a.Source, vertex)) for (const b of outgoing) if (!same(b.Target, vertex)) graph.AddEdge(MergedEdge.Merge(a, b));
    }
  }
}

function transitive(algorithm, graph, reduce, factory) {
  // Both upstream transitive algorithms require a DAG. Snapshot before graph mutation.
  const sorter = new TopologicalSortAlgorithm(algorithm.VisitedGraph); sorter.Compute();
  graph.Clear(); graph.AddVertexRange(algorithm.VisitedGraph.Vertices); graph.AddEdgeRange(algorithm.VisitedGraph.Edges);
  const ancestors = new Map();
  for (const vertex of sorter.SortedVertices) {
    algorithm.ThrowIfCancellationRequested(); const predecessors = [], indirect = new Set();
    for (const edge of graph.InEdges(vertex)) { predecessors.push(edge.Source); for (const ancestor of ancestors.get(edge.Source)) indirect.add(ancestor); }
    for (const ancestor of indirect) {
      if (reduce) { const redundant = Array.from(graph.OutEdges(ancestor)).filter(e => same(e.Target, vertex)); for (const e of redundant) graph.RemoveEdge(e); }
      else if (!graph.ContainsEdge(ancestor, vertex)) graph.AddEdge(factory(ancestor, vertex));
    }
    for (const predecessor of predecessors) indirect.add(predecessor); ancestors.set(vertex, indirect);
  }
}

export class TransitiveClosureAlgorithm extends AlgorithmBase {
  constructor(graph, edgeFactory) { super(graph); this._createEdge = required(edgeFactory, 'edgeFactory'); this.TransitiveClosure = new BidirectionalGraph(); }
  InternalCompute() { transitive(this, this.TransitiveClosure, false, this._createEdge); }
}

export class TransitiveReductionAlgorithm extends AlgorithmBase {
  constructor(graph) { super(graph); this.TransitiveReduction = new BidirectionalGraph(); }
  InternalCompute() { transitive(this, this.TransitiveReduction, true); }
}

export class PageRankAlgorithm extends AlgorithmBase {
  constructor(graph) { super(graph); this.Ranks = new Map(); this._damping = 0.85; this._tolerance = 2 * Number.MIN_VALUE; this._maxIterations = 60; this.Iterations = 0; }
  get Damping() { return this._damping; }
  set Damping(value) { if (!(value >= 0 && value <= 1)) throw new ArgumentOutOfRangeException('Damping must be in [0,1].'); this._damping = value; }
  get Tolerance() { return this._tolerance; }
  set Tolerance(value) { if (!(value >= 0)) throw new ArgumentOutOfRangeException('Tolerance must be nonnegative.'); this._tolerance = value; }
  get MaxIterations() { return this._maxIterations; }
  set MaxIterations(value) { if (!Number.isInteger(value) || value <= 0) throw new ArgumentOutOfRangeException('MaxIterations must be a positive integer.'); this._maxIterations = value; }
  Initialize() { super.Initialize(); this.Ranks.clear(); this.Iterations = 0; const list = vertices(this.VisitedGraph); for (const v of list) this.Ranks.set(v, 1 / list.length); }
  InternalCompute() {
    const incoming = adjacency(this.VisitedGraph, false, true), outDegree = new Map(vertices(this.VisitedGraph).map(v => [v, 0]));
    for (const e of this.VisitedGraph.Edges) outDegree.set(e.Source, outDegree.get(e.Source) + 1);
    let error;
    do {
      this.ThrowIfCancellationRequested(); const nextRanks = new Map(); error = 0;
      for (const [vertex, rank] of this.Ranks) {
        this.ThrowIfCancellationRequested(); let sum = 0;
        for (const e of incoming.get(vertex)) sum += this.Ranks.get(e.Source) / outDegree.get(e.Source);
        const next = (1 - this.Damping) + this.Damping * sum; nextRanks.set(vertex, next); error += Math.abs(next - rank);
      }
      this.Ranks = nextRanks; ++this.Iterations;
    } while (error > this.Tolerance && this.Iterations < this.MaxIterations);
  }
  GetRanksSum() { let sum = 0; for (const value of this.Ranks.values()) sum += value; return sum; }
  GetRanksMean() { return this.GetRanksSum() / this.Ranks.size; }
}

// Value-keyed edge map preserves the equality semantics of SEquatableEdge pairs.
class VertexPairMap extends Map {
  constructor() { super(); this._keys = new Map(); }
  _key(pair) { return this._keys.get(pair?.Source)?.get(pair?.Target); }
  get(pair) { const key = this._key(pair); return key === undefined ? undefined : super.get(key); }
  has(pair) { const key = this._key(pair); return key !== undefined && super.has(key); }
  set(pair, value) { let row = this._keys.get(pair.Source); if (!row) this._keys.set(pair.Source, row = new Map()); let key = row.get(pair.Target); if (key === undefined) { key = pair; row.set(pair.Target, key); } super.set(key, value); return this; }
  delete(pair) { const key = this._key(pair); if (key === undefined) return false; this._keys.get(pair.Source).delete(pair.Target); return super.delete(key); }
  clear() { super.clear(); this._keys?.clear(); }
}

export class TarjanOfflineLeastCommonAncestorAlgorithm extends RootedAlgorithmBase {
  constructor(...args) { super(...args); this.Ancestors = new VertexPairMap(); this._pairs = undefined; }
  TryGetVertexPairs() { return this._pairs; }
  SetVertexPairs(pairs) {
    const list = Array.from(required(pairs, 'pairs'));
    if (!list.length) throw new ArgumentException('Must have at least one vertex pair.');
    for (const pair of list) if (!pair || !this.VisitedGraph.ContainsVertex(pair.Source) || !this.VisitedGraph.ContainsVertex(pair.Target)) throw new ArgumentException('All pairs vertices must be in the graph.');
    this._pairs = list;
  }
  Compute(...args) { if (args.length >= 2) { this.SetVertexPairs(args[1]); return super.Compute(args[0]); } return super.Compute(...args); }
  Initialize() { super.Initialize(); this.Ancestors.clear(); }
  InternalCompute() {
    const root = this.GetAndAssertRootInGraph(); if (!this._pairs) throw new InvalidOperationException('Pairs not set.');
    const out = adjacency(this.VisitedGraph), queries = new Map(), sets = new DisjointSets(), ancestor = new Map(), discovered = new Set(), finished = new Set();
    for (const pair of this._pairs) { for (const vertex of same(pair.Source, pair.Target) ? [pair.Source] : [pair.Source, pair.Target]) { let list = queries.get(vertex); if (!list) queries.set(vertex, list = []); list.push(pair); } }
    const discover = (v, parent) => { discovered.add(v); sets.add(v); ancestor.set(v, v); return { v, parent, index: 0 }; };
    const stack = [discover(root, undefined)];
    while (stack.length) {
      this.ThrowIfCancellationRequested(); const frame = stack[stack.length - 1], list = out.get(frame.v);
      if (frame.index < list.length) { const next = list[frame.index++].Target; if (!discovered.has(next)) stack.push(discover(next, frame.v)); continue; }
      stack.pop(); finished.add(frame.v);
      for (const pair of queries.get(frame.v) ?? []) { const next = other(pair, frame.v); if (finished.has(next)) this.Ancestors.set(pair, ancestor.get(sets.find(next))); }
      if (stack.length) { sets.union(frame.parent, frame.v); ancestor.set(sets.find(frame.parent), frame.parent); }
    }
  }
}

function randomIndex(rng, count) {
  required(rng, 'rng'); if (!Number.isInteger(count) || count <= 0) throw new ArgumentOutOfRangeException('Count must be a positive integer.');
  const value = typeof rng === 'function' ? Math.floor(rng() * count) : typeof rng.Next === 'function' ? rng.Next(count) : Math.floor(rng.next() * count);
  if (!Number.isInteger(value) || value < 0 || value >= count) throw new ArgumentOutOfRangeException('Random generator returned an out-of-range value.');
  return value;
}

function randomElement(items, count, rng) {
  required(items, 'items'); let index = randomIndex(rng, count); for (const value of items) if (index-- === 0) return value;
  throw new InvalidOperationException('Could not find a random element.');
}

export class RandomGraphFactory {
  static GetVertex(graphOrVertices, countOrRng, rng) { required(graphOrVertices, 'graph'); return arguments.length === 2 ? randomElement(graphOrVertices.Vertices, graphOrVertices.VertexCount, countOrRng) : randomElement(graphOrVertices, countOrRng, rng); }
  static GetEdge(graphOrEdges, countOrRng, rng) { required(graphOrEdges, 'graph'); return arguments.length === 2 ? randomElement(graphOrEdges.Edges, graphOrEdges.EdgeCount, countOrRng) : randomElement(graphOrEdges, countOrRng, rng); }
  static Create(graph, vertexFactory, edgeFactory, rng, vertexCount, edgeCount, selfEdges) {
    required(graph, 'graph'); required(vertexFactory, 'vertexFactory'); required(edgeFactory, 'edgeFactory'); required(rng, 'rng');
    if (!Number.isInteger(vertexCount) || vertexCount <= 0) throw new ArgumentOutOfRangeException('Must request at least one vertex.');
    if (!Number.isInteger(edgeCount) || edgeCount < 0) throw new ArgumentOutOfRangeException('Edge count must be nonnegative.');
    const list = []; for (let i = 0; i < vertexCount; ++i) { const v = vertexFactory(); graph.AddVertex(v); list.push(v); }
    const unique = Array.from(new Set(list)), n = unique.length;
    if (edgeCount && !selfEdges && n < 2) throw new ArgumentException('Cannot create non-self edges with fewer than two distinct vertices.');
    const parallel = graph.AllowParallelEdges !== false;
    if (!parallel) {
      const possible = graph.IsDirected ? n * (n - (selfEdges ? 0 : 1)) : n * (n - 1) / 2 + (selfEdges ? n : 0);
      const existing = new Set(); const ids = new Map(unique.map((v, i) => [v, i]));
      for (const e of graph.Edges) if (ids.has(e.Source) && ids.has(e.Target) && (selfEdges || !same(e.Source, e.Target))) { let a = ids.get(e.Source), b = ids.get(e.Target); if (!graph.IsDirected && a > b) [a, b] = [b, a]; existing.add(`${a}:${b}`); }
      if (edgeCount > possible - existing.size) throw new ArgumentException('Requested edge count exceeds the available distinct edges.');
    }
    let added = 0, failed = 0; const retryLimit = Math.max(64, Math.min(100000, n * n * 4));
    while (added < edgeCount) {
      let a = list[randomIndex(rng, list.length)], b = list[randomIndex(rng, list.length)];
      if ((selfEdges || !same(a, b)) && graph.AddEdge(edgeFactory(a, b))) { ++added; failed = 0; continue; }
      if (++failed < retryLimit) continue;
      // Degenerate RNGs and nearly full simple graphs cannot leave the browser hanging.
      let found = false;
      for (let i = 0; i < n && !found; ++i) for (let j = graph.IsDirected ? 0 : i; j < n && !found; ++j) {
        a = unique[i]; b = unique[j]; if (!selfEdges && same(a, b)) continue;
        if (!parallel && graph.ContainsEdge(a, b)) continue;
        if (graph.AddEdge(edgeFactory(a, b))) { ++added; failed = 0; found = true; }
      }
      if (!found) throw new InvalidOperationException('The factories cannot create the requested graph.');
    }
    return graph;
  }
}
