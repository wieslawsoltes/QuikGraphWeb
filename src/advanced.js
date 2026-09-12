/** Advanced algorithms ported from QuikGraph (MS-PL); see NOTICE. */
import { Edge, BidirectionalGraph, EventHook, equals, VertexNotFoundException, NegativeCapacityException, ArgumentNullException, ArgumentException, InvalidOperationException } from './core.js';
import { AlgorithmBase, RootedAlgorithmBase, ComputationState } from './algorithm-base.js';
import { ShortestPathAlgorithmBase } from './shortest-paths.js';

const required = (v, name = 'argument') => { if (v == null) throw new ArgumentNullException(`${name} must not be null`); return v; };
const events = (object, names) => { for (const name of names.split(' ')) object[name] = new EventHook(); };
const vertices = graph => [...graph.Vertices];
const edges = graph => [...graph.Edges];
const other = (edge, vertex) => Object.is(edge.Source, vertex) || edge.Source === vertex ? edge.Target : edge.Source;
const out = (graph, vertex) => [...(graph.IsDirected === false ? graph.AdjacentEdges(vertex) : graph.OutEdges(vertex))];
const incoming = (graph, vertex) => graph.InEdges ? [...graph.InEdges(vertex)] : edges(graph).filter(e => e.Target === vertex);
const random = rng => typeof rng === 'function' ? rng() : rng.NextDouble();
const edgeFactory = (source, target) => new Edge(source, target);
const assertVertex = (graph, vertex) => { required(vertex, 'vertex'); if (!graph.ContainsVertex(vertex)) throw new VertexNotFoundException('Vertex is not part of the graph'); };
const parseHost = args => args.length > 1 && args[1]?.Vertices !== undefined && args[0]?.Vertices === undefined ? [args[0], ...args.slice(1)] : [null, ...args];
const simpleAdjacency = graph => {
  const a = new Map(vertices(graph).map(v => [v, new Set()]));
  for (const e of graph.Edges) if (e.Source !== e.Target) { a.get(e.Source).add(e.Target); a.get(e.Target).add(e.Source); }
  return a;
};

export class ReversedEdgeAugmentorAlgorithm {
  constructor(graph, factory = edgeFactory) {
    this.VisitedGraph = required(graph); this.EdgeFactory = required(factory);
    this.ReversedEdges = new Map(); this._augmented = []; this.Augmented = false;
    events(this, 'ReversedEdgeAdded');
  }
  get AugmentedEdges() { return this._augmented.slice(); }
  AddReversedEdges() {
    if (this.Augmented) throw new InvalidOperationException('Graph already augmented');
    const originals = edges(this.VisitedGraph);
    for (const e of originals) {
      if (this.ReversedEdges.has(e)) continue;
      let reverse = out(this.VisitedGraph, e.Target).find(r => r.Target === e.Source && !this.ReversedEdges.has(r));
      if (!reverse) {
        reverse = this.EdgeFactory(e.Target, e.Source);
        if (!this.VisitedGraph.AddEdge(reverse)) {
          // Nonparallel graphs may share a reverse residual arc; callers retain individual flows.
          reverse = out(this.VisitedGraph, e.Target).find(r => r.Target === e.Source);
          if (!reverse) throw new InvalidOperationException('Cannot add reversed edge');
        } else { this._augmented.push(reverse); this.ReversedEdgeAdded.emit(reverse); }
      }
      this.ReversedEdges.set(e, reverse);
      if (!this.ReversedEdges.has(reverse)) this.ReversedEdges.set(reverse, e);
    }
    this.Augmented = true;
  }
  RemoveReversedEdges() {
    if (!this.Augmented) throw new InvalidOperationException('Graph is not augmented');
    for (const e of this._augmented) this.VisitedGraph.RemoveEdge(e);
    this._augmented.length = 0; this.ReversedEdges.clear(); this.Augmented = false;
  }
  Dispose() { if (this.Augmented) this.RemoveReversedEdges(); }
}

export class MaximumFlowAlgorithm extends AlgorithmBase {
  constructor(...args) {
    const [host, graph, capacities, factory = edgeFactory] = parseHost(args); super(host, graph);
    this.Capacities = required(capacities); this.EdgeFactory = required(factory);
    this.Predecessors = new Map(); this.ResidualCapacities = new Map(); this.ReversedEdges = new Map();
    this.VerticesColors = new Map(); this.MaxFlow = 0; this.Source = undefined; this.Sink = undefined;
  }
  GetVertexColor(vertex) { required(vertex); if (!this.VerticesColors.has(vertex)) throw new VertexNotFoundException('Vertex color is not available'); return this.VerticesColors.get(vertex); }
  Compute(source, sink) {
    if (arguments.length) { required(source); required(sink); this.Source = source; this.Sink = sink; }
    super.Compute(); return this.MaxFlow;
  }
}

export class EdmondsKarpMaximumFlowAlgorithm extends MaximumFlowAlgorithm {
  constructor(...args) {
    const [host, graph, capacities, factory = edgeFactory, reverser] = parseHost(args);
    super(host, graph, capacities, factory);
    this._reverser = reverser;
    if (parseHost(args).length >= 5) required(reverser, 'reverseEdgesAugmentorAlgorithm');
    if (reverser && reverser.VisitedGraph !== graph) throw new ArgumentException('Reverser must target the same graph');
    if (reverser) this.ReversedEdges = reverser.ReversedEdges;
    this.Flows = new Map();
  }
  Initialize() {
    if (this._reverser && !this._reverser.Augmented) throw new InvalidOperationException('Call AddReversedEdges before computing maximum flow');
    if(this.Source==null||this.Sink==null)throw new InvalidOperationException('Source and sink must be specified');
    assertVertex(this.VisitedGraph, this.Source); assertVertex(this.VisitedGraph, this.Sink);
    if (this.Source === this.Sink) throw new InvalidOperationException('Source and sink must differ');
    this.Predecessors.clear(); this.ResidualCapacities.clear(); this.VerticesColors.clear(); this.Flows.clear(); this.MaxFlow = 0;
  }
  InternalCompute() {
    // Dedicated reverse arcs preserve conservation with antiparallel and parallel edges.
    const adjacency = new Map(vertices(this.VisitedGraph).map(v => [v, []]));
    const arcs = new Map();
    for (const e of this.VisitedGraph.Edges) {
      const capacity = this.Capacities instanceof Map ? this.Capacities.get(e) : this.Capacities(e);
      if (typeof capacity !== 'number' || Number.isNaN(capacity) || capacity < 0) throw new NegativeCapacityException('Negative or invalid capacity');
      const forward = { to: e.Target, from: e.Source, residual: capacity, edge: e, forward: true };
      const reverse = { to: e.Source, from: e.Target, residual: 0, edge: e, forward: false };
      forward.reverse = reverse; reverse.reverse = forward; adjacency.get(e.Source).push(forward); adjacency.get(e.Target).push(reverse);
      arcs.set(e, forward); this.Flows.set(e, 0);
    }
    for (;;) {
      this.ThrowIfCancellationRequested();
      const seen = new Set([this.Source]), pred = new Map(), queue = [this.Source];
      for (let head = 0; head < queue.length && !seen.has(this.Sink); ++head) {
        for (const arc of adjacency.get(queue[head])) if (arc.residual > 0 && !seen.has(arc.to)) {
          seen.add(arc.to); pred.set(arc.to, arc); queue.push(arc.to);
        }
      }
      for (const [v, arc] of pred) this.Predecessors.set(v, arc.forward ? arc.edge : this.ReversedEdges.get(arc.edge) ?? this.EdgeFactory(arc.from, arc.to));
      for (const v of adjacency.keys()) this.VerticesColors.set(v, seen.has(v) ? 2 : 0);
      if (!seen.has(this.Sink)) break;
      let delta = Infinity;
      for (let v = this.Sink; v !== this.Source;) { const arc = pred.get(v); delta = Math.min(delta, arc.residual); v = arc.from; }
      if (!Number.isFinite(delta)) throw new RangeError('Maximum flow is unbounded');
      for (let v = this.Sink; v !== this.Source;) {
        const arc = pred.get(v); arc.residual -= delta; arc.reverse.residual += delta;
        this.Flows.set(arc.edge, this.Flows.get(arc.edge) + (arc.forward ? delta : -delta)); v = arc.from;
      }
      this.MaxFlow += delta;
    }
    for (const [e, arc] of arcs) {
      const reverse = this.ReversedEdges.get(e);
      this.ResidualCapacities.set(e, arc.residual + (reverse && reverse !== e ? this.Flows.get(reverse) ?? 0 : 0));
    }
  }
}

