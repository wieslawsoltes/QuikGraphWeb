// Adapted from QuikGraph AlgorithmExtensions. MS-PL; see LICENSE and NOTICE.
import * as Core from './core.js';
import * as Collections from './collections.js';
import * as Search from './search.js';
import * as Paths from './shortest-paths.js';
import * as Structural from './structural.js';
import * as Advanced from './advanced.js';
import * as Observers from './observers.js';
const required = (value,name) => {if(value==null)throw new TypeError(`${name} is required.`);return value;};
const same = (a,b) => a === b || (a !== a && b !== b);
export function GetIndexer(dictionary){required(dictionary,'dictionary');return key=>{if(dictionary instanceof Map){if(!dictionary.has(key))throw new Error('Key not found.');return dictionary.get(key);}if(!Object.hasOwn(dictionary,key))throw new Error('Key not found.');return dictionary[key];};}
function identityAllocator(primitiveStrings) {
  const ids=new Map(),owners=new Map(),buckets=new Map();let next=0;
  return value=>{
    required(value,'identity value');if(ids.has(value))return ids.get(value);
    let bucket;
    if(typeof value?.Equals==='function') { const hash=typeof value.GetHashCode==='function'?value.GetHashCode():'custom';bucket=buckets.get(hash);if(!bucket)buckets.set(hash,bucket=[]);for(const other of bucket)if(Core.equals(other,value)){const id=ids.get(other);ids.set(value,id);return id;} }
    const type=typeof value;let id=primitiveStrings&&['string','number','boolean','bigint'].includes(type)?(type==='boolean'?value?'True':'False':String(value)):undefined;
    if(id===undefined||owners.has(id)){do{id=String(next++);}while(owners.has(id));}
    ids.set(value,id);owners.set(id,value);bucket?.push(value);return id;
  };
}
export function GetVertexIdentity(graph){required(graph,'graph');const types=new Set([...graph.Vertices].map(v=>typeof v));const homogeneous=types.size<=1&&![...types].some(t=>!['string','number','boolean','bigint'].includes(t));return identityAllocator(homogeneous);}
export function GetEdgeIdentity(graph){required(graph,'graph');return identityAllocator(false);}
function runTree(algorithm,root,undirected=false){
  required(root,'root');const recorder=undirected?new Observers.UndirectedVertexPredecessorRecorderObserver():new Observers.VertexPredecessorRecorderObserver();
  const subscription=recorder.Attach(algorithm);try{algorithm.Compute(root);}finally{(subscription.Dispose??subscription.dispose??subscription.unsubscribe).call(subscription);}
  const lookup=vertex=>recorder.TryGetPath(vertex);lookup.algorithm=algorithm;lookup.predecessors=recorder.VerticesPredecessors;return lookup;
}
export function TreeBreadthFirstSearch(graph,root){return runTree(new Search.BreadthFirstSearchAlgorithm(graph),root);}
export function TreeDepthFirstSearch(graph,root){return runTree(new Search.DepthFirstSearchAlgorithm(graph),root);}
export function TreeCyclePoppingRandom(graph,root,edgeChain=new Advanced.NormalizedMarkovEdgeChain()){return runTree(new Advanced.CyclePoppingRandomTreeAlgorithm(graph,edgeChain),root);}
export function ShortestPathsDijkstra(graph,weights,root){required(graph,'graph');return runTree(graph.IsDirected?new Paths.DijkstraShortestPathAlgorithm(graph,weights):new Paths.UndirectedDijkstraShortestPathAlgorithm(graph,weights),root,!graph.IsDirected);}
export function ShortestPathsAStar(graph,weights,heuristic,root){return runTree(new Paths.AStarShortestPathAlgorithm(graph,weights,heuristic),root);}
export function ShortestPathsBellmanFord(graph,weights,root){const result=runTree(new Paths.BellmanFordShortestPathAlgorithm(graph,weights),root);result.hasNegativeCycle=result.algorithm.FoundNegativeCycle;return result;}
export function ShortestPathsDag(graph,weights,root){return runTree(new Paths.DagShortestPathAlgorithm(graph,weights),root);}
export function RankedShortestPathHoffmanPavley(graph,weights,root,target,pathCount=3){const algorithm=new Paths.HoffmanPavleyRankedShortestPathAlgorithm(graph,weights);algorithm.ShortestPathCount=pathCount;algorithm.Compute(root,target);return algorithm.ComputedShortestPaths;}
export function Sinks(graph){required(graph,'graph');return [...graph.Vertices].filter(v=>graph.OutDegree(v)===0);}
export function Roots(graph){required(graph,'graph');const targets=new Set([...graph.Edges].map(e=>e.Target));return [...graph.Vertices].filter(v=>!targets.has(v));}
export function IsolatedVertices(graph){required(graph,'graph');const touched=new Set();for(const e of graph.Edges){touched.add(e.Source);touched.add(e.Target);}return [...graph.Vertices].filter(v=>!touched.has(v));}
function sort(graph,Type,output){const algorithm=new Type(graph);algorithm.Compute();const values=[...algorithm.SortedVertices];if(output){output.push(...values);return output;}return values;}
export function TopologicalSort(graph,output){required(graph,'graph');return sort(graph,graph.IsDirected?Structural.TopologicalSortAlgorithm:Structural.UndirectedTopologicalSortAlgorithm,output);}
export function SourceFirstTopologicalSort(graph,output){required(graph,'graph');return sort(graph,graph.IsDirected?Structural.SourceFirstTopologicalSortAlgorithm:Structural.UndirectedFirstTopologicalSortAlgorithm,output);}
export function SourceFirstBidirectionalTopologicalSort(graph,direction=0,output){if(Array.isArray(direction)){output=direction;direction=0;}const algorithm=new Structural.SourceFirstBidirectionalTopologicalSortAlgorithm(graph,direction);algorithm.Compute();const values=[...algorithm.SortedVertices];if(output){output.push(...values);return output;}return values;}
function components(graph,Type,output=new Map()){const algorithm=new Type(graph,output);algorithm.Compute();if(algorithm.Components!==output){output.clear();for(const pair of algorithm.Components)output.set(...pair);}return algorithm.ComponentCount;}
export function ConnectedComponents(graph,output=new Map()){return components(graph,Structural.ConnectedComponentsAlgorithm,output);}
export function StronglyConnectedComponents(graph,output=new Map()){return components(graph,Structural.StronglyConnectedComponentsAlgorithm,output);}
export function WeaklyConnectedComponents(graph,output=new Map()){return components(graph,Structural.WeaklyConnectedComponentsAlgorithm,output);}
export function IncrementalConnectedComponents(graph){const algorithm=new Structural.IncrementalConnectedComponentsAlgorithm(graph);algorithm.Compute();return algorithm;}
export function CondensateStronglyConnected(graph,graphFactory){const algorithm=graphFactory===undefined?new Structural.CondensationGraphAlgorithm(graph):new Structural.CondensationGraphAlgorithm(graph,graphFactory);algorithm.StronglyConnected=true;algorithm.Compute();return algorithm.CondensedGraph;}
export function CondensateWeaklyConnected(graph,graphFactory){const algorithm=graphFactory===undefined?new Structural.CondensationGraphAlgorithm(graph):new Structural.CondensationGraphAlgorithm(graph,graphFactory);algorithm.StronglyConnected=false;algorithm.Compute();return algorithm.CondensedGraph;}
export function CondensateEdges(graph,vertexPredicate=()=>true){const algorithm=new Structural.EdgeMergeCondensationGraphAlgorithm(graph,new Core.BidirectionalGraph(),vertexPredicate);algorithm.Compute();return algorithm.CondensedGraph;}
export function OddVertices(graph){required(graph,'graph');const counts=new Map([...graph.Vertices].map(v=>[v,0]));for(const e of graph.Edges){counts.set(e.Source,counts.get(e.Source)+1);counts.set(e.Target,counts.get(e.Target)-1);}return [...counts].filter(([,count])=>count%2!==0).map(([v])=>v);}
function graphOrEdges(value,Type){required(value,'graph or edges');if(value.Vertices!==undefined&&value.Edges!==undefined)return value;const graph=new Type();graph.AddVerticesAndEdgeRange(value);return graph;}
export function IsDirectedAcyclicGraph(value){const graph=graphOrEdges(value,Core.AdjacencyGraph);try{new Structural.TopologicalSortAlgorithm(graph).Compute();return true;}catch(error){if(error.name==='NonAcyclicGraphException')return false;throw error;}}
export function IsUndirectedAcyclicGraph(value){const graph=graphOrEdges(value,Core.UndirectedGraph),sets=new Collections.ForestDisjointSet();for(const v of graph.Vertices)sets.MakeSet(v);for(const e of graph.Edges){if(!sets.Union(e.Source,e.Target))return false;}return true;}
export function ComputePredecessorCost(predecessors,weights,vertex){required(predecessors,'predecessors');required(weights,'weights');required(vertex,'vertex');const weight=typeof weights==='function'?weights:GetIndexer(weights);let cost=0;const seen=new Set();while(predecessors.has(vertex)){if(seen.has(vertex))throw new Error('Predecessors contain a cycle.');seen.add(vertex);const e=predecessors.get(vertex);cost+=weight(e);vertex=e.Source;}return cost;}
export function ComputeDisjointSet(graph){required(graph,'graph');const set=new Collections.ForestDisjointSet();for(const v of graph.Vertices)set.MakeSet(v);for(const e of graph.Edges)set.Union(e.Source,e.Target);return set;}
function spanning(graph,weights,Type){required(graph,'graph');required(weights,'weights');const algorithm=new Type(graph,weights),edges=[];algorithm.TreeEdge.add(e=>edges.push(e));algorithm.Compute();return edges;}
export function MinimumSpanningTreePrim(graph,weights){return spanning(graph,weights,Structural.PrimMinimumSpanningTreeAlgorithm);}
export function MinimumSpanningTreeKruskal(graph,weights){return spanning(graph,weights,Structural.KruskalMinimumSpanningTreeAlgorithm);}
export function OfflineLeastCommonAncestor(graph,root,pairs){required(pairs,'pairs');const queries=[...pairs],algorithm=new Structural.TarjanOfflineLeastCommonAncestorAlgorithm(graph);algorithm.Compute(root,queries);return pair=>algorithm.Ancestors.get(required(pair,'pair'));}
/** Additional .NET out value is exposed as `result.predecessors` on this record. */
export function MaximumFlow(graph,capacities,source,sink,edgeFactory=(s,t)=>new Core.Edge(s,t),augmentor){required(source,'source');required(sink,'sink');if(same(source,sink))throw new Error('Source and sink must differ.');if(augmentor===null)throw new TypeError('augmentor is required.');const algorithm=augmentor===undefined?new Advanced.EdmondsKarpMaximumFlowAlgorithm(graph,capacities,edgeFactory):new Advanced.EdmondsKarpMaximumFlowAlgorithm(graph,capacities,edgeFactory,augmentor);algorithm.Compute(source,sink);return{value:algorithm.MaxFlow,predecessors:vertex=>algorithm.Predecessors.get(vertex),algorithm};}
export function ComputeTransitiveReduction(graph){const algorithm=new Structural.TransitiveReductionAlgorithm(graph);algorithm.Compute();return algorithm.TransitiveReduction;}
export function ComputeTransitiveClosure(graph,edgeFactory=(s,t)=>new Core.Edge(s,t)){const algorithm=new Structural.TransitiveClosureAlgorithm(graph,edgeFactory);algorithm.Compute();return algorithm.TransitiveClosure;}
export function Clone(graph,vertexCloner,edgeCloner,clone){required(graph,'graph');required(vertexCloner,'vertexCloner');required(edgeCloner,'edgeCloner');required(clone,'clone');if(graph===clone)throw new Error('Clone destination must differ from source.');clone.Clear();const vertices=new Map();for(const vertex of graph.Vertices){const copy=vertexCloner(vertex);clone.AddVertex(copy);vertices.set(vertex,copy);}for(const edge of graph.Edges)clone.AddEdge(edgeCloner(edge,vertices.get(edge.Source),vertices.get(edge.Target)));return clone;}
export const AlgorithmExtensions=Object.freeze({GetIndexer,GetVertexIdentity,GetEdgeIdentity,TreeBreadthFirstSearch,TreeDepthFirstSearch,TreeCyclePoppingRandom,ShortestPathsDijkstra,ShortestPathsAStar,ShortestPathsBellmanFord,ShortestPathsDag,RankedShortestPathHoffmanPavley,Sinks,Roots,IsolatedVertices,TopologicalSort,SourceFirstTopologicalSort,SourceFirstBidirectionalTopologicalSort,ConnectedComponents,IncrementalConnectedComponents,StronglyConnectedComponents,WeaklyConnectedComponents,CondensateStronglyConnected,CondensateWeaklyConnected,CondensateEdges,OddVertices,IsDirectedAcyclicGraph,IsUndirectedAcyclicGraph,ComputePredecessorCost,ComputeDisjointSet,MinimumSpanningTreePrim,MinimumSpanningTreeKruskal,OfflineLeastCommonAncestor,MaximumFlow,ComputeTransitiveReduction,ComputeTransitiveClosure,Clone});
