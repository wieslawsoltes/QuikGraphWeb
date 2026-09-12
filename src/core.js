import { EqualityMap as Map, EqualitySet as Set } from './equality.js';
// QuikGraph Web. Graph contracts ported from QuikGraph (Microsoft Public License).
// JavaScript adaptation: TryGet* returns the out value, or undefined on failure.
export const GraphColor = Object.freeze({ White: 0, Gray: 1, Black: 2 });
export class QuikGraphException extends Error {
  constructor(message = 'A graph operation failed.', innerExceptionOrOptions) { super(message, innerExceptionOrOptions instanceof Error ? { cause: innerExceptionOrOptions } : innerExceptionOrOptions ?? undefined); this.name = new.target.name; }
  get Message() { return this.message; }
  get InnerException() { return this.cause ?? null; }
  get StackTrace() { return this.stack; }
  ToString() { return this.toString(); }
}
export class VertexNotFoundException extends QuikGraphException {}
export class NegativeCycleGraphException extends QuikGraphException {}
export class NegativeWeightException extends QuikGraphException {}
export class ParallelEdgeNotAllowedException extends QuikGraphException {}
export class NegativeCapacityException extends QuikGraphException {}
export class NoPathFoundException extends QuikGraphException {}
export class NonStronglyConnectedGraphException extends QuikGraphException {}
export class NonAcyclicGraphException extends QuikGraphException {}
export class ArgumentException extends TypeError { constructor(message = 'Invalid argument.') { super(message); this.name = new.target.name; } }
export class ArgumentNullException extends ArgumentException {}
export class ArgumentOutOfRangeException extends RangeError { constructor(message = 'Argument out of range.') { super(message); this.name = new.target.name; } }
export class InvalidOperationException extends Error { constructor(message = 'Operation is not valid.') { super(message); this.name = new.target.name; } }
export class NotSupportedException extends Error { constructor(message = 'Operation is not supported.') { super(message); this.name = new.target.name; } }
export function requireValue(value, name = 'value') { if (value == null) throw new ArgumentNullException(`${name} must not be null.`); return value; }
export function equals(a, b) { return a === b || (a !== a && b !== b) || (a != null && typeof a.Equals === 'function' && a.Equals(b)); }
export function defaultCompare(a, b) { return a === b ? 0 : typeof a?.CompareTo === 'function' ? a.CompareTo(b) : a < b ? -1 : a > b ? 1 : 0; }
const batch = (items, name) => { const a = Array.from(requireValue(items, name)); a.forEach(x => requireValue(x, name)); return a; };
const indexed = (a, i) => { if (!Number.isInteger(i) || i < 0 || i >= a.length) throw new ArgumentOutOfRangeException('Index is outside the collection.'); return a[i]; };
const removeOne = (a, v) => { const i = a.findIndex(x => equals(x, v)); if (i < 0) return false; a.splice(i, 1); return true; };

/** Multicast event. Listeners run in registration order; duplicate registrations are supported. */
export class EventHook {
  constructor() { this._listeners = []; }
  add(listener) { if (typeof listener !== 'function') throw new TypeError('Listener must be a function.'); this._listeners.push(listener); return listener; }
  remove(listener) { const i = this._listeners.lastIndexOf(listener); if (i >= 0) this._listeners.splice(i, 1); return i >= 0; }
  subscribe(listener) { this.add(listener); let active = true; const dispose = () => { if (active) { active = false; this.remove(listener); } }; return { dispose, unsubscribe: dispose, Dispose: dispose }; }
  emit(...args) { for (const fn of this._listeners.slice()) fn(...args); }
  clear() { this._listeners.length = 0; }
  get Count() { return this._listeners.length; }
}
export class VertexEventArgs { constructor(vertex) { this.Vertex = requireValue(vertex, 'vertex'); } }
export class EdgeEventArgs { constructor(edge) { this.Edge = requireValue(edge, 'edge'); } }
export class UndirectedEdgeEventArgs extends EdgeEventArgs {
  constructor(edge, reversed) { super(edge); this.Reversed = !!reversed; }
  get Source() { return this.Reversed ? this.Edge.Target : this.Edge.Source; }
  get Target() { return this.Reversed ? this.Edge.Source : this.Edge.Target; }
}
const objectHashes = new WeakMap(); let nextHash = 1;
function identityHash(v) { if (v == null) return 0; if (typeof v === 'object' || typeof v === 'function') { if (!objectHashes.has(v)) objectHashes.set(v, nextHash++); return objectHashes.get(v); } let h = 0; for (const c of String(v)) h = ((h * 31) ^ c.charCodeAt(0)) | 0; return h; }
function hash(v) { return typeof v?.GetHashCode === 'function' ? v.GetHashCode() : typeof v?.Equals === 'function' ? 0 : identityHash(v); }
function edgeHash(e) { return (Math.imul(hash(e.Source), 397) ^ hash(e.Target)) | 0; }
function endpoints(e, source, target) { Object.defineProperties(e, { Source: { value: requireValue(source, 'source'), enumerable: true }, Target: { value: requireValue(target, 'target'), enumerable: true } }); }
const structDefault = Symbol('struct default');
export class Edge {
  constructor(source, target, mode) { if (mode === structDefault) Object.defineProperties(this, { Source: { value: null, enumerable: true }, Target: { value: null, enumerable: true } }); else endpoints(this, source, target); }
  Equals(other) { return this === other; }
  GetHashCode() { return identityHash(this); }
  ToString() { return `${this.Source ?? ''} -> ${this.Target ?? ''}`; }
  toString() { return this.ToString(); }
}
export class EquatableEdge extends Edge { Equals(other) { return other instanceof EquatableEdge && equals(this.Source, other.Source) && equals(this.Target, other.Target); } GetHashCode() { return edgeHash(this); } }
export class SEdge extends Edge { constructor(source, target) { if (arguments.length === 0) super(null, null, structDefault); else super(source, target); } Equals(other) { return other?.constructor === this.constructor && equals(this.Source, other.Source) && equals(this.Target, other.Target); } GetHashCode() { return edgeHash(this); } }
export class SEquatableEdge extends SEdge {}
export class UndirectedEdge extends Edge {
  constructor(source, target, mode) { super(source, target, mode); if (mode !== structDefault && defaultCompare(source, target) > 0) throw new RangeError('source must be lower than or equal to target.'); }
  ToString() { return `${this.Source ?? ''} <-> ${this.Target ?? ''}`; }
}
export class EquatableUndirectedEdge extends UndirectedEdge { Equals(other) { return other instanceof EquatableUndirectedEdge && equals(this.Source, other.Source) && equals(this.Target, other.Target); } GetHashCode() { return edgeHash(this); } }
export class SUndirectedEdge extends UndirectedEdge { constructor(source, target) { if (arguments.length === 0) super(null, null, structDefault); else super(source, target); } Equals(other) { return other?.constructor === this.constructor && equals(this.Source, other.Source) && equals(this.Target, other.Target); } GetHashCode() { return edgeHash(this); } }
const tagged = Base => class extends Base {
  constructor(...args) { if (args.length === 0 && (Base === SEdge || Base === SEquatableEdge || Base === SUndirectedEdge)) super(); else super(args[0], args[1]); this._tag = args.length === 0 ? null : args[2]; this.TagChanged = new EventHook(); }
  get Tag() { return this._tag; }
  set Tag(value) { if (!equals(value, this._tag)) { this._tag = value; this.TagChanged.emit(this, {}); } }
  ToString() { return `${super.ToString()} (${this.Tag == null ? '' : this.Tag})`; }
};
export class TaggedEdge extends tagged(Edge) {}
export class EquatableTaggedEdge extends tagged(EquatableEdge) {}
export class STaggedEdge extends tagged(SEdge) { Equals(other) { return super.Equals(other) && equals(this.Tag, other.Tag); } GetHashCode() { return edgeHash(this) ^ hash(this.Tag); } }
export class SEquatableTaggedEdge extends tagged(SEquatableEdge) {}
export class TaggedUndirectedEdge extends tagged(UndirectedEdge) {}
export class STaggedUndirectedEdge extends tagged(SUndirectedEdge) { Equals(other) { return super.Equals(other) && equals(this.Tag, other.Tag); } GetHashCode() { return edgeHash(this) ^ hash(this.Tag); } }
export class TermEdge extends Edge {
  constructor(source, target, sourceTerminal = 0, targetTerminal = 0) { super(source, target); if (!Number.isInteger(sourceTerminal) || sourceTerminal < 0 || !Number.isInteger(targetTerminal) || targetTerminal < 0) throw new RangeError('Terminals must be nonnegative integers.'); Object.defineProperties(this, { SourceTerminal: { value: sourceTerminal, enumerable: true }, TargetTerminal: { value: targetTerminal, enumerable: true } }); }
  ToString() { return `${this.Source} (${this.SourceTerminal}) -> ${this.Target} (${this.TargetTerminal})`; }
}
export class EquatableTermEdge extends TermEdge { Equals(other) { return other instanceof EquatableTermEdge && equals(this.Source, other.Source) && equals(this.Target, other.Target) && this.SourceTerminal === other.SourceTerminal && this.TargetTerminal === other.TargetTerminal; } GetHashCode() { return edgeHash(this) ^ this.SourceTerminal ^ Math.imul(this.TargetTerminal, 397); } }
export class SReversedEdge extends Edge {
  constructor(originalEdge) { if (arguments.length === 0) { super(null, null, structDefault); originalEdge = null; } else { requireValue(originalEdge, 'originalEdge'); super(originalEdge.Target, originalEdge.Source); } Object.defineProperty(this, 'OriginalEdge', { value: originalEdge, enumerable: true }); }
  Equals(other) { return other instanceof SReversedEdge && equals(this.OriginalEdge, other.OriginalEdge); }
  GetHashCode() { return (typeof this.OriginalEdge?.GetHashCode === 'function' ? this.OriginalEdge.GetHashCode() : hash(this.OriginalEdge)) ^ 16777619; }
  ToString() { return `R(${this.OriginalEdge ?? ''})`; }
}