export class GraphAugmentorAlgorithmBase extends AlgorithmBase {
  constructor(...args) {
    const [host, graph, vertexFactory, factory = edgeFactory] = parseHost(args); super(host, graph);
    this.VertexFactory = required(vertexFactory); this.EdgeFactory = required(factory);
    this.SuperSource = undefined; this.SuperSink = undefined; this.Augmented = false; this._augmented = [];
    events(this, 'SuperSourceAdded SuperSinkAdded EdgeAdded');
  }
  get AugmentedEdges() { return this._augmented.slice(); }
  InternalCompute() {
    if (this.Augmented) throw new InvalidOperationException('Graph already augmented');
    this._originalVertices = vertices(this.VisitedGraph);
    this.SuperSource = required(this.VertexFactory()); this.SuperSink = required(this.VertexFactory());
    if (this.SuperSource === this.SuperSink || this.VisitedGraph.ContainsVertex(this.SuperSource) || this.VisitedGraph.ContainsVertex(this.SuperSink)) throw new InvalidOperationException('Vertex factory must produce fresh vertices');
    this.VisitedGraph.AddVertex(this.SuperSource); this.SuperSourceAdded.emit(this.SuperSource);
    this.VisitedGraph.AddVertex(this.SuperSink); this.SuperSinkAdded.emit(this.SuperSink); this.Augmented = true;
    try { this.AugmentGraph(); } catch (error) { this.Rollback(); throw error; }
  }
  AddAugmentedEdge(source, target) {
    const e = this.EdgeFactory(source, target);
    // Upstream records factory output even when a simple graph already has this connector.
    this.VisitedGraph.AddEdge(e);
    this._augmented.push(e); this.EdgeAdded.emit(e); return e;
  }
  AugmentGraph() { throw new InvalidOperationException('AugmentGraph must be implemented'); }
  Rollback() {
    if (!this.Augmented) return;
    this.VisitedGraph.RemoveVertex(this.SuperSource); this.VisitedGraph.RemoveVertex(this.SuperSink);
    this.SuperSource = this.SuperSink = undefined; this._augmented.length = 0; this.Augmented = false;
  }
  Dispose() { this.Rollback(); }
}

export class AllVerticesGraphAugmentorAlgorithm extends GraphAugmentorAlgorithmBase {
  AugmentGraph() {
    for (const vertex of this.VisitedGraph.Vertices) {
      this.ThrowIfCancellationRequested(); this.AddAugmentedEdge(this.SuperSource, vertex); this.AddAugmentedEdge(vertex, this.SuperSink);
    }
  }
}
export class MultiSourceSinkGraphAugmentorAlgorithm extends GraphAugmentorAlgorithmBase {
  AugmentGraph() {
    for (const v of this.VisitedGraph.Vertices) {
      this.ThrowIfCancellationRequested();
      if (!incoming(this.VisitedGraph, v).length) this.AddAugmentedEdge(this.SuperSource, v);
      if (!out(this.VisitedGraph, v).length) this.AddAugmentedEdge(v, this.SuperSink);
    }
  }
}
export class BipartiteToMaximumFlowGraphAugmentorAlgorithm extends GraphAugmentorAlgorithmBase {
  constructor(...args) {
    const [host, graph, left, right, vertexFactory, factory = edgeFactory] = parseHost(args);
    super(host, graph, vertexFactory, factory); this.SourceToVertices = required(left); this.VerticesToSink = required(right);
  }
  AugmentGraph() {
    for (const v of this.SourceToVertices) { assertVertex(this.VisitedGraph, v); this.AddAugmentedEdge(this.SuperSource, v); }
    for (const v of this.VerticesToSink) { assertVertex(this.VisitedGraph, v); this.AddAugmentedEdge(v, this.SuperSink); }
  }
}

