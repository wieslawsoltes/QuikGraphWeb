// Detachable algorithm observers, adapted from QuikGraph (MS-PL).
import { sameVertex, DistanceRelaxers, GraphColor, requireValue, algorithmError } from './algorithm-base.js';
import { predecessorPath } from './shortest-paths.js';
function attach(algorithm, handlers) {
  requireValue(algorithm, 'algorithm');
  const subscriptions = [];
  for (const [name, handler] of Object.entries(handlers)) {
    if (!algorithm[name]?.add) { for (const [event, fn] of subscriptions) event.remove(fn); throw new TypeError(`Algorithm must expose ${name}.`); }
    algorithm[name].add(handler); subscriptions.push([algorithm[name], handler]);
  }
  let disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; for (const [event, handler] of subscriptions) event.remove(handler); } };
  const result = { Dispose: dispose, dispose, unsubscribe: dispose }; if (Symbol.dispose) result[Symbol.dispose] = dispose; return result;
}
export class VertexPredecessorRecorderObserver {
  constructor(verticesPredecessors = new Map()) { this.VerticesPredecessors = requireValue(verticesPredecessors, 'verticesPredecessors'); }
  Attach(algorithm) { return attach(algorithm, { TreeEdge: edge => this.VerticesPredecessors.set(edge.Target, edge) }); }
  TryGetPath(vertex) { return predecessorPath(this.VerticesPredecessors, vertex); }
}
export class UndirectedVertexPredecessorRecorderObserver extends VertexPredecessorRecorderObserver {
  Attach(algorithm) { return attach(algorithm, { TreeEdge: (_sender, args) => this.VerticesPredecessors.set(args.Target, args.Edge) }); }
  TryGetPath(vertex) { return predecessorPath(this.VerticesPredecessors, vertex, true); }
}
export class VertexDistanceRecorderObserver {
  constructor(edgeWeights, distanceRelaxer = DistanceRelaxers.EdgeShortestDistance, distances = new Map()) {
    this.EdgeWeights = requireValue(edgeWeights, 'edgeWeights'); this.DistanceRelaxer = requireValue(distanceRelaxer, 'distanceRelaxer'); this.Distances = requireValue(distances, 'distances');
  }
  _record(edge, source, target) { if (!this.Distances.has(source)) this.Distances.set(source, this.DistanceRelaxer.InitialDistance); this.Distances.set(target, this.DistanceRelaxer.Combine(this.Distances.get(source), this.EdgeWeights(edge))); }
  Attach(algorithm) { return attach(algorithm, { TreeEdge: edge => this._record(edge, edge.Source, edge.Target) }); }
}
export class UndirectedVertexDistanceRecorderObserver extends VertexDistanceRecorderObserver {
  Attach(algorithm) { return attach(algorithm, { TreeEdge: (_sender, args) => this._record(args.Edge, args.Source, args.Target) }); }
}
export class VertexTimeStamperObserver {
  constructor(discoverTimes, finishTimes) {
    this.DiscoverTimes = arguments.length ? requireValue(discoverTimes, 'discoverTimes') : new Map();
    this.FinishTimes = arguments.length === 1 ? null : arguments.length > 1 ? requireValue(finishTimes, 'finishTimes') : new Map(); this._currentTime = 0;
  }
  Attach(algorithm) {
    const handlers = { DiscoverVertex: v => this.DiscoverTimes.set(v, this._currentTime++) };
    if (this.FinishTimes) handlers.FinishVertex = v => this.FinishTimes.set(v, this._currentTime++);
    return attach(algorithm, handlers);
  }
}
export class VertexRecorderObserver {
  constructor(vertices = []) { this.Vertices = [...requireValue(vertices, 'vertices')]; }
  Attach(algorithm) { return attach(algorithm, { DiscoverVertex: vertex => this.Vertices.push(vertex) }); }
}
export class EdgeRecorderObserver {
  constructor(edges = []) { this.Edges = [...requireValue(edges, 'edges')]; }
  Attach(algorithm) { return attach(algorithm, { TreeEdge: edge => this.Edges.push(edge) }); }
}
export class VertexPredecessorPathRecorderObserver extends VertexPredecessorRecorderObserver {
  constructor(...args) { super(...args); this.EndPathVertices = []; }
  Attach(algorithm) {
    return attach(algorithm, {
      TreeEdge: edge => this.VerticesPredecessors.set(edge.Target, edge),
      FinishVertex: vertex => { for (const edge of this.VerticesPredecessors.values()) if (sameVertex(edge.Source, vertex)) return; this.EndPathVertices.push(vertex); }
    });
  }
  *AllPaths() { for (const vertex of this.EndPathVertices) { const path = this.TryGetPath(vertex); if (path) yield path; } }
}
export class EdgePredecessorRecorderObserver {
  constructor(edgesPredecessors = new Map()) { this.EdgesPredecessors = requireValue(edgesPredecessors, 'edgesPredecessors'); this.EndPathEdges = []; }
  Attach(algorithm) {
    return attach(algorithm, {
      DiscoverTreeEdge: (edge, targetEdge) => { if (edge !== targetEdge) this.EdgesPredecessors.set(targetEdge, edge); },
      FinishEdge: edge => { for (const predecessor of this.EdgesPredecessors.values()) if (predecessor === edge) return; this.EndPathEdges.push(edge); }
    });
  }
  Path(startingEdge) {
    requireValue(startingEdge, 'startingEdge'); const path = [], seen = new Set(); let edge = startingEdge;
    while (edge !== undefined) { if (seen.has(edge)) throw algorithmError('InvalidOperationException', 'The edge predecessor map contains a cycle.'); seen.add(edge); path.push(edge); edge = this.EdgesPredecessors.get(edge); }
    return path.reverse();
  }
  *AllPaths() { for (const edge of this.EndPathEdges) yield this.Path(edge); }
  MergedPath(startingEdge, colors) {
    requireValue(startingEdge, 'startingEdge'); requireValue(colors, 'colors'); const path = []; let edge = startingEdge;
    while (edge !== undefined) { if (!colors.has(edge)) throw algorithmError('KeyNotFoundException', 'No color recorded for edge.'); if (colors.get(edge) !== GraphColor.White) break; colors.set(edge, GraphColor.Black); path.push(edge); edge = this.EdgesPredecessors.get(edge); }
    return path.reverse();
  }
  *AllMergedPaths() {
    const colors = new Map(); for (const [edge, parent] of this.EdgesPredecessors) { colors.set(edge, GraphColor.White); colors.set(parent, GraphColor.White); }
    for (const edge of this.EndPathEdges) { if (!colors.has(edge)) colors.set(edge, GraphColor.White); yield this.MergedPath(edge, colors); }
  }
}