class GraphQueries {
  get IsVerticesEmpty() { return this.VertexCount === 0; }
  get IsEdgesEmpty() { return this.EdgeCount === 0; }
  ContainsEdge(edgeOrSource, target) { requireValue(edgeOrSource); if (arguments.length === 2) return this.TryGetEdge(edgeOrSource, requireValue(target)) !== undefined; return this.Edges.some(e => equals(e, edgeOrSource)); }
  TryGetEdge(source, target) { requireValue(source); requireValue(target); return this.TryGetEdges(source, target)?.[0]; }
  TryGetEdges(source, target) { requireValue(source); requireValue(target); const a = this.TryGetOutEdges(source); if (!a) return undefined; return a.filter(e => this.IsDirected ? equals(e.Target, target) : UndirectedVertexEquality(e, source, target)); }
  OutDegree(vertex) { return this.OutEdges(vertex).length; }
  IsOutEdgesEmpty(vertex) { return this.OutDegree(vertex) === 0; }
  OutEdge(vertex, index) { return indexed(this.OutEdges(vertex), index); }
  InDegree(vertex) { return this.InEdges(vertex).length; }
  IsInEdgesEmpty(vertex) { return this.InDegree(vertex) === 0; }
  InEdge(vertex, index) { return indexed(this.InEdges(vertex), index); }
  Degree(vertex) { return this.OutDegree(vertex) + this.InDegree(vertex); }
  AdjacentEdges(vertex) { return this.OutEdges(vertex).concat(this.InEdges(vertex).filter(e => !IsSelfEdge(e))); }
  TryGetAdjacentEdges(vertex) { return this.ContainsVertex(vertex) ? this.AdjacentEdges(vertex) : undefined; }
  AdjacentDegree(vertex) { return this.AdjacentEdges(vertex).length; }
  IsAdjacentEdgesEmpty(vertex) { return this.AdjacentDegree(vertex) === 0; }
  AdjacentEdge(vertex, index) { return indexed(this.AdjacentEdges(vertex), index); }
  AdjacentVertices(vertex) { return Array.from(new Set(this.AdjacentEdges(vertex).filter(e => !IsSelfEdge(e)).map(e => GetOtherVertex(e, vertex)))); }
}