export class GraphBalancerAlgorithm {
  constructor(graph, source, sink, vertexFactory, factory = edgeFactory, capacities) {
    this.VisitedGraph = required(graph); required(source);required(sink);
    if(!graph.ContainsVertex(source)||!graph.ContainsVertex(sink))throw new ArgumentException('Source and sink must be in the graph');
    this.Source = source; this.Sink = sink; this.VertexFactory = required(vertexFactory); this.EdgeFactory = required(factory);
    this.Capacities = arguments.length >= 6 ? required(capacities, 'capacities') : new Map(edges(graph).map(e => [e, Number.MAX_VALUE]));
    this._preFlow = new Map(edges(graph).map(e => [e, 1])); this.Balanced = false;
    this.SurplusVertices = []; this.DeficientVertices = []; this.SurplusEdges = []; this.DeficientEdges = [];
    events(this, 'BalancingSourceAdded BalancingSinkAdded EdgeAdded SurplusVertexAdded DeficientVertexAdded');
  }
  GetBalancingIndex(v) {
    assertVertex(this.VisitedGraph, v);
    return out(this.VisitedGraph, v).reduce((s,e) => s + (this._preFlow.get(e) ?? 0), 0) - incoming(this.VisitedGraph, v).reduce((s,e) => s + (this._preFlow.get(e) ?? 0), 0);
  }
  Balance() {
    if (this.Balanced) throw new InvalidOperationException('Graph already balanced');
    const indexes = new Map(vertices(this.VisitedGraph).map(v => [v, this.GetBalancingIndex(v)]));
    this.BalancingSource = this.VertexFactory(); this.BalancingSink = this.VertexFactory();
    if (this.BalancingSource === this.BalancingSink || this.VisitedGraph.ContainsVertex(this.BalancingSource) || this.VisitedGraph.ContainsVertex(this.BalancingSink)) throw new InvalidOperationException('Vertex factory must produce fresh vertices');
    this.VisitedGraph.AddVertex(this.BalancingSource); this.BalancingSourceAdded.emit(this.Source);
    this.VisitedGraph.AddVertex(this.BalancingSink); this.BalancingSinkAdded.emit(this.Sink);
    const add = (s,t,c) => { const e = this.EdgeFactory(s,t); this.VisitedGraph.AddEdge(e); this.Capacities.set(e,c); this._preFlow.set(e,0); this.EdgeAdded.emit(e); return e; };
    this.BalancingSourceEdge = add(this.BalancingSource,this.Source,Number.MAX_VALUE);
    this.BalancingSinkEdge = add(this.Sink,this.BalancingSink,Number.MAX_VALUE);
    for (const [v,index] of indexes) if (v !== this.Source && v !== this.Sink && index !== 0) {
      if (index < 0) {
        this.SurplusVertices.push(v); this.SurplusVertexAdded.emit(v); this.SurplusEdges.push(add(this.BalancingSource,v,-index));
      } else {
        this.DeficientVertices.push(v); this.DeficientVertexAdded.emit(v); this.DeficientEdges.push(add(v,this.BalancingSink,index));
      }
    }
    this.Balanced = true;
  }
  UnBalance() {
    if (!this.Balanced) throw new InvalidOperationException('Graph is not balanced');
    for (const e of [...this.SurplusEdges,...this.DeficientEdges,this.BalancingSourceEdge,this.BalancingSinkEdge]) {
      this.VisitedGraph.RemoveEdge(e); this.Capacities.delete(e); this._preFlow.delete(e);
    }
    this.VisitedGraph.RemoveVertex(this.BalancingSource); this.VisitedGraph.RemoveVertex(this.BalancingSink);
    this.BalancingSource = this.BalancingSink = this.BalancingSourceEdge = this.BalancingSinkEdge = undefined;
    this.SurplusVertices.length = this.DeficientVertices.length = this.SurplusEdges.length = this.DeficientEdges.length = 0; this.Balanced = false;
  }
}

export class MaximumBipartiteMatchingAlgorithm extends AlgorithmBase {
  constructor(graph, left, right, vertexFactory = () => Symbol('vertex'), factory = edgeFactory) {
    super(graph); this.SourceToVertices = required(left); this.VerticesToSink = required(right);
    this.VertexFactory = required(vertexFactory); this.EdgeFactory = required(factory); this._matchedEdges = [];
  }
  get MatchedEdges() { return this._matchedEdges.slice(); }
  Initialize() { this._matchedEdges = []; }
  InternalCompute() {
    const left = new Set(this.SourceToVertices), right = new Set(this.VerticesToSink);
    for (const v of [...left,...right]) assertVertex(this.VisitedGraph,v);
    for (const v of left) if (right.has(v)) throw new InvalidOperationException('Bipartite vertex sets must be disjoint');
    const adjacency = new Map([...left].map(v => [v,[]]));
    for (const e of this.VisitedGraph.Edges) {
      if (left.has(e.Source) && right.has(e.Target)) adjacency.get(e.Source).push([e.Target,e]);
      else if (left.has(e.Target) && right.has(e.Source)) adjacency.get(e.Target).push([e.Source,e]);
    }
    // Hopcroft-Karp: simultaneous shortest augmenting paths, O(E sqrt(V)).
    const pairL = new Map(), pairR = new Map(), chosen = new Map(), distance = new Map();
    for (;;) {
      this.ThrowIfCancellationRequested(); const q = []; let reachable = false;
      for (const u of left) { distance.set(u, pairL.has(u) ? Infinity : 0); if (!pairL.has(u)) q.push(u); }
      for (let h=0; h<q.length; ++h) for (const [v] of adjacency.get(q[h])) {
        if (!pairR.has(v)) reachable = true;
        else { const next = pairR.get(v); if (distance.get(next) === Infinity) { distance.set(next,distance.get(q[h])+1); q.push(next); } }
      }
      if (!reachable) break;
      const augment = u => {
        for (const [v,e] of adjacency.get(u)) {
          const paired = pairR.get(v);
          if (!pairR.has(v) || (distance.get(paired) === distance.get(u)+1 && augment(paired))) {
            pairL.set(u,v); pairR.set(v,u); chosen.set(u,e); return true;
          }
        }
        distance.set(u,Infinity); return false;
      };
      let count = 0; for (const u of left) if (!pairL.has(u) && augment(u)) ++count;
      if (!count) break;
    }
    this._matchedEdges = [...chosen.values()];
  }
}

export const HungarianSteps = Object.freeze({ Init:0, Step1:1, Step2:2, Step3:3, Step4:4, End:5 });
export class HungarianIteration {
  constructor(matrix, mask, rowsCovered, columnsCovered, step) {
    this.Matrix = matrix; this.Mask = mask; this.RowsCovered = rowsCovered; this.ColumnsCovered = columnsCovered; this.Step = step;
  }
}
export class HungarianAlgorithm {
  static Steps = HungarianSteps;
  constructor(costs) {
    required(costs); if (!Array.isArray(costs)) throw new TypeError('Costs must be a matrix of rows');
    this._height = costs.length; this._width = costs[0]?.length ?? 0;
    if (costs.some(row => row.length !== this._width || row.some(x => !Number.isFinite(x)))) throw new RangeError('Costs must be a rectangular finite matrix');
    if (this._height > this._width) throw new RangeError('Assignment requires at least as many tasks as agents');
    this._costs = costs; this._step = 0; this.AgentsTasks = undefined;
  }
  Compute() { while (this._doStep() !== HungarianSteps.End) { /* run every assignment step */ } return this.AgentsTasks; }
  *GetIterations() {
    let step;
    do { step = this._doStep(); yield new HungarianIteration(this._costs.map(r=>r.slice()),this._mask.map(r=>r.slice()),this._rows.slice(),this._cols.slice(),step); } while (step !== HungarianSteps.End);
  }
  _doStep() {
    const oldStep = this._step, h=this._height,w=this._width,c=this._costs;
    if (oldStep === 0) {
      this._mask = Array.from({length:h},()=>Array(w).fill(0)); this._rows = Array(h).fill(false); this._cols = Array(w).fill(false);
      for (let i=0;i<h;++i) { const min=Math.min(...c[i]); for(let j=0;j<w;++j)c[i][j]-=min; }
      for(let i=0;i<h;++i)for(let j=0;j<w;++j)if(c[i][j]===0&&!this._rows[i]&&!this._cols[j]) {this._mask[i][j]=1;this._rows[i]=true;this._cols[j]=true;}
      this._rows.fill(false);this._cols.fill(false);this._step=1;
    } else if(oldStep===1) {
      for(let i=0;i<h;++i)for(let j=0;j<w;++j)if(this._mask[i][j]===1)this._cols[j]=true;
      this._step=this._cols.filter(Boolean).length===h?5:2;
    } else if(oldStep===2) {
      let location;
      outer:for(let i=0;i<h;++i)if(!this._rows[i])for(let j=0;j<w;++j)if(!this._cols[j]&&c[i][j]===0){location=[i,j];break outer;}
      if(!location)this._step=4;
      else {
        const [i,j]=location;this._mask[i][j]=2;const star=this._mask[i].indexOf(1);
        if(star>=0){this._rows[i]=true;this._cols[star]=false;}else{this._start=location;this._step=3;}
      }
    } else if(oldStep===3) {
      const path=[this._start];
      for(;;){const j=path.at(-1)[1],i=this._mask.findIndex(row=>row[j]===1);if(i<0)break;path.push([i,j]);path.push([i,this._mask[i].indexOf(2)]);}
      for(const [i,j] of path)this._mask[i][j]=this._mask[i][j]===1?0:1;
      this._rows.fill(false);this._cols.fill(false);for(const row of this._mask)for(let j=0;j<w;++j)if(row[j]===2)row[j]=0;
      this._step=1;
    } else if(oldStep===4) {
      let min=Infinity;for(let i=0;i<h;++i)if(!this._rows[i])for(let j=0;j<w;++j)if(!this._cols[j])min=Math.min(min,c[i][j]);
      if(!Number.isFinite(min))throw new InvalidOperationException('No feasible assignment');
      for(let i=0;i<h;++i)for(let j=0;j<w;++j){if(this._rows[i])c[i][j]+=min;if(!this._cols[j])c[i][j]-=min;}
      this._step=2;
    } else this.AgentsTasks=this._mask.map(row=>row.indexOf(1));
    return oldStep;
  }
}

