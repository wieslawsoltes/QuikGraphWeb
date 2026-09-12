// Add explicit vertex/edge generics to the main graph API while retaining inferred
// declarations for every other JavaScript export. No runtime shim is introduced.
import { copyFile, readFile, writeFile } from 'node:fs/promises';

await copyFile('dist/core.d.ts', 'dist/core-inferred.d.ts');
let declarations = `import * as Raw from './core-inferred.js';
export * from './core-inferred.js';

export interface IDisposable { Dispose(): void; }
export interface Subscription extends IDisposable { dispose(): void; unsubscribe(): void; }
export interface IEdge<TVertex = unknown> { readonly Source: TVertex; readonly Target: TVertex; }
export interface ITermEdge<TVertex = unknown> extends IEdge<TVertex> { readonly SourceTerminal: number; readonly TargetTerminal: number; }
export interface ITagged<TTag = unknown> { Tag: TTag; }
export type VertexPredicate<TVertex> = (vertex: TVertex) => boolean;
export type EdgePredicate<TVertex, TEdge extends IEdge<TVertex>> = (edge: TEdge) => boolean;
export type EdgeFactory<TVertex, TEdge extends IEdge<TVertex>> = (source: TVertex, target: TVertex) => TEdge;
export type UndirectedEdgeEqualityComparer<TVertex, TEdge extends IEdge<TVertex>> = (edge: TEdge, source: TVertex, target: TVertex) => boolean;
export interface IGraph<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> {
  readonly IsDirected: boolean; readonly AllowParallelEdges: boolean;
  readonly Vertices: TVertex[]; readonly Edges: TEdge[];
  readonly VertexCount: number; readonly EdgeCount: number;
  ContainsVertex(vertex: TVertex): boolean;
}
export interface IVertexAndEdgeListGraph<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends IGraph<TVertex, TEdge> {
  OutEdges(vertex: TVertex): TEdge[];
  TryGetOutEdges(vertex: TVertex): TEdge[] | undefined;
  OutDegree(vertex: TVertex): number;
}
export interface IBidirectionalGraph<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends IVertexAndEdgeListGraph<TVertex, TEdge> {
  InEdges(vertex: TVertex): TEdge[];
  TryGetInEdges(vertex: TVertex): TEdge[] | undefined;
  InDegree(vertex: TVertex): number;
}
export interface IUndirectedGraph<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends IVertexAndEdgeListGraph<TVertex, TEdge> {
  AdjacentEdges(vertex: TVertex): TEdge[];
  TryGetAdjacentEdges(vertex: TVertex): TEdge[] | undefined;
  AdjacentDegree(vertex: TVertex): number;
}
export class EventHook<TArgs extends unknown[] = any[]> extends Raw.EventHook {
  add(listener: (...args: TArgs) => void): (...args: TArgs) => void;
  remove(listener: (...args: TArgs) => void): boolean;
  subscribe(listener: (...args: TArgs) => void): Subscription;
  emit(...args: TArgs): void;
}
export class VertexEventArgs<TVertex = unknown> extends Raw.VertexEventArgs {
  constructor(vertex: TVertex); Vertex: TVertex;
}
export class EdgeEventArgs<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends Raw.EdgeEventArgs {
  constructor(edge: TEdge); Edge: TEdge;
}
export class UndirectedEdgeEventArgs<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends Raw.UndirectedEdgeEventArgs {
  constructor(edge: TEdge, reversed: boolean); Edge: TEdge;
  get Source(): TVertex; get Target(): TVertex;
}
`;
for (const name of ['Edge', 'EquatableEdge', 'SEdge', 'SEquatableEdge', 'UndirectedEdge', 'EquatableUndirectedEdge', 'SUndirectedEdge']) {
  declarations += `export class ${name}<TVertex = unknown> extends Raw.${name} implements IEdge<TVertex> {\n  constructor(source: TVertex, target: TVertex);\n  readonly Source: TVertex; readonly Target: TVertex;\n}\n`;
}
for (const name of ['TaggedEdge', 'EquatableTaggedEdge', 'STaggedEdge', 'SEquatableTaggedEdge', 'TaggedUndirectedEdge', 'STaggedUndirectedEdge']) {
  declarations += `export class ${name}<TVertex = unknown, TTag = unknown> extends Raw.${name} implements IEdge<TVertex>, ITagged<TTag> {\n  constructor(source: TVertex, target: TVertex, tag: TTag);\n  readonly Source: TVertex; readonly Target: TVertex;\n  get Tag(): TTag; set Tag(value: TTag); TagChanged: EventHook<[sender: this, args: object]>;\n}\n`;
}
for (const name of ['TermEdge', 'EquatableTermEdge']) declarations += `export class ${name}<TVertex = unknown> extends Raw.${name} implements ITermEdge<TVertex> {\n constructor(source: TVertex, target: TVertex, sourceTerminal?: number, targetTerminal?: number);\n readonly Source: TVertex; readonly Target: TVertex; readonly SourceTerminal: number; readonly TargetTerminal: number;\n}\n`;
declarations += `export class SReversedEdge<TVertex = unknown, TEdge extends IEdge<TVertex> = IEdge<TVertex>> extends Raw.SReversedEdge implements IEdge<TVertex> {
  constructor(originalEdge: TEdge); readonly Source: TVertex; readonly Target: TVertex; readonly OriginalEdge: TEdge;
}
`;
const graphProperties = `
  get Vertices(): TVertex[]; get Edges(): TEdge[];
  ContainsVertex(vertex: TVertex): boolean;
  ContainsEdge(edge: TEdge): boolean;
  ContainsEdge(source: TVertex, target: TVertex): boolean;
  TryGetEdge(source: TVertex, target: TVertex): TEdge | undefined;
  TryGetEdges(source: TVertex, target: TVertex): TEdge[] | undefined;
  OutEdges(vertex: TVertex): TEdge[]; TryGetOutEdges(vertex: TVertex): TEdge[] | undefined;
  InEdges(vertex: TVertex): TEdge[]; TryGetInEdges(vertex: TVertex): TEdge[] | undefined;
  OutDegree(vertex: TVertex): number; InDegree(vertex: TVertex): number; Degree(vertex: TVertex): number;
  OutEdge(vertex: TVertex, index: number): TEdge; InEdge(vertex: TVertex, index: number): TEdge;
  AdjacentEdges(vertex: TVertex): TEdge[]; TryGetAdjacentEdges(vertex: TVertex): TEdge[] | undefined;
  AdjacentEdge(vertex: TVertex, index: number): TEdge; AdjacentVertices(vertex: TVertex): TVertex[];
`;
const graphMutators = `
  VertexAdded: EventHook<[vertex: TVertex]>; VertexRemoved: EventHook<[vertex: TVertex]>;
  EdgeAdded: EventHook<[edge: TEdge]>; EdgeRemoved: EventHook<[edge: TEdge]>;
  AddVertex(vertex: TVertex): boolean; AddVertexRange(vertices: Iterable<TVertex>): number;
  AddEdge(edge: TEdge): boolean; AddEdgeRange(edges: Iterable<TEdge>): number;
  AddVerticesAndEdge(edge: TEdge): boolean; AddVerticesAndEdgeRange(edges: Iterable<TEdge>): number;
  RemoveVertex(vertex: TVertex): boolean; RemoveVertexIf(predicate: VertexPredicate<TVertex>): number;
  RemoveEdge(edge: TEdge): boolean; RemoveEdges(edges: Iterable<TEdge>): number;
  RemoveEdgeIf(predicate: (edge: TEdge) => boolean): number;
  RemoveOutEdgeIf(vertex: TVertex, predicate: (edge: TEdge) => boolean): number;
  ClearOutEdges(vertex: TVertex): void; ClearInEdges(vertex: TVertex): void; ClearEdges(vertex: TVertex): void;
`;
for (const name of ['AdjacencyGraph', 'BidirectionalGraph', 'UndirectedGraph']) {
  declarations += `export class ${name}<TVertex = unknown, TEdge extends IEdge<TVertex> = Edge<TVertex>> extends Raw.${name} implements IVertexAndEdgeListGraph<TVertex, TEdge> {\n`;
  if (name === 'UndirectedGraph') declarations += `  constructor(allowParallelEdges?: boolean | IGraph<TVertex, TEdge>, edgeEqualityComparer?: UndirectedEdgeEqualityComparer<TVertex, TEdge>);\n`;
  else declarations += `  constructor(allowParallelEdges?: boolean | IGraph<TVertex, TEdge>, vertexCapacity?: number, edgeCapacity?: number);\n`;
  declarations += graphProperties + graphMutators + `  Clone(): ${name}<TVertex, TEdge>;\n`;
  if (name === 'BidirectionalGraph') declarations += `  MergeVertex(vertex: TVertex, edgeFactory: EdgeFactory<TVertex, TEdge>): void;\n  MergeVerticesIf(predicate: VertexPredicate<TVertex>, edgeFactory: EdgeFactory<TVertex, TEdge>): void;\n`;
  if (name === 'UndirectedGraph') declarations += `  EdgeEqualityComparer: UndirectedEdgeEqualityComparer<TVertex, TEdge>;\n  RemoveAdjacentEdgeIf(vertex: TVertex, predicate: (edge: TEdge) => boolean): number;\n  ClearAdjacentEdges(vertex: TVertex): void;\n`;
  declarations += '}\n';
}
for (const name of ['ArrayAdjacencyGraph', 'ArrayBidirectionalGraph', 'ArrayUndirectedGraph']) declarations += `export class ${name}<TVertex = unknown, TEdge extends IEdge<TVertex> = Edge<TVertex>> extends Raw.${name} {\n constructor(graph: IGraph<TVertex, TEdge>);\n ${graphProperties}\n Clone(): ${name}<TVertex, TEdge>;\n}\n`;
await writeFile('dist/core.d.ts', declarations);
console.log('Added explicit generic vertex, edge, event and graph declarations.');