/** Mutable indexed directed multigraph. Vertex identity follows JavaScript Map semantics. */
export class AdjacencyGraph extends GraphQueries {
  constructor(allowParallelEdges = true, vertexCapacity = -1, edgeCapacity = 0) {
    super(); const copy = typeof allowParallelEdges === 'object' ? requireValue(allowParallelEdges) : null;
    this.AllowParallelEdges = copy ? copy.AllowParallelEdges : !!allowParallelEdges; this.EdgeCapacity = copy ? copy.EdgeCapacity : edgeCapacity;
    this._out = new Map(); this._in = new Map(); this._count = 0;
    this.VertexAdded = new EventHook(); this.VertexRemoved = new EventHook(); this.EdgeAdded = new EventHook(); this.EdgeRemoved = new EventHook();
    if (copy) { this.AddVertexRange(copy.Vertices); this.AddEdgeRange(copy.Edges); if (typeof copy.InEdges === 'function') for (const vertex of copy.Vertices) this._in.set(vertex, Array.from(copy.InEdges(vertex))); }
  }
  get IsDirected() { return true; }
  get VertexType() { return Object; } get EdgeType() { return Edge; }
  get VertexCount() { return this._out.size; }
  get EdgeCount() { return this._count; }
  get Vertices() { return Array.from(this._out.keys()); }
  get Edges() { const a = []; for (const edges of this._out.values()) for (const e of edges) a.push(e); return a; }
  ContainsVertex(vertex) { return this._out.has(requireValue(vertex, 'vertex')); }
  ContainsEdge(edgeOrSource, target) { if (arguments.length === 2) return this.TryGetEdge(edgeOrSource, target) !== undefined; const edge = requireValue(edgeOrSource, 'edge'); return this._out.get(edge.Source)?.some(e => equals(e, edge)) ?? false; }
  TryGetEdge(source, target) { requireValue(source); requireValue(target); return this._out.get(source)?.find(e => equals(e.Target, target)); }
  TryGetEdges(source, target) { requireValue(source); requireValue(target); return this._out.get(source)?.filter(e => equals(e.Target, target)); }
  OutEdges(vertex) { const a = this.TryGetOutEdges(vertex); if (!a) throw new VertexNotFoundException(); return a; }
  TryGetOutEdges(vertex) { return this._out.get(requireValue(vertex, 'vertex'))?.slice(); }
  InEdges(vertex) { const a = this.TryGetInEdges(vertex); if (!a) throw new VertexNotFoundException(); return a; }
  TryGetInEdges(vertex) { return this._in.get(requireValue(vertex, 'vertex'))?.slice(); }
  OutDegree(vertex) { const a = this._out.get(requireValue(vertex)); if (!a) throw new VertexNotFoundException(); return a.length; }
  InDegree(vertex) { const a = this._in.get(requireValue(vertex)); if (!a) throw new VertexNotFoundException(); return a.length; }
  AddVertex(vertex) { requireValue(vertex, 'vertex'); if (this._out.has(vertex)) return false; this._out.set(vertex, []); this._in.set(vertex, []); this.VertexAdded.emit(vertex); return true; }
  AddVertexRange(vertices) { let n = 0; for (const v of batch(vertices, 'vertices')) n += this.AddVertex(v); return n; }
  AddEdge(edge) { requireValue(edge, 'edge'); if (!this.ContainsVertex(edge.Source) || !this.ContainsVertex(edge.Target)) throw new VertexNotFoundException(); if (!this.AllowParallelEdges && this.ContainsEdge(edge.Source, edge.Target)) return false; this._out.get(edge.Source).push(edge); this._in.get(edge.Target).push(edge); ++this._count; this.EdgeAdded.emit(edge); return true; }
  AddEdgeRange(edges) { let n = 0; for (const e of batch(edges, 'edges')) n += this.AddEdge(e); return n; }
  AddVerticesAndEdge(edge) { requireValue(edge, 'edge'); this.AddVertex(edge.Source); this.AddVertex(edge.Target); return this.AddEdge(edge); }
  AddVerticesAndEdgeRange(edges) { let n = 0; for (const e of batch(edges, 'edges')) n += this.AddVerticesAndEdge(e); return n; }
  RemoveEdge(edge) { requireValue(edge, 'edge'); const out = this._out.get(edge.Source); if (!out || !removeOne(out, edge)) return false; removeOne(this._in.get(edge.Target), edge); --this._count; this.EdgeRemoved.emit(edge); return true; }
  RemoveEdges(edges) { let n = 0; for (const e of batch(edges, 'edges')) n += this.RemoveEdge(e); return n; }
  RemoveEdgeIf(predicate) { requireValue(predicate); return this.RemoveEdges(this.Edges.filter(predicate)); }
  RemoveOutEdgeIf(vertex, predicate) { requireValue(predicate); return this.RemoveEdges((this.TryGetOutEdges(vertex) ?? []).filter(predicate)); }
  RemoveInEdgeIf(vertex, predicate) { requireValue(predicate); return this.RemoveEdges((this.TryGetInEdges(vertex) ?? []).filter(predicate)); }
  ClearOutEdges(vertex) { this.RemoveEdges(this.TryGetOutEdges(vertex) ?? []); }
  ClearInEdges(vertex) { this.RemoveEdges(this.TryGetInEdges(vertex) ?? []); }
  ClearEdges(vertex) { this.ClearOutEdges(vertex); this.ClearInEdges(vertex); }
  RemoveVertex(vertex) { if (!this.ContainsVertex(vertex)) return false; this.ClearEdges(vertex); this._out.delete(vertex); this._in.delete(vertex); this.VertexRemoved.emit(vertex); return true; }
  RemoveVertexIf(predicate) { requireValue(predicate); const vs = this.Vertices.filter(predicate); for (const v of vs) this.RemoveVertex(v); return vs.length; }
  Clear() { const es = this.Edges, vs = this.Vertices; this._out.clear(); this._in.clear(); this._count = 0; for (const e of es) this.EdgeRemoved.emit(e); for (const v of vs) this.VertexRemoved.emit(v); }
  TrimEdgeExcess() { for (const [v, es] of this._out) this._out.set(v, es.slice()); for (const [v, es] of this._in) this._in.set(v, es.slice()); }
  Clone() { return new this.constructor(this); }
}
export class BidirectionalGraph extends AdjacencyGraph {
  MergeVertex(vertex, edgeFactory) { requireValue(edgeFactory); const ins = this.InEdges(vertex).filter(e => !IsSelfEdge(e)), outs = this.OutEdges(vertex).filter(e => !IsSelfEdge(e)); this.RemoveVertex(vertex); for (const i of ins) for (const o of outs) this.AddEdge(edgeFactory(i.Source, o.Target)); }
  MergeVerticesIf(predicate, edgeFactory) { requireValue(predicate); requireValue(edgeFactory); for (const v of this.Vertices.filter(predicate)) this.MergeVertex(v, edgeFactory); }
}
export class UndirectedGraph extends AdjacencyGraph {
  constructor(allowParallelEdges = true, edgeEqualityComparer = UndirectedVertexEquality) { super(typeof allowParallelEdges === 'object' ? requireValue(allowParallelEdges).AllowParallelEdges : allowParallelEdges); this.EdgeCapacity = -1; this.EdgeEqualityComparer = requireValue(edgeEqualityComparer); this._edges = []; if (typeof allowParallelEdges === 'object') { this.AddVertexRange(allowParallelEdges.Vertices); this.AddEdgeRange(allowParallelEdges.Edges); } }
  get IsDirected() { return false; }
  get Edges() { return this._edges.slice(); }
  ContainsEdge(edgeOrSource, target) { if (arguments.length === 2) return this.TryGetEdge(edgeOrSource, target) !== undefined; requireValue(edgeOrSource); return this._out.get(edgeOrSource.Source)?.some(e => equals(e, edgeOrSource)) ?? false; }
  TryGetEdges(source, target) { requireValue(target); const es = this.TryGetAdjacentEdges(source)?.filter(e => this.EdgeEqualityComparer(e, source, target)); return es?.length ? es : undefined; }
  TryGetEdge(source, target) { requireValue(source); requireValue(target); if (this._sortedEdgeType && defaultCompare(source, target) > 0) [source, target] = [target, source]; return this._out.get(source)?.find(e => this.EdgeEqualityComparer(e, source, target)); }
  AdjacentEdges(vertex) { return this.OutEdges(vertex); }
  AdjacentDegree(vertex) { return this.AdjacentEdges(vertex).reduce((n, e) => n + (IsSelfEdge(e) ? 2 : 1), 0); }
  TryGetAdjacentEdges(vertex) { return this.TryGetOutEdges(vertex); }
  InEdges(vertex) { return this.OutEdges(vertex); }
  TryGetInEdges(vertex) { return this.TryGetOutEdges(vertex); }
  InDegree(vertex) { return this.OutDegree(vertex); }
  Degree(vertex) { return this.AdjacentDegree(vertex); }
  AddEdge(edge) { requireValue(edge); if (!this.ContainsVertex(edge.Source) || !this.ContainsVertex(edge.Target)) throw new VertexNotFoundException(); if (!this.AllowParallelEdges && this.ContainsEdge(edge.Source, edge.Target)) return false; this._sortedEdgeType = (this._sortedEdgeType ?? true) && edge instanceof UndirectedEdge; this._out.get(edge.Source).push(edge); if (!IsSelfEdge(edge)) this._out.get(edge.Target).push(edge); this._edges.push(edge); ++this._count; this.EdgeAdded.emit(edge); return true; }
  RemoveEdge(edge) { requireValue(edge); const a = this._out.get(edge.Source); if (!a || !removeOne(a, edge)) return false; if (!IsSelfEdge(edge)) removeOne(this._out.get(edge.Target), edge); removeOne(this._edges, edge); --this._count; this.EdgeRemoved.emit(edge); return true; }
  ClearAdjacentEdges(vertex) { this.RemoveEdges(this.TryGetAdjacentEdges(vertex) ?? []); }
  ClearEdges(vertex) { this.ClearAdjacentEdges(vertex); }
  ClearInEdges(vertex) { this.ClearAdjacentEdges(vertex); }
  RemoveAdjacentEdgeIf(vertex, predicate) { requireValue(predicate); return this.RemoveEdges((this.TryGetAdjacentEdges(vertex) ?? []).filter(predicate)); }
  Clear() { const edges = this.Edges, vertices = this.Vertices; this._edges.length = 0; this._out.clear(); this._in.clear(); this._count = 0; for (const e of edges) this.EdgeRemoved.emit(e); for (const v of vertices) this.VertexRemoved.emit(v); }
  Clone() { const g = new UndirectedGraph(this.AllowParallelEdges, this.EdgeEqualityComparer); g.EdgeCapacity = this.EdgeCapacity; g.AddVertexRange(this.Vertices); g.AddEdgeRange(this.Edges); return g; }
}

