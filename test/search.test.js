import test from 'node:test';
import assert from 'node:assert/strict';
import { AdjacencyGraph, BidirectionalGraph, UndirectedGraph, Edge, TaggedEdge, GraphColor, VertexNotFoundException } from '../src/core.js';
import { AlgorithmBase, RootedAlgorithmBase, RootedSearchAlgorithmBase, ComputationState, CancelManager, DistanceRelaxers } from '../src/algorithm-base.js';
import * as S from '../src/search.js';
import { VertexRecorderObserver, VertexDistanceRecorderObserver } from '../src/observers.js';
const {White,Gray,Black}=GraphColor;
function graph(rows,vertices=[],Type=AdjacencyGraph){const g=new Type();g.AddVertexRange(vertices);g.AddVerticesAndEdgeRange(rows.map(row=>new Edge(...row)));return g;}
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ProcessAllComponents
for(const processAll of [false,true])test(`DepthFirstSearchAlgorithmTests.ProcessAllComponents(${processAll})`,()=>{
  const g=graph([[1,2],[1,3],[2,1],[2,4],[2,5],[6,7],[6,8],[8,6]]),a=new S.DepthFirstSearchAlgorithm(g);a.ProcessAllComponents=processAll;a.Compute(1);
  for(const v of [1,2,3,4,5])assert.equal(a.GetVertexColor(v),Black);for(const v of [6,7,8])assert.equal(a.GetVertexColor(v),processAll?Black:White);
});
// Upstream .../Search/DepthFirstSearchAlgorithmTests.cs::RunDepthFirstSearchAndCheck helper invariants.
for(const Algorithm of [S.DepthFirstSearchAlgorithm,S.ImplicitDepthFirstSearchAlgorithm])test(`${Algorithm.name} upstream traversal event invariants`,()=>{
  const g=graph([[1,2],[1,3],[2,1],[2,4],[3,4],[4,4]]),a=new Algorithm(g),parents=new Map(),times=new Map();let time=0;
  a.StartVertex.add(v=>parents.set(v,v));a.DiscoverVertex.add(v=>{assert.equal(a.GetVertexColor(v),Gray);assert.equal(a.GetVertexColor(parents.get(v)),Gray);times.set(v,[time++]);});
  a.TreeEdge.add(e=>parents.set(e.Target,e.Source));a.BackEdge.add(e=>assert.equal(a.GetVertexColor(e.Target),Gray));a.ForwardOrCrossEdge.add(e=>assert.equal(a.GetVertexColor(e.Target),Black));
  a.FinishVertex.add(v=>{assert.equal(a.GetVertexColor(v),Black);times.get(v).push(time++);});a.Compute(1);
  assert.equal(times.size,4);for(const [start,finish]of times.values())assert.ok(start<finish);
});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
// Shared constructor and root fixtures exercise the same contract across search variants.
for(const Algorithm of [S.DepthFirstSearchAlgorithm,S.BreadthFirstSearchAlgorithm,S.BidirectionalDepthFirstSearchAlgorithm,S.UndirectedDepthFirstSearchAlgorithm,S.UndirectedBreadthFirstSearchAlgorithm,S.ImplicitDepthFirstSearchAlgorithm,S.EdgeDepthFirstSearchAlgorithm,S.ImplicitEdgeDepthFirstSearchAlgorithm]){
  test(`${Algorithm.name}.Constructor / root contracts`,()=>{
    const Type=Algorithm.name.startsWith('Undirected')?UndirectedGraph:BidirectionalGraph,g=graph([[1,2]],[],Type),a=new Algorithm(g);assert.equal(a.VisitedGraph,g);assert.equal(a.State,ComputationState.NotRunning);assert.equal(a.TryGetRootVertex(),undefined);
    let changes=0;a.RootVertexChanged.add(()=>changes++);a.SetRootVertex(1);a.SetRootVertex(1);assert.equal(changes,1);assert.equal(a.TryGetRootVertex(),1);a.ClearRootVertex();assert.equal(changes,2);assert.equal(a.TryGetRootVertex(),undefined);
    assert.throws(()=>a.SetRootVertex(null),TypeError);assert.throws(()=>a.Compute(9),{name:'ArgumentException'});a.Compute(1);assert.equal(a.State,ComputationState.Finished);
  });
  test(`${Algorithm.name}.Constructor_Throws`,()=>{assert.throws(()=>new Algorithm(null),TypeError);});
}
test('BreadthFirstSearch rootless starts graph roots and leaves rootless cycles white',()=>{const g=graph([[1,2],[3,4],[4,3]],[1,2,3,4,5]),a=new S.BreadthFirstSearchAlgorithm(g),record=new VertexRecorderObserver();record.Attach(a);a.Compute();assert.deepEqual(record.Vertices,[1,5,2]);assert.equal(a.GetVertexColor(3),White);});
test('BreadthFirstSearch queue order and non-tree color event order',()=>{const g=graph([[1,2],[1,3],[2,3],[3,1]]),a=new S.BreadthFirstSearchAlgorithm(g),log=[];for(const name of ['StartVertex','DiscoverVertex','ExamineVertex','TreeEdge','NonTreeEdge','GrayTarget','BlackTarget','FinishVertex'])a[name].add(x=>log.push([name,x.Source===undefined?x:`${x.Source}${x.Target}`]));a.Compute(1);assert.deepEqual(log,[['StartVertex',1],['DiscoverVertex',1],['ExamineVertex',1],['TreeEdge','12'],['DiscoverVertex',2],['TreeEdge','13'],['DiscoverVertex',3],['FinishVertex',1],['ExamineVertex',2],['NonTreeEdge','23'],['GrayTarget','23'],['FinishVertex',2],['ExamineVertex',3],['NonTreeEdge','31'],['BlackTarget','31'],['FinishVertex',3]]);});
test('Undirected DFS examines each edge once with correctly reversed event arguments',()=>{const g=graph([[0,1],[1,2],[0,2],[2,2]],[],UndirectedGraph),a=new S.UndirectedDepthFirstSearchAlgorithm(g),edges=[];a.ExamineEdge.add((sender,args)=>{assert.equal(sender,a);assert.equal(a.GetVertexColor(args.Source),Gray);edges.push(args.Edge);});a.Compute(2);assert.equal(edges.length,g.EdgeCount);assert.equal(new Set(edges).size,g.EdgeCount);});
test('Bidirectional DFS includes incoming edges',()=>{const g=graph([[0,1],[2,1],[3,2]],[],BidirectionalGraph),a=new S.BidirectionalDepthFirstSearchAlgorithm(g).Compute(1);assert.ok([...a.VerticesColors.values()].every(c=>c===Black));});
test('Implicit graph traversal never enumerates the full vertex set',()=>{const g={ContainsVertex:v=>Number.isInteger(v)&&v>=0&&v<6,OutEdges:v=>v<5?[new Edge(v,v+1)]:[]};const a=new S.ImplicitDepthFirstSearchAlgorithm(g).Compute(0);assert.equal(a.VerticesColors.size,6);const e=new S.ImplicitEdgeDepthFirstSearchAlgorithm(g).Compute(0);assert.equal(e.EdgesColors.size,5);});
test('Depth limits reject invalid values and bound implicit exploration',()=>{const g={ContainsVertex:v=>v>=0,OutEdges:v=>[new Edge(v,v+1)]},a=new S.ImplicitDepthFirstSearchAlgorithm(g);assert.throws(()=>a.MaxDepth=-1,RangeError);a.MaxDepth=2;a.Compute(0);assert.deepEqual([...a.VerticesColors.keys()],[0,1,2]);});
test('DepthFirstSearch OutEdgesFilter reorders traversal',()=>{const g=graph([[0,1],[0,2],[0,3]]),a=new S.DepthFirstSearchAlgorithm(null,g,new Map(),edges=>[...edges].reverse()),record=new VertexRecorderObserver();record.Attach(a);a.Compute(0);assert.deepEqual(record.Vertices,[0,3,2,1]);});
test('DFS traverses 30000 vertices without recursion overflow',()=>{const n=30000,g=new AdjacencyGraph();g.AddVertexRange(Array.from({length:n},(_,i)=>i));for(let i=1;i<n;i++)g.AddEdge(new Edge(i-1,i));const a=new S.DepthFirstSearchAlgorithm(g).Compute(0);assert.equal(a.GetVertexColor(n-1),Black);});
test('AlgorithmBase cancellation event sequence, cleanup, and restart',()=>{const g=graph([[1,2],[2,3]]),a=new S.BreadthFirstSearchAlgorithm(g),log=[];for(const name of ['Started','StateChanged','Aborted','Finished'])a[name].add(()=>log.push([name,a.State]));const sub=a.DiscoverVertex.subscribe(v=>{if(v===2)a.Abort();});a.Compute(1);assert.equal(a.State,ComputationState.Aborted);assert.equal(a.Services.CancelManager.IsCancelling,false);assert.deepEqual(log,[['Started',1],['StateChanged',1],['StateChanged',2],['Aborted',4],['StateChanged',4]]);sub.Dispose();a.Compute(1);assert.equal(a.State,ComputationState.Finished);});
test('AlgorithmBase exceptions clean up and unsupported services fail',()=>{class Broken extends AlgorithmBase{InternalCompute(){throw new Error('failure');}Clean(){this.cleaned=true;}}const a=new Broken(graph([]));assert.throws(()=>a.Compute(),/failure/);assert.equal(a.cleaned,true);assert.equal(a.State,ComputationState.Finished);assert.equal(a.TryGetService('missing'),undefined);assert.throws(()=>a.GetService('missing'),/Service not found/);assert.ok(a.GetService(CancelManager)instanceof CancelManager);});
test('BestFirstFrontierSearch target and shortest distance recorder',()=>{const g=new BidirectionalGraph();g.AddVerticesAndEdgeRange([[0,1,5],[0,2,1],[2,1,1],[1,3,2],[2,3,8]].map(row=>new TaggedEdge(...row)));const a=new S.BestFirstFrontierSearchAlgorithm(g,e=>e.Tag,DistanceRelaxers.ShortestDistance),record=new VertexDistanceRecorderObserver(e=>e.Tag);record.Attach(a);let reached=false;a.TargetReached.add(()=>reached=true);a.Compute(0,3);assert.equal(reached,true);assert.equal(record.Distances.get(3),4);assert.ok(a.OperatorMaxCount>=0);});
test('BestFirstFrontierSearch terminates when target is unreachable beyond a cycle',()=>{const g=graph([[0,1],[1,0]],[0,1,2],BidirectionalGraph),a=new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.ShortestDistance);let reached=false;a.TargetReached.add(()=>reached=true);a.Compute(0,2);assert.equal(a.State,ComputationState.Finished);assert.equal(reached,false);});

// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::BestFirstFrontierSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::BestFirstFrontierComparedToDijkstraSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::DepthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::BreadthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ImplicitDepthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::EdgeDepthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::EdgeDepthFirstSearch
import { readdirSync, readFileSync } from 'node:fs';
const corpusDirectory=new URL('./fixtures/GraphML/',import.meta.url);
for(const filename of readdirSync(corpusDirectory).filter(name=>/^g\.\d+\.\d+\.graphml$/.test(name)||name==='DCT8.graphml').sort())test(`upstream search corpus: ${filename}`,()=>{
  const xml=readFileSync(new URL(filename,corpusDirectory),'utf8'),vertices=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(match=>match[1]),g=graph([],vertices);
  for(const match of xml.matchAll(/<edge\b([^>]+)>?/g)){const source=/\bsource="([^"]+)"/.exec(match[1]),target=/\btarget="([^"]+)"/.exec(match[1]);if(source&&target)g.AddEdge(new Edge(source[1],target[1]));}
  if(vertices.length){const root=vertices[0],d=new DijkstraShortestPathAlgorithm(g,()=>1).Compute(root);for(const target of vertices){const b=new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.ShortestDistance),record=new VertexDistanceRecorderObserver(()=>1);record.Attach(b);let reached=false;b.TargetReached.add(()=>reached=true);b.Compute(root,target);assert.equal(reached,d.GetDistance(target)!==Number.MAX_VALUE);if(target!==root&&reached)assert.equal(record.Distances.get(target),d.GetDistance(target));}}
  for(const root of vertices){
    const reachable=new Set([root]);let changed=true;while(changed){changed=false;for(const edge of g.Edges)if(reachable.has(edge.Source)&&!reachable.has(edge.Target)){reachable.add(edge.Target);changed=true;}}
    for(const Algorithm of [S.BreadthFirstSearchAlgorithm,S.DepthFirstSearchAlgorithm,S.ImplicitDepthFirstSearchAlgorithm]){
      const a=new Algorithm(g),discovered=new Set(),finished=new Set();a.DiscoverVertex.add(v=>{assert.equal(a.GetVertexColor(v),Gray);assert.equal(discovered.has(v),false);discovered.add(v);});a.FinishVertex.add(v=>{assert.equal(a.GetVertexColor(v),Black);finished.add(v);});a.Compute(root);assert.deepEqual(discovered,reachable);assert.deepEqual(finished,reachable);
    }
    const reachableEdges=new Set(g.Edges.filter(e=>reachable.has(e.Source)));
    for(const Algorithm of [S.EdgeDepthFirstSearchAlgorithm,S.ImplicitEdgeDepthFirstSearchAlgorithm]){const a=new Algorithm(g),finished=new Set();a.FinishEdge.add(e=>finished.add(e));a.Compute(root);assert.deepEqual(finished,reachableEdges);}
  }
});

// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::UndirectedDepthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::UndirectedBreadthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::DepthFirstSearch
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::UndirectedDijkstra
import { DijkstraShortestPathAlgorithm, UndirectedDijkstraShortestPathAlgorithm } from '../src/shortest-paths.js';
for(const filename of readdirSync(corpusDirectory).filter(name=>/^g\.\d+\.\d+\.graphml$/.test(name)||name==='DCT8.graphml').sort())test(`upstream undirected search/path corpus: ${filename}`,()=>{
  const xml=readFileSync(new URL(filename,corpusDirectory),'utf8'),vertices=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(match=>match[1]),g=graph([],vertices,UndirectedGraph),directed=graph([],vertices,BidirectionalGraph);
  for(const match of xml.matchAll(/<edge\b([^>]+)>?/g)){const source=/\bsource="([^"]+)"/.exec(match[1]),target=/\btarget="([^"]+)"/.exec(match[1]);if(source&&target){const edge=new Edge(source[1],target[1]);g.AddEdge(edge);directed.AddEdge(edge);}}
  for(const root of vertices){
    const distances=new Map([[root,0]]);let changed=true;while(changed){changed=false;for(const edge of g.Edges)for(const [source,target]of [[edge.Source,edge.Target],[edge.Target,edge.Source]]){const distance=(distances.get(source)??Infinity)+1;if(distance<(distances.get(target)??Infinity)){distances.set(target,distance);changed=true;}}}
    const reachable=new Set(distances.keys());
    for(const Algorithm of [S.UndirectedBreadthFirstSearchAlgorithm,S.UndirectedDepthFirstSearchAlgorithm,S.BidirectionalDepthFirstSearchAlgorithm]){const a=new Algorithm(Algorithm===S.BidirectionalDepthFirstSearchAlgorithm?directed:g),discovered=new Set(),finished=new Set();a.DiscoverVertex.add(v=>discovered.add(v));a.FinishVertex.add(v=>finished.add(v));a.Compute(root);assert.deepEqual(discovered,reachable);assert.deepEqual(finished,reachable);}
    const dijkstra=new UndirectedDijkstraShortestPathAlgorithm(g,()=>1).Compute(root);for(const vertex of vertices)assert.equal(dijkstra.GetDistance(vertex),distances.get(vertex)??Number.MAX_VALUE);
  }
});