// Inference cannot infer abstract throwing methods or overload-compatible base
// signatures from plain JS. Repair those declarations to their actual contracts.
for (const [file, replacements] of [
  ['core-inferred.d.ts', [['AddVertex(): void;', 'AddVertex(...args: any[]): never;'], ['RemoveVertex(): void;', 'RemoveVertex(...args: any[]): never;']]],
  ['algorithm-base.d.ts', [['Compute(): this;', 'Compute(...args: any[]): any;'], ['Compute(root: any): this;', 'Compute(root?: any): any;'], ['Compute(root: any, target: any): this;', 'Compute(root?: any, target?: any): any;'], ['State: 0;', 'State: number;']]],
  ['advanced.d.ts', [['TryGetSuccessor(): void;', 'TryGetSuccessor(...args: any[]): any;']]],
  ['msagl.d.ts', [['AddNode(): void;', 'AddNode(...args: any[]): any;'], ['AddEdge(): void;', 'AddEdge(...args: any[]): any;'], ['GetVertexId(): string;', 'GetVertexId(...args: any[]): string;']]],
  ['structural.d.ts', [['_direction: 0;', '_direction: number;']]],
]) {
  let text = await readFile('dist/' + file, 'utf8');
  for (const [from, to] of replacements) text = text.replaceAll(from, to);
  await writeFile('dist/' + file, text);
}