export class EdgeListGraph extends GraphQueries {
  constructor(isDirected = true, allowParallelEdges = true) { super(); this.IsDirected = !!isDirected; this.AllowParallelEdges = !!allowParallelEdges; this._edges = []; this.EdgeAdded = new EventHook(); this.EdgeRemoved = new EventHook(); }
  get Edges() { return this._edges.slice(); } get EdgeCount() { return this._edges.length; }
  get Vertices() { const s = new Set(); for (const e of this._edges) { s.add(e.Source); s.add(e.Target); } return [...s]; }
  get VertexCount() { return this.Vertices.length; }
  ContainsVertex(vertex) { requireValue(vertex); return this._edges.some(e => IsAdjacent(e, vertex)); }
  TryGetOutEdges(v) { return this.ContainsVertex(v) ? this._edges.filter(e => this.IsDirected ? equals(e.Source, v) : IsAdjacent(e, v)) : undefined; }
  OutEdges(v) { const a = this.TryGetOutEdges(v); if (!a) throw new VertexNotFoundException(); return a; }
  InEdges(v) { if (!this.ContainsVertex(v)) throw new VertexNotFoundException(); return this._edges.filter(e => this.IsDirected ? equals(e.Target, v) : IsAdjacent(e, v)); }
  AddEdge(edge) { requireValue(edge); if (this.AllowParallelEdges ? this.ContainsEdge(edge) : this.ContainsEdge(edge.Source, edge.Target)) return false; this._edges.push(edge); this.EdgeAdded.emit(edge); return true; }
  AddVerticesAndEdge(edge) { return this.AddEdge(edge); }
  AddEdgeRange(edges) { let n = 0; for (const e of batch(edges, 'edges')) n += this.AddEdge(e); return n; }
  AddVerticesAndEdgeRange(edges) { return this.AddEdgeRange(edges); }
  RemoveEdge(edge) { requireValue(edge); if (!removeOne(this._edges, edge)) return false; this.EdgeRemoved.emit(edge); return true; }
  RemoveEdgeIf(predicate) { requireValue(predicate); const a = this.Edges.filter(predicate); for (const e of a) this.RemoveEdge(e); return a.length; }
  Clear() { const a = this._edges; this._edges = []; for (const e of a) this.EdgeRemoved.emit(e); }
  Clone() { const g = new EdgeListGraph(this.IsDirected, this.AllowParallelEdges); g.AddEdgeRange(this.Edges); return g; }
}

