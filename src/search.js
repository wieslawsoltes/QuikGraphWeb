// QuikGraph searches: iterative traversal avoids the JavaScript recursion limit.
import { RootedAlgorithmBase, RootedSearchAlgorithmBase, GraphColor, DistanceRelaxers, AlgorithmHeap, events, algorithmError, requireValue } from './algorithm-base.js';
import { UndirectedEdgeEventArgs } from './core.js';
const { White, Gray, Black } = GraphColor;
function parseSearch(args) {
  args = [...args]; let host = null;
  if (args[0] == null || (args[0]?.Services && args[1]?.ContainsVertex)) host = args.shift();
  const graph = requireValue(args.shift(), 'visitedGraph'); if (typeof graph.ContainsVertex !== 'function') throw new TypeError('visitedGraph must implement ContainsVertex.');
  return { host, graph, args };
}
function color(map, vertex) { if (!map.has(vertex)) throw algorithmError('VertexNotFoundException', 'Vertex color not available.'); return map.get(vertex); }
function emitEdge(algorithm, name, edge, vertex) {
  if (algorithm._undirected && !(name === 'ExamineEdge' && algorithm instanceof BreadthFirstSearchAlgorithm)) algorithm[name].emit(algorithm, new UndirectedEdgeEventArgs(edge, Object.is(edge.Target, vertex)));
  else algorithm[name].emit(edge);
}
export class BreadthFirstSearchAlgorithm extends RootedAlgorithmBase {
  constructor(...input) {
    const { host, graph, args } = parseSearch(input); super(host, graph);
    this.VertexQueue = args[0] ?? null; this.VerticesColors = args[1] ?? new Map(); this.OutEdgesFilter = args[2] ?? (edges => edges);
    if (args.length && args[0] == null) throw new TypeError('vertexQueue cannot be null.');
    if (args.length > 1 && args[1] == null) throw new TypeError('verticesColors cannot be null.');
    if (args.length > 2 && args[2] == null) throw new TypeError('outEdgesFilter cannot be null.');
    events(this, 'InitializeVertex StartVertex DiscoverVertex ExamineVertex ExamineEdge TreeEdge NonTreeEdge GrayTarget BlackTarget FinishVertex');
  }
  GetVertexColor(vertex) { return color(this.VerticesColors, vertex); }
  Initialize() { this.ThrowIfCancellationRequested(); this.VerticesColors.clear(); for (const v of this.VisitedGraph.Vertices) { this.VerticesColors.set(v, White); this.InitializeVertex.emit(v); } }
  _edges(v) { return this.OutEdgesFilter(this._undirected ? this.VisitedGraph.AdjacentEdges(v) : this.VisitedGraph.OutEdges(v)); }
  InternalCompute() {
    if (this._undirected) return this._visit([this.GetAndAssertRootInGraph()]);
    if (this.VisitedGraph.VertexCount === 0) return;
    if (this._hasRoot) { this.AssertRootInGraph(this._root); return this._visit([this._root]); }
    const targets = new Set(Array.from(this.VisitedGraph.Edges, edge => edge.Target));
    this._visit(Array.from(this.VisitedGraph.Vertices).filter(v => !targets.has(v)));
  }
  Visit(root) { this.AssertRootInGraph(root); this._visit([root]); }
  _visit(roots) {
    const queue = this.VertexQueue; const items = []; let head = 0;
    const push = v => queue ? queue.Enqueue(v) : items.push(v);
    const pop = () => queue ? queue.Dequeue() : items[head++];
    const count = () => queue ? queue.Count : items.length - head;
    for (const root of roots) { this.StartVertex.emit(root); this.VerticesColors.set(root, Gray); this.DiscoverVertex.emit(root); push(root); }
    while (count()) {
      this.ThrowIfCancellationRequested(); const u = pop(); this.ExamineVertex.emit(u);
      for (const edge of this._edges(u)) {
        const v = this._undirected && Object.is(edge.Target, u) ? edge.Source : edge.Target;
        emitEdge(this, 'ExamineEdge', edge, u); const c = this.GetVertexColor(v);
        if (c === White) { emitEdge(this, 'TreeEdge', edge, u); this.VerticesColors.set(v, Gray); this.DiscoverVertex.emit(v); push(v); }
        else { emitEdge(this, 'NonTreeEdge', edge, u); emitEdge(this, c === Gray ? 'GrayTarget' : 'BlackTarget', edge, u); }
      }
      this.VerticesColors.set(u, Black); this.FinishVertex.emit(u);
    }
  }
}
export class UndirectedBreadthFirstSearchAlgorithm extends BreadthFirstSearchAlgorithm { constructor(...args) { super(...args); this._undirected = true; } }
export class DepthFirstSearchAlgorithm extends RootedAlgorithmBase {
  constructor(...input) {
    const { host, graph, args } = parseSearch(input); super(host, graph);
    this.VerticesColors = args[0] instanceof Map ? args[0] : new Map();
    this.OutEdgesFilter = args.find(a => typeof a === 'function') ?? (edges => edges);
    if (args.length && args[0] == null) throw new TypeError('verticesColors cannot be null.');
    if (args.length > 1 && args[1] == null) throw new TypeError('outEdgesFilter cannot be null.');
    this.AdjacentEdgesFilter = this.OutEdgesFilter; this.ProcessAllComponents = false; this._maxDepth = 2147483647;
    events(this, 'InitializeVertex StartVertex DiscoverVertex ExamineEdge TreeEdge BackEdge ForwardOrCrossEdge FinishVertex VertexMaxDepthReached');
  }
  get MaxDepth() { return this._maxDepth; }
  set MaxDepth(value) { if (!Number.isInteger(value) || value < 0) throw new RangeError('MaxDepth must be a non-negative integer.'); this._maxDepth = value; }
  GetVertexColor(vertex) { return this._implicit ? this.VerticesColors.get(vertex) ?? White : color(this.VerticesColors, vertex); }
  Initialize() { this.VerticesColors.clear(); if (!this._implicit) for (const v of this.VisitedGraph.Vertices) { this.VerticesColors.set(v, White); this.InitializeVertex.emit(v); } }
  *_edges(v) {
    if (this._undirected) yield* this.AdjacentEdgesFilter(this.VisitedGraph.AdjacentEdges(v));
    else { yield* this.OutEdgesFilter(this.VisitedGraph.OutEdges(v)); if (this._bidirectional) yield* this.VisitedGraph.InEdges(v); }
  }
  InternalCompute() {
    if (this._implicit && !this._hasRoot) this.GetAndAssertRootInGraph();
    if (this._hasRoot) { this.AssertRootInGraph(this._root); this.StartVertex.emit(this._root); this.Visit(this._root); if (!this.ProcessAllComponents) return; }
    for (const v of this.VisitedGraph.Vertices ?? []) { this.ThrowIfCancellationRequested(); if (this.GetVertexColor(v) === White) { this.StartVertex.emit(v); this.Visit(v); } }
  }
  Visit(root) {
    const visitedEdges = new Set(), stack = [];
    const enter = (v, depth) => { if ((this._implicit || this._bidirectional) && depth > this.MaxDepth) return; this.VerticesColors.set(v, Gray); this.DiscoverVertex.emit(v); stack.push({ v, depth, edges: this._edges(v)[Symbol.iterator]() }); };
    enter(root, 0);
    while (stack.length) {
      this.ThrowIfCancellationRequested(); const frame = stack[stack.length - 1];
      if (frame.depth > this.MaxDepth) { this.VertexMaxDepthReached.emit(frame.v); stack.pop(); this.VerticesColors.set(frame.v, Black); this.FinishVertex.emit(frame.v); continue; }
      const next = frame.edges.next();
      if (next.done) { stack.pop(); this.VerticesColors.set(frame.v, Black); this.FinishVertex.emit(frame.v); continue; }
      const edge = next.value;
      if (this._undirected) { if (visitedEdges.has(edge)) continue; visitedEdges.add(edge); }
      const v = (this._undirected || this._bidirectional) && Object.is(edge.Target, frame.v) ? edge.Source : edge.Target;
      emitEdge(this, 'ExamineEdge', edge, frame.v); const c = this.GetVertexColor(v);
      if (c === White) { emitEdge(this, 'TreeEdge', edge, frame.v); enter(v, frame.depth + 1); }
      else emitEdge(this, c === Gray ? 'BackEdge' : 'ForwardOrCrossEdge', edge, frame.v);
    }
  }
}
export class UndirectedDepthFirstSearchAlgorithm extends DepthFirstSearchAlgorithm { constructor(...args) { super(...args); this._undirected = true; } }
export class BidirectionalDepthFirstSearchAlgorithm extends DepthFirstSearchAlgorithm { constructor(...args) { super(...args); this._bidirectional = true; } }
export class ImplicitDepthFirstSearchAlgorithm extends DepthFirstSearchAlgorithm { constructor(...args) { super(...args); this._implicit = true; } }
export class EdgeDepthFirstSearchAlgorithm extends RootedAlgorithmBase {
  constructor(...input) {
    const { host, graph, args } = parseSearch(input); super(host, graph); this.EdgesColors = args[0] ?? new Map();
    this.ProcessAllComponents = false; this._maxDepth = 2147483647;
    events(this, 'InitializeEdge StartVertex StartEdge DiscoverTreeEdge TreeEdge BackEdge ForwardOrCrossEdge FinishEdge');
  }
  get MaxDepth() { return this._maxDepth; }
  set MaxDepth(value) { if (!Number.isInteger(value) || value < 0) throw new RangeError('MaxDepth must be a non-negative integer.'); this._maxDepth = value; }
  Initialize() { this.EdgesColors.clear(); if (!this._implicit) for (const edge of this.VisitedGraph.Edges) { this.EdgesColors.set(edge, White); this.InitializeEdge.emit(edge); } }
  InternalCompute() {
    if (this._implicit && !this._hasRoot) this.GetAndAssertRootInGraph();
    if (this._hasRoot) {
      this.AssertRootInGraph(this._root); this.StartVertex.emit(this._root);
      for (const edge of this.VisitedGraph.OutEdges(this._root)) if ((this.EdgesColors.get(edge) ?? White) === White) { this.StartEdge.emit(edge); this.Visit(edge); }
      if (!this.ProcessAllComponents) return;
    }
    for (const edge of this.VisitedGraph.Edges ?? []) if ((this.EdgesColors.get(edge) ?? White) === White) { this.StartEdge.emit(edge); this.Visit(edge); }
  }
  Visit(root) {
    const stack = [];
    const enter = (edge, depth) => { if (depth > this.MaxDepth) { if (!this._implicit) { this.EdgesColors.set(edge, Black); this.FinishEdge.emit(edge); } return; } this.EdgesColors.set(edge, Gray); this.TreeEdge.emit(edge); stack.push({ edge, depth, iterator: this.VisitedGraph.OutEdges(edge.Target)[Symbol.iterator]() }); };
    enter(root, 0);
    while (stack.length) {
      this.ThrowIfCancellationRequested(); const frame = stack[stack.length - 1], next = frame.depth > this.MaxDepth ? { done: true } : frame.iterator.next();
      if (next.done) { stack.pop(); this.EdgesColors.set(frame.edge, Black); this.FinishEdge.emit(frame.edge); continue; }
      const edge = next.value, c = this.EdgesColors.get(edge) ?? White;
      if (c === White) { this.DiscoverTreeEdge.emit(frame.edge, edge); enter(edge, frame.depth + 1); }
      else (c === Gray ? this.BackEdge : this.ForwardOrCrossEdge).emit(edge);
    }
  }
}
export class ImplicitEdgeDepthFirstSearchAlgorithm extends EdgeDepthFirstSearchAlgorithm { constructor(...args) { super(...args); this._implicit = true; } }
/** Best-first frontier search tracks edge operators and removes expanded nodes. */
export class BestFirstFrontierSearchAlgorithm extends RootedSearchAlgorithmBase {
  constructor(...input) {
    const { host, graph, args } = parseSearch(input); super(host, graph); this.Weights = requireValue(args[0], 'edgeWeights'); this.DistanceRelaxer = args.length > 1 ? requireValue(args[1], 'distanceRelaxer') : DistanceRelaxers.ShortestDistance;
    this.OperatorMaxCount = -1; events(this, 'TreeEdge');
  }
  InternalCompute() {
    const root = this.GetAndAssertRootInGraph(), target = this.TryGetTargetVertex();
    if (target === undefined) throw algorithmError('InvalidOperationException', 'Target vertex not set.');
    this.AssertRootInGraph(target); if (Object.is(root, target)) { this.OnTargetReached(); return; }
    const heap = new AlgorithmHeap((a, b) => this.DistanceRelaxer.Compare(a.priority, b.priority)), open = new Map([[root, 0]]), operators = new Map();
    const settled = new Set();
    heap.Enqueue({ vertex: root, priority: 0 }); for (const edge of this.VisitedGraph.OutEdges(root)) operators.set(edge, White);
    while (heap.Count) {
      this.ThrowIfCancellationRequested(); const { vertex, priority } = heap.Dequeue(); if (open.get(vertex) !== priority || settled.has(vertex)) continue; open.delete(vertex); settled.add(vertex);
      if (Object.is(vertex, target)) { this.OnTargetReached(); return; }
      for (const edge of this.VisitedGraph.OutEdges(vertex)) {
        if (Object.is(edge.Source, edge.Target) || settled.has(edge.Target)) continue;
        if (operators.get(edge) === Gray) { operators.delete(edge); continue; }
        const weight = this.Weights(edge); if (weight < 0) throw algorithmError('NegativeWeightException', 'Best-first search requires non-negative weights.');
        const cost = this.DistanceRelaxer.Combine(priority, weight); operators.set(edge, Gray);
        if (!open.has(edge.Target) || this.DistanceRelaxer.Compare(cost, open.get(edge.Target)) < 0) { open.set(edge.Target, cost); heap.Enqueue({ vertex: edge.Target, priority: cost }); this.TreeEdge.emit(edge); }
      }
      this.OperatorMaxCount = Math.max(this.OperatorMaxCount, operators.size);
      for (const edge of this.VisitedGraph.InEdges(vertex)) if (operators.get(edge) === Gray) operators.delete(edge);
    }
  }
}
