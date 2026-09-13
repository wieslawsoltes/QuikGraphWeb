/** Optional Microsoft MSAGL geometry engine. All result coordinates use screen-space Y down. */
export interface LayoutPoint { x: number; y: number }
export interface LayoutSize { width: number; height: number }
export interface LayoutBounds extends LayoutPoint, LayoutSize {}
export interface LayoutLabel { Text: string; Center: LayoutPoint; Bounds: LayoutBounds }
export interface LayoutArrowhead { Tip: LayoutPoint; Base: LayoutPoint; Width: number }
export type LayoutAlgorithm = 'Sugiyama' | 'MDS' | 'IPsepCola';
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';
export type LayoutRouting = 'Spline' | 'SplineBundling' | 'StraightLine' | 'SugiyamaSplines' | 'Rectilinear' | 'None';
export interface LayoutDrawingNode { Id: string; LabelText?: string; Attr?: { Shape?: string; Width?: number; Height?: number }; UserData?: unknown }
export interface LayoutDrawingEdge { Source: string; Target: string; LabelText?: string; UserData?: unknown }
export interface LayoutDrawingGraph { Id?: string; Directed: boolean; Nodes: Iterable<LayoutDrawingNode>; Edges: Iterable<LayoutDrawingEdge>; AddNode(id: string): LayoutDrawingNode }
export interface LayoutEdgeLike<TVertex> { readonly Source: TVertex; readonly Target: TVertex }
export interface LayoutGraphLike<TVertex, TEdge extends LayoutEdgeLike<TVertex> = LayoutEdgeLike<TVertex>> { readonly Vertices: Iterable<TVertex>; readonly Edges: Iterable<TEdge>; readonly IsDirected: boolean }
export interface LayoutCluster<TVertex = unknown> { id: string; nodes?: readonly (TVertex | string)[]; parentId?: string | null; label?: string; padding?: number }
export type LayoutConstraint<TVertex = unknown> =
  | { type: 'align'; axis: 'x' | 'y'; nodes: readonly (TVertex | string)[]; coordinate?: number }
  | { type: 'pin'; axis: 'x' | 'y'; node: TVertex | string; coordinate: number }
  | { type: 'separate'; axis: 'x' | 'y'; before: TVertex | string; after: TVertex | string; gap?: number };
export interface NativeMsaglCurve {
  readonly start: LayoutPoint; readonly end: LayoutPoint; readonly parStart: number; readonly parEnd: number;
  readonly length: number; value(parameter: number): LayoutPoint; toJSON(): unknown;
}
export interface NativeMsaglGeometryNode { center: LayoutPoint; boundaryCurve: NativeMsaglCurve; readonly id: string }
export interface NativeMsaglGeometryGraph {
  graph: unknown;
  readonly nodesBreadthFirst: Iterable<NativeMsaglGeometryNode>;
  readonly shallowNodes: Iterable<NativeMsaglGeometryNode>;
  readonly boundingBox: { left: number; right: number; top: number; bottom: number; width: number; height: number };
  layoutSettings: NativeMsaglLayoutSettings;
}
export interface NativeMsaglLayoutSettings {
  commonSettings: { NodeSeparation: number; PackingAspectRatio: number };
  edgeRoutingSettings: { EdgeRoutingMode: number; Padding: number };
  [key: string]: unknown;
}
export interface LayoutConfigurationContext<TVertex = unknown> {
  Graph: unknown;
  GeometryGraph: NativeMsaglGeometryGraph;
  Settings: NativeMsaglLayoutSettings;
  Nodes: Map<string, { id: string; node: LayoutDrawingNode; native: unknown; geom: NativeMsaglGeometryNode; vertex: TVertex; label: string; size: LayoutSize }>;
  Edges: readonly { edge: LayoutDrawingEdge; original: unknown; native: unknown; geom: unknown; label: string }[];
}
export interface MsaglLayoutOptions<TVertex = unknown, TEdge = unknown> {
  algorithm?: LayoutAlgorithm; direction?: LayoutDirection; routing?: LayoutRouting;
  nodeWidth?: number; nodeHeight?: number; nodeSeparation?: number; layerSeparation?: number;
  padding?: number; edgePadding?: number; aspectRatio?: number; fontSize?: number;
  arrows?: boolean; arrowLength?: number; iterations?: number; pivots?: number; avoidOverlaps?: boolean;
  signal?: AbortSignal; clusters?: readonly LayoutCluster<TVertex>[]; constraints?: readonly LayoutConstraint<TVertex>[];
  vertexLabel?: (vertex: TVertex, node: LayoutDrawingNode) => string;
  edgeLabel?: (edge: TEdge, node: LayoutDrawingEdge) => string;
  nodeSize?: (vertex: TVertex, node: LayoutDrawingNode) => LayoutSize;
  nodeShape?: (vertex: TVertex, node: LayoutDrawingNode) => string;
  measureLabel?: (text: string, entity: LayoutDrawingNode | LayoutDrawingEdge | LayoutCluster<TVertex>, kind: 'node' | 'edge' | 'cluster') => LayoutSize;
  configure?: (context: LayoutConfigurationContext<TVertex>) => void;
}
export interface MsaglSvgOptions { padding?: number; foreground?: string; background?: string; nodeFill?: string; clusterFill?: string; fontSize?: number; fontFamily?: string; title?: string }
export type MsaglCurveJson =
  | { type: 'lineSegment'; data: { start: LayoutPoint; end: LayoutPoint } }
  | { type: 'bezier'; data: { b: LayoutPoint[] } }
  | { type: 'ellipse'; data: { parStart: number; parEnd: number; axis0: LayoutPoint; axis1: LayoutPoint; center: LayoutPoint } }
  | { type: 'polyline'; data: { points: LayoutPoint[] } }
  | { type: 'curve'; data: { segs: (
      | { tag: 'lineSegment'; segData: { start: LayoutPoint; end: LayoutPoint } }
      | { tag: 'bezier'; segData: { b: LayoutPoint[] } }
      | { tag: 'ellipse'; segData: { parStart: number; parEnd: number; axis0: LayoutPoint; axis1: LayoutPoint; center: LayoutPoint } }
    )[] } };