class GraphView extends GraphQueries {
  constructor(graph) { super(); this.OriginalGraph = requireValue(graph, 'graph'); }
  get IsDirected() { return this.OriginalGraph.IsDirected; } get AllowParallelEdges() { return this.OriginalGraph.AllowParallelEdges; }
  get Vertices() { return Array.from(this.OriginalGraph.Vertices); } get VertexCount() { return this.OriginalGraph.VertexCount; }
  get Edges() { return Array.from(this.OriginalGraph.Edges); } get EdgeCount() { return this.OriginalGraph.EdgeCount; }
  ContainsVertex(v) { return this.OriginalGraph.ContainsVertex(v); }
  OutEdges(v) { return Array.from(this.OriginalGraph.OutEdges(v)); } TryGetOutEdges(v) { return this.ContainsVertex(v) ? this.OutEdges(v) : undefined; }
  InEdges(v) { return Array.from(this.OriginalGraph.InEdges(v)); } TryGetInEdges(v) { return this.ContainsVertex(v) ? this.InEdges(v) : undefined; }
}
export class ArrayAdjacencyGraph extends GraphView { constructor(graph) { const g = new AdjacencyGraph(requireValue(graph).AllowParallelEdges); g.AddVertexRange(graph.Vertices); g.AddEdgeRange(graph.Edges); super(g); } Clone() { return new this.constructor(this); } }
export class ArrayBidirectionalGraph extends ArrayAdjacencyGraph { constructor(graph) { super(graph); for (const vertex of graph.Vertices) this.OriginalGraph._in.set(vertex, Array.from(graph.InEdges(vertex))); } }
export class ArrayUndirectedGraph extends GraphView {
  constructor(graph) { const g = new UndirectedGraph(requireValue(graph).AllowParallelEdges, graph.EdgeEqualityComparer ?? UndirectedVertexEquality); g.AddVertexRange(graph.Vertices); g.AddEdgeRange(graph.Edges); super(g); this.EdgeEqualityComparer = g.EdgeEqualityComparer; }
  AdjacentEdges(v) { return this.OriginalGraph.AdjacentEdges(v); }
  AdjacentDegree(v) { return this.OriginalGraph.AdjacentDegree(v); }
  TryGetEdges(s, t) { return this.OriginalGraph.TryGetEdges(s, t); }
  Clone() { return new ArrayUndirectedGraph(this); }
}
export class BidirectionalAdapterGraph extends GraphView {
  constructor(graph) { super(graph); this._incoming = new Map(); for (const v of graph.Vertices) this._incoming.set(v, []); for (const e of graph.Edges) { if (!this._incoming.has(e.Target)) this._incoming.set(e.Target, []); this._incoming.get(e.Target).push(e); } }
  InEdges(v) { const edges = this._incoming.get(requireValue(v)); if (!edges) throw new VertexNotFoundException(); return edges.slice(); }
  TryGetInEdges(v) { return this._incoming.get(requireValue(v))?.slice(); }
}
export class ReversedBidirectionalGraph extends GraphView {
  get Edges() { return this.OriginalGraph.Edges.map(e => new SReversedEdge(e)); }
  OutEdges(v) { return this.OriginalGraph.InEdges(v).map(e => new SReversedEdge(e)); }
  InEdges(v) { return this.OriginalGraph.OutEdges(v).map(e => new SReversedEdge(e)); }
}
export class UndirectedBidirectionalGraph extends GraphView {
  constructor(graph) { super(graph); this.EdgeEqualityComparer = UndirectedVertexEquality; }
  get IsDirected() { return false; }
  AdjacentEdges(v) { return this.OriginalGraph.OutEdges(v).concat(this.OriginalGraph.InEdges(v).filter(e => !IsSelfEdge(e))); }
  AdjacentDegree(v) { return this.OriginalGraph.Degree(v); }
  AdjacentEdge() { throw new NotSupportedException(); }
  OutEdges(v) { return this.AdjacentEdges(v); } InEdges(v) { return this.AdjacentEdges(v); }
}

export class BidirectionalMatrixGraph extends BidirectionalGraph {
  constructor(vertexCount) { if (!Number.isInteger(vertexCount) || vertexCount < 0) throw new RangeError('vertexCount must be nonnegative.'); super(false); this._size = vertexCount; for (let i = 0; i < vertexCount; ++i) AdjacencyGraph.prototype.AddVertex.call(this, i); }
  AddVertex() { throw new TypeError('Matrix graph has a fixed vertex set.'); }
  RemoveVertex() { throw new TypeError('Matrix graph has a fixed vertex set.'); }
  ContainsVertex(v) { return Number.isInteger(v) && v >= 0 && v < this._size; }
  TryGetEdge(s, t) { return this.ContainsVertex(s) && this.ContainsVertex(t) ? this._matrix?.get(s * this._size + t) : undefined; }
  AddEdge(e) { requireValue(e); if (!this.ContainsVertex(e.Source) || !this.ContainsVertex(e.Target)) throw new VertexNotFoundException(); if (!this._matrix) this._matrix = new Map(); const key = e.Source * this._size + e.Target; if (this._matrix.has(key)) return false; this._matrix.set(key, e); this._out.get(e.Source).push(e); this._in.get(e.Target).push(e); ++this._count; this.EdgeAdded.emit(e); return true; }
  RemoveEdge(e) { requireValue(e); const key = e.Source * this._size + e.Target, stored = this._matrix?.get(key); if (!stored || !equals(stored, e)) return false; this._matrix.delete(key); return super.RemoveEdge(stored); }
  OutEdges(v) { return super.OutEdges(v).sort((a, b) => a.Target - b.Target); }
  InEdges(v) { return super.InEdges(v).sort((a, b) => a.Source - b.Source); }
  get Edges() { return super.Edges.sort((a, b) => a.Source - b.Source || a.Target - b.Target); }
  Clear() { this.RemoveEdgeIf(() => true); }
  Clone() { const g = new BidirectionalMatrixGraph(this.VertexCount); g.AddEdgeRange(this.Edges); return g; }
}

