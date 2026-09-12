// Port of QuikGraph algorithm lifecycle, rooted algorithms and services (MS-PL).
import { EqualityMap as Map, valueEquals } from './equality.js';
import * as Core from './core.js';
import { EventHook, requireValue } from './core.js';
export { requireValue } from './core.js';
export { GraphColor } from './core.js';
export const ComputationState = Object.freeze({ NotRunning: 0, Running: 1, PendingAbortion: 2, Finished: 3, Aborted: 4 });
export class OperationCanceledException extends Error { constructor(message = 'Algorithm aborted.') { super(message); this.name = 'OperationCanceledException'; } }
export function algorithmError(name, message) { if (typeof Core[name] === 'function') return new Core[name](message); const error = new Error(message); error.name = name; return error; }
export const sameVertex = valueEquals;
export function events(owner, names) { for (const name of names.split(' ')) if (!owner[name]) owner[name] = new EventHook(); }
export class CancelManager {
  constructor() { this.IsCancelling = false; this.CancelRequested = new EventHook(); this.CancelReset = new EventHook(); this.Cancelling = this.CancelRequested; }
  Cancel() { if (!this.IsCancelling) { this.IsCancelling = true; this.Cancelling.emit(this, {}); } }
  ResetCancel() { const cancelled = this.IsCancelling; this.IsCancelling = false; if (cancelled) this.CancelReset.emit(this, {}); }
}
export class AlgorithmServices {
  constructor(host) { this.Host = requireValue(host, 'host'); }
  get CancelManager() { return this._cancelManager ??= this.Host.GetService(CancelManager); }
}
export class AlgorithmBase {
  constructor(host, graph) {
    if (arguments.length === 1) { graph = host; host = null; }
    this.VisitedGraph = requireValue(graph, 'visitedGraph'); this.State = ComputationState.NotRunning;
    this.SyncRoot = {}; this._services = new Map(); this.Services = new AlgorithmServices(host ?? this);
    events(this, 'StateChanged Started Finished Aborted');
  }
  TryGetService(type) {
    requireValue(type, 'serviceType');
    if (type === CancelManager || type === 'ICancelManager' || type === 'CancelManager') {
      if (!this._services.has(CancelManager)) this._services.set(CancelManager, new CancelManager());
      return this._services.get(CancelManager);
    }
    return this._services.get(type);
  }
  GetService(type) { const service = this.TryGetService(type); if (service === undefined) throw algorithmError('InvalidOperationException', 'Service not found.'); return service; }
  Compute() {
    if (this.State === ComputationState.Running || this.State === ComputationState.PendingAbortion) throw algorithmError('InvalidOperationException', 'Algorithm is already running.');
    this.State = ComputationState.Running; this.Services.CancelManager.ResetCancel();
    this.OnStarted({}); this.OnStateChanged({});
    try { this.Initialize(); this.ThrowIfCancellationRequested(); this.InternalCompute(); }
    catch (error) { if (!(error instanceof OperationCanceledException)) throw error; }
    finally {
      try { this.Clean(); } finally {
        this.State = this.State === ComputationState.PendingAbortion ? ComputationState.Aborted : ComputationState.Finished;
        if (this.State === ComputationState.Aborted) this.OnAborted({}); else this.OnFinished({});
        this.Services.CancelManager.ResetCancel(); this.OnStateChanged({});
      }
    }
    return this;
  }
  Abort() { if (this.State === ComputationState.Running) { this.State = ComputationState.PendingAbortion; this.Services.CancelManager.Cancel(); this.OnStateChanged({}); } }
  ThrowIfCancellationRequested() { if (this.Services.CancelManager.IsCancelling) throw new OperationCanceledException(); }
  OnStateChanged(args = {}) { this.StateChanged.emit(this, args); }
  OnStarted(args = {}) { this.Started.emit(this, args); }
  OnFinished(args = {}) { this.Finished.emit(this, args); }
  OnAborted(args = {}) { this.Aborted.emit(this, args); }
  Initialize() {}
  InternalCompute() { throw algorithmError('NotImplementedException', 'Override InternalCompute().'); }
  Clean() {}
}
export class RootedAlgorithmBase extends AlgorithmBase {
  constructor(...args) { super(...args); this._hasRoot = false; events(this, 'RootVertexChanged'); }
  TryGetRootVertex() { return this._hasRoot ? this._root : undefined; }
  SetRootVertex(root) { requireValue(root, 'root'); const changed = !this._hasRoot || !sameVertex(root, this._root); this._root = root; this._hasRoot = true; if (changed) this.OnRootVertexChanged({}); }
  ClearRootVertex() { const changed = this._hasRoot; this._hasRoot = false; this._root = undefined; if (changed) this.OnRootVertexChanged({}); }
  OnRootVertexChanged(args = {}) { this.RootVertexChanged.emit(this, args); }
  AssertRootInGraph(root) { if (!this.VisitedGraph.ContainsVertex(root)) throw algorithmError('VertexNotFoundException', 'Root vertex is not part of the graph.'); }
  GetAndAssertRootInGraph() { if (!this._hasRoot) throw algorithmError('InvalidOperationException', 'Root vertex not set.'); this.AssertRootInGraph(this._root); return this._root; }
  Compute(root) { if (arguments.length) { this.SetRootVertex(root); if (!this.VisitedGraph.ContainsVertex(root)) throw algorithmError('ArgumentException', 'Graph does not contain the provided root vertex.'); } return super.Compute(); }
}
export class RootedSearchAlgorithmBase extends RootedAlgorithmBase {
  constructor(...args) { super(...args); this._hasTarget = false; events(this, 'TargetVertexChanged TargetReached'); }
  TryGetTargetVertex() { return this._hasTarget ? this._target : undefined; }
  SetTargetVertex(target) { requireValue(target, 'target'); const changed = !this._hasTarget || !sameVertex(target, this._target); this._target = target; this._hasTarget = true; if (changed) this.OnTargetVertexChanged({}); }
  ClearTargetVertex() { const changed = this._hasTarget; this._hasTarget = false; this._target = undefined; if (changed) this.OnTargetVertexChanged({}); }
  Compute(root, target) { if (arguments.length > 1) { requireValue(root, 'root'); this.SetTargetVertex(target); if (!this.VisitedGraph.ContainsVertex(target)) throw algorithmError('ArgumentException', 'Graph does not contain the provided target vertex.'); } return arguments.length ? super.Compute(root) : super.Compute(); }
  OnTargetVertexChanged(args = {}) { this.TargetVertexChanged.emit(this, args); }
  OnTargetReached() { this.TargetReached.emit(this, {}); }
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const DistanceRelaxers = Object.freeze({
  ShortestDistance: Object.freeze({ InitialDistance: Number.MAX_VALUE, Compare: compare, Combine: (d, w) => d + w }),
  CriticalDistance: Object.freeze({ InitialDistance: -Number.MAX_VALUE, Compare: (a, b) => -compare(a, b), Combine: (d, w) => d + w }),
  EdgeShortestDistance: Object.freeze({ InitialDistance: 0, Compare: compare, Combine: (d, w) => d + w }),
  Prim: Object.freeze({ InitialDistance: Number.MAX_VALUE, Compare: compare, Combine: (_d, w) => w })
});
/** Stable binary min heap. Lazy decrease-key gives O((V+E) log E) shortest paths. */
export class AlgorithmHeap {
  constructor(compareItems = (a, b) => a.priority - b.priority) { this.items = []; this.compareItems = compareItems; this.sequence = 0; }
  get Count() { return this.items.length; }
  _compare(a, b) { return this.compareItems(a.value, b.value) || a.sequence - b.sequence; }
  Enqueue(value) { const node = { value, sequence: this.sequence++ }; let i = this.items.length; this.items.push(node); while (i) { const p = (i - 1) >> 1; if (this._compare(this.items[p], node) <= 0) break; this.items[i] = this.items[p]; i = p; } this.items[i] = node; }
  Dequeue() { if (!this.Count) throw algorithmError('InvalidOperationException', 'Queue is empty.'); const result = this.items[0], last = this.items.pop(); if (this.Count) { let i = 0; while (i * 2 + 1 < this.Count) { let child = i * 2 + 1; if (child + 1 < this.Count && this._compare(this.items[child + 1], this.items[child]) < 0) child++; if (this._compare(last, this.items[child]) <= 0) break; this.items[i] = this.items[child]; i = child; } this.items[i] = last; } return result.value; }
}