await copyFile('dist/shortest-paths.d.ts', 'dist/shortest-paths-inferred.d.ts');
let paths = `import * as Raw from './shortest-paths-inferred.js';
import { IEdge, Edge, IVertexAndEdgeListGraph, EventHook, UndirectedEdgeEventArgs } from './core.js';
export * from './shortest-paths-inferred.js';
export interface IDistanceRelaxer { InitialDistance: number; Compare(left: number, right: number): number; Combine(distance: number, weight: number): number; }
export interface IDistancesCollection<TVertex> { GetDistance(vertex: TVertex): number; TryGetDistance(vertex: TVertex): number | undefined; GetDistances(): IterableIterator<[TVertex, number]>; }
`;
for (const name of ['ShortestPathAlgorithmBase', 'UndirectedShortestPathAlgorithmBase', 'DijkstraShortestPathAlgorithm', 'UndirectedDijkstraShortestPathAlgorithm', 'AStarShortestPathAlgorithm', 'BellmanFordShortestPathAlgorithm', 'DagShortestPathAlgorithm']) {
  const args = name === 'AStarShortestPathAlgorithm' ? 'edgeWeights: (edge: TEdge) => number, costHeuristic: (vertex: TVertex) => number, distanceRelaxer?: IDistanceRelaxer' : 'edgeWeights: (edge: TEdge) => number, distanceRelaxer?: IDistanceRelaxer';
  paths += `export class ${name}<TVertex = unknown, TEdge extends IEdge<TVertex> = Edge<TVertex>> extends Raw.${name} implements IDistancesCollection<TVertex> {\n
  constructor(graph: IVertexAndEdgeListGraph<TVertex, TEdge>, ${args});
  constructor(host: any, graph: IVertexAndEdgeListGraph<TVertex, TEdge>, ${args});
  VisitedGraph: IVertexAndEdgeListGraph<TVertex, TEdge>;
  Weights: (edge: TEdge) => number; DistanceRelaxer: IDistanceRelaxer;
  Distances: Map<TVertex, number>; VerticesColors: Map<TVertex, number>; Predecessors: Map<TVertex, TEdge>;
  Compute(root?: TVertex): this;
  GetDistance(vertex: TVertex): number; TryGetDistance(vertex: TVertex): number | undefined;
  GetDistances(): IterableIterator<[TVertex, number]>;
  GetVertexDistance(vertex: TVertex): number; SetVertexDistance(vertex: TVertex, distance: number): void;
  GetVertexColor(vertex: TVertex): number; TryGetPath(vertex: TVertex): TEdge[] | undefined;
  TryGetRootVertex(): TVertex | undefined; SetRootVertex(vertex: TVertex): void;
  InitializeVertex: EventHook<[vertex: TVertex]>; DiscoverVertex: EventHook<[vertex: TVertex]>;
  StartVertex: EventHook<[vertex: TVertex]>; ExamineVertex: EventHook<[vertex: TVertex]>; FinishVertex: EventHook<[vertex: TVertex]>;
  ExamineEdge: EventHook<[edge: TEdge]>;
`;
  if (name.startsWith('Undirected')) paths += `  TreeEdge: EventHook<[sender: this, args: UndirectedEdgeEventArgs<TVertex, TEdge>]>; EdgeNotRelaxed: EventHook<[sender: this, args: UndirectedEdgeEventArgs<TVertex, TEdge>]>;\n`;
  else paths += `  TreeEdge: EventHook<[edge: TEdge]>; EdgeNotRelaxed: EventHook<[edge: TEdge]>;\n`;
  if (name === 'AStarShortestPathAlgorithm') paths += `  CostHeuristic: (vertex: TVertex) => number;\n`;
  paths += '}\n';
}
paths += `export class FloydWarshallAllShortestPathAlgorithm<TVertex = unknown, TEdge extends IEdge<TVertex> = Edge<TVertex>> extends Raw.FloydWarshallAllShortestPathAlgorithm {
  constructor(graph: IVertexAndEdgeListGraph<TVertex, TEdge>, weights: (edge: TEdge) => number, relaxer?: IDistanceRelaxer);
  constructor(host: any, graph: IVertexAndEdgeListGraph<TVertex, TEdge>, weights: (edge: TEdge) => number, relaxer?: IDistanceRelaxer);
  VisitedGraph: IVertexAndEdgeListGraph<TVertex, TEdge>; Weights: (edge: TEdge) => number; DistanceRelaxer: IDistanceRelaxer;
  Distances: Map<TVertex, Map<TVertex, number>>;
  TryGetDistance(source: TVertex, target: TVertex): number | undefined;
  TryGetPath(source: TVertex, target: TVertex): TEdge[] | undefined;
}
export class SortedPath<TVertex = unknown, TEdge extends IEdge<TVertex> = Edge<TVertex>> extends Raw.SortedPath implements Iterable<TEdge> {
  constructor(edges: Iterable<TEdge>); Edges: TEdge[];
  GetVertex(index: number): TVertex; GetEdge(index: number): TEdge; GetEdges(count: number): TEdge[];
  [Symbol.iterator](): ArrayIterator<TEdge>;
}
`;
await writeFile('dist/shortest-paths.d.ts', paths);