/** Compact immutable adjacency graph: typed offset array plus contiguous targets. */
export class CompressedSparseRowGraph extends GraphQueries {
  constructor(graph) { super(); requireValue(graph); this._vertices = Array.from(graph.Vertices); this._index = new Map(this._vertices.map((v, i) => [v, i])); this._offsets = new Uint32Array(this._vertices.length + 1); this._targets = []; for (let i = 0; i < this._vertices.length; ++i) { this._offsets[i] = this._targets.length; for (const e of graph.OutEdges(this._vertices[i])) this._targets.push(e.Target); } this._offsets[this._vertices.length] = this._targets.length; }
  static FromGraph(graph) { return new CompressedSparseRowGraph(graph); }
  get IsDirected() { return true; } get AllowParallelEdges() { return false; }
  get VertexCount() { return this._vertices.length; } get Vertices() { return this._vertices.slice(); }
  get EdgeCount() { return this._targets.length; }
  get Edges() { const a = []; for (const v of this._vertices) for (const e of this.OutEdges(v)) a.push(e); return a; }
  ContainsVertex(v) { return this._index.has(requireValue(v)); }
  OutEdges(v) { const a = this.TryGetOutEdges(v); if (!a) throw new VertexNotFoundException(); return a; }
  TryGetOutEdges(v) { requireValue(v); const i = this._index.get(v); if (i === undefined) return undefined; const a = []; for (let j = this._offsets[i]; j < this._offsets[i + 1]; ++j) a.push(new SEquatableEdge(v, this._targets[j])); return a; }
  OutDegree(v) { const i = this._index.get(requireValue(v)); if (i === undefined) throw new VertexNotFoundException(); return this._offsets[i + 1] - this._offsets[i]; }
  Clone() { return new CompressedSparseRowGraph(this); }
}

export class DelegateImplicitGraph extends GraphQueries {
  constructor(tryGetOutEdges, allowParallelEdges = true) { super(); this._getter = requireValue(tryGetOutEdges); this.AllowParallelEdges = !!allowParallelEdges; }
  get IsDirected() { return true; }
  TryGetOutEdges(v) { const a = this._getter(requireValue(v)); return a == null || a === false ? undefined : Array.from(a); }
  ContainsVertex(v) { return this.TryGetOutEdges(v) !== undefined; }
  OutEdges(v) { const a = this.TryGetOutEdges(v); if (!a) throw new VertexNotFoundException(); return a; }
}
export class DelegateIncidenceGraph extends DelegateImplicitGraph {}
export class DelegateBidirectionalIncidenceGraph extends DelegateIncidenceGraph {
  constructor(outEdges, inEdges, allowParallelEdges = true) { super(outEdges, allowParallelEdges); this._inGetter = requireValue(inEdges); }
  TryGetInEdges(v) { const a = this._inGetter(requireValue(v)); return a == null || a === false ? undefined : Array.from(a); }
  InEdges(v) { const a = this.TryGetInEdges(v); if (!a) throw new VertexNotFoundException(); return a; }
}
export class DelegateVertexAndEdgeListGraph extends DelegateIncidenceGraph {
  constructor(vertices, getter, allowParallelEdges = true) { super(getter, allowParallelEdges); this._vertices = requireValue(vertices); }
  get Vertices() { return Array.from(typeof this._vertices === 'function' ? this._vertices() : this._vertices); }
  get VertexCount() { return this.Vertices.length; }
  get Edges() { return this.Vertices.flatMap(v => this.OutEdges(v)); }
  get EdgeCount() { return this.Edges.length; }
  ContainsVertex(v) { requireValue(v); return this.Vertices.some(x => equals(x, v)); }
  TryGetOutEdges(v) { if (!this.ContainsVertex(v)) return undefined; const vertices = new Set(this.Vertices); return (super.TryGetOutEdges(v) ?? []).filter(e => equals(e.Source, v) && vertices.has(e.Target)); }
  OutEdges(v) { if (!this.ContainsVertex(v)) throw new VertexNotFoundException(); const a = this._getter(v); if (a == null || a === false) throw new VertexNotFoundException(); const vertices = new Set(this.Vertices); return Array.from(a).filter(e => equals(e.Source, v) && vertices.has(e.Target)); }
}
export class DelegateImplicitUndirectedGraph extends DelegateImplicitGraph {
  constructor(getter, allowParallelEdges = true) { super(getter, allowParallelEdges); this.EdgeEqualityComparer = UndirectedVertexEquality; }
  get IsDirected() { return false; }
  AdjacentEdges(v) { return this.OutEdges(v); } TryGetAdjacentEdges(v) { return this.TryGetOutEdges(v); }
}
export class DelegateUndirectedGraph extends DelegateImplicitUndirectedGraph {
  constructor(vertices, getter, allowParallelEdges = true) { super(getter, allowParallelEdges); this._vertices = requireValue(vertices); }
  get Vertices() { return Array.from(typeof this._vertices === 'function' ? this._vertices() : this._vertices); }
  get VertexCount() { return this.Vertices.length; }
  get Edges() { return this.Vertices.flatMap(v => this.AdjacentEdges(v).filter(e => equals(e.Source, v))); }
  get EdgeCount() { return this.Edges.length; }
  ContainsVertex(v) { requireValue(v); return this.Vertices.some(x => equals(x, v)); }
  TryGetOutEdges(v) { if (!this.ContainsVertex(v)) return undefined; const vertices = new Set(this.Vertices); return (super.TryGetOutEdges(v) ?? []).filter(e => IsAdjacent(e, v) && vertices.has(GetOtherVertex(e, v))); }
  OutEdges(v) { if (!this.ContainsVertex(v)) throw new VertexNotFoundException(); const a = this._getter(v); if (a == null || a === false) throw new VertexNotFoundException(); const vertices = new Set(this.Vertices); return Array.from(a).filter(e => IsAdjacent(e, v) && vertices.has(GetOtherVertex(e, v))); }
}