export class Partition {
  constructor(vertexSetA, vertexSetB, cutCost) { this.VertexSetA = new Set(required(vertexSetA)); this.VertexSetB = new Set(required(vertexSetB)); this.CutCost = cutCost; }
  static AreEquivalent(a,b) {
    const same=(x,y)=>x.size===y.size&&[...x].every(v=>y.has(v));
    return (same(a.VertexSetA,b.VertexSetA)&&same(a.VertexSetB,b.VertexSetB))||(same(a.VertexSetA,b.VertexSetB)&&same(a.VertexSetB,b.VertexSetA));
  }
}
export const PartitionHelpers = Object.freeze({AreEquivalent:Partition.AreEquivalent});
/** TSP work-item ordering, exposed for the upstream internal priority tests. */
export class TaskPriority {
  constructor(cost,pathSize){this._cost=cost;this._pathSize=pathSize;}
  Equals(other){return other instanceof TaskPriority&&(this._cost===other._cost||Number.isNaN(this._cost)&&Number.isNaN(other._cost))&&this._pathSize===other._pathSize;}
  CompareTo(other){if(other==null)return 1;let order=0;if(this._cost!==other._cost){if(Number.isNaN(this._cost))order=Number.isNaN(other._cost)?0:-1;else if(Number.isNaN(other._cost))order=1;else order=this._cost<other._cost?-1:1;}return order||(other._pathSize<this._pathSize?-1:other._pathSize>this._pathSize?1:0);}
  GetHashCode(){const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,this._cost===0?0:this._cost);return Math.imul(view.getInt32(0)^view.getInt32(4),397)^this._pathSize;}
}
export class KernighanLinAlgorithm extends AlgorithmBase {
  constructor(graph, nbIterations = 10) { super(graph); this._iterations = nbIterations; this.Partition = undefined; }
  InternalCompute() {
    const vs=vertices(this.VisitedGraph),a=new Set(vs.slice(0,Math.floor(vs.length/2))),b=new Set(vs.slice(Math.floor(vs.length/2)));
    const weights=new Map(vs.map(v=>[v,new Map()]));
    for(const e of this.VisitedGraph.Edges)if(e.Source!==e.Target){const w=Number(e.Tag??1);if(!Number.isFinite(w))throw new RangeError('Weight must be finite');for(const [u,v]of[[e.Source,e.Target],[e.Target,e.Source]])weights.get(u).set(v,(weights.get(u).get(v)??0)+w);}
    const cost=()=>edges(this.VisitedGraph).reduce((s,e)=>s+(a.has(e.Source)!==a.has(e.Target)?Number(e.Tag??1):0),0);
    for(let iteration=0;iteration<this._iterations;++iteration){
      this.ThrowIfCancellationRequested();const freeA=new Set(a),freeB=new Set(b),swaps=[];let total=0,best=0,bestCount=0;
      const d=v=>[...weights.get(v)].reduce((sum,[n,w])=>sum+(a.has(v)===a.has(n)?-w:w),0);
      while(freeA.size&&freeB.size){let chosen,gain=-Infinity;for(const x of freeA)for(const y of freeB){const g=d(x)+d(y)-2*(weights.get(x).get(y)??0);if(g>gain){gain=g;chosen=[x,y];}}
        const [x,y]=chosen;freeA.delete(x);freeB.delete(y);a.delete(x);a.add(y);b.delete(y);b.add(x);swaps.push(chosen);total+=gain;if(total>best){best=total;bestCount=swaps.length;}
      }
      for(let i=swaps.length-1;i>=bestCount;--i){const[x,y]=swaps[i];a.delete(y);a.add(x);b.delete(x);b.add(y);}
      if(best<=0)break;
    }
    this.Partition=new Partition(a,b,cost());
  }
}

export class TSP extends ShortestPathAlgorithmBase {
  constructor(graph, weights) { super(graph,weights);this.BestCost=Infinity;this.ResultPath=undefined;this.VerticesColors=null; }
  Initialize(){this.Distances=new Map();this.Predecessors=new Map();this.BestCost=Infinity;this.ResultPath=undefined;}
  TryGetDistance(vertex){required(vertex);if(this.State===ComputationState.NotRunning)throw new InvalidOperationException('Algorithm has not computed');return undefined;}
  /** @returns {never} */
  GetVertexColor(vertex){required(vertex);throw new VertexNotFoundException('TSP does not compute vertex colors');}
  InternalCompute(){
    const vs=vertices(this.VisitedGraph),n=vs.length;if(!n)return;
    const index=new Map(vs.map((v,i)=>[v,i])),adj=Array.from({length:n},()=>new Map());
    for(const e of this.VisitedGraph.Edges){const i=index.get(e.Source),j=index.get(e.Target),weight=this.Weights(e);if(!Number.isFinite(weight))throw new RangeError('TSP weights must be finite');if(!adj[i].has(j)||adj[i].get(j).weight>weight)adj[i].set(j,{edge:e,weight});}
    if(n===1){const e=adj[0].get(0);if(e)this._save([e.edge],e.weight,vs);return;}
    const root=this.TryGetRootVertex(),start=root===undefined?0:index.get(root);if(start===undefined)throw new InvalidOperationException('Root is not part of graph');
    // Exact branch-and-bound with admissible outgoing-edge relaxation. No size cutoff or heuristic result.
    const used=new Uint8Array(n),path=[],minimum=adj.map(row=>Math.min(...[...row.values()].map(e=>e.weight)));used[start]=1;
    const search=(u,count,cost)=>{
      this.ThrowIfCancellationRequested();
      if(count===n){const closing=adj[u].get(start);if(closing&&cost+closing.weight<this.BestCost)this._save([...path,closing.edge],cost+closing.weight,vs);return;}
      let bound=cost+minimum[u];for(let i=0;i<n;++i)if(!used[i])bound+=minimum[i];if(bound>=this.BestCost)return;
      const candidates=[...adj[u]].filter(([v])=>!used[v]).sort((a,b)=>a[1].weight-b[1].weight);
      for(const[v,arc]of candidates){used[v]=1;path.push(arc.edge);search(v,count+1,cost+arc.weight);path.pop();used[v]=0;}
    };
    search(start,1,0);
  }
  _save(path,cost,vs){this.BestCost=cost;this.ResultPath=new BidirectionalGraph(true);this.ResultPath.AddVertexRange(vs);this.ResultPath.AddEdgeRange(path);}
}