// Complete branch ports of the shared RootedAlgorithmTestsBase helper methods.
function assertSearchRootContract(method,make,g,requiresRoot){let a=make();
  if(method==='TryGetRootVertex'){assert.equal(a.TryGetRootVertex(),undefined);const v={};a.SetRootVertex(v);assert.equal(a.TryGetRootVertex(),v);}
  else if(method==='SetRootVertex'){let n=0;a.RootVertexChanged.add(()=>n++);for(const [v,count]of [[0,1],[0,1],[1,2],[0,3]]){a.SetRootVertex(v);assert.equal(a.TryGetRootVertex(),v);assert.equal(n,count);}}
  else if(method==='SetRootVertex_Throws'){assert.throws(()=>a.SetRootVertex(null),TypeError);}
  else if(method==='ClearRootVertex'){let n=0;a.RootVertexChanged.add(()=>n++);a.ClearRootVertex();assert.equal(n,0);a.SetRootVertex({});n=0;a.ClearRootVertex();assert.equal(n,1);a.ClearRootVertex();assert.equal(n,1);}
  else if(method==='ComputeWithoutRoot_Throws'){if(requiresRoot){assert.throws(()=>a.Compute(),{name:'InvalidOperationException'});a=make();a.SetRootVertex({});assert.throws(()=>a.Compute(),VertexNotFoundException);}else{a.Compute();g.AddVertexRange([1,2]);make().Compute();}}
  else if(method==='ComputeWithRoot'){g.AddVertex(0);a.Compute(0);assert.equal(a.TryGetRootVertex(),0);}
  else if(method==='ComputeWithRoot_Throws'){assert.throws(()=>a.Compute(null),TypeError);assert.equal(a.TryGetRootVertex(),undefined);a=make();assert.throws(()=>a.Compute({}),{name:'ArgumentException'});}
  else if(method==='GetVertexColor'){g.AddVerticesAndEdge(new Edge(1,2));assert.throws(()=>a.GetVertexColor(1),VertexNotFoundException);a.Compute(1);assert.equal(a.GetVertexColor(1),Black);assert.equal(a.GetVertexColor(2),Black);}
}
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('DepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('DepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('DepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('DepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('DepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('DepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('DepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/DepthFirstSearchAlgorithmTests.cs::GetVertexColor
test('DepthFirstSearchAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('GetVertexColor',()=>new S.DepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::TryGetRootVertex
test('BreadthFirstSearchAlgirthmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::SetRootVertex
test('BreadthFirstSearchAlgirthmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::SetRootVertex_Throws
test('BreadthFirstSearchAlgirthmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ClearRootVertex
test('BreadthFirstSearchAlgirthmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ComputeWithoutRoot_Throws
test('BreadthFirstSearchAlgirthmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ComputeWithRoot
test('BreadthFirstSearchAlgirthmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::ComputeWithRoot_Throws
test('BreadthFirstSearchAlgirthmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BreadthFirstSearchAlgirthmTests.cs::GetVertexColor
test('BreadthFirstSearchAlgirthmTests.GetVertexColor full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('GetVertexColor',()=>new S.BreadthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('BidirectionalDepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('BidirectionalDepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('BidirectionalDepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('BidirectionalDepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('BidirectionalDepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('BidirectionalDepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('BidirectionalDepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::GetVertexColor
test('BidirectionalDepthFirstSearchAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('GetVertexColor',()=>new S.BidirectionalDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('UndirectedDepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('UndirectedDepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('SetRootVertex',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('UndirectedDepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('UndirectedDepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ClearRootVertex',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('UndirectedDepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('UndirectedDepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('UndirectedDepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::GetVertexColor
test('UndirectedDepthFirstSearchAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('GetVertexColor',()=>new S.UndirectedDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('UndirectedBreathFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::SetRootVertex
test('UndirectedBreathFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('SetRootVertex',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('UndirectedBreathFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ClearRootVertex
test('UndirectedBreathFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ClearRootVertex',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('UndirectedBreathFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('UndirectedBreathFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('UndirectedBreathFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedBreathFirstSearchAlgorithmTests.cs::GetVertexColor
test('UndirectedBreathFirstSearchAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new UndirectedGraph();assertSearchRootContract('GetVertexColor',()=>new S.UndirectedBreadthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('ImplicitDepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('ImplicitDepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('ImplicitDepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('ImplicitDepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('ImplicitDepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('ImplicitDepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('ImplicitDepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.ImplicitDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('EdgeDepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('EdgeDepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('EdgeDepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('EdgeDepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('EdgeDepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('EdgeDepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('EdgeDepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.EdgeDepthFirstSearchAlgorithm(g),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::TryGetRootVertex
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::SetRootVertex_Throws
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ClearRootVertex
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithoutRoot_Throws',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/ImplicitEdgeDepthFirstSearchAlgorithmTests.cs::ComputeWithRoot_Throws
test('ImplicitEdgeDepthFirstSearchAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ComputeWithRoot_Throws',()=>new S.ImplicitEdgeDepthFirstSearchAlgorithm(g),g,true);});

test('traversal uses SameValueZero identity for NaN and signed-zero vertices',()=>{for(const Type of [AdjacencyGraph,UndirectedGraph]){const g=graph([[NaN,-0],[-0,1],[NaN,NaN]],[],Type);for(const Algorithm of Type===UndirectedGraph?[S.UndirectedBreadthFirstSearchAlgorithm,S.UndirectedDepthFirstSearchAlgorithm]:[S.BreadthFirstSearchAlgorithm,S.DepthFirstSearchAlgorithm,S.ImplicitDepthFirstSearchAlgorithm,S.BidirectionalDepthFirstSearchAlgorithm]){const a=new Algorithm(g);let changes=0;a.RootVertexChanged.add(()=>changes++);a.SetRootVertex(-0);a.SetRootVertex(0);assert.equal(changes,1);a.Compute(NaN);assert.equal(a.GetVertexColor(0),Black);assert.equal(a.GetVertexColor(NaN),Black);assert.equal(a.GetVertexColor(1),Black);}}const g=graph([[NaN,0],[0,1]],[],BidirectionalGraph),a=new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.ShortestDistance);let reached=0;a.TargetReached.add(()=>reached++);a.Compute(NaN,-0);a.Compute(-0,0);a.Compute(NaN,NaN);assert.equal(reached,3);});

function assertTargetContract(method,make,g){let a=make();
 if(method==='TryGetTargetVertex'){assert.equal(a.TryGetTargetVertex(),undefined);const v={};a.SetTargetVertex(v);assert.equal(a.TryGetTargetVertex(),v);}
 else if(method==='SetTargetVertex'){let count=0;a.TargetVertexChanged.add(()=>count++);for(const[v,n]of [[0,1],[0,1],[1,2],[0,3]]){a.SetTargetVertex(v);assert.equal(a.TryGetTargetVertex(),v);assert.equal(count,n);}}
 else if(method==='SetTargetVertex_Throws')assert.throws(()=>a.SetTargetVertex(null),TypeError);
 else if(method==='ClearTargetVertex'){let count=0;a.TargetVertexChanged.add(()=>count++);a.ClearTargetVertex();assert.equal(count,0);a.SetTargetVertex({});count=0;a.ClearTargetVertex();assert.equal(count,1);a.ClearTargetVertex();assert.equal(count,1);}
 else if(method==='ComputeWithoutRoot_Throws'){assert.throws(()=>a.Compute(),{name:'InvalidOperationException'});a=make();a.SetRootVertex(1);a.SetTargetVertex(1);assert.throws(()=>a.Compute(),{name:'VertexNotFoundException'});g.AddVertex(1);a=make();a.SetRootVertex(1);a.SetTargetVertex(2);assert.throws(()=>a.Compute(),{name:'VertexNotFoundException'});}
 else if(method==='ComputeWithRootAndTarget'){g.AddVertexRange([0,1]);a.Compute(0,1);assert.equal(a.TryGetRootVertex(),0);assert.equal(a.TryGetTargetVertex(),1);}
 else if(method==='ComputeWithRootAndTarget_Throws'){assert.throws(()=>a.Compute(1),{name:'ArgumentException'});g.AddVertex(1);assert.throws(()=>a.Compute(1),{name:'InvalidOperationException'});assert.throws(()=>a.Compute(1,2),{name:'ArgumentException'});for(const args of [[null],[{},null],[null,{}],[null,null]])assert.throws(()=>make().Compute(...args),TypeError);}
}
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::TryGetRootVertex
test('BestFirstFrontierSearchAlgorithmTests.TryGetRootVertex complete helper',()=>{const g=new BidirectionalGraph();assertSearchRootContract('TryGetRootVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SetRootVertex
test('BestFirstFrontierSearchAlgorithmTests.SetRootVertex complete helper',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SetRootVertex_Throws
test('BestFirstFrontierSearchAlgorithmTests.SetRootVertex_Throws complete helper',()=>{const g=new BidirectionalGraph();assertSearchRootContract('SetRootVertex_Throws',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::ClearRootVertex
test('BestFirstFrontierSearchAlgorithmTests.ClearRootVertex complete helper',()=>{const g=new BidirectionalGraph();assertSearchRootContract('ClearRootVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::TryGetTargetVertex
test('BestFirstFrontierSearchAlgorithmTests.TryGetTargetVertex complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('TryGetTargetVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SetTargetVertex
test('BestFirstFrontierSearchAlgorithmTests.SetTargetVertex complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('SetTargetVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SetTargetVertex_Throws
test('BestFirstFrontierSearchAlgorithmTests.SetTargetVertex_Throws complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('SetTargetVertex_Throws',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::ClearTargetVertex
test('BestFirstFrontierSearchAlgorithmTests.ClearTargetVertex complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('ClearTargetVertex',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('BestFirstFrontierSearchAlgorithmTests.ComputeWithoutRoot_Throws complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('ComputeWithoutRoot_Throws',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::ComputeWithRootAndTarget
test('BestFirstFrontierSearchAlgorithmTests.ComputeWithRootAndTarget complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('ComputeWithRootAndTarget',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::ComputeWithRootAndTarget_Throws
test('BestFirstFrontierSearchAlgorithmTests.ComputeWithRootAndTarget_Throws complete helper',()=>{const g=new BidirectionalGraph();assertTargetContract('ComputeWithRootAndTarget_Throws',()=>new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.EdgeShortestDistance),g);});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::Constructor_Throws
test('BestFirstFrontier constructors all graph/weight/relaxer null combinations',()=>{const g=graph([],[],BidirectionalGraph),weights=()=>1,relaxer=DistanceRelaxers.ShortestDistance;for(const args of [[g,weights,relaxer],[null,g,weights,relaxer]])assert.equal(new S.BestFirstFrontierSearchAlgorithm(...args).VisitedGraph,g);for(let mask=1;mask<8;mask++){const args=[g,weights,relaxer].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new S.BestFirstFrontierSearchAlgorithm(...args),TypeError);assert.throws(()=>new S.BestFirstFrontierSearchAlgorithm(null,...args),TypeError);}});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SameStartAndEnd
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BestFirstFrontierSearchAlgorithmTests.cs::SimpleGraph
test('BestFirstFrontier SameStartAndEnd and SimpleGraph exact source fixtures',()=>{for(const[root,target,rows]of [[1,1,[[1,3],[1,2],[2,5],[2,4],[5,6],[5,7]]],['A','G',[['A','C'],['A','B'],['B','E'],['B','D'],['E','F'],['E','G']]]]){const g=graph(rows,[],BidirectionalGraph),a=new S.BestFirstFrontierSearchAlgorithm(g,()=>1,DistanceRelaxers.ShortestDistance);let reached=false;a.TargetReached.add(()=>reached=true);a.Compute(root,target);assert.equal(reached,true);}});
// upstream: tests/QuikGraph.Tests/Algorithms/Search/BidirectionalDepthFirstSearchAlgorithmTests.cs::ProcessAllComponents
// upstream: tests/QuikGraph.Tests/Algorithms/Search/UndirectedDepthFirstSearchAlgorithmTests.cs::ProcessAllComponents
// upstream: tests/QuikGraph.Tests/Algorithms/Search/EdgeDepthFirstSearchAlgorithmTests.cs::ProcessAllComponents
for(const Algorithm of [S.BidirectionalDepthFirstSearchAlgorithm,S.UndirectedDepthFirstSearchAlgorithm,S.EdgeDepthFirstSearchAlgorithm])for(const all of [false,true])test(`${Algorithm.name}.ProcessAllComponents(${all}) source components`,()=>{const g=graph([[1,2],[1,3],[2,1],[2,4],[2,5],[6,7],[6,8],[8,6]],[],Algorithm===S.UndirectedDepthFirstSearchAlgorithm?UndirectedGraph:BidirectionalGraph),a=new Algorithm(g);a.ProcessAllComponents=all;a.Compute(1);if(a.EdgesColors){for(const[e,color]of a.EdgesColors)assert.equal(color,all||e.Source<6?Black:White);}else{for(const[v,color]of a.VerticesColors)assert.equal(color,all||v<6?Black:White);}});

// Every constructor overload's nullable arguments are exercised independently.
for(const Algorithm of [S.DepthFirstSearchAlgorithm,S.BidirectionalDepthFirstSearchAlgorithm,S.UndirectedDepthFirstSearchAlgorithm,S.EdgeDepthFirstSearchAlgorithm])test(`${Algorithm.name}.Constructor_Throws full overload matrix`,()=>{const g=graph([],[],Algorithm===S.UndirectedDepthFirstSearchAlgorithm?UndirectedGraph:BidirectionalGraph),colors=new Map(),filter=edges=>edges;for(const args of [[g,colors],[null,g,colors]]){const a=new Algorithm(...args);assert.equal(a.VisitedGraph,g);assert.equal(a.VerticesColors??a.EdgesColors,colors);assert.equal(a.ProcessAllComponents,false);assert.equal(a.MaxDepth,2147483647);a.MaxDepth=12;a.ProcessAllComponents=true;assert.equal(a.MaxDepth,12);assert.equal(a.ProcessAllComponents,true);assert.throws(()=>a.MaxDepth=-1,RangeError);}for(let mask=1;mask<4;mask++){const args=[g,colors].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new Algorithm(...args),TypeError);assert.throws(()=>new Algorithm(null,...args),TypeError);}if(Algorithm===S.DepthFirstSearchAlgorithm||Algorithm===S.UndirectedDepthFirstSearchAlgorithm){const a=new Algorithm(null,g,colors,filter);assert.equal(a.OutEdgesFilter,filter);for(let mask=1;mask<8;mask++){const args=[g,colors,filter].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new Algorithm(null,...args),TypeError);}}});
for(const Algorithm of [S.BreadthFirstSearchAlgorithm,S.UndirectedBreadthFirstSearchAlgorithm])test(`${Algorithm.name}.Constructor_Throws full queue/map/filter matrix`,()=>{const g=graph([],[],Algorithm===S.UndirectedBreadthFirstSearchAlgorithm?UndirectedGraph:AdjacencyGraph),items=[],queue={get Count(){return items.length;},Enqueue(v){items.push(v);},Dequeue(){return items.shift();}},colors=new Map(),filter=edges=>edges;for(const args of [[g,queue,colors],[null,g,queue,colors],[null,g,queue,colors,filter]]){const a=new Algorithm(...args);assert.equal(a.VisitedGraph,g);assert.equal(a.VerticesColors,colors);if(args.length===5)assert.equal(a.OutEdgesFilter,filter);}for(let mask=1;mask<8;mask++){const args=[g,queue,colors].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new Algorithm(...args),TypeError);assert.throws(()=>new Algorithm(null,...args),TypeError);}for(let mask=1;mask<16;mask++){const args=[g,queue,colors,filter].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new Algorithm(null,...args),TypeError);}});
for(const Algorithm of [S.ImplicitDepthFirstSearchAlgorithm,S.ImplicitEdgeDepthFirstSearchAlgorithm])test(`${Algorithm.name}.Constructor complete host/depth branches`,()=>{const g=graph([]);for(const args of [[g],[null,g]]){const a=new Algorithm(...args);assert.equal(a.VisitedGraph,g);assert.equal(a.MaxDepth,2147483647);assert.equal((a.VerticesColors??a.EdgesColors).size,0);a.MaxDepth=12;assert.equal(a.MaxDepth,12);assert.throws(()=>a.MaxDepth=-1,RangeError);}assert.throws(()=>new Algorithm(null),TypeError);assert.throws(()=>new Algorithm(null,null),TypeError);});
