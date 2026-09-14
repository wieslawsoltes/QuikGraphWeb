import * as engine from '../../dist/index.js';
import * as Graphviz from '../../dist/graphviz-runtime.js';
import * as Layout from '../../dist/layout.js';
import * as Xml from '../../dist/xml-validation.js';
function id(value, kind) { if (typeof value !== 'string' || !value.length) throw new TypeError(`${kind} id must be a nonempty string.`); return value; }
function vertex(value) { id(value?.id, 'Vertex'); return value; }
function edge(value) { id(value?.id, 'Edge'); id(value.source, 'Source'); id(value.target, 'Target'); if (!Number.isFinite(value.weight ?? 1)) throw new RangeError('Edge weight must be finite.'); return value; }
export class BlazorGraph extends EventTarget {
  constructor(snapshot = {}) { super(); this.disposed = false; this.renderer = null; this.Load(snapshot); }
  check() { if (this.disposed) throw new Error('Graph model is disposed.'); }
  notify(kind) { this.dispatchEvent(new CustomEvent('changed', { detail: { kind, vertices: this.Graph.VertexCount, edges: this.Graph.EdgeCount } })); }
  Load(snapshot) {
    this.check(); const directed = snapshot.directed !== false, graph = directed ? new engine.BidirectionalGraph(true) : new engine.UndirectedGraph(true);
    const vertices = new Map(), edges = new Map(), nativeEdges = new Map();
    for (const item of snapshot.vertices ?? []) { vertex(item); if (vertices.has(item.id)) throw new Error(`Duplicate vertex id: ${item.id}`); vertices.set(item.id, item); graph.AddVertex(item.id); }
    for (const item of snapshot.edges ?? []) {
      edge(item); if (edges.has(item.id)) throw new Error(`Duplicate edge id: ${item.id}`);
      if (!vertices.has(item.source) || !vertices.has(item.target)) throw new Error(`Edge ${item.id} references a missing vertex.`);
      const native = new engine.TaggedEdge(item.source, item.target, item.weight ?? 1); native.Id = item.id;
      if (!graph.AddEdge(native)) throw new Error(`Could not add edge ${item.id}.`);
      edges.set(item.id, item); nativeEdges.set(item.id, native);
    }
    this.Graph = graph; this.vertices = vertices; this.edges = edges; this.nativeEdges = nativeEdges; this.notify('load');
  }
  GetSnapshot() { this.check(); return { directed: this.Graph.IsDirected, vertices: [...this.vertices.values()], edges: [...this.edges.values()] }; }
  AddVertex(item) { this.check(); vertex(item); if (this.vertices.has(item.id)) throw new Error(`Duplicate vertex id: ${item.id}`); this.Graph.AddVertex(item.id); this.vertices.set(item.id, item); this.notify('addVertex'); }
  AddEdge(item) {
    this.check(); edge(item); if (this.edges.has(item.id)) throw new Error(`Duplicate edge id: ${item.id}`);
    if (!this.vertices.has(item.source) || !this.vertices.has(item.target)) throw new Error('Both edge endpoints must exist.');
    const native = new engine.TaggedEdge(item.source, item.target, item.weight ?? 1); native.Id = item.id;
    if (!this.Graph.AddEdge(native)) throw new Error('Could not add the native edge.');
    this.edges.set(item.id, item); this.nativeEdges.set(item.id, native); this.notify('addEdge');
  }
  RemoveEdge(value) { this.check(); const native = this.nativeEdges.get(value); if (!native) return false; if (!this.Graph.RemoveEdge(native)) return false; this.nativeEdges.delete(value); this.edges.delete(value); this.notify('removeEdge'); return true; }
  RemoveVertex(value) {
    this.check(); if (!this.vertices.has(value)) return false;
    for (const item of [...this.edges.values()]) if (item.source === value || item.target === value) this.RemoveEdge(item.id);
    const removed = this.Graph.RemoveVertex(value); if (removed) { this.vertices.delete(value); this.notify('removeVertex'); } return removed;
  }
  ShortestPath(source, target, algorithm = 'dijkstra') {
    this.check(); if (!this.Graph.ContainsVertex(source) || !this.Graph.ContainsVertex(target)) throw new Error('Both path endpoints must exist.');
    const types = { dijkstra: this.Graph.IsDirected ? engine.DijkstraShortestPathAlgorithm : engine.UndirectedDijkstraShortestPathAlgorithm, bellmanFord: engine.BellmanFordShortestPathAlgorithm, dag: engine.DagShortestPathAlgorithm };
    const Type = types[algorithm]; if (!Type || (!this.Graph.IsDirected && algorithm !== 'dijkstra')) throw new Error('Unsupported algorithm for this graph direction.');
    const computation = new Type(this.Graph, edge => edge.Tag); computation.Compute(source);
    if (computation.FoundNegativeCycle) throw new Error('The graph contains a reachable negative cycle.');
    const distance = computation.TryGetDistance(target);
    if (!Number.isFinite(distance)) return { found: false, distance: null, vertices: [], edges: [] };
    const path = source === target ? [] : computation.TryGetPath(target);
    if (!path) return { found: false, distance: null, vertices: [], edges: [] };
    let current = source; const vertices = [current];
    for (const item of path) { current = item.Source === current ? item.Target : item.Source; vertices.push(current); }
    return { found: true, distance, vertices, edges: path.map(item => item.Id) };
  }
  Components(strong = false) {
    this.check(); const Type = strong && this.Graph.IsDirected ? engine.StronglyConnectedComponentsAlgorithm : engine.ConnectedComponentsAlgorithm;
    const computation = new Type(this.Graph); computation.Compute();
    return { count: computation.ComponentCount, components: Object.fromEntries(computation.Components) };
  }
  async RenderGraphviz(options = {}) {
    this.check(); this.renderer ??= new Graphviz.GraphvizWasmEngine(); await this.renderer.Initialize(); this.check();
    return this.renderer.RenderSvg(this.Graph, options);
  }
  Dispose() { if (this.disposed) return; this.disposed = true; this.renderer?.Dispose(); this.Graph.Clear(); this.vertices.clear(); this.edges.clear(); this.nativeEdges.clear(); }
}
export const api = { ...engine, Graphviz, Layout, Xml, BlazorGraph };
const states = new WeakMap();
function bind(viewer, model, graph) {
  const state = states.get(viewer);
  if (state.model !== model) {
    state.model?.removeEventListener('changed', state.changed);
    state.model = model;
    state.changed = () => { if (viewer.Graph !== model.Graph) viewer.Graph = model.Graph; viewer.Refresh(); };
    model?.addEventListener('changed', state.changed);
  }
  if (viewer.Graph !== graph) viewer.Graph = graph;
  if (model) { viewer.VertexLabel = value => model.vertices.get(value)?.label ?? value; viewer.EdgeLabel = value => model.edges.get(value.Id)?.label ?? String(value.Tag ?? ''); }
}
function configure(viewer, options) {
  const state = states.get(viewer), { model, graph, vertices = [], edges = [], directed = true, layoutMode = 'circle', ...properties } = options;
  if (model || graph) {
    bind(viewer, model ?? null, model?.Graph ?? graph);
    state.owned?.Dispose(); state.owned = null; state.signature = null;
  } else {
    const signature = JSON.stringify([vertices, edges, directed]);
    if (state.signature !== signature) {
      const next = new BlazorGraph({ vertices, edges, directed }); bind(viewer, next, next.Graph);
      state.owned?.Dispose(); state.owned = next; state.signature = signature; state.layout = null;
    }
  }
  for (const [name, value] of Object.entries(properties)) if (viewer[name] !== value) viewer[name] = value;
  if (state.layout !== layoutMode) { viewer.Layout(layoutMode); state.layout = layoutMode; }
}
export function mount(host, options) {
  engine.defineQuikGraphViewer(); const viewer = document.createElement('quikgraph-viewer'); viewer.style.cssText = 'display:block;width:100%;height:100%';
  const state = { model: null, owned: null, disposed: false }; states.set(viewer, state);
  viewer.GetModel = () => state.model;
  viewer.ShortestPath = (source, target, algorithm) => { if (!state.model) throw new Error('Use a typed graph model for this convenience operation.'); return state.model.ShortestPath(source, target, algorithm); };
  viewer.Highlight = ids => { if (!state.model) throw new Error('Stable-id highlighting requires a typed graph model.'); viewer.HighlightedEdges.clear(); for (const id of ids) { const edge = state.model.nativeEdges.get(id); if (edge) viewer.HighlightedEdges.add(edge); } viewer.Refresh(); };
  viewer.ApplyMsaglLayout = async options => { const result = await viewer.LayoutAsync(new Layout.MsaglLayoutEngine(), options); return result.ToJSON(); };
  viewer.Dispose = () => { if (state.disposed) return; state.disposed = true; state.model?.removeEventListener('changed', state.changed); viewer.remove(); viewer.Graph = null; state.owned?.Dispose(); states.delete(viewer); };
  try { configure(viewer, options); host.append(viewer); return viewer; }
  catch (error) { viewer.Dispose(); throw error; }
}
export function update(viewer, options) { configure(viewer, options); }