export const ComponentWithEdges=Object.freeze({NoComponent:0,OneComponent:1,ManyComponents:2});
export class IsEulerianGraphAlgorithm {
  constructor(graph){this.VisitedGraph=required(graph);this._adj=simpleAdjacency(graph);}
  CheckComponentsWithEdges(){const seen=new Set();let count=0;for(const[v,ns]of this._adj)if(ns.size&&!seen.has(v)){++count;const q=[v];seen.add(v);for(let h=0;h<q.length;++h)for(const n of this._adj.get(q[h]))if(!seen.has(n)){seen.add(n);q.push(n);}}return Math.min(2,count);}
  IsEulerian(){const c=this.CheckComponentsWithEdges();return c===1?[...this._adj.values()].every(ns=>ns.size%2===0):c===0&&this._adj.size===1;}
  static IsEulerian(graph){return new IsEulerianGraphAlgorithm(graph).IsEulerian();}
}
export class IsHamiltonianGraphAlgorithm {
  constructor(graph){this.VisitedGraph=required(graph);this._adj=simpleAdjacency(graph);}
  GetPermutations(){return [...this.EnumeratePermutations()];}
  *EnumeratePermutations(){
    // Iterative Heap permutation generator avoids factorial retained memory for consumers
    // that choose the streaming extension; GetPermutations retains the upstream array API.
    const values=[...this._adj.keys()];if(!values.length)return;yield values.slice();const counters=new Uint32Array(values.length);
    for(let i=0;i<values.length;){if(counters[i]<i){const j=i%2?counters[i]:0;[values[i],values[j]]=[values[j],values[i]];yield values.slice();++counters[i];i=0;}else{counters[i]=0;++i;}}
  }
  IsHamiltonian(){const n=this._adj.size;if(n<2)return n===1;if(n>=3&&[...this._adj.values()].every(ns=>ns.size>=n/2))return true;
    const start=this._adj.keys().next().value,used=new Set([start]);
    const visit=v=>{if(used.size===n)return this._adj.get(v).has(start);for(const next of this._adj.get(v))if(!used.has(next)){used.add(next);if(visit(next))return true;used.delete(next);}return false;};return visit(start);
  }
  static IsHamiltonian(graph){return new IsHamiltonianGraphAlgorithm(graph).IsHamiltonian();}
}

export class EulerianTrailAlgorithm extends RootedAlgorithmBase {
  constructor(...args){super(...args);this._circuit=[];this._temporaryEdges=[];events(this,'TreeEdge CircuitEdge VisitEdge');}
  get Circuit(){return this._circuit.slice();}
  Initialize(){this._circuit=[];}
  InternalCompute(){
    const vs=vertices(this.VisitedGraph);if(!vs.length)return;
    let root=this.TryGetRootVertex();if(root===undefined)root=vs[0];
    assertVertex(this.VisitedGraph,root);
    if(this.VisitedGraph.IsDirected!==false&&vs.some(v=>out(this.VisitedGraph,v).length!==incoming(this.VisitedGraph,v).length)){
      // Upstream returns the expandable circuit through the chosen root, omitting dead ends.
      const used=new Set();
      const findCycle=start=>{
        // A simple cycle is sufficient: remaining cycles can be spliced afterwards.
        // Exhausted vertices prevent exponential re-exploration of directed dead ends.
        const path=[],seen=new Set([start]),stack=[{vertex:start,edges:out(this.VisitedGraph,start),next:0}];
        while(stack.length){this.ThrowIfCancellationRequested();const frame=stack.at(-1);if(frame.next===frame.edges.length){stack.pop();if(stack.length)path.pop();continue;}
          const e=frame.edges[frame.next++];if(used.has(e))continue;this.TreeEdge.emit(e);
          if(e.Target===start)return [...path,e];
          if(seen.has(e.Target))continue;seen.add(e.Target);path.push(e);stack.push({vertex:e.Target,edges:out(this.VisitedGraph,e.Target),next:0});
        }
        return [];
      };
      const add=(cycle,index)=>{for(const e of cycle){used.add(e);this.CircuitEdge.emit(e);}this._circuit.splice(index,0,...cycle);};
      add(findCycle(root),0);
      for(;;){let changed=false;for(let i=0;i<this._circuit.length;++i){const v=this._circuit[i].Source,unused=out(this.VisitedGraph,v).find(e=>!used.has(e));if(!unused)continue;this.VisitEdge.emit(unused);const cycle=findCycle(v);if(cycle.length){add(cycle,i);changed=true;break;}}if(!changed)break;}
      return;
    }
    const adjacency=new Map(vs.map(v=>[v,out(this.VisitedGraph,v)])),cursor=new Map(vs.map(v=>[v,0])),used=new Set(),stack=[{vertex:root}],reversed=[];
    while(stack.length){this.ThrowIfCancellationRequested();const frame=stack.at(-1),list=adjacency.get(frame.vertex);let i=cursor.get(frame.vertex);while(i<list.length&&used.has(list[i]))++i;cursor.set(frame.vertex,i);
      if(i<list.length){const e=list[i];cursor.set(frame.vertex,i+1);used.add(e);this.VisitEdge.emit(e);this.TreeEdge.emit(e);stack.push({vertex:this.VisitedGraph.IsDirected===false?other(e,frame.vertex):e.Target,edge:e});}
      else {const f=stack.pop();if(f.edge)reversed.push(f.edge);}
    }
    this._circuit=reversed.reverse();for(const e of this._circuit)this.CircuitEdge.emit(e);
  }
  static ComputeEulerianPathCount(graph){required(graph);const vs=vertices(graph);if(graph.EdgeCount<vs.length)return 0;let odd=0;for(const v of vs)if((out(graph,v).length+(graph.IsDirected===false?0:incoming(graph,v).length))%2)++odd;return odd===0?1:odd%2?0:odd/2;}
  AddTemporaryEdges(factory){required(factory);if(this._temporaryEdges.length)throw new InvalidOperationException('Temporary edges already added');const graph=this.VisitedGraph;
    const add=(s,t)=>{const e=factory(s,t);if(!graph.AddEdge(e))throw new InvalidOperationException('Cannot add temporary edge');this._temporaryEdges.push(e);};
    if(graph.IsDirected!==false){
      const odd=vertices(graph).filter(v=>Math.abs(out(graph,v).length-incoming(graph,v).length)%2);
      let failures=0;
      while(odd.length){const u=odd[0];let v,hasAdjacent=false;for(const e of out(graph,u))if(e.Target!==u&&odd.includes(e.Target)){hasAdjacent=true;if(!out(graph,e.Target).some(r=>r.Target===u)){v=e.Target;break;}}
        if(v===undefined&&!hasAdjacent)v=odd[1];
        if(v===undefined){odd.push(odd.shift());if(++failures>=odd.length)throw new InvalidOperationException('No valid temporary edge can pair the odd vertices');continue;}
        failures=0;add(u,v);odd.splice(odd.indexOf(v),1);odd.splice(odd.indexOf(u),1);
      }
    }
    else {const odd=vertices(graph).filter(v=>out(graph,v).reduce((n,e)=>n+(e.Source===e.Target?2:1),0)%2);for(let i=0;i<odd.length;i+=2)add(odd[i],odd[i+1]);}
    return this._temporaryEdges.slice();
  }
  RemoveTemporaryEdges(){for(const e of this._temporaryEdges)this.VisitedGraph.RemoveEdge(e);this._temporaryEdges=[];}
  *Trails(startingVertex){
    let circuit=this._circuit.slice();const temp=new Set(this._temporaryEdges);let predecessors;
    if(startingVertex!==undefined){assertVertex(this.VisitedGraph,startingVertex);const i=circuit.findIndex(e=>!temp.has(e)&&e.Source===startingVertex);if(i<0)throw new InvalidOperationException('Starting vertex was not found in computed circuit');circuit=[...circuit.slice(i),...circuit.slice(0,i)];
      predecessors=new Map();const q=[startingVertex],seen=new Set(q);for(let h=0;h<q.length;++h)for(const e of out(this.VisitedGraph,q[h]))if(!seen.has(e.Target)){seen.add(e.Target);predecessors.set(e.Target,e);q.push(e.Target);}
    }
    let trail=[];for(const e of circuit){if(temp.has(e)){if(trail.length)yield trail;trail=[];if(predecessors){let v=e.Target;while(v!==startingVertex){const p=predecessors.get(v);if(!p)throw new InvalidOperationException('Trail is unreachable from starting vertex');trail.push(p);v=p.Source;}trail.reverse();}}else trail.push(e);}if(trail.length)yield trail;
  }
}