export class ClusteredAdjacencyGraph extends GraphView {
  constructor(graph) { const parent = graph instanceof ClusteredAdjacencyGraph ? graph : null; super(parent ? new AdjacencyGraph(parent.AllowParallelEdges) : requireValue(graph)); this.Parent = parent; this.Wrapped = this.OriginalGraph; this.Collapsed = false; this._clusters = []; }
  get EdgeCapacity() { return this.Wrapped.EdgeCapacity; } set EdgeCapacity(v) { this.Wrapped.EdgeCapacity = v; }
  get VertexType() { return Object; } get EdgeType() { return Edge; }
  get Clusters() { return this._clusters.slice(); } get ClustersCount() { return this._clusters.length; }
  AddCluster() { const c = new ClusteredAdjacencyGraph(this); this._clusters.push(c); return c; }
  RemoveCluster(graph) { requireValue(graph); removeOne(this._clusters, graph); }
  AddVertex(v) { this.Parent?.AddVertex(v); return this.Wrapped.AddVertex(v); }
  AddVertexRange(vs) { return batch(vs).reduce((n, v) => n + this.AddVertex(v), 0); }
  AddEdge(e) { requireValue(e); if (this.Parent && !this.Parent.ContainsEdge(e)) this.Parent.AddEdge(e); return this.Wrapped.AddEdge(e); }
  AddEdgeRange(es) { return batch(es).reduce((n, e) => n + this.AddEdge(e), 0); }
  AddVerticesAndEdge(e) { requireValue(e); this.AddVertex(e.Source); this.AddVertex(e.Target); return this.AddEdge(e); }
  AddVerticesAndEdgeRange(es) { return batch(es).reduce((n, e) => n + this.AddVerticesAndEdge(e), 0); }
  _removeDescendants(method, value) { for (const c of this._clusters) { c.Wrapped[method](value); c._removeDescendants(method, value); } }
  RemoveVertex(v) { if (!this.ContainsVertex(v)) return false; this._removeDescendants('RemoveVertex', v); this.Wrapped.RemoveVertex(v); this.Parent?.RemoveVertex(v); return true; }
  RemoveEdge(e) { if (!this.ContainsEdge(e)) return false; this._removeDescendants('RemoveEdge', e); this.Wrapped.RemoveEdge(e); this.Parent?.RemoveEdge(e); return true; }
  RemoveVertexIf(p) { requireValue(p); return this.Vertices.filter(p).reduce((n, v) => n + this.RemoveVertex(v), 0); }
  RemoveEdgeIf(p) { requireValue(p); return this.Edges.filter(p).reduce((n, e) => n + this.RemoveEdge(e), 0); }
  RemoveOutEdgeIf(v, p) { requireValue(p); return (this.TryGetOutEdges(v) ?? []).filter(p).reduce((n, e) => n + this.RemoveEdge(e), 0); }
  ClearOutEdges(v) { this.Wrapped.ClearOutEdges(v); }
  Clear() { this.Wrapped.Clear(); this._clusters.length = 0; }
}

/** Live filtered view. Both endpoints and the edge itself must satisfy their predicates. */
export class FilteredGraph extends GraphView {
  constructor(baseGraph, vertexPredicate, edgePredicate) { super(baseGraph); this.BaseGraph = baseGraph; this.VertexPredicate = requireValue(vertexPredicate); this.EdgePredicate = requireValue(edgePredicate); }
  FilterEdge(e) { requireValue(e); return this.VertexPredicate(e.Source) && this.VertexPredicate(e.Target) && this.EdgePredicate(e); }
  get Vertices() { return Array.from(this.BaseGraph.Vertices).filter(this.VertexPredicate); }
  get VertexCount() { return this.Vertices.length; }
  get Edges() { return Array.from(this.BaseGraph.Edges).filter(e => this.FilterEdge(e)); }
  get EdgeCount() { return this.Edges.length; }
  ContainsVertex(v) { return this.VertexPredicate(requireValue(v)) && this.BaseGraph.ContainsVertex(v); }
  ContainsEdge(e, t) { if (arguments.length === 2) return this.TryGetEdge(e, t) !== undefined; return this.FilterEdge(e) && this.BaseGraph.ContainsEdge(e); }
  OutEdges(v) { if (!this.VertexPredicate(requireValue(v))) throw new VertexNotFoundException(); return Array.from(this.BaseGraph.OutEdges(v)).filter(e => this.FilterEdge(e)); }
  TryGetOutEdges(v) { return this.ContainsVertex(v) ? this.OutEdges(v) : undefined; }
  InEdges(v) { if (!this.VertexPredicate(requireValue(v))) throw new VertexNotFoundException(); return Array.from(this.BaseGraph.InEdges(v)).filter(e => this.FilterEdge(e)); }
  TryGetInEdges(v) { return this.ContainsVertex(v) ? this.InEdges(v) : undefined; }
  TryGetEdges(s, t) { requireValue(s); requireValue(t); if (!this.VertexPredicate(s) || !this.VertexPredicate(t)) return undefined; return this.BaseGraph.TryGetEdges(s, t)?.filter(e => this.EdgePredicate(e)); }
}
export class FilteredImplicitVertexSet extends FilteredGraph {}
export class FilteredImplicitGraph extends FilteredImplicitVertexSet {}
export class FilteredIncidenceGraph extends FilteredImplicitGraph {}
export class FilteredVertexListGraph extends FilteredIncidenceGraph {}
export class FilteredVertexAndEdgeListGraph extends FilteredVertexListGraph {}
export class FilteredEdgeListGraph extends FilteredImplicitVertexSet {}
export class FilteredBidirectionalGraph extends FilteredVertexListGraph {}
export class FilteredUndirectedGraph extends FilteredGraph {
  get EdgeEqualityComparer() { return this.BaseGraph.EdgeEqualityComparer; }
  AdjacentEdges(v) { if (!this.VertexPredicate(requireValue(v))) throw new VertexNotFoundException(); return Array.from(this.BaseGraph.AdjacentEdges(v)).filter(e => this.FilterEdge(e)); }
  AdjacentDegree(v) { return this.AdjacentEdges(v).reduce((n, e) => n + (IsSelfEdge(e) ? 2 : 1), 0); }
  OutEdges(v) { return this.AdjacentEdges(v); } InEdges(v) { return this.AdjacentEdges(v); }
}
export class InDictionaryVertexPredicate { constructor(vertexMap) { this.VertexMap = requireValue(vertexMap); } Test(v) { return this.VertexMap.has(requireValue(v)); } }
export class IsolatedVertexPredicate { constructor(graph) { this.VisitedGraph = requireValue(graph); } Test(v) { return this.VisitedGraph.Degree(requireValue(v)) === 0; } }
export class SinkVertexPredicate { constructor(graph) { this.VisitedGraph = requireValue(graph); } Test(v) { return this.VisitedGraph.OutDegree(requireValue(v)) === 0; } }
export class ResidualEdgePredicate { constructor(capacities) { this.ResidualCapacities = requireValue(capacities); } Test(e) { requireValue(e); if (!this.ResidualCapacities.has(e)) throw new TypeError('Residual capacity is missing.'); return this.ResidualCapacities.get(e) > 0; } }
export class ReversedResidualEdgePredicate extends ResidualEdgePredicate { constructor(capacities, reversedEdges) { super(capacities); this.ReversedEdges = requireValue(reversedEdges); } Test(e) { requireValue(e); if (!this.ReversedEdges.has(e)) throw new TypeError('Reversed edge is missing.'); return super.Test(this.ReversedEdges.get(e)); } }

