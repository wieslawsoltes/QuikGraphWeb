import type { IEdge } from './core.js';

export interface GraphViewerPoint { x: number; y: number }
export interface GraphViewerBounds extends GraphViewerPoint { width: number; height: number }
export interface GraphViewerLabel { Text: string; Center: GraphViewerPoint; Bounds: GraphViewerBounds }
export interface GraphViewerArrowhead { Tip: GraphViewerPoint; Base: GraphViewerPoint; Width: number }
export interface GraphViewerSubscription { dispose(): void }
export interface GraphViewerEventSource { subscribe(handler: (...args: unknown[]) => void): GraphViewerSubscription }
export interface GraphViewerGraph<TVertex, TEdge extends IEdge<TVertex> = IEdge<TVertex>> {
  readonly Vertices: Iterable<TVertex>;
  readonly Edges: Iterable<TEdge>;
  readonly IsDirected: boolean;
  VertexAdded?: GraphViewerEventSource;
  VertexRemoved?: GraphViewerEventSource;
  EdgeAdded?: GraphViewerEventSource;
  EdgeRemoved?: GraphViewerEventSource;
}
export interface GraphViewerNodeLayout<TVertex> { Vertex: TVertex; Center: GraphViewerPoint; Bounds: GraphViewerBounds; Path: string; Label?: GraphViewerLabel }
export interface GraphViewerEdgeLayout<TEdge> { Edge: TEdge; Path: string; Label?: GraphViewerLabel | null; SourceArrowhead?: GraphViewerArrowhead | null; TargetArrowhead?: GraphViewerArrowhead | null }
export interface GraphViewerClusterLayout { Id: string; Bounds: GraphViewerBounds; Path: string; Label?: GraphViewerLabel }
export interface GraphViewerLayoutResult<TVertex, TEdge extends IEdge<TVertex> = IEdge<TVertex>> {
  Positions: Iterable<readonly [TVertex, GraphViewerPoint]>;
  Bounds?: GraphViewerBounds;
  Nodes?: readonly GraphViewerNodeLayout<TVertex>[];
  Edges?: readonly GraphViewerEdgeLayout<TEdge>[];
  Clusters?: readonly GraphViewerClusterLayout[];
}
export interface GraphViewerLayoutOptions { signal?: AbortSignal }
export type GraphViewerLayoutOutput<TVertex, TEdge extends IEdge<TVertex> = IEdge<TVertex>> = GraphViewerLayoutResult<TVertex, TEdge> | Iterable<readonly [TVertex, GraphViewerPoint]>;
export type GraphViewerLayoutAdapter<TVertex, TEdge extends IEdge<TVertex>, TResult extends GraphViewerLayoutOutput<TVertex, TEdge>, TOptions extends GraphViewerLayoutOptions = GraphViewerLayoutOptions> =
  | ((graph: GraphViewerGraph<TVertex, TEdge>, options: TOptions) => TResult | PromiseLike<TResult>)
  | { LayoutAsync(graph: GraphViewerGraph<TVertex, TEdge>, options: TOptions): TResult | PromiseLike<TResult> }
  | { Layout(graph: GraphViewerGraph<TVertex, TEdge>, options: TOptions): TResult | PromiseLike<TResult> };
export type GraphViewerLayoutMethod<TAdapter> = TAdapter extends { LayoutAsync: infer TMethod } ? TMethod : TAdapter extends { Layout: infer TMethod } ? TMethod : TAdapter;
export type GraphViewerAdapterOptions<TAdapter> = GraphViewerLayoutMethod<TAdapter> extends (...args: infer TArgs) => unknown ? TArgs['length'] extends 0 | 1 ? GraphViewerLayoutOptions : Exclude<TArgs[1], undefined> : never;
export type GraphViewerAdapterResult<TAdapter> = GraphViewerLayoutMethod<TAdapter> extends (...args: never[]) => infer TResult ? Awaited<TResult> : never;
export type GraphViewerLayoutChange<TVertex, TEdge extends IEdge<TVertex> = IEdge<TVertex>> =
  | { vertex: TVertex; position: GraphViewerPoint }
  | { positions: Map<TVertex, GraphViewerPoint>; result: GraphViewerLayoutOutput<TVertex, TEdge> };
export interface GraphViewerEventMap<TVertex, TEdge extends IEdge<TVertex> = IEdge<TVertex>> {
  'graph-create-vertex': CustomEvent<GraphViewerPoint>;
  'graph-select': CustomEvent<{ vertex: TVertex }>;
  'graph-select-edge': CustomEvent<{ edge: TEdge }>;
  'graph-delete-vertex': CustomEvent<{ vertex: TVertex }>;
  'graph-delete-edge': CustomEvent<{ edge: TEdge }>;
  'graph-layout-change': CustomEvent<GraphViewerLayoutChange<TVertex, TEdge>>;
}

/** Generic reusable canvas viewer. Register explicitly before constructing in a browser. */
export declare class QuikGraphViewer<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends HTMLElement {
  constructor();
  Graph: GraphViewerGraph<TVertex, TEdge> | null;
  Positions: Map<TVertex, GraphViewerPoint>;
  VertexColors: Map<TVertex, string>;
  HighlightedEdges: Set<TEdge>;
  VertexLabel: (vertex: TVertex) => string;
  EdgeLabel: (edge: TEdge) => string;
  LayoutResult: GraphViewerLayoutOutput<TVertex, TEdge> | null | undefined;
  connectedCallback(): void;
  disconnectedCallback(): void;
  Layout(mode?: 'circle' | 'grid'): void;
  LayoutAsync<TResult extends GraphViewerLayoutOutput<TVertex, TEdge>>(adapter: (graph: GraphViewerGraph<TVertex, TEdge>, options: GraphViewerLayoutOptions) => TResult | PromiseLike<TResult>, options?: GraphViewerLayoutOptions): Promise<TResult>;
  LayoutAsync<TAdapter extends GraphViewerLayoutAdapter<TVertex, TEdge, GraphViewerLayoutOutput<TVertex, TEdge>, never>>(adapter: TAdapter, options?: GraphViewerAdapterOptions<TAdapter>): Promise<GraphViewerAdapterResult<TAdapter>>;
  CancelLayout(): void;
  SelectVertex(vertex: TVertex): void;
  SelectEdge(edge: TEdge): void;
  Fit(): void;
  Zoom(factor: number, x?: number, y?: number): void;
  Refresh(): void;
  ToSvg(): string;
  addEventListener<TKey extends keyof GraphViewerEventMap<TVertex, TEdge>>(type: TKey, listener: (this: QuikGraphViewer<TVertex, TEdge>, event: GraphViewerEventMap<TVertex, TEdge>[TKey]) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener<TKey extends keyof HTMLElementEventMap>(type: TKey, listener: (this: HTMLElement, event: HTMLElementEventMap[TKey]) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<TKey extends keyof GraphViewerEventMap<TVertex, TEdge>>(type: TKey, listener: (this: QuikGraphViewer<TVertex, TEdge>, event: GraphViewerEventMap<TVertex, TEdge>[TKey]) => void, options?: boolean | EventListenerOptions): void;
  removeEventListener<TKey extends keyof HTMLElementEventMap>(type: TKey, listener: (this: HTMLElement, event: HTMLElementEventMap[TKey]) => void, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}
export declare function defineQuikGraphViewer(name?: string): CustomElementConstructor;

declare global {
  interface HTMLElementTagNameMap { 'quikgraph-viewer': QuikGraphViewer }
}