export class VertexColoringAlgorithm extends AlgorithmBase {
  constructor(graph){super(graph);this.Colors=new Map();events(this,'VertexColored');}
  Initialize(){this.Colors=new Map(vertices(this.VisitedGraph).map(v=>[v,null]));}
  InternalCompute(){for(const v of this.VisitedGraph.Vertices){this.ThrowIfCancellationRequested();const unavailable=new Set(out(this.VisitedGraph,v).map(e=>this.Colors.get(other(e,v))));let color=0;while(unavailable.has(color))++color;this.Colors.set(v,color);this.VertexColored.emit(v);}}
}
export class MinimumVertexCoverApproximationAlgorithm extends AlgorithmBase {
  constructor(graph,rng=Math.random){super(graph);this._rng=required(rng);this._cover=[];}
  get CoverSet(){return this.State===ComputationState.Finished?this._cover.slice():null;}
  Initialize(){this._cover=[];}
  InternalCompute(){let remaining=edges(this.VisitedGraph);const selected=new Set();while(remaining.length){this.ThrowIfCancellationRequested();const e=remaining[Math.min(remaining.length-1,Math.floor(random(this._rng)*remaining.length))];let sd=0,td=0;for(const x of remaining){if(x.Source===e.Source||x.Target===e.Source)++sd;if(x.Source===e.Target||x.Target===e.Target)++td;}if(sd>1||sd===1&&td===1)selected.add(e.Source);if(td>1)selected.add(e.Target);remaining=remaining.filter(x=>x.Source!==e.Source&&x.Target!==e.Source&&x.Source!==e.Target&&x.Target!==e.Target);}this._cover=[...selected];}
}
export class MaximumCliqueAlgorithmBase extends AlgorithmBase {}
/** Optional concrete extension: exact Bron-Kerbosch maximum-clique search. */
export class BronKerboschMaximumCliqueAlgorithm extends MaximumCliqueAlgorithmBase {
  constructor(...args){super(...args);this.MaximumClique=[];this.MaximalCliques=[];}
  Initialize(){this.MaximumClique=[];this.MaximalCliques=[];}
  InternalCompute(){const adj=simpleAdjacency(this.VisitedGraph);const visit=(r,p,x)=>{this.ThrowIfCancellationRequested();if(!p.size&&!x.size){this.MaximalCliques.push(r.slice());if(r.length>this.MaximumClique.length)this.MaximumClique=r.slice();return;}let pivot,best=-1;for(const v of new Set([...p,...x])){const score=[...p].filter(w=>adj.get(v).has(w)).length;if(score>best){best=score;pivot=v;}}for(const v of [...p].filter(w=>pivot===undefined||!adj.get(pivot).has(w))){const ns=adj.get(v);visit([...r,v],new Set([...p].filter(w=>ns.has(w))),new Set([...x].filter(w=>ns.has(w))));p.delete(v);x.add(v);}};visit([],new Set(adj.keys()),new Set());}
}