export function IsSelfEdge(edge) { requireValue(edge); return equals(edge.Source, edge.Target); }
export function GetOtherVertex(edge, vertex) { requireValue(edge); requireValue(vertex); return equals(edge.Source, vertex) ? edge.Target : edge.Source; }
export function IsAdjacent(edge, vertex) { requireValue(edge); requireValue(vertex); return equals(edge.Source, vertex) || equals(edge.Target, vertex); }
export function IsPath(path) { let first = true, last; for (const e of requireValue(path)) { if (!first && !equals(last, e.Source)) return false; first = false; last = e.Target; } return true; }
export function HasCycles(path) { const seen = new Set(); let first = true; for (const e of requireValue(path)) { if (first) { seen.add(e.Source); first = false; } if (seen.has(e.Target)) return true; seen.add(e.Target); } return false; }
export function IsPathWithoutCycles(path) { const a = Array.from(requireValue(path)); return IsPath(a) && !HasCycles(a); }
export function ToVertexPair(edge) { requireValue(edge); return new SEquatableEdge(edge.Source, edge.Target); }
export function IsPredecessor(predecessors, root, vertex) { requireValue(predecessors); requireValue(root); requireValue(vertex); const seen = new Set(); while (!seen.has(vertex)) { if (equals(vertex, root)) return true; seen.add(vertex); const e = predecessors.get(vertex); if (!e) return false; vertex = GetOtherVertex(e, vertex); } return false; }
export function TryGetPath(predecessors, vertex) { requireValue(predecessors); requireValue(vertex); const a = [], seen = new Set(); while (predecessors.has(vertex)) { if (seen.has(vertex)) return undefined; seen.add(vertex); const e = predecessors.get(vertex); if (IsSelfEdge(e)) break; a.push(e); vertex = GetOtherVertex(e, vertex); } return a.length ? a.reverse() : undefined; }
export function SortedVertexEquality(edge, source, target) { requireValue(edge); requireValue(source); requireValue(target); return equals(edge.Source, source) && equals(edge.Target, target); }
export function UndirectedVertexEquality(edge, source, target) { return SortedVertexEquality(edge, source, target) || SortedVertexEquality(edge, target, source); }
export function GetUndirectedVertexEquality(edgeType) { return edgeType === UndirectedEdge || edgeType?.prototype instanceof UndirectedEdge ? SortedVertexEquality : UndirectedVertexEquality; }
export function ReverseEdges(edges) { return Array.from(requireValue(edges), e => new SReversedEdge(e)); }
export const EdgeExtensions = Object.freeze({ IsSelfEdge, GetOtherVertex, IsAdjacent, IsPath, HasCycles, IsPathWithoutCycles, ToVertexPair, IsPredecessor, TryGetPath, SortedVertexEquality, UndirectedVertexEquality, GetUndirectedVertexEquality, ReverseEdges });
for (const [name, fn] of Object.entries({ IsSelfEdge, GetOtherVertex, IsAdjacent, ToVertexPair, SortedVertexEquality, UndirectedVertexEquality })) Object.defineProperty(Edge.prototype, name, { value(...args) { return fn(this, ...args); } });

function convert(Graph, input, factoryOrParallel = true, parallel = true) {
  requireValue(input); requireValue(factoryOrParallel); const factory = typeof factoryOrParallel === 'function' ? factoryOrParallel : null, g = new Graph(factory ? parallel : factoryOrParallel);
  if (factory) { g.AddVertexRange(input); for (const v of g.Vertices) g.AddEdgeRange(factory(v)); }
  else if (input.Vertices && input.Edges) { g.AddVertexRange(input.Vertices); g.AddEdgeRange(input.Edges); }
  else { const a = Array.from(input); if (a.length && Array.isArray(a[0])) { if (a.length !== 2 || a[0].length !== a[1]?.length) throw new RangeError('Expected equally sized source and target columns.'); g.AddVerticesAndEdgeRange(a[0].map((s, i) => new SEquatableEdge(s, a[1][i]))); } else g.AddVerticesAndEdgeRange(a); }
  return g;
}
export function ToAdjacencyGraph(input, factoryOrParallel = true, parallel = true) { return convert(AdjacencyGraph, input, factoryOrParallel, parallel); }
export function ToBidirectionalGraph(input, factoryOrParallel = true, parallel = true) { if (input?.Vertices && input?.Edges && arguments.length === 1) { if (!input.IsDirected) return convert(BidirectionalGraph, input); return input instanceof BidirectionalGraph || input instanceof ArrayBidirectionalGraph ? input : new BidirectionalAdapterGraph(input); } return convert(BidirectionalGraph, input, factoryOrParallel, parallel); }
export function ToUndirectedGraph(input, factoryOrParallel = true, parallel = true) { return convert(UndirectedGraph, input, factoryOrParallel, parallel); }
export function ToArrayAdjacencyGraph(graph) { return new ArrayAdjacencyGraph(graph); }
export function ToArrayBidirectionalGraph(graph) { return new ArrayBidirectionalGraph(graph); }
export function ToArrayUndirectedGraph(graph) { return new ArrayUndirectedGraph(graph); }
export function ToCompressedRowGraph(graph) { return CompressedSparseRowGraph.FromGraph(graph); }
export function ToDelegateIncidenceGraph(getter) { return new DelegateIncidenceGraph(getter); }
export function ToDelegateBidirectionalIncidenceGraph(outGetter, inGetter) { return new DelegateBidirectionalIncidenceGraph(outGetter, inGetter); }
export function ToDelegateVertexAndEdgeListGraph(vertices, getter) { if (vertices instanceof globalThis.Map) { if (arguments.length > 1) requireValue(getter); const map = vertices; return new DelegateVertexAndEdgeListGraph(() => map.keys(), v => map.has(v) ? (getter ? getter({ Key: v, Value: map.get(v) }) : map.get(v)) : undefined); } return new DelegateVertexAndEdgeListGraph(vertices, getter); }
export function ToDelegateUndirectedGraph(vertices, getter) { return new DelegateUndirectedGraph(vertices, getter); }
export const GraphExtensions = Object.freeze({ ToAdjacencyGraph, ToBidirectionalGraph, ToUndirectedGraph, ToArrayAdjacencyGraph, ToArrayBidirectionalGraph, ToArrayUndirectedGraph, ToCompressedRowGraph, ToDelegateIncidenceGraph, ToDelegateBidirectionalIncidenceGraph, ToDelegateVertexAndEdgeListGraph, ToDelegateUndirectedGraph });
for (const [name, fn] of Object.entries(GraphExtensions)) if (!name.startsWith('ToDelegate')) Object.defineProperty(GraphQueries.prototype, name, { value(...args) { return fn(this, ...args); } });