export interface MsaglNodeLayout<TVertex = unknown> { Id: string; Vertex: TVertex; Node: LayoutDrawingNode; Center: LayoutPoint; Bounds: LayoutBounds; Path: string; Label: LayoutLabel }
export interface MsaglEdgeLayout<TEdge = unknown> { Edge: TEdge; Source: string; Target: string; Path: string; Curve: MsaglCurveJson | null; Label: LayoutLabel | null; SourceArrowhead: LayoutArrowhead | null; TargetArrowhead: LayoutArrowhead | null }
export interface MsaglClusterLayout { Id: string; Bounds: LayoutBounds; Path: string; Label: LayoutLabel }
export interface MsaglLayoutJson { Engine: string; Algorithm: LayoutAlgorithm; Routing: LayoutRouting; Bounds: LayoutBounds; Nodes: Omit<MsaglNodeLayout, 'Vertex' | 'Node'>[]; Edges: Omit<MsaglEdgeLayout, 'Edge'>[]; Clusters: MsaglClusterLayout[] }
export class MsaglLayoutResult<TVertex = unknown, TEdge = unknown> {
  constructor(data: { Engine: string; Graph: LayoutDrawingGraph; Algorithm: LayoutAlgorithm; Routing: LayoutRouting; Positions: Map<TVertex, LayoutPoint>; Nodes: MsaglNodeLayout<TVertex>[]; Edges: MsaglEdgeLayout<TEdge>[]; Clusters: MsaglClusterLayout[]; Bounds: LayoutBounds; GeometryGraph: NativeMsaglGeometryGraph; EngineGraph: unknown });
  Engine: string; Graph: LayoutDrawingGraph; Algorithm: LayoutAlgorithm; Routing: LayoutRouting;
  Positions: Map<TVertex, LayoutPoint>; Nodes: MsaglNodeLayout<TVertex>[]; Edges: MsaglEdgeLayout<TEdge>[];
  Clusters: MsaglClusterLayout[]; Bounds: LayoutBounds; GeometryGraph: NativeMsaglGeometryGraph; EngineGraph: unknown;
  ToJSON(): MsaglLayoutJson;
  ToSvg(options?: MsaglSvgOptions): string;
}
export class MsaglLayoutEngine<TVertex = unknown, TEdge extends LayoutEdgeLike<TVertex> = LayoutEdgeLike<TVertex>> {
  constructor(options?: MsaglLayoutOptions<TVertex, TEdge>);
  Options: MsaglLayoutOptions<TVertex, TEdge>;
  Layout(graph: LayoutGraphLike<TVertex, TEdge>, options?: MsaglLayoutOptions<TVertex, TEdge>): MsaglLayoutResult<TVertex, TEdge>;
  Layout(graph: LayoutDrawingGraph, options?: MsaglLayoutOptions<TVertex, TEdge>): MsaglLayoutResult<TVertex, TEdge>;
  LayoutAsync(graph: LayoutGraphLike<TVertex, TEdge> | LayoutDrawingGraph, options?: MsaglLayoutOptions<TVertex, TEdge>): Promise<MsaglLayoutResult<TVertex, TEdge>>;
}
export function LayoutGraph<TVertex, TEdge extends LayoutEdgeLike<TVertex>>(graph: LayoutGraphLike<TVertex, TEdge>, options?: MsaglLayoutOptions<TVertex, TEdge>): MsaglLayoutResult<TVertex, TEdge>;
export function LayoutGraph(graph: LayoutDrawingGraph, options?: MsaglLayoutOptions): MsaglLayoutResult;
export function LayoutGraphAsync<TVertex, TEdge extends LayoutEdgeLike<TVertex>>(graph: LayoutGraphLike<TVertex, TEdge>, options?: MsaglLayoutOptions<TVertex, TEdge>): Promise<MsaglLayoutResult<TVertex, TEdge>>;
export function LayoutGraphAsync(graph: LayoutDrawingGraph, options?: MsaglLayoutOptions): Promise<MsaglLayoutResult>;
export function MsaglCurveToSvgPath(curve: NativeMsaglCurve | null | undefined): string;
