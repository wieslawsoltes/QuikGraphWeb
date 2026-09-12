import test from 'node:test';
import assert from 'node:assert/strict';
import { AdjacencyGraph, BidirectionalGraph, UndirectedGraph, TaggedEdge, NoPathFoundException, NegativeWeightException, NegativeCycleGraphException, NonAcyclicGraphException } from '../src/core.js';
import { DistanceRelaxers, GraphColor } from '../src/algorithm-base.js';
import * as P from '../src/shortest-paths.js';
import { VertexPredecessorRecorderObserver } from '../src/observers.js';
const weight = edge => edge.Tag;
function graph(rows, vertices = [], Type = AdjacencyGraph) { const g = new Type(); g.AddVertexRange(vertices); g.AddVerticesAndEdgeRange(rows.map(row => new TaggedEdge(...row))); return g; }
const pathCost = path => [...path].reduce((sum, edge) => sum + edge.Tag, 0);
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::DijkstraSimpleGraph
for (const Algorithm of [P.DijkstraShortestPathAlgorithm, P.BellmanFordShortestPathAlgorithm, P.DagShortestPathAlgorithm]) test(`${Algorithm.name}: DijkstraSimpleGraph upstream fixture`, () => {
  const g = graph([['A','B',30],['A','C',30],['C','D',40],['D','E',4],['B','E',60]], ['A','B','D','C','E']);
  const a = new Algorithm(g, weight), observer = new VertexPredecessorRecorderObserver(); const subscription = observer.Attach(a); a.Compute('A'); subscription.Dispose();
  assert.equal(a.GetDistance('E'), 74); assert.equal(pathCost(observer.TryGetPath('E')),74); assert.equal([...a.GetDistances()].length,5);
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::SimpleNoPathGraph
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::LoopGraph
test('YenShortestPathsAlgorithmTests.SimpleNoPathGraph / LoopGraph', () => {
  const g=graph([],['1','2']); assert.throws(()=>new P.YenShortestPathsAlgorithm(g,'1','1',10).Execute(),NoPathFoundException); assert.throws(()=>new P.YenShortestPathsAlgorithm(g,'1','2',10).Execute(),NoPathFoundException);
  g.AddEdge(new TaggedEdge('1','1',7)); assert.throws(()=>new P.YenShortestPathsAlgorithm(g,'1','1',10).Execute(),NoPathFoundException);
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::GraphWithCycle
test('YenShortestPathsAlgorithmTests.GraphWithCycle', () => {
  const g=graph([['1','2',1],['1','3',12],['1','4',0.5],['2','3',3],['2','4',2],['3','5',1],['5','2',6]],'12345');
  const paths=new P.YenShortestPathsAlgorithm(g,'1','5',10).Execute(); assert.deepEqual(paths.map(pathCost),[5,13]); assert.deepEqual(paths.map(p=>[...p].map(e=>`${e.Source}${e.Target}`)),[['12','23','35'],['13','35']]);
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::GraphWithMultiplePaths
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::GraphWithMultiplePaths_KShortest
test('YenShortestPathsAlgorithmTests.GraphWithMultiplePaths', () => {
  const g=graph([['A','B',5],['A','C',6],['B','C',7],['B','D',8],['C','D',9]],'ABCD');
  const paths=new P.YenShortestPathsAlgorithm(g,'A','D',5).Execute(); assert.deepEqual(paths.map(pathCost),[13,15,21]); assert.deepEqual(paths.map(p=>[...p].map(e=>`${e.Source}${e.Target}`)),[['AB','BD'],['AC','CD'],['AB','BC','CD']]);
});
test('YenShortestPathsAlgorithmTests.GraphWithMultiplePaths_KShortest', () => {
  const g=graph([['C','D',3],['C','E',2],['D','F',4],['E','D',1],['E','F',2],['E','G',3],['F','G',2],['F','H',1],['G','H',2]],'CDEFGH');
  const five=new P.YenShortestPathsAlgorithm(g,'C','H',5).Execute(),all=new P.YenShortestPathsAlgorithm(g,'C','H',50).Execute();
  assert.equal(five.length,5); assert.equal(all.length,7); assert.deepEqual(all.map(pathCost),[5,7,8,8,8,11,11]);
  const hp=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight); hp.ShortestPathCount=50; hp.Compute('C','H'); assert.deepEqual(hp.ComputedShortestPaths.map(pathCost),all.map(pathCost));
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::LineGraph
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::PredecessorsLineGraph
test('DijkstraShortestPathAlgorithmTests.LineGraph / PredecessorsLineGraph',()=>{
  const g=graph([[1,2,1],[2,3,1]],[1,2,3]); const a=new P.DijkstraShortestPathAlgorithm(g,weight).Compute(1);
  assert.deepEqual([...a.Distances],[[1,0],[2,1],[3,2]]); assert.deepEqual(a.TryGetPath(3),g.Edges); assert.equal(a.TryGetPath(1),undefined); assert.equal(a.TryGetDistance(4),undefined);
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::Dijkstra_Throws
test('DijkstraShortestPathAlgorithmTests.Dijkstra_Throws negative weights',()=>{const g=graph([[1,2,1],[2,3,-1],[3,4,2]]);assert.throws(()=>new P.DijkstraShortestPathAlgorithm(g,weight).Compute(1),NegativeWeightException);});
test('AStar reopens closed vertices with inconsistent heuristic',()=>{const g=graph([['s','a',3],['s','b',1],['b','a',1],['a','t',1],['b','t',20]]);const a=new P.AStarShortestPathAlgorithm(g,weight,v=>({s:0,a:0,b:4,t:0}[v])).Compute('s');assert.equal(a.GetDistance('t'),3);assert.equal(pathCost(a.TryGetPath('t')),3);});
test('DAG rejects cycles and ignores negative edges from unreachable vertices',()=>{const g=graph([[0,1,2],[2,1,-10]],[0,1,2]);assert.equal(new P.DagShortestPathAlgorithm(g,weight).Compute(0).GetDistance(1),2);g.AddEdge(new TaggedEdge(1,0,1));assert.throws(()=>new P.DagShortestPathAlgorithm(g,weight).Compute(0),NonAcyclicGraphException);});
test('DAG critical distance supports longest paths',()=>{const g=graph([[0,1,2],[0,2,1],[1,3,3],[2,3,1]]);assert.equal(new P.DagShortestPathAlgorithm(g,weight,DistanceRelaxers.CriticalDistance).Compute(0).GetDistance(3),5);});
test('BellmanFord detects reachable negative cycles only',()=>{const g=graph([[0,1,1],[1,2,-3],[2,1,1],[3,3,-1]],[0,1,2,3,4]);assert.equal(new P.BellmanFordShortestPathAlgorithm(g,weight).Compute(0).FoundNegativeCycle,true);assert.equal(new P.BellmanFordShortestPathAlgorithm(g,weight).Compute(4).FoundNegativeCycle,false);});
test('FloydWarshall negative self loops and cycles throw',()=>{assert.throws(()=>new P.FloydWarshallAllShortestPathAlgorithm(graph([[0,0,-1]]),weight).Compute(),NegativeCycleGraphException);assert.throws(()=>new P.FloydWarshallAllShortestPathAlgorithm(graph([[0,1,-3],[1,0,1]]),weight).Compute(),NegativeCycleGraphException);});
test('FloydWarshall handles parallel edges, zero length distance and unreachable paths',()=>{const g=graph([[0,1,8],[0,1,2],[1,2,-1]],[0,1,2,3]);const a=new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute();assert.equal(a.TryGetDistance(0,2),1);assert.equal(pathCost(a.TryGetPath(0,2)),1);assert.equal(a.TryGetDistance(0,0),0);assert.equal(a.TryGetPath(0,0),undefined);assert.equal(a.TryGetDistance(3,0),undefined);});
test('Undirected Dijkstra traverses reversed edge endpoints',()=>{const g=graph([[0,1,3],[1,2,4],[0,2,10]],[],UndirectedGraph);const a=new P.UndirectedDijkstraShortestPathAlgorithm(g,weight).Compute(2);assert.equal(a.GetDistance(0),7);assert.deepEqual(a.TryGetPath(0).map(e=>[e.Source,e.Target]),[[1,2],[0,1]]);});
// Independent exhaustive simple-path oracle, independent of all shortest-path implementations.
function pathsOracle(g,source,target) {const output=[];function visit(v,path,seen){if(v===target){output.push(path);return;}for(const e of g.OutEdges(v))if(!seen.has(e.Target)){const next=new Set(seen);next.add(e.Target);visit(e.Target,[...path,e],next);}}visit(source,[],new Set([source]));return output.sort((a,b)=>pathCost(a)-pathCost(b));}
let randomState=0x73517;function random(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/2**32;}
for(let seed=0;seed<80;seed++)test(`random shortest/ranked paths vs exhaustive oracle ${seed}`,()=>{
  const n=2+(seed%5),g=graph([],Array.from({length:n},(_,i)=>i),BidirectionalGraph);
  for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(u!==v&&random()<.32)g.AddEdge(new TaggedEdge(u,v,Math.floor(random()*8)));
  const fw=new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute();
  for(let source=0;source<n;source++){
    const algorithms=[new P.DijkstraShortestPathAlgorithm(g,weight),new P.AStarShortestPathAlgorithm(g,weight,()=>0),new P.BellmanFordShortestPathAlgorithm(g,weight)];for(const a of algorithms)a.Compute(source);
    for(let target=0;target<n;target++){
      const expected=pathsOracle(g,source,target),best=expected.length?pathCost(expected[0]):undefined;
      assert.equal(fw.TryGetDistance(source,target),best,`FW ${source}->${target}`);
      for(const a of algorithms){assert.equal(a.GetDistance(target),best??(a instanceof P.BellmanFordShortestPathAlgorithm?Infinity:Number.MAX_VALUE),`${a.constructor.name} ${source}->${target}`);if(source!==target&&best!==undefined)assert.equal(pathCost(a.TryGetPath(target)),best);}
      if(source!==target&&expected.length){
        const yen=new P.YenShortestPathsAlgorithm(g,source,target,10).Execute();assert.deepEqual(yen.map(pathCost),expected.slice(0,10).map(pathCost),'Yen costs');
        const hp=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight);hp.ShortestPathCount=10;hp.Compute(source,target);assert.deepEqual(hp.ComputedShortestPaths.map(pathCost),expected.slice(0,10).map(pathCost),'Hoffman-Pavley costs');
      }
    }
  }
});

// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::Dijkstra
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::BellmanFord
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::AStar
// upstream: tests/QuikGraph.Tests/Algorithms/RankedShortestPath/HoffmanPavleyRankedShortestPathAlgorithmTests.cs::HoffmanPavleyRankedShortestPath
// The original slow tests use every root of the shared GraphML corpus and
// out-degree + 1 weights. We preserve those inputs, then add an independent
// dense min-plus oracle and cross-algorithm checks for stronger assertions.
import { readdirSync, readFileSync } from 'node:fs';
const corpusDirectory = new URL('./fixtures/GraphML/', import.meta.url);
for (const filename of readdirSync(corpusDirectory).filter(name => /^g\.\d+\.\d+\.graphml$/.test(name) || name === 'DCT8.graphml').sort()) {
  test(`upstream shortest-path corpus: ${filename}`, () => {
    const xml=readFileSync(new URL(filename,corpusDirectory),'utf8'),vertices=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(match=>match[1]),g=graph([],vertices);
    for(const match of xml.matchAll(/<edge\b([^>]+)>?/g)){const source=/\bsource="([^"]+)"/.exec(match[1]),target=/\btarget="([^"]+)"/.exec(match[1]);if(source&&target)g.AddEdge(new TaggedEdge(source[1],target[1],0));}
    for(const edge of g.Edges)edge.Tag=g.OutDegree(edge.Source)+1;
    const n=vertices.length,ids=new Map(vertices.map((v,i)=>[v,i])),distances=new Float64Array(n*n).fill(Infinity);for(let i=0;i<n;i++)distances[i*n+i]=0;
    for(const edge of g.Edges){const at=ids.get(edge.Source)*n+ids.get(edge.Target);distances[at]=Math.min(distances[at],edge.Tag);}
    for(let k=0;k<n;k++)for(let i=0;i<n;i++){const ik=distances[i*n+k];if(ik===Infinity)continue;for(let j=0;j<n;j++){const candidate=ik+distances[k*n+j];if(candidate<distances[i*n+j])distances[i*n+j]=candidate;}}
    const floyd=new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute();
    const degree=new Map(vertices.map(v=>[v,g.InDegree(v)])),order=vertices.filter(v=>degree.get(v)===0);for(let at=0;at<order.length;at++)for(const edge of g.OutEdges(order[at])){degree.set(edge.Target,degree.get(edge.Target)-1);if(degree.get(edge.Target)===0)order.push(edge.Target);}
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++)assert.equal(floyd.TryGetDistance(vertices[i],vertices[j]),distances[i*n+j]===Infinity?undefined:distances[i*n+j]);
      const algorithms=[new P.DijkstraShortestPathAlgorithm(g,weight),new P.AStarShortestPathAlgorithm(g,weight,()=>0),new P.BellmanFordShortestPathAlgorithm(g,weight)];if(order.length===n)algorithms.push(new P.DagShortestPathAlgorithm(g,weight));
      for(const algorithm of algorithms){algorithm.Compute(vertices[i]);assert.equal(algorithm.Distances.size,n);for(let j=0;j<n;j++){const expected=distances[i*n+j];assert.equal(algorithm.GetDistance(vertices[j]),expected===Infinity&&!(algorithm instanceof P.BellmanFordShortestPathAlgorithm)?Number.MAX_VALUE:expected,`${algorithm.constructor.name} ${vertices[i]} -> ${vertices[j]}`);}}
    }
    if(n>1){const ranked=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight);ranked.ShortestPathCount=n;ranked.Compute(vertices[0],vertices[n-1]);if(distances[n-1]!==Infinity){const yen=new P.YenShortestPathsAlgorithm(g,vertices[0],vertices[n-1],n).Execute();assert.deepEqual(ranked.ComputedShortestPaths.map(pathCost),yen.map(pathCost),'Ranked shortest paths differ from Yen');}else assert.equal(ranked.ComputedShortestPathCount,0);}
  });
}

// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::AStar_HeuristicCalls
test('AStarShortestPathAlgorithmTests.AStar_HeuristicCalls',()=>{const g=graph([[0,1,8],[0,2,6],[0,3,20],[2,3,1],[1,4,1],[3,4,5]]),colors=new Set([0,1,2]);let calls=0,a;a=new P.AStarShortestPathAlgorithm(g,weight,v=>{colors.delete(a.GetVertexColor(v));return 10/++calls;});a.Compute(0);assert.equal(colors.size,0);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::AStar_HeuristicCallCount
test('AStarShortestPathAlgorithmTests.AStar_HeuristicCallCount',()=>{const g=graph([[2,3,1],[3,4,1],[2,1,1],[1,0,1]]),calls=[],a=new P.AStarShortestPathAlgorithm(g,weight,v=>{calls.push(v);return v;});a.Compute(2);assert.equal(calls.length,4);assert.ok(calls.indexOf(0)<calls.indexOf(4));});

// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::Constructor_Throws
for(const Algorithm of [P.DijkstraShortestPathAlgorithm,P.BellmanFordShortestPathAlgorithm,P.DagShortestPathAlgorithm,P.UndirectedDijkstraShortestPathAlgorithm])test(`${Algorithm.name} upstream constructors preserve custom relaxers and reject nulls`,()=>{
  const g=graph([],[],Algorithm===P.UndirectedDijkstraShortestPathAlgorithm?UndirectedGraph:AdjacencyGraph);
  for(const args of [[g,weight],[g,weight,DistanceRelaxers.CriticalDistance],[null,g,weight,DistanceRelaxers.CriticalDistance]]){
    const a=new Algorithm(...args);assert.equal(a.VisitedGraph,g);assert.equal(a.Weights,weight);assert.equal(a.VerticesColors,null);assert.deepEqual([...a.GetDistances()],[]);assert.throws(()=>a.TryGetDistance(0),/Run the algorithm/);if(args.length>2)assert.equal(a.DistanceRelaxer,DistanceRelaxers.CriticalDistance);
  }
  for(const args of [[null,weight],[g,null],[g,weight,null],[null,g,null,DistanceRelaxers.ShortestDistance],[null,g,weight,null]])assert.throws(()=>new Algorithm(...args),TypeError);
});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::Constructor_Throws
test('AStar constructors require heuristic and preserve explicit host/relaxer',()=>{const g=graph([]),heuristic=()=>1,a=new P.AStarShortestPathAlgorithm(null,g,weight,heuristic,DistanceRelaxers.CriticalDistance);assert.equal(a.CostHeuristic,heuristic);assert.equal(a.DistanceRelaxer,DistanceRelaxers.CriticalDistance);for(const args of [[g,null,heuristic],[g,weight,null],[g,weight,heuristic,null]])assert.throws(()=>new P.AStarShortestPathAlgorithm(...args),TypeError);});

// upstream: tests/QuikGraph.Tests/Algorithms/RankedShortestPath/HoffmanPavleyRankedShortestPathAlgorithmTests.cs::NotEnoughPaths
test('HoffmanPavleyRankedShortestPathAlgorithmTests.NotEnoughPaths',()=>{const g=graph([[493, 495, 1], [495, 493, 1], [497, 499, 1], [499, 497, 1], [499, 501, 1], [501, 499, 1], [501, 503, 1], [503, 501, 1], [503, 505, 1], [505, 503, 1], [505, 507, 1], [507, 505, 1], [507, 509, 1], [509, 507, 1], [509, 511, 1], [511, 509, 1], [2747, 2749, 1], [2749, 2747, 1], [2749, 2751, 1], [2751, 2749, 1], [2751, 2753, 1], [2753, 2751, 1], [2753, 2755, 1], [2755, 2753, 1], [2755, 2757, 1], [2757, 2755, 1], [2757, 2759, 1], [2759, 2757, 1], [2761, 2763, 1], [2763, 2761, 1], [2765, 2767, 1], [2767, 2765, 1], [2763, 2765, 1], [2765, 2763, 1], [654, 978, 1], [978, 654, 1], [978, 1302, 1], [1302, 978, 1], [1302, 1626, 1], [1626, 1302, 1], [1626, 1950, 1], [1950, 1626, 1], [1950, 2274, 1], [2274, 1950, 1], [2274, 2598, 1], [2598, 2274, 1], [513, 676, 1], [676, 513, 1], [2767, 2608, 1], [2608, 2767, 1], [2287, 2608, 1], [2608, 2287, 1], [676, 999, 1], [999, 676, 1], [1321, 1643, 1], [1643, 1321, 1], [1643, 1965, 1], [1965, 1643, 1], [1965, 2287, 1], [2287, 1965, 1], [999, 1321, 1], [1321, 999, 1], [2745, 2747, 1], [2747, 2745, 1], [650, 491, 1], [491, 650, 1], [650, 970, 1], [970, 650, 1], [2258, 2582, 1], [2582, 2258, 1], [970, 1291, 1], [1291, 970, 1], [1935, 2258, 1], [2258, 1935, 1], [1291, 1613, 1], [1613, 1291, 1], [1613, 1935, 1], [1935, 1613, 1], [2582, 2745, 1], [2745, 2582, 1], [495, 497, 1], [497, 495, 1], [511, 513, 1], [513, 511, 1], [491, 493, 1], [493, 491, 1], [491, 654, 1], [654, 491, 1], [2761, 2598, 1], [2598, 2761, 1], [2761, 2759, 1], [2759, 2761, 1]],[],BidirectionalGraph),a=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight);a.ShortestPathCount=5;a.Compute(1626,1965);assert.equal(a.ComputedShortestPathCount,4);for(const path of a.ComputedShortestPaths){const vertices=[path[0].Source,...path.map(e=>e.Target)];assert.equal(vertices.length,new Set(vertices).size);}});

// upstream: tests/QuikGraph.Tests/Algorithms/RankedShortestPath/HoffmanPavleyRankedShortestPathAlgorithmTests.cs::InfiniteLoop
test('HoffmanPavleyRankedShortestPathAlgorithmTests.InfiniteLoop',()=>{const g=graph([[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [1, 5, 1], [5, 1, 1], [2, 5, 1], [1, 0, 1], [2, 1, 1], [3, 2, 1], [4, 3, 1], [5, 4, 1], [0, 5, 1], [5, 2, 1]],[],BidirectionalGraph),a=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight);a.ShortestPathCount=5;a.Compute(5,2);for(const path of a.ComputedShortestPaths){const vertices=[path[0].Source,...path.map(e=>e.Target)];assert.equal(vertices.length,new Set(vertices).size);}});

// upstream: tests/QuikGraph.Tests/Algorithms/RankedShortestPath/HoffmanPavleyRankedShortestPathAlgorithmTests.cs::HoffmanPavleyRankedShortestPathNetwork
test('HoffmanPavleyRankedShortestPathAlgorithmTests.HoffmanPavleyRankedShortestPathNetwork',()=>{const g=graph([[1, 4, 3], [4, 1, 3], [1, 2, 1], [2, 1, 1], [2, 3, 3], [3, 2, 3], [4, 5, 1], [5, 4, 1], [1, 5, 2], [5, 1, 2], [2, 5, 2], [5, 2, 3], [2, 6, 5], [6, 2, 5], [2, 8, 2], [8, 2, 2], [6, 9, 2], [9, 6, 2], [6, 8, 4], [8, 6, 4], [5, 8, 2], [8, 5, 2], [5, 7, 2], [7, 5, 2], [4, 7, 3], [7, 4, 3], [7, 8, 4], [8, 7, 4], [9, 8, 5]],[],BidirectionalGraph),a=new P.HoffmanPavleyRankedShortestPathAlgorithm(g,weight);a.ShortestPathCount=10;a.Compute(9,1);assert.deepEqual(a.ComputedShortestPaths.map(pathCost),pathsOracle(g,9,1).slice(0,10).map(pathCost));});

function assertPathRootContract(method,make,g,requiresRoot){let a=make();
  if(method==='TryGetRootVertex'){assert.equal(a.TryGetRootVertex(),undefined);const v={};a.SetRootVertex(v);assert.equal(a.TryGetRootVertex(),v);}
  else if(method==='SetRootVertex'){let n=0;a.RootVertexChanged.add(()=>n++);for(const [v,count]of [[0,1],[0,1],[1,2],[0,3]]){a.SetRootVertex(v);assert.equal(a.TryGetRootVertex(),v);assert.equal(n,count);}}
  else if(method==='SetRootVertex_Throws'){assert.throws(()=>a.SetRootVertex(null),TypeError);}
  else if(method==='ClearRootVertex'){let n=0;a.RootVertexChanged.add(()=>n++);a.ClearRootVertex();assert.equal(n,0);a.SetRootVertex({});n=0;a.ClearRootVertex();assert.equal(n,1);a.ClearRootVertex();assert.equal(n,1);}
  else if(method==='ComputeWithoutRoot_Throws'){if(requiresRoot){assert.throws(()=>a.Compute(),{name:'InvalidOperationException'});a=make();a.SetRootVertex({});assert.throws(()=>a.Compute(),{name:'VertexNotFoundException'});}else{a.Compute();g.AddVertexRange([1,2]);make().Compute();}}
  else if(method==='ComputeWithRoot'){g.AddVertex(0);a.Compute(0);assert.equal(a.TryGetRootVertex(),0);}
  else if(method==='ComputeWithRoot_Throws'){assert.throws(()=>a.Compute(null),TypeError);assert.equal(a.TryGetRootVertex(),undefined);a=make();assert.throws(()=>a.Compute({}),{name:'ArgumentException'});}
  else if(method==='GetVertexColor'){g.AddVerticesAndEdge(new TaggedEdge(1,2,1));a.Compute(1);assert.equal(a.GetVertexColor(1),GraphColor.Black);assert.equal(a.GetVertexColor(2),GraphColor.Black);}
}
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::TryGetRootVertex
test('DijkstraShortestPathAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('TryGetRootVertex',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::SetRootVertex
test('DijkstraShortestPathAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::SetRootVertex_Throws
test('DijkstraShortestPathAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex_Throws',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::ClearRootVertex
test('DijkstraShortestPathAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ClearRootVertex',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('DijkstraShortestPathAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithoutRoot_Throws',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::ComputeWithRoot
test('DijkstraShortestPathAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::ComputeWithRoot_Throws
test('DijkstraShortestPathAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot_Throws',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::GetVertexColor
test('DijkstraShortestPathAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('GetVertexColor',()=>new P.DijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::TryGetRootVertex
test('UndirectedDijkstraShortestPathAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('TryGetRootVertex',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::SetRootVertex
test('UndirectedDijkstraShortestPathAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('SetRootVertex',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::SetRootVertex_Throws
test('UndirectedDijkstraShortestPathAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('SetRootVertex_Throws',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::ClearRootVertex
test('UndirectedDijkstraShortestPathAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('ClearRootVertex',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('UndirectedDijkstraShortestPathAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('ComputeWithoutRoot_Throws',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::ComputeWithRoot
test('UndirectedDijkstraShortestPathAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('ComputeWithRoot',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::ComputeWithRoot_Throws
test('UndirectedDijkstraShortestPathAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('ComputeWithRoot_Throws',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/UndirectedDijkstraShortestPathAlgorithmTests.cs::GetVertexColor
test('UndirectedDijkstraShortestPathAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new UndirectedGraph();assertPathRootContract('GetVertexColor',()=>new P.UndirectedDijkstraShortestPathAlgorithm(g,weight),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::TryGetRootVertex
test('AStarShortestPathAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('TryGetRootVertex',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::SetRootVertex
test('AStarShortestPathAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::SetRootVertex_Throws
test('AStarShortestPathAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex_Throws',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::ClearRootVertex
test('AStarShortestPathAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ClearRootVertex',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('AStarShortestPathAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithoutRoot_Throws',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::ComputeWithRoot
test('AStarShortestPathAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::ComputeWithRoot_Throws
test('AStarShortestPathAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot_Throws',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::GetVertexColor
test('AStarShortestPathAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('GetVertexColor',()=>new P.AStarShortestPathAlgorithm(g,weight,()=>0),g,false);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::TryGetRootVertex
test('BellmanFordShortestPathAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('TryGetRootVertex',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::SetRootVertex
test('BellmanFordShortestPathAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::SetRootVertex_Throws
test('BellmanFordShortestPathAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex_Throws',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::ClearRootVertex
test('BellmanFordShortestPathAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ClearRootVertex',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('BellmanFordShortestPathAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithoutRoot_Throws',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::ComputeWithRoot
test('BellmanFordShortestPathAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::ComputeWithRoot_Throws
test('BellmanFordShortestPathAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot_Throws',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::GetVertexColor
test('BellmanFordShortestPathAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('GetVertexColor',()=>new P.BellmanFordShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::TryGetRootVertex
test('DagShortestPathAlgorithmTests.TryGetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('TryGetRootVertex',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::SetRootVertex
test('DagShortestPathAlgorithmTests.SetRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::SetRootVertex_Throws
test('DagShortestPathAlgorithmTests.SetRootVertex_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('SetRootVertex_Throws',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::ClearRootVertex
test('DagShortestPathAlgorithmTests.ClearRootVertex full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ClearRootVertex',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::ComputeWithoutRoot_Throws
test('DagShortestPathAlgorithmTests.ComputeWithoutRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithoutRoot_Throws',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::ComputeWithRoot
test('DagShortestPathAlgorithmTests.ComputeWithRoot full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::ComputeWithRoot_Throws
test('DagShortestPathAlgorithmTests.ComputeWithRoot_Throws full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('ComputeWithRoot_Throws',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DagShortestPathAlgorithmTests.cs::GetVertexColor
test('DagShortestPathAlgorithmTests.GetVertexColor full helper branches',()=>{const g=new AdjacencyGraph();assertPathRootContract('GetVertexColor',()=>new P.DagShortestPathAlgorithm(g,weight),g,true);});

// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::Constructor_Throws
test('FloydWarshall constructors all overload/null branches',()=>{const g=graph([]),relaxer=DistanceRelaxers.CriticalDistance;for(const args of [[g,weight],[g,weight,relaxer],[null,g,weight,relaxer]]){const a=new P.FloydWarshallAllShortestPathAlgorithm(...args);assert.equal(a.VisitedGraph,g);assert.equal(a.State,0);}for(const base of [[g,weight],[g,weight,relaxer]])for(let mask=1;mask<(1<<base.length);mask++){const args=base.map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new P.FloydWarshallAllShortestPathAlgorithm(...args),TypeError);if(base.length===3)assert.throws(()=>new P.FloydWarshallAllShortestPathAlgorithm(null,...args),TypeError);}});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::TryGetDistance
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::TryGetDistance_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::TryGetPath
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::TryGetPath_Throws
test('FloydWarshall TryGetDistance/TryGetPath all initial/unreachable/null branches',()=>{const g=graph([[1,2,1],[2,4,1]],[3]),a=new P.FloydWarshallAllShortestPathAlgorithm(g,weight);for(const target of [1,2,3,4])assert.equal(a.TryGetPath(1,target),undefined);assert.equal(a.TryGetDistance(1,2),undefined);assert.equal(a.TryGetDistance(1,3),undefined);a.Compute();assert.equal(a.TryGetDistance(1,2),1);assert.equal(a.TryGetDistance(1,3),undefined);assert.equal(a.TryGetPath(1,1),undefined);assert.deepEqual(a.TryGetPath(1,2),[g.Edges[0]]);assert.deepEqual(a.TryGetPath(1,4),g.Edges);assert.equal(a.TryGetPath(1,3),undefined);for(const method of ['TryGetPath','TryGetDistance'])for(const args of [[{},null],[null,{}],[null,null]])assert.throws(()=>a[method](...args),TypeError);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::FloydWarshallSimpleGraph
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/DijkstraShortestPathAlgorithmTests.cs::DijkstraSimpleGraph2
test('FloydWarshallSimpleGraph / DijkstraSimpleGraph2 full source fixture',()=>{const g=graph([['A','C',1],['B','B',2],['B','D',1],['B','E',2],['C','B',7],['C','D',3],['D','E',1],['E','A',1],['E','B',1]],'ABCDE'),f=new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute(),d=new P.DijkstraShortestPathAlgorithm(g,weight).Compute('A');for(const [v,distance]of [['A',0],['B',6],['C',1],['D',4],['E',5]]){assert.equal(f.TryGetDistance('A',v),distance);assert.equal(d.GetDistance(v),distance);}});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/FloydWarshallAllShortestPathAlgorithmTests.cs::FloydWarshall_Throws
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/BellmanFordShortestPathAlgorithmTests.cs::BellmanFord_NegativeCycle
test('Floyd/Bellman negative chain and negative-cycle original fixture',()=>{const g=graph([[1,2,12],[2,3,-23],[3,4,-34]]);new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute();assert.equal(new P.BellmanFordShortestPathAlgorithm(g,weight).Compute(1).FoundNegativeCycle,false);g.AddEdge(new TaggedEdge(4,1,41));assert.throws(()=>new P.FloydWarshallAllShortestPathAlgorithm(g,weight).Compute(),NegativeCycleGraphException);assert.equal(new P.BellmanFordShortestPathAlgorithm(g,weight).Compute(1).FoundNegativeCycle,true);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/AStarShortestPathAlgorithmTests.cs::AStar_Throws
test('AStar_Throws original negative edge fixture',()=>{const g=graph([[1,2,12],[2,3,-23],[3,4,34]]);assert.throws(()=>new P.AStarShortestPathAlgorithm(g,weight,()=>1).Compute(1),NegativeWeightException);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::Constructor
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::Constructor_Throws
test('Yen all constructor endpoints/null/rank branches',()=>{const one={},two={};for(const vertices of [[],[one],[two]])assert.throws(()=>new P.YenShortestPathsAlgorithm(graph([],vertices),one,two,2147483647),{name:'ArgumentException'});const g=graph([],[one,two]);for(const k of [10,2147483647])new P.YenShortestPathsAlgorithm(g,one,two,k);new P.YenShortestPathsAlgorithm(g,one,two,2147483647,()=>1,paths=>paths.filter(p=>p.Count>2));for(let mask=1;mask<8;mask++){const args=[g,one,two].map((v,i)=>mask&(1<<i)?null:v);assert.throws(()=>new P.YenShortestPathsAlgorithm(...args,2147483647),TypeError);}for(const k of [0,-1])assert.throws(()=>new P.YenShortestPathsAlgorithm(g,one,two,k),RangeError);});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::MultipleRunMethods
test('Yen MultipleRunMethods default/custom weights and filters fixture',()=>{const g=graph([['1','2',7],['1','3',9],['1','6',14],['2','3',10],['2','4',15],['3','4',11],['3','6',2],['4','5',6],['5','6',9]],'123456');for(const weights of [null,weight])for(const filter of [null,paths=>paths]){const a=new P.YenShortestPathsAlgorithm(g,'1','5',10,weights,filter);for(let run=0;run<2;run++)assert.deepEqual(a.Execute().map(p=>[...p].map(e=>`${e.Source}${e.Target}`).join(',')),['13,34,45','12,24,45','12,23,34,45']);}});
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::SortedPathHashCode
// upstream: tests/QuikGraph.Tests/Algorithms/ShortestPath/YenShortestPathsAlgorithmTests.cs::SortedPathEnumeration
test('SortedPath source identity hash and enumeration semantics',()=>{const edges=[[1,2,1],[2,3,1],[3,4,1]].map(row=>new TaggedEdge(...row)),one=new P.SortedPath(edges),two=new P.SortedPath(edges),three=new P.SortedPath(edges.map(e=>new TaggedEdge(e.Source,e.Target,e.Tag)));assert.equal(one.GetHashCode(),one.GetHashCode());assert.notEqual(one.GetHashCode(),two.GetHashCode());assert.notEqual(one.GetHashCode(),three.GetHashCode());assert.notEqual(two.GetHashCode(),three.GetHashCode());assert.deepEqual([...one],edges);assert.deepEqual([...new P.SortedPath([])],[]);});