const chainEdges=(graphOrEdges,vertex)=>graphOrEdges?.OutEdges?[...graphOrEdges.OutEdges(vertex)]:[...required(graphOrEdges)];
export class MarkovEdgeChainBase {
  constructor(){this.Rand=Math.random;}
  TryGetSuccessor(){throw new InvalidOperationException('TryGetSuccessor must be implemented');}
}
export class NormalizedMarkovEdgeChain extends MarkovEdgeChainBase {
  TryGetSuccessor(graphOrEdges,vertex){const es=chainEdges(graphOrEdges,vertex);return es.length?es[Math.min(es.length-1,Math.floor(random(this.Rand)*es.length))]:undefined;}
}
export class RoundRobinEdgeChain {
  constructor(){this._indices=new Map();}
  TryGetSuccessor(graphOrEdges,vertex){const es=chainEdges(graphOrEdges,vertex);if(!es.length)return undefined;const i=(this._indices.get(vertex)??0)%es.length;this._indices.set(vertex,i+1);return es[i];}
}
export class WeightedMarkovEdgeChainBase extends MarkovEdgeChainBase {
  constructor(weights){super();this.Weights=required(weights);}
  GetWeights(es){let sum=0;for(const e of es){const w=this.Weights.get(e);if(!Number.isFinite(w)||w<0)throw new RangeError('Every edge needs a nonnegative finite weight');sum+=w;}return sum;}
  GetOutWeight(graph,vertex){return this.GetWeights(chainEdges(graph,vertex));}
  _choose(es){const sum=this.GetWeights(es);if(!es.length)return undefined;if(sum===0)return es[0];let value=random(this.Rand)*sum;for(const e of es){value-=this.Weights.get(e);if(value<0)return e;}return es.at(-1);}
}
export class WeightedMarkovEdgeChain extends WeightedMarkovEdgeChainBase {
  TryGetSuccessor(graphOrEdges,vertex){return this._choose(chainEdges(graphOrEdges,vertex));}
}
export class VanishingWeightedMarkovEdgeChain extends WeightedMarkovEdgeChainBase {
  constructor(weights,factor=0.2){super(weights);this.Factor=factor;}
  TryGetSuccessor(graphOrEdges,vertex){const es=chainEdges(graphOrEdges,vertex),sum=this.GetWeights(es),e=this._choose(es);if(e!==undefined&&sum>0){this.Weights.set(e,this.Weights.get(e)*this.Factor);for(const x of es)this.Weights.set(x,this.Weights.get(x)/sum);}return e;}
}
export class RandomWalkAlgorithm extends RootedAlgorithmBase {
  constructor(graph,chain=new NormalizedMarkovEdgeChain()){super(graph);this.EdgeChain=chain;this.EndPredicate=undefined;events(this,'StartVertex EndVertex TreeEdge');}
  get EdgeChain(){return this._chain;}set EdgeChain(value){this._chain=required(value);}
  InternalCompute(){const root=this.TryGetRootVertex();if(root===undefined)throw new InvalidOperationException('Root vertex not set');this.Generate(root);}
  Generate(root,walkCount=100){assertVertex(this.VisitedGraph,root);let current=root;this.StartVertex.emit(root);for(let i=0;i<walkCount;++i){this.ThrowIfCancellationRequested();const e=this.EdgeChain.TryGetSuccessor(this.VisitedGraph,current);if(e==null||this.EndPredicate?.(e))break;this.TreeEdge.emit(e);current=e.Target;}this.EndVertex.emit(current);}
}
export class CyclePoppingRandomTreeAlgorithm extends RootedAlgorithmBase {
  constructor(...args){const[host,graph,chain=new NormalizedMarkovEdgeChain()]=parseHost(args);super(host,graph);this.EdgeChain=required(chain);this._rand=Math.random;this.VerticesColors=new Map();this.Successors=new Map();events(this,'InitializeVertex FinishVertex TreeEdge ClearTreeVertex');}
  get Rand(){return this._rand;}set Rand(value){this._rand=required(value);}
  GetVertexColor(v){required(v);if(!this.VerticesColors.has(v))throw new VertexNotFoundException('Vertex color is not available');return this.VerticesColors.get(v);}
  Initialize(){this.Successors.clear();this.VerticesColors.clear();for(const v of this.VisitedGraph.Vertices){this.VerticesColors.set(v,0);this.InitializeVertex.emit(v);}}
  _makeTreeRoot(vertex){this.Successors.set(vertex,undefined);this.ClearTreeVertex.emit(vertex);this.VerticesColors.set(vertex,2);this.FinishVertex.emit(vertex);}
  _seedClosedClasses(){
    // A directed Markov chain can have several closed classes. Each class that cannot
    // reach an existing root needs one root; vertices outside these classes do not.
    const vs=vertices(this.VisitedGraph),adj=new Map(),reverse=new Map(vs.map(v=>[v,[]]));
    for(const v of vs){let es=out(this.VisitedGraph,v);if(this.EdgeChain.Weights){const sum=this.EdgeChain.GetWeights(es);es=sum>0?es.filter(e=>this.EdgeChain.Weights.get(e)>0):es.slice(0,1);}adj.set(v,es.map(e=>e.Target));for(const e of es)reverse.get(e.Target).push(v);}
    const reached=new Set(vs.filter(v=>this.VerticesColors.get(v)===2)),q=[...reached];
    for(let i=0;i<q.length;++i)for(const v of reverse.get(q[i]))if(!reached.has(v)){reached.add(v);q.push(v);}
    const pending=vs.filter(v=>!reached.has(v));if(!pending.length)return;
    const seen=new Set(),order=[];
    for(const v of pending)if(!seen.has(v)){seen.add(v);const stack=[[v,0]];while(stack.length){const frame=stack.at(-1),ns=adj.get(frame[0]);if(frame[1]===ns.length){order.push(frame[0]);stack.pop();continue;}const next=ns[frame[1]++];if(!reached.has(next)&&!seen.has(next)){seen.add(next);stack.push([next,0]);}}}
    const component=new Map(),groups=[];
    for(let i=order.length-1;i>=0;--i){const v=order[i];if(component.has(v))continue;const id=groups.length,group=[v];component.set(v,id);for(let j=0;j<group.length;++j)for(const next of reverse.get(group[j]))if(!reached.has(next)&&!component.has(next)){component.set(next,id);group.push(next);}groups.push(group);}
    const closed=groups.map(()=>true);for(const v of pending)for(const next of adj.get(v))if(component.get(v)!==component.get(next))closed[component.get(v)]=false;
    for(let i=0;i<groups.length;++i)if(closed[i]){const group=groups[i];this._makeTreeRoot(group[Math.floor(random(this.Rand)*group.length)]);}
  }
  InternalCompute(){
    const vs=vertices(this.VisitedGraph);const root=this.GetAndAssertRootInGraph();this._makeTreeRoot(root);this._seedClosedClasses();
    // Wilson's loop-erased random walks draw from the complete transition distribution
    // on every visit. Edges are never banned after a loop: that would bias the tree.
    for(const start of vs){this.ThrowIfCancellationRequested();if(this.VerticesColors.get(start)===2)continue;
      let current=start;const path=[],position=new Map();
      while(this.VerticesColors.get(current)!==2){
        this.ThrowIfCancellationRequested();
        if(position.has(current)){const at=position.get(current);for(const v of path.splice(at)){position.delete(v);this.Successors.delete(v);this.ClearTreeVertex.emit(v);}}
        position.set(current,path.length);path.push(current);
        const e=this.EdgeChain.TryGetSuccessor(this.VisitedGraph,current);
        if(!e){this._makeTreeRoot(current);break;}
        this.Successors.set(current,e);this.TreeEdge.emit(e);current=e.Target;
        if(this.EdgeChain.Weights?.get(e)===0)this._seedClosedClasses();
      }
      for(let i=path.length-1;i>=0;--i)if(this.VerticesColors.get(path[i])!==2){this.VerticesColors.set(path[i],2);this.FinishVertex.emit(path[i]);}
    }
  }
  RandomTreeWithRoot(root){required(root);if(!this.VisitedGraph.ContainsVertex(root))throw new ArgumentException('Root vertex must be in the graph');return this.Compute(root);}
  RandomTree(){const vs=vertices(this.VisitedGraph);if(!vs.length){this.Initialize();return;}return this.Compute(vs[Math.min(vs.length-1,Math.floor(random(this.Rand)*vs.length))]);}
}

