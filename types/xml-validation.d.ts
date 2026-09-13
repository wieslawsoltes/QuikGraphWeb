import type { AdjacencyGraph, UndirectedGraph, IEdge, IGraph } from './core.js';

export type GraphMLInput = string | Uint8Array | ArrayBuffer | { ReadToEnd(): string } | { documentElement: { outerHTML: string } } | { outerHTML: string };
export interface GraphMLValidationDiagnostic {
  readonly Message: string;
  readonly FileName: string;
  /** One-based line, or zero when libxml2 does not provide a location. */
  readonly LineNumber: number;
  /** One-based column, or zero when libxml2 does not provide a location. */
  readonly ColumnNumber: number;
  readonly Severity: 'warning' | 'error' | 'fatal';
  readonly Path: string | null;
}
export interface GraphMLValidationResult {
  readonly IsValid: boolean;
  readonly Errors: ReadonlyArray<GraphMLValidationDiagnostic>;
}
export interface GraphMLSchemaValidatorOptions {
  /** Override loading of the bundled libxml2-wasm module. The module is checked at runtime. */
  engineLoader?: () => Promise<object>;
  engineUrl?: string | URL;
}
export interface GraphMLValidationOptions { filename?: string; }
export type GraphMLScalarType = 'boolean' | 'int' | 'long' | 'float' | 'double' | 'string';
export type GraphMLPropertyType = GraphMLScalarType | `${GraphMLScalarType}[]`;
export interface GraphMLPropertyDefinition<TObject> {
  type: GraphMLPropertyType;
  id?: string;
  name?: string;
  default?: unknown;
  get?: (object: TObject) => unknown;
  set?: (object: TObject, value: unknown) => void;
}
export type GraphMLPropertyMap<TObject> = Record<string, GraphMLPropertyType | GraphMLPropertyDefinition<TObject>>;
export interface GraphMLPropertyOptions<TVertex, TEdge extends IEdge<TVertex>> {
  graphProperties?: GraphMLPropertyMap<IGraph<TVertex, TEdge>>;
  vertexProperties?: GraphMLPropertyMap<TVertex>;
  edgeProperties?: GraphMLPropertyMap<TEdge>;
}
export type GraphMLWriter = ((xml: string) => void) | { Write(xml: string): void } | { write(xml: string): void };
export interface GraphMLSerializeOptions<TVertex, TEdge extends IEdge<TVertex>> extends GraphMLPropertyOptions<TVertex, TEdge>, GraphMLValidationOptions {
  graphId?: string;
  emitDocumentDeclaration?: boolean;
  vertexIdentity?: (vertex: TVertex) => string | number;
  edgeIdentity?: (edge: TEdge) => string | number;
  writer?: GraphMLWriter;
}
export interface GraphMLMutableGraph<TVertex, TEdge extends IEdge<TVertex>> extends IGraph<TVertex, TEdge> {
  AddVertexRange(vertices: Iterable<TVertex>): number;
  AddEdge(edge: TEdge): boolean;
}
export interface GraphMLDeserializeOptions<TVertex, TEdge extends IEdge<TVertex>> extends GraphMLPropertyOptions<TVertex, TEdge>, GraphMLValidationOptions {
  graph?: GraphMLMutableGraph<TVertex, TEdge>;
  vertexFactory?: (id: string, data: Record<string, unknown>) => TVertex;
  edgeFactory?: (source: TVertex, target: TVertex, id: string, data: Record<string, unknown>) => TEdge;
  /** Only affects graph conversion; XSD validation remains strict GraphML 1.1. */
  allowLegacy?: boolean;
}
export declare class GraphMLValidationError extends SyntaxError {
  constructor(errors: ReadonlyArray<GraphMLValidationDiagnostic>, cause?: Error);
  readonly Errors: ReadonlyArray<GraphMLValidationDiagnostic>;
}
export declare class GraphMLSchemaValidator {
  private constructor();
  readonly IsDisposed: boolean;
  readonly SchemaNamespace: 'http://graphml.graphdrawing.org/xmlns';
  readonly SchemaVersion: '1.1';
  Validate(input: GraphMLInput, options?: GraphMLValidationOptions): GraphMLValidationResult;
  ValidateAndThrow(input: GraphMLInput, options?: GraphMLValidationOptions): GraphMLValidationResult;
  Deserialize<TVertex, TEdge extends IEdge<TVertex>, TGraph extends GraphMLMutableGraph<TVertex, TEdge>>(input: GraphMLInput, options: GraphMLDeserializeOptions<TVertex, TEdge> & { graph: TGraph }): TGraph;
  Deserialize<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>>(input: GraphMLInput, options?: GraphMLDeserializeOptions<TVertex, TEdge>): AdjacencyGraph<TVertex, TEdge> | UndirectedGraph<TVertex, TEdge>;
  Serialize<TVertex, TEdge extends IEdge<TVertex>>(graph: IGraph<TVertex, TEdge>, options?: GraphMLSerializeOptions<TVertex, TEdge>): string;
  Dispose(): void;
  dispose(): void;
}
export declare function CreateGraphMLSchemaValidator(options?: GraphMLSchemaValidatorOptions): Promise<GraphMLSchemaValidator>;
export declare function ValidateGraphMLSchema(input: GraphMLInput, options?: GraphMLSchemaValidatorOptions & GraphMLValidationOptions): Promise<GraphMLValidationResult>;
export declare function DeserializeAndValidateGraphML<TVertex, TEdge extends IEdge<TVertex>, TGraph extends GraphMLMutableGraph<TVertex, TEdge>>(input: GraphMLInput, options: GraphMLSchemaValidatorOptions & GraphMLDeserializeOptions<TVertex, TEdge> & { graph: TGraph }): Promise<TGraph>;
export declare function DeserializeAndValidateGraphML<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>>(input: GraphMLInput, options?: GraphMLSchemaValidatorOptions & GraphMLDeserializeOptions<TVertex, TEdge>): Promise<AdjacencyGraph<TVertex, TEdge> | UndirectedGraph<TVertex, TEdge>>;
