import type { GraphvizAlgorithm } from './graphviz.js';

export type GraphvizAttributeValue = string | number | boolean | { html: string };
export type GraphvizAttributes = Record<string, GraphvizAttributeValue>;
export interface GraphvizImageSize { name: string; width: number | string; height: number | string; }
export interface GraphvizRenderOptions {
  format?: string;
  engine?: string;
  yInvert?: boolean;
  reduce?: boolean;
  graphAttributes?: GraphvizAttributes;
  nodeAttributes?: GraphvizAttributes;
  edgeAttributes?: GraphvizAttributes;
  images?: readonly GraphvizImageSize[];
}
export interface GraphvizNodeDescription { name: string; attributes?: GraphvizAttributes; }
export interface GraphvizEdgeDescription { tail: string; head: string; attributes?: GraphvizAttributes; }
export interface GraphvizDescription {
  name?: string;
  strict?: boolean;
  directed?: boolean;
  graphAttributes?: GraphvizAttributes;
  nodeAttributes?: GraphvizAttributes;
  edgeAttributes?: GraphvizAttributes;
  nodes?: readonly GraphvizNodeDescription[];
  edges?: readonly GraphvizEdgeDescription[];
  subgraphs?: readonly GraphvizDescription[];
}
export interface GraphvizGraphInput<TVertex = unknown> {
  readonly Vertices: Iterable<TVertex>;
  readonly Edges: Iterable<{ readonly Source: TVertex; readonly Target: TVertex }>;
  readonly IsDirected: boolean;
}
export type GraphvizInput = string | GraphvizDescription | GraphvizGraphInput;
export type GraphvizConfigure = (algorithm: GraphvizAlgorithm) => void;
export interface GraphvizDiagnostic { level?: 'error' | 'warning'; message: string; }
export type GraphvizRenderResult =
  | { status: 'success'; output: string; errors: GraphvizDiagnostic[] }
  | { status: 'failure'; output: undefined; errors: GraphvizDiagnostic[] };
export type GraphvizMultipleRenderResult =
  | { status: 'success'; output: Record<string, string>; errors: GraphvizDiagnostic[] }
  | { status: 'failure'; output: undefined; errors: GraphvizDiagnostic[] };
export interface GraphvizDrawingOperation {
  op: string;
  color?: string;
  grad?: string;
  style?: string;
  points?: [number, number][];
  rect?: [number, number, number, number];
  pt?: [number, number];
  text?: string;
  size?: number;
  width?: number;
  face?: string;
  align?: string;
  [attribute: string]: unknown;
}
export interface GraphvizJsonObject {
  _gvid: number;
  name: string;
  pos?: string;
  width?: string;
  height?: string;
  _draw_?: GraphvizDrawingOperation[];
  _ldraw_?: GraphvizDrawingOperation[];
  [attribute: string]: unknown;
}
export interface GraphvizJsonEdge {
  _gvid: number;
  tail: number;
  head: number;
  pos?: string;
  _draw_?: GraphvizDrawingOperation[];
  _hdraw_?: GraphvizDrawingOperation[];
  _tdraw_?: GraphvizDrawingOperation[];
  _ldraw_?: GraphvizDrawingOperation[];
  [attribute: string]: unknown;
}
export interface GraphvizJsonGraph {
  name: string;
  directed: boolean;
  strict: boolean;
  bb: string;
  objects?: GraphvizJsonObject[];
  edges?: GraphvizJsonEdge[];
  _draw_?: GraphvizDrawingOperation[];
  _ldraw_?: GraphvizDrawingOperation[];
  _subgraph_cnt?: number;
  [attribute: string]: unknown;
}
export interface GraphvizImageOptions {
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Multiplies the output dimensions. Default: 1. */
  scale?: number;
  width?: number;
  height?: number;
  quality?: number;
  background?: string;
  /** Upper bound on width × height; default 16,777,216 pixels. */
  maxPixels?: number;
  renderOptions?: GraphvizRenderOptions;
}
export class GraphvizRenderException extends Error {
  constructor(diagnostics: readonly GraphvizDiagnostic[]);
  readonly Diagnostics: readonly Readonly<GraphvizDiagnostic>[];
}
/** Real Graphviz WASM renderer, loaded only through this optional entry point. */
export class GraphvizWasmEngine {
  constructor(options?: GraphvizRenderOptions);
  static Create(options?: GraphvizRenderOptions): Promise<GraphvizWasmEngine>;
  readonly IsInitialized: boolean;
  readonly IsDisposed: boolean;
  readonly State: 'Uninitialized' | 'Initializing' | 'Ready' | 'Disposed';
  readonly GraphvizVersion: string;
  readonly Engines: readonly string[];
  readonly Formats: readonly string[];
  Initialize(): Promise<this>;
  Render(input: GraphvizInput, options?: GraphvizRenderOptions, configure?: GraphvizConfigure): GraphvizRenderResult;
  RenderString(input: GraphvizInput, options?: GraphvizRenderOptions, configure?: GraphvizConfigure): string;
  renderString(input: GraphvizInput, options?: GraphvizRenderOptions): string;
  RenderSvg(input: GraphvizInput, options?: GraphvizRenderOptions, configure?: GraphvizConfigure): string;
  RenderJson(input: GraphvizInput, options?: GraphvizRenderOptions, configure?: GraphvizConfigure): GraphvizJsonGraph;
  RenderFormats(input: GraphvizInput, formats: readonly string[], options?: GraphvizRenderOptions, configure?: GraphvizConfigure): GraphvizMultipleRenderResult;
  /** Returns output content. outputFilePath is accepted for IDotEngine compatibility. */
  Run(imageType: string, dot: string, outputFilePath?: string): string;
  RenderSvgElement(input: GraphvizInput, options?: GraphvizRenderOptions, configure?: GraphvizConfigure): SVGSVGElement;
  RenderImage(input: GraphvizInput, options?: GraphvizImageOptions, configure?: GraphvizConfigure): Promise<Blob>;
  Dispose(): void;
  dispose(): void;
}
export function CreateGraphvizEngine(options?: GraphvizRenderOptions): Promise<GraphvizWasmEngine>;