export class TransitionFactoryImplicitGraph {
  constructor(){this._factories=[];this._cache=new Map();this._pending=new Map();this._vertexPredicate=()=>true;this._edgePredicate=()=>true;}
  get IsDirected(){return true;}get AllowParallelEdges(){return true;}
  get SuccessorVertexPredicate(){return this._vertexPredicate;}set SuccessorVertexPredicate(v){this._vertexPredicate=required(v);this._cache.clear();}
  get SuccessorEdgePredicate(){return this._edgePredicate;}set SuccessorEdgePredicate(v){this._edgePredicate=required(v);this._cache.clear();}
  AddTransitionFactory(factory){this._factories.push(required(factory));for(const v of this._cache.keys())this._pending.set(v,new Set());this._cache.clear();}
  AddTransitionFactories(factories){for(const f of required(factories))this.AddTransitionFactory(f);}
  RemoveTransitionFactory(factory){const i=this._factories.indexOf(factory);if(i<0)return false;this._factories.splice(i,1);this._cache.clear();for(const[v,fs]of this._pending)if(!fs.size||fs.has(factory))this._pending.delete(v);return true;}
  ClearTransitionFactories(){this._factories=[];this._cache.clear();this._pending.clear();}
  ContainsTransitionFactory(factory){return this._factories.includes(factory);}
  ContainsVertex(vertex){required(vertex);return this._cache.has(vertex)||this._pending.has(vertex);}
  TryGetOutEdges(vertex){required(vertex);let valid=this._pending.delete(vertex);if(this._cache.has(vertex))return this._cache.get(vertex).slice();const es=[];
    for(const factory of this._factories)if(factory.IsValid(vertex)){valid=true;for(const e of factory.Apply(vertex))if(this.SuccessorVertexPredicate(e.Target)){if(!this._cache.has(e.Target)){if(!this._pending.has(e.Target))this._pending.set(e.Target,new Set());this._pending.get(e.Target).add(factory);}if(this.SuccessorEdgePredicate(e))es.push(e);}}
    if(!valid)return undefined;this._cache.set(vertex,es);return es.slice();
  }
  OutEdges(vertex){const es=this.TryGetOutEdges(vertex);if(es===undefined)throw new InvalidOperationException('Vertex is not part of implicit graph');return es;}
  OutDegree(vertex){return this.OutEdges(vertex).length;}IsOutEdgesEmpty(vertex){return this.OutDegree(vertex)===0;}
  OutEdge(vertex,index){const es=this.OutEdges(vertex);if(!Number.isInteger(index)||index<0||index>=es.length)throw new RangeError('Edge index out of range');return es[index];}
}

export class DefaultFinishedPredicate {
  constructor(maxVertexCount=1000,maxEdgeCount=1000){this.MaxVertexCount=maxVertexCount;this.MaxEdgeCount=maxEdgeCount;}
  Test(algorithm){required(algorithm);return algorithm.VisitedGraph.VertexCount<=this.MaxVertexCount&&algorithm.VisitedGraph.EdgeCount<=this.MaxEdgeCount;}
}
export class CloneableVertexGraphExplorerAlgorithm extends RootedAlgorithmBase {
  static DefaultFinishedPredicate=DefaultFinishedPredicate;
  constructor(...args){const[host,graph]=parseHost(args);super(host,graph);this._factories=[];this._queue=[];this.AddVertexPredicate=()=>true;this.ExploreVertexPredicate=()=>true;this.AddEdgePredicate=()=>true;const p=new DefaultFinishedPredicate();this.FinishedPredicate=a=>p.Test(a);this.FinishedSuccessfully=false;events(this,'DiscoverVertex TreeEdge BackEdge EdgeSkipped');}
  get AddVertexPredicate(){return this._addVertexPredicate;}set AddVertexPredicate(value){this._addVertexPredicate=required(value);}
  get ExploreVertexPredicate(){return this._exploreVertexPredicate;}set ExploreVertexPredicate(value){this._exploreVertexPredicate=required(value);}
  get AddEdgePredicate(){return this._addEdgePredicate;}set AddEdgePredicate(value){this._addEdgePredicate=required(value);}
  get FinishedPredicate(){return this._finishedPredicate;}set FinishedPredicate(value){this._finishedPredicate=required(value);}
  get UnExploredVertices(){return this._queue.slice();}
  AddTransitionFactory(factory){this._factories.push(required(factory));}
  AddTransitionFactories(factories){for(const f of required(factories))this.AddTransitionFactory(f);}
  RemoveTransitionFactory(factory){const i=this._factories.indexOf(factory);if(i<0)return false;this._factories.splice(i,1);return true;}
  ClearTransitionFactories(){this._factories=[];}ContainsTransitionFactory(f){return this._factories.includes(f);}
  Compute(root){if(arguments.length)this.SetRootVertex(root);return AlgorithmBase.prototype.Compute.call(this);}
  InternalCompute(){
    const root=this.TryGetRootVertex();if(root===undefined)throw new InvalidOperationException('Root vertex not set');this.VisitedGraph.Clear();this._queue=[];this.FinishedSuccessfully=false;
    if(!this.AddVertexPredicate(root))throw new InvalidOperationException('Starting vertex fails AddVertexPredicate');
    const discover=v=>{this.VisitedGraph.AddVertex(v);this._queue.push(v);this.DiscoverVertex.emit(v);};discover(root);
    while(this._queue.length){this.ThrowIfCancellationRequested();if(!this.FinishedPredicate(this))return;const current=this._queue.shift(),clone=typeof current?.Clone==='function'?current.Clone():current;
      if(!this.ExploreVertexPredicate(clone))continue;
      for(const f of this._factories)if(f.IsValid(clone))for(let e of f.Apply(clone)){
        if(!this.AddVertexPredicate(e.Target)||!this.AddEdgePredicate(e)){this.EdgeSkipped.emit(e);continue;}
        const source=e.Source===clone?current:vertices(this.VisitedGraph).find(v=>equals(v,e.Source))??e.Source;
        const target=vertices(this.VisitedGraph).find(v=>equals(v,e.Target))??e.Target;
        if(source!==e.Source||target!==e.Target){const properties=Object.getOwnPropertyDescriptors(e);properties.Source={value:source,enumerable:true};properties.Target={value:target,enumerable:true};e=Object.create(Object.getPrototypeOf(e),properties);}
        const back=this.VisitedGraph.ContainsVertex(e.Target);if(!back)discover(e.Target);
        this.VisitedGraph.AddEdge(e);(back?this.BackEdge:this.TreeEdge).emit(e);
      }
    }
    this.FinishedSuccessfully=true;
  }
}
