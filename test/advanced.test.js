import test from 'node:test';
import assert from 'node:assert/strict';
import { AdjacencyGraph, BidirectionalGraph, UndirectedGraph, Edge, TaggedEdge, TaggedUndirectedEdge, NegativeCapacityException } from '../src/core.js';
import * as A from '../src/advanced.js';
import { AlgorithmBase, ComputationState } from '../src/algorithm-base.js';
import { readdirSync, readFileSync } from 'node:fs';

const ef=(s,t)=>new Edge(s,t),tf=(s,t,w=0)=>new TaggedEdge(s,t,w);
const make=(pairs,undirected=false,vs=[])=>{const g=undirected?new UndirectedGraph():new BidirectionalGraph();g.AddVertexRange(vs);g.AddVerticesAndEdgeRange(pairs.map(([s,t,w])=>w===undefined?ef(s,t):tf(s,t,w)));return g;};
const seeded=(seed=1)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const perms=xs=>xs.length?xs.flatMap((x,i)=>perms(xs.filter((_,j)=>i!==j)).map(p=>[x,...p])):[[]];
const assignmentCost=m=>Math.min(...perms([...Array(m[0].length).keys()]).map(p=>m.reduce((s,row,i)=>s+row[p[i]],0)));
const pathValid=es=>es.every((e,i)=>i===0||es[i-1].Target===e.Source);

// Upstream: tests/QuikGraph.Tests/Algorithms/Assigment/HungarianAlgorithmTests.cs::Constructor
test('Hungarian constructors, empty matrix, and argument validation',()=>{
  assert.equal(new A.HungarianAlgorithm([]).AgentsTasks,undefined);
  assert.deepEqual(new A.HungarianAlgorithm([]).Compute(),[]);
  assert.throws(()=>new A.HungarianAlgorithm(null),TypeError);
  assert.throws(()=>new A.HungarianAlgorithm([[1],[2,3]]),RangeError);
  assert.throws(()=>new A.HungarianAlgorithm([[1],[2]]),RangeError);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Assigment/HungarianAlgorithmTests.cs::SimpleAssignment
test('Hungarian simple assignment',()=>assert.deepEqual(new A.HungarianAlgorithm([[1,2,3],[3,3,3],[3,3,2]]).Compute(),[0,1,2]));
// Upstream: tests/QuikGraph.Tests/Algorithms/Assigment/HungarianAlgorithmTests.cs::JobAssignment
test('Hungarian job assignment',()=>assert.deepEqual(new A.HungarianAlgorithm([[82,83,69,92],[77,37,49,92],[11,69,5,86],[8,9,98,23]]).Compute(),[2,1,0,3]));
// Upstream: tests/QuikGraph.Tests/Algorithms/Assigment/HungarianAlgorithmTests.cs::SimpleAssignmentIterations
test('Hungarian simple iteration snapshots are independent',()=>{
  const a=new A.HungarianAlgorithm([[1,2,3],[3,3,3],[3,3,2]]),it=[...a.GetIterations()];
  assert.deepEqual(a.AgentsTasks,[0,1,2]);assert.equal(it.length,3);assert.deepEqual(it.map(x=>x.Step),[0,1,5]);
  for(const x of it){assert.deepEqual(x.Matrix,[[0,1,2],[0,0,0],[1,1,0]]);assert.deepEqual(x.Mask,[[1,0,0],[0,1,0],[0,0,1]]);assert.deepEqual(x.RowsCovered,[false,false,false]);}
  assert.deepEqual(it.map(x=>x.ColumnsCovered),[[false,false,false],[true,true,true],[true,true,true]]);
  it[0].Matrix[0][0]=100;assert.equal(it[1].Matrix[0][0],0);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Assigment/HungarianAlgorithmTests.cs::JobAssignmentIterations
test('Hungarian eleven job assignment iterations',()=>{
  const a=new A.HungarianAlgorithm([[82,83,69,92],[77,37,49,92],[11,69,5,86],[8,9,98,23]]),it=[...a.GetIterations()];
  assert.equal(it.length,11);assert.deepEqual(a.AgentsTasks,[2,1,0,3]);
  assert.deepEqual(it.map(x=>x.Step),[0,1,2,4,2,2,4,2,3,1,5]);
  assert.deepEqual(it.at(-1).Matrix,[[7,14,0,2],[34,0,12,34],[0,64,0,60],[0,7,96,0]]);
});
test('Hungarian differential: negative and rectangular assignments versus exhaustive permutations',()=>{
  const rand=seeded(72);for(let n=1;n<=5;++n)for(let k=0;k<12;++k){const width=n+(k%2),m=Array.from({length:n},()=>Array.from({length:width},()=>Math.floor(rand()*40)-20));const a=new A.HungarianAlgorithm(m.map(r=>r.slice())),p=a.Compute();assert.equal(new Set(p).size,n);assert.equal(p.reduce((s,j,i)=>s+m[i][j],0),assignmentCost(m));}
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/EdmondsKarpMaximumFlowAlgorithmTests.cs::SimpleFlow
test('Edmonds-Karp upstream seven-vertex five-unit flow and residual fixture',()=>{
  const g=make([['A','D',3],['A','B',3],['B','C',4],['C','A',3],['C','D',1],['D','E',2],['D','F',6],['E','B',1],['C','E',2],['E','G',1],['F','G',9]]),original=g.Edges;
  const reverse=new A.ReversedEdgeAugmentorAlgorithm(g,(s,t)=>tf(s,t,0));reverse.AddReversedEdges();
  const a=new A.EdmondsKarpMaximumFlowAlgorithm(g,e=>e.Tag,tf,reverse);assert.equal(a.Compute('A','G'),5);assert.equal(a.Predecessors.size,6);assert.equal(a.ResidualCapacities.size,g.EdgeCount);
  const residual=new Map(g.Edges.map(e=>[`${e.Source}${e.Target}`,a.ResidualCapacities.get(e)]));
  assert.deepEqual(Object.fromEntries(residual),{AD:0,AB:1,AC:0,BC:2,BA:2,BE:0,CA:3,CD:0,CE:1,CB:2,DE:2,DF:2,DA:3,DC:1,EB:1,EG:0,ED:0,EC:1,FG:5,FD:4,GE:1,GF:4});
  reverse.RemoveReversedEdges();assert.deepEqual(g.Edges,original);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/EdmondsKarpMaximumFlowAlgorithmTests.cs::NotReachableSink
test('Edmonds-Karp unreachable sink and invalid capacities',()=>{
  const g=make([[0,1,2]],false,[0,1,2]);const a=new A.EdmondsKarpMaximumFlowAlgorithm(g,e=>e.Tag);assert.equal(a.Compute(0,2),0);assert.equal(a.Compute(0,1),2);assert.throws(()=>a.Compute(0,0));
  const b=new A.EdmondsKarpMaximumFlowAlgorithm(g,()=>-1);assert.throws(()=>b.Compute(0,1),NegativeCapacityException);
  const r=new A.ReversedEdgeAugmentorAlgorithm(g);assert.throws(()=>new A.EdmondsKarpMaximumFlowAlgorithm(g,()=>1,ef,r).Compute(0,1),/AddReversedEdges/);
});
test('Edmonds-Karp differential max-flow/min-cut and conservation with parallel and antiparallel arcs',()=>{
  const rand=seeded(71);for(let trial=0;trial<70;++trial){const n=2+Math.floor(rand()*6),g=make([],false,[...Array(n).keys()]);
    for(let i=0;i<n;++i)for(let j=0;j<n;++j)if(i!==j&&rand()<.32){g.AddEdge(tf(i,j,Math.floor(rand()*7)));if(rand()<.3)g.AddEdge(tf(i,j,Math.floor(rand()*7)));}
    const a=new A.EdmondsKarpMaximumFlowAlgorithm(g,e=>e.Tag),flow=a.Compute(0,n-1);let cut=Infinity;
    for(let mask=0;mask<(1<<n);++mask)if((mask&1)&&!(mask&(1<<(n-1))))cut=Math.min(cut,g.Edges.reduce((s,e)=>s+((mask&(1<<e.Source))&&!(mask&(1<<e.Target))?e.Tag:0),0));
    assert.equal(flow,cut);for(const v of g.Vertices){const balance=g.OutEdges(v).reduce((s,e)=>s+a.Flows.get(e),0)-g.InEdges(v).reduce((s,e)=>s+a.Flows.get(e),0);assert.equal(balance,v===0?flow:v===n-1?(-flow||0):0);}
    for(const e of g.Edges)assert.ok(a.Flows.get(e)>=0&&a.Flows.get(e)<=e.Tag);
  }
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/ReversedEdgeAugmentorAlgorithmTests.cs::AddReversedEdges
test('Reversed augmentor pairs parallel edges bijectively and restores graph',()=>{
  const g=make([[0,1],[0,1],[1,0],[1,1]]),before=g.Edges;const a=new A.ReversedEdgeAugmentorAlgorithm(g);a.AddReversedEdges();
  for(const[e,r]of a.ReversedEdges){assert.equal(e.Source,r.Target);assert.equal(e.Target,r.Source);assert.equal(a.ReversedEdges.get(r),e);}
  assert.throws(()=>a.AddReversedEdges());a.Dispose();assert.deepEqual(g.Edges,before);assert.throws(()=>a.RemoveReversedEdges());
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/AllVerticesGraphAugmentorAlgorithmTests.cs::AllVerticesAugmentor
for(const [name,Type]of [['all vertices',A.AllVerticesGraphAugmentorAlgorithm],['source/sink',A.MultiSourceSinkGraphAugmentorAlgorithm]])test(`Graph augmentor ${name} creation, events, rollback, repeated lifecycle`,()=>{
  for(const pairs of [[],[[0,1],[1,2]],[[0,1],[1,0]]]){const g=make(pairs,false,[0,1,2]),vs=g.Vertices,es=g.Edges;let id=10,seen=0;const a=new Type(g,()=>id++,ef);a.EdgeAdded.add(()=>++seen);a.Compute();assert.ok(seen>0);assert.equal(g.VertexCount,5);assert.throws(()=>a.Compute());a.Rollback();assert.deepEqual(g.Vertices,vs);assert.deepEqual(g.Edges,es);a.Compute();a.Dispose();assert.deepEqual(g.Edges,es);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/BipartiteToMaximumFlowGraphAugmentorAlgorithmTests.cs::RunAugmentation
test('Bipartite augmentor only attaches designated sets and rolls back',()=>{
  const g=make([[0,2],[1,2]]);let id=10;const a=new A.BipartiteToMaximumFlowGraphAugmentorAlgorithm(g,[0,1],[2],()=>id++,ef);a.Compute();assert.equal(a.AugmentedEdges.length,3);assert.equal(g.OutDegree(a.SuperSource),2);assert.equal(g.InDegree(a.SuperSink),1);a.Rollback();assert.equal(g.EdgeCount,2);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/GraphBalancerAlgorithmTests.cs::Balance
test('Graph balancing indexes, finite capacities, deficient edge insertion and restoration',()=>{
  const g=make([['s','a'],['s','b'],['b','a'],['a','t'],['b','c'],['c','t']]);let id=0;const original=g.Edges;
  const a=new A.GraphBalancerAlgorithm(g,'s','t',()=>`super${id++}`,ef);assert.equal(a.GetBalancingIndex('a'),-1);assert.equal(a.GetBalancingIndex('b'),1);
  a.Balance();assert.deepEqual(a.SurplusVertices,['a']);assert.deepEqual(a.DeficientVertices,['b']);assert.ok(g.ContainsEdge(a.DeficientEdges[0]));assert.equal(a.Capacities.get(a.DeficientEdges[0]),1);assert.throws(()=>a.Balance());a.UnBalance();assert.deepEqual(g.Edges,original);assert.equal(a.Capacities.size,original.length);assert.throws(()=>a.UnBalance());
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumBipartiteMatchingAlgorithmTests.cs::BipartiteMaxMatchSimple
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumBipartiteMatchingAlgorithmTests.cs::BipartiteMaxMatchSimpleReversedEdges
for(const reversed of [false,true])test(`Bipartite complete 50 by 50 matching, reversed=${reversed}`,()=>{
  const left=Array.from({length:50},(_,i)=>i*2),right=left.map(v=>v+1),pairs=left.flatMap(l=>right.map(r=>reversed?[r,l]:[l,r])),g=make(pairs);const a=new A.MaximumBipartiteMatchingAlgorithm(g,left,right);a.Compute();assert.equal(a.MatchedEdges.length,50);assert.equal(new Set(a.MatchedEdges.flatMap(e=>[e.Source,e.Target])).size,100);assert.equal(g.EdgeCount,2500);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumBipartiteMatchingAlgorithmTests.cs::BipartiteMaxMatchUnequalPartitionsTest
test('Bipartite matching 1 by 1000 vertices',()=>{const g=make(Array.from({length:1000},(_,i)=>[0,i+1]));const a=new A.MaximumBipartiteMatchingAlgorithm(g,[0],Array.from({length:1000},(_,i)=>i+1));a.Compute();assert.equal(a.MatchedEdges.length,1);});
test('Matching differential versus exhaustive partial assignments',()=>{
  const rand=seeded(12);for(let k=0;k<60;++k){const left=[0,1,2,3],right=[4,5,6,7],pairs=left.flatMap(u=>right.filter(()=>rand()<.4).map(v=>[u,v])),g=make(pairs,false,[...left,...right]);
    let best=0;const walk=(i,used,count)=>{if(i===left.length){best=Math.max(best,count);return;}walk(i+1,used,count);for(const[u,v]of pairs)if(u===left[i]&&!used.has(v)){used.add(v);walk(i+1,used,count+1);used.delete(v);}};walk(0,new Set(),0);
    const a=new A.MaximumBipartiteMatchingAlgorithm(g,left,right);a.Compute();assert.equal(a.MatchedEdges.length,best);
  }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::UndirectedFullGraph
test('TSP upstream five-city complete graph optimum 25',()=>{
  const pairs=[[1,2,16],[1,3,9],[1,4,15],[1,5,3],[2,3,14],[2,4,4],[2,5,5],[3,4,4],[3,5,2],[4,5,1]],g=make(pairs.flatMap(([s,t,w])=>[[s,t,w],[t,s,w]]));const a=new A.TSP(g,e=>e.Tag);a.Compute();assert.equal(a.BestCost,25);assert.equal(a.ResultPath.EdgeCount,5);for(const v of g.Vertices){assert.equal(a.ResultPath.OutDegree(v),1);assert.equal(a.ResultPath.InDegree(v),1);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::UndirectedSparseGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::DirectedSparseGraphWithoutPath
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::DirectedSparseGraph
for(const[kind,expected]of [['undirected',47],['acyclic',Infinity],['directed',45]])test(`TSP upstream sparse ${kind} graph`,()=>{
  let pairs=[[1,2,10],[2,3,8],[3,4,11],[4,5,6],[5,6,9],[1,6,3],[2,6,5],[3,6,18],[3,5,21]];if(kind==='undirected')pairs=pairs.flatMap(([s,t,w])=>[[s,t,w],[t,s,w]]);if(kind==='directed')pairs.push([6,1,1]);const a=new A.TSP(make(pairs),e=>e.Tag);a.Compute();assert.equal(a.BestCost,expected);assert.equal(a.ResultPath===undefined,expected===Infinity);
});
test('TSP differential exact optimum with negative weights versus permutations',()=>{
  const rand=seeded(78);for(let n=2;n<=7;++n)for(let k=0;k<5;++k){const g=make([],false,[...Array(n).keys()]);for(let i=0;i<n;++i)for(let j=0;j<n;++j)if(i!==j&&rand()<.8)g.AddEdge(tf(i,j,Math.floor(rand()*20)-5));
    const minimum=Math.min(...perms([...Array(n-1).keys()].map(x=>x+1)).map(p=>{const route=[0,...p,0];let c=0;for(let i=1;i<route.length;++i)c+=g.TryGetEdge(route[i-1],route[i])?.Tag??Infinity;return c;}));
    const a=new A.TSP(g,e=>e.Tag);a.Compute();assert.equal(a.BestCost,minimum);a.Compute();assert.equal(a.BestCost,minimum);
  }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/GraphPartition/KernighanLinAlgorithmTests.cs::GraphPartitioningSimpleGraph
test('Kernighan-Lin weighted graph partition, equivalence and cut cost',()=>{
  const g=make([[0,1,100],[1,2,20],[2,3,10],[1,3,50]],true);const a=new A.KernighanLinAlgorithm(g,1);a.Compute();assert.ok(A.Partition.AreEquivalent(a.Partition,new A.Partition([0,1],[2,3],70)));assert.equal(a.Partition.CutCost,70);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/GraphPartition/KernighanLinAlgorithmTests.cs::GraphPartitioningSimpleGraph2
test('Kernighan-Lin odd vertex count partition',()=>{const a=new A.KernighanLinAlgorithm(make([[0,1,1],[1,2,1],[2,3,1],[3,4,1],[0,4,1],[1,4,1]],true),1);a.Compute();assert.ok(A.Partition.AreEquivalent(a.Partition,new A.Partition([2,3],[0,1,4],2)));assert.equal(a.Partition.CutCost,2);});
test('Kernighan-Lin differential partition invariants and nonincreasing cost',()=>{const rand=seeded(88);for(let k=0;k<30;++k){const n=3+k%9,g=make([],true,[...Array(n).keys()]);for(let i=0;i<n;++i)for(let j=i+1;j<n;++j)if(rand()<.4)g.AddEdge(tf(i,j,Math.floor(rand()*20)));const initial=new Set(g.Vertices.slice(0,Math.floor(n/2))),initialCost=g.Edges.reduce((s,e)=>s+(initial.has(e.Source)!==initial.has(e.Target)?e.Tag:0),0);const a=new A.KernighanLinAlgorithm(g,6);a.Compute();assert.equal(a.Partition.VertexSetA.size,Math.floor(n/2));assert.equal(new Set([...a.Partition.VertexSetA,...a.Partition.VertexSetB]).size,n);assert.ok(a.Partition.CutCost<=initialCost);}});

// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianOneComponent
test('Eulerian predicate ignores loops and parallel edges, handles components and isolated vertices',()=>{
  for(const[pairs,vs,expected,components]of [[[],[],false,0],[[],[0],true,0],[[],[0,1],false,0],[[[0,1],[1,2],[2,0]],[0,1,2,3],true,1],[[[0,1],[2,3]],[],false,2],[[[0,1],[0,1]],[],false,1]]){const a=new A.IsEulerianGraphAlgorithm(make(pairs,true,vs));assert.equal(a.IsEulerian(),expected);assert.equal(a.CheckComponentsWithEdges(),components);}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonian
test('Hamiltonian cycle predicate, empty/single/two vertices and permutations',()=>{
  assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(make([],true)),false);assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(make([],true,[0])),true);assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(make([[0,1]],true)),true);
  assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(make([[0,1],[1,2]],true)),false);assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(make([[0,1],[1,2],[2,3],[3,0]],true)),true);assert.equal(new A.IsHamiltonianGraphAlgorithm(make([],true,[0,1,2])).GetPermutations().length,6);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SingleEulerianTrailGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SingleEulerianTrailGraph2
for(const extra of [false,true])test(`Eulerian circuit upstream seven-edge fixture, hanging edge=${extra}`,()=>{
  const pairs=[['b','c'],['f','a'],['a','b'],['c','d'],['e','c'],['d','e'],['c','f']];if(extra)pairs.push(['b','e']);const g=make(pairs),a=new A.EulerianTrailAlgorithm(g);a.AddTemporaryEdges(ef);a.Compute();const trails=[...a.Trails()];assert.equal(trails.length,1);assert.equal(trails[0].length,7);assert.ok(pathValid(trails[0]));assert.ok(pathValid(a.Circuit));a.RemoveTemporaryEdges();assert.equal(g.EdgeCount,pairs.length);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SingleEulerianTrailGraph3
test('Eulerian circuit uses every parallel edge and loop exactly once',()=>{const g=make([[1,2],[2,1],[1,3],[3,1],[2,4],[4,2],[3,4],[4,3],[4,4]]),a=new A.EulerianTrailAlgorithm(g);a.Compute();assert.equal(a.Circuit.length,9);assert.equal(new Set(a.Circuit).size,9);assert.ok(pathValid(a.Circuit));assert.equal(a.Circuit[0].Source,a.Circuit.at(-1).Target);});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::AddTemporaryEdges
for(const[pairs,expected]of [[[[1,2],[1,3],[2,4],[3,4]],[]],[[[1,2],[2,1],[1,3]],[[1,3]]],[[[1,2],[2,1],[1,4],[3,1],[1,5]],[[1,4],[3,5]]],[[[1,2],[2,1],[1,3],[1,4],[3,4],[3,4],[1,5]],[[1,3],[4,5]]]])test(`Eulerian upstream temporary odd-vertex pairing ${JSON.stringify(expected)}`,()=>{const g=make(pairs,false,[...new Set(pairs.flat())].sort()),a=new A.EulerianTrailAlgorithm(g);assert.deepEqual(a.AddTemporaryEdges(ef).map(e=>[e.Source,e.Target]),expected);a.RemoveTemporaryEdges();assert.equal(g.EdgeCount,pairs.length);});

// Upstream: tests/QuikGraph.Tests/Algorithms/VertexColoring/VertexColoringAlgorithmTests.cs::VertexColoringSimpleGraph
test('Vertex coloring events and deterministic first available colors',()=>{const g=make([[0,1],[0,2],[1,2],[2,3],[3,4],[4,0]],true),a=new A.VertexColoringAlgorithm(g),seen=[];a.VertexColored.add(v=>seen.push(v));a.Compute();assert.equal(seen.length,5);for(const e of g.Edges)assert.notEqual(a.Colors.get(e.Source),a.Colors.get(e.Target));assert.deepEqual([...a.Colors.values()],[0,1,2,0,1]);});
// Upstream: tests/QuikGraph.Tests/Algorithms/VertexCover/MinimumVertexCoverApproximationAlgorithmTests.cs::Cover
test('Vertex-cover approximation covers all random edges and is within twice optimum',()=>{const rand=seeded(19);for(let k=0;k<40;++k){const n=7,g=make([],true,[...Array(n).keys()]);for(let i=0;i<n;++i)for(let j=i+1;j<n;++j)if(rand()<.35)g.AddEdge(ef(i,j));const a=new A.MinimumVertexCoverApproximationAlgorithm(g,rand);assert.equal(a.CoverSet,null);a.Compute();const cover=new Set(a.CoverSet);for(const e of g.Edges)assert.ok(cover.has(e.Source)||cover.has(e.Target));let optimum=n;for(let mask=0;mask<1<<n;++mask)if(g.Edges.every(e=>(mask&(1<<e.Source))||(mask&(1<<e.Target))))optimum=Math.min(optimum,mask.toString(2).replace(/0/g,'').length);assert.ok(cover.size<=2*optimum);}});
test('Bron-Kerbosch maximum clique versus exhaustive subsets',()=>{const rand=seeded(17);for(let k=0;k<20;++k){const n=8,g=make([],true,[...Array(n).keys()]);for(let i=0;i<n;++i)for(let j=i+1;j<n;++j)if(rand()<.5)g.AddEdge(ef(i,j));let best=0;for(let mask=0;mask<1<<n;++mask){const vs=g.Vertices.filter(v=>mask&(1<<v));if(vs.every(u=>vs.every(v=>u===v||g.ContainsEdge(u,v))))best=Math.max(best,vs.length);}const a=new A.BronKerboschMaximumCliqueAlgorithm(g);a.Compute();assert.equal(a.MaximumClique.length,best);}});

// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/EdgeChainsTests.cs::RoundRobinEdgeChain
test('Round-robin independent vertex indices and empty outgoing edges',()=>{const g=make([[0,1],[0,2],[1,0]],false,[0,1,2]);const c=new A.RoundRobinEdgeChain();assert.deepEqual(Array.from({length:5},()=>c.TryGetSuccessor(g,0).Target),[1,2,1,2,1]);assert.equal(c.TryGetSuccessor(g,1).Target,0);assert.equal(c.TryGetSuccessor(g,2),undefined);});
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/EdgeChainsTests.cs::NormalizedMarkovEdgeChain
test('Normalized Markov deterministic random injection',()=>{const g=make([[0,1],[0,2]]),c=new A.NormalizedMarkovEdgeChain();c.Rand=()=>.8;assert.equal(c.TryGetSuccessor(g,0).Target,2);c.Rand={NextDouble:()=>0};assert.equal(c.TryGetSuccessor(g.Edges,0).Target,1);assert.equal(c.TryGetSuccessor([],0),undefined);});
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/EdgeChainsTests.cs::WeightedMarkovEdgeChain
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/EdgeChainsTests.cs::VanishingWeightedMarkovEdgeChain
test('Weighted and vanishing Markov selection follows weights',()=>{const es=[ef(0,1),ef(0,2)],weights=new Map([[es[0],1],[es[1],3]]),c=new A.WeightedMarkovEdgeChain(weights);c.Rand=()=>.4;assert.equal(c.TryGetSuccessor(es,0),es[1]);const v=new A.VanishingWeightedMarkovEdgeChain(weights,.2);v.Rand=()=>.4;assert.equal(v.TryGetSuccessor(es,0),es[1]);assert.equal(weights.get(es[0]),.25);assert.ok(Math.abs(weights.get(es[1])-.15)<1e-12);});
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::RandomWalkWithPredicate
test('Random walk event order, bounded counts and end predicate before edge traversal',()=>{const g=make([[0,1],[1,2],[2,0]]),a=new A.RandomWalkAlgorithm(g,new A.RoundRobinEdgeChain()),seen=[];a.StartVertex.add(v=>seen.push(`start${v}`));a.EndVertex.add(v=>seen.push(`end${v}`));a.TreeEdge.add(e=>seen.push(`${e.Source}${e.Target}`));a.Generate(0,4);assert.deepEqual(seen,['start0','01','12','20','01','end1']);seen.length=0;a.EndPredicate=e=>e.Target===2;a.Generate(0);assert.deepEqual(seen,['start0','01','end1']);});
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::ComputeWithRoot
test('Cycle-popping root, initialization and forest has no successor cycles',()=>{const g=make([[0,1],[1,0],[1,2],[2,1],[2,3],[3,0],[4,5],[5,4]],false,[0,1,2,3,4,5]),a=new A.CyclePoppingRandomTreeAlgorithm(g);a.Rand=seeded(5);a.RandomTreeWithRoot(0);assert.equal(a.Successors.get(0),undefined);assert.equal(a.VerticesColors.size,6);for(const v of g.Vertices){assert.equal(a.GetVertexColor(v),2);const seen=new Set();let x=v;while(a.Successors.get(x)){assert.ok(!seen.has(x));seen.add(x);x=a.Successors.get(x).Target;}}});

// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/TransitionFactoryImplicitGraphTests.cs::AddTransitionFactory
test('Implicit transition graph lazy expansion, cache, predicates and invalidation',()=>{
  const g=new A.TransitionFactoryImplicitGraph();let calls=0;const f={IsValid:v=>v>=0&&v<3,Apply:v=>{++calls;return[ef(v,v+1)];}};g.AddTransitionFactory(f);assert.equal(g.ContainsVertex(0),false);assert.equal(g.OutEdges(0)[0].Target,1);assert.equal(g.ContainsVertex(1),true);g.OutEdges(0);assert.equal(calls,1);g.OutEdges(1);g.OutEdges(2);assert.deepEqual(g.OutEdges(3),[]);assert.equal(g.TryGetOutEdges(10),undefined);assert.throws(()=>g.OutEdges(10));g.SuccessorVertexPredicate=v=>v<2;assert.equal(g.OutDegree(1),0);g.ClearTransitionFactories();assert.equal(g.TryGetOutEdges(0),undefined);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::GraphExplorationWithPredicates
test('Graph explorer discovers transitions and checks predicates',()=>{
  const g=new AdjacencyGraph(),a=new A.CloneableVertexGraphExplorerAlgorithm(g),seen=[];a.AddTransitionFactory({IsValid:v=>v<5,Apply:v=>[ef(v,v+1)]});a.DiscoverVertex.add(v=>seen.push(v));a.AddVertexPredicate=v=>v<=3;a.Compute(0);assert.equal(a.FinishedSuccessfully,true);assert.deepEqual(seen,[0,1,2,3]);assert.equal(g.EdgeCount,3);assert.deepEqual(a.UnExploredVertices,[]);
});
test('Graph explorer clones states, canonicalizes Equals vertices, and stops at limits',()=>{
  class State{constructor(n){this.n=n;}Clone(){return new State(this.n);}Equals(v){return v?.n===this.n;}}
  const g=new AdjacencyGraph(),a=new A.CloneableVertexGraphExplorerAlgorithm(g);a.AddTransitionFactory({IsValid:v=>v.n<5,Apply:v=>[ef(v,new State(v.n+1))]});const limit=new A.DefaultFinishedPredicate(2,10);a.FinishedPredicate=x=>limit.Test(x);a.Compute(new State(0));assert.equal(a.FinishedSuccessfully,false);assert.equal(g.VertexCount,3);assert.equal(a.UnExploredVertices.length,1);assert.equal(g.EdgeCount,2);
});
test('Advanced algorithms support host lifecycle and cancellation',()=>{const g=make([[0,1],[1,0]]),host=new AlgorithmBase(g);let id=10;const a=new A.AllVerticesGraphAugmentorAlgorithm(host,g,()=>id++,ef);a.Compute();assert.equal(a.State,ComputationState.Finished);a.Rollback();const coloring=new A.VertexColoringAlgorithm(make([[0,1]],true));coloring.VertexColored.add(()=>coloring.Abort());coloring.Compute();assert.equal(coloring.State,ComputationState.Aborted);});

// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::CyclePoppingRandomTree
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::RandomWalk
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/EdmondsKarpMaximumFlowAlgorithmTests.cs::EdmondsKarpMaxFlow
test('All 1,277 upstream algorithm GraphML fixtures: random trees, walks, max-flow cuts, coloring and covers',()=>{
  const directory=new URL('./fixtures/GraphML/',import.meta.url),files=readdirSync(directory).filter(n=>/^g\.\d+\.\d+\.graphml$/.test(n)).sort();assert.equal(files.length,1277);
  const forestValid=a=>{for(const start of a.VisitedGraph.Vertices){assert.equal(a.VerticesColors.get(start),2);const seen=new Set();let v=start;while(a.Successors.get(v)){assert.ok(!seen.has(v),'successor cycle');seen.add(v);v=a.Successors.get(v).Target;}}};
  for(const [i,file]of files.entries()){
    // This old upstream fixture dialect predates the GraphML namespace; extract its simple graph records.
    const xml=readFileSync(new URL(file,directory),'utf8'),vs=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]),pairs=[...xml.matchAll(/<edge\b[^>]*\bsource="([^"]+)"[^>]*\btarget="([^"]+)"/g)].map(m=>[m[1],m[2]]),g=make(pairs,false,vs);
    const chain=new A.NormalizedMarkovEdgeChain();chain.Rand=seeded(i+1);const tree=new A.CyclePoppingRandomTreeAlgorithm(g,chain);
    if(vs.length){tree.Compute(vs[0]);forestValid(tree);const walk=new A.RandomWalkAlgorithm(g,chain);let prior=vs[0],count=0;walk.TreeEdge.add(e=>{assert.equal(e.Source,prior);prior=e.Target;++count;});walk.Generate(vs[0],100);assert.ok(count<=100);}
    if(vs.length>1){const a=new A.EdmondsKarpMaximumFlowAlgorithm(g,()=>1),value=a.Compute(vs[0],vs.at(-1)),reachable=new Set(vs.filter(v=>a.VerticesColors.get(v)===2));assert.equal(value,g.Edges.filter(e=>reachable.has(e.Source)&&!reachable.has(e.Target)).length,file);}
    const undirected=make(pairs,true,vs),color=new A.VertexColoringAlgorithm(undirected);color.Compute();for(const e of undirected.Edges)if(e.Source!==e.Target)assert.notEqual(color.Colors.get(e.Source),color.Colors.get(e.Target),file);
    const cover=new A.MinimumVertexCoverApproximationAlgorithm(undirected,seeded(i+1));cover.Compute();const covered=new Set(cover.CoverSet);for(const e of undirected.Edges)assert.ok(covered.has(e.Source)||covered.has(e.Target),file);
  }
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/GraphBalancerAlgorithmTests.cs::Balance
test('GraphBalancer full upstream surplus/deficit and event fixture',()=>{
  const g=make([[1,2],[1,3],[2,3],[3,2],[3,4],[3,5],[4,2],[5,5],[6,7],[7,8]]);let id=9;const a=new A.GraphBalancerAlgorithm(g,1,3,()=>id++,ef),surplus=[],deficit=[];
  a.BalancingSourceAdded.add(v=>assert.equal(v,1));a.BalancingSinkAdded.add(v=>assert.equal(v,3));a.SurplusVertexAdded.add(v=>surplus.push(v));a.DeficientVertexAdded.add(v=>deficit.push(v));a.Balance();assert.deepEqual(surplus,[2,5,8]);assert.deepEqual(deficit,[6]);assert.equal(a.BalancingSource,9);assert.equal(a.BalancingSink,10);assert.deepEqual(a.SurplusEdges.map(e=>[e.Source,e.Target]),[[9,2],[9,5],[9,8]]);assert.deepEqual(a.DeficientEdges.map(e=>[e.Source,e.Target]),[[6,10]]);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::TryGetDistance_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::GetVertexColor_Throws
test('TSP inherits shortest-path contract while unused distance/color maps stay absent',()=>{const a=new A.TSP(make([[1,2,1]]),e=>e.Tag);assert.throws(()=>a.TryGetDistance(1));a.Compute(1);assert.equal(a.TryGetDistance(1),undefined);assert.throws(()=>a.GetVertexColor(1));assert.deepEqual([...a.GetDistances()],[]);});
test('TSP four-city sample optimum 80 and rooted rerun',()=>{const g=make([['A','B',10],['A','C',15],['A','D',20],['B','A',10],['B','C',35],['B','D',25],['C','A',15],['C','B',35],['C','D',30],['D','A',20],['D','B',25],['D','C',30]]),a=new A.TSP(g,e=>e.Tag);a.Compute('A');assert.equal(a.BestCost,80);a.Compute('C');assert.equal(a.BestCost,80);assert.equal(a.ResultPath.EdgeCount,4);});
test('All-vertices augmentation supports graphs that reject parallel edges',()=>{const g=new AdjacencyGraph(false);g.AddVertex(0);let id=1;const a=new A.AllVerticesGraphAugmentorAlgorithm(g,()=>id++,ef);a.Compute();assert.equal(a.AugmentedEdges.length,6);assert.equal(g.EdgeCount,5);a.Rollback();assert.equal(g.EdgeCount,0);assert.deepEqual(g.Vertices,[0]);});
test('Wilson loop-erased sampler spans every root-reachable vertex with the correct weighted distribution',()=>{
  const g=make([[1,0,1],[1,2,2],[2,0,3],[2,1,4]]),chain=new A.WeightedMarkovEdgeChain(new Map(g.Edges.map(e=>[e,e.Tag])));chain.Rand=seeded(9191);const a=new A.CyclePoppingRandomTreeAlgorithm(g,chain),counts=new Map();
  for(let i=0;i<12000;++i){a.Compute(0);assert.equal([...a.Successors.values()].filter(Boolean).length,2);const key=`${a.Successors.get(1).Target}${a.Successors.get(2).Target}`;counts.set(key,(counts.get(key)??0)+1);}
  assert.equal(counts.size,3);for(const[key,probability]of [['00',3/13],['20',6/13],['01',4/13]])assert.ok(Math.abs(counts.get(key)/12000-probability)<.02,`${key}: ${counts.get(key)}`);
});
test('Wilson chooses one additional root per closed class and respects zero-weight support',()=>{const g=make([[1,2,1],[2,1,1],[2,0,0]],false,[0,1,2]),chain=new A.WeightedMarkovEdgeChain(new Map(g.Edges.map(e=>[e,e.Tag])));chain.Rand=seeded(6);const a=new A.CyclePoppingRandomTreeAlgorithm(g,chain);a.Rand=seeded(7);a.Compute(0);assert.equal([...a.Successors.values()].filter(Boolean).length,1);assert.equal(a.Successors.get(0),undefined);});
test('Eulerian cycle search handles a 20,000-vertex dead-end chain without recursion',()=>{const n=20000,g=make([[0,1],[1,0]],false,[...Array(n).keys()]);for(let i=1;i<n-1;++i)g.AddEdge(ef(i,i+1));const a=new A.EulerianTrailAlgorithm(g);a.Compute(0);assert.equal(a.Circuit.length,2);assert.ok(pathValid(a.Circuit));});

// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TaskPriorityTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TaskPriorityTests.cs::Equals
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TaskPriorityTests.cs::Hashcode
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TaskPriorityTests.cs::Comparison
test('TSP TaskPriority complete upstream construction/equality/hash/comparison assertions',()=>{
  assert.doesNotThrow(()=>new A.TaskPriority(10,5));const p=new A.TaskPriority(1,2),same=new A.TaskPriority(1,2),greater=new A.TaskPriority(2,2),shorter=new A.TaskPriority(1,1),both=new A.TaskPriority(2,1);
  assert.ok(p.Equals(p));assert.ok(p.Equals(same));assert.ok(same.Equals(p));for(const other of[greater,shorter,both,null]){assert.equal(p.Equals(other),false);if(other)assert.equal(other.Equals(p),false);}
  assert.equal(p.GetHashCode(),same.GetHashCode());assert.notEqual(p.GetHashCode(),greater.GetHashCode());assert.equal(p.CompareTo(same),0);assert.ok(p.CompareTo(greater)<0);assert.ok(p.CompareTo(shorter)<0);assert.ok(p.CompareTo(null)>0);
});

// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianEmpty
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianOneVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianOneComponent
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianManyComponents
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianOneVertexWithLoop
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianOneVertexWithTwoLoops
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianTwoVertices
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianTwoVerticesWithLoops
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerianTwoVerticesOneEdge
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianGraphAlgorithmTests.cs::IsEulerian_Throws
test('Eulerian predicate complete upstream fixture cases via instance and static API',()=>{
  for(const[pairs,isolated,expected]of [[[],[],false],[[],[42],true],[[[1,2],[2,3],[1,3]],[],true],[[[1,2],[2,3],[3,4],[1,4],[1,3]],[],false],[[[1,2],[2,3],[1,3]],[4,5],true],[[[1,2],[2,3],[1,3],[4,5],[5,6],[4,6]],[7],false],[[[1,1]],[],true],[[[1,1],[1,1]],[],true],[[[1,2],[2,2]],[],false],[[[1,1],[2,2]],[],false],[[[1,2]],[],false]]){const g=make(pairs,true,isolated);assert.equal(new A.IsEulerianGraphAlgorithm(g).IsEulerian(),expected);assert.equal(A.IsEulerianGraphAlgorithm.IsEulerian(g),expected);}
  assert.throws(()=>new A.IsEulerianGraphAlgorithm(null),TypeError);assert.throws(()=>A.IsEulerianGraphAlgorithm.IsEulerian(null),TypeError);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianEmpty
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonian
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianOneVertexWithCycle
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianTwoVertices
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianWithLoops
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianWithParallelEdges
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianDiracsTheorem
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianNotDiracsTheorem
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonian_Throws
test('Hamiltonian predicate complete upstream positive, negative, loop, multiedge, and Dirac fixtures',()=>{
  const large=[[1,2],[1,3],[1,4],[1,7],[1,8],[1,10],[2,6],[2,9],[2,4],[3,4],[3,6],[3,7],[3,8],[4,6],[4,5],[4,7],[5,7],[5,6],[5,9],[5,10],[6,9],[6,10],[6,7],[7,8],[8,9],[8,10],[9,10]];
  for(const[pairs,expected]of [[[],false],[[[1,2],[2,3],[1,3],[2,4],[3,4]],true],[[[1,2],[2,3],[2,4],[3,4]],false],[[[1,1]],true],[[[1,2]],true],[[[1,1],[2,2]],false],[[[1,1],[1,1],[2,2],[2,2],[2,2],[3,3],[3,3]],false],[[[1,2],[1,2],[3,4],[3,4]],false],[large,true],[[...large,[2,5],[3,8]],true]]){const g=make(pairs,true);assert.equal(new A.IsHamiltonianGraphAlgorithm(g).IsHamiltonian(),expected);assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(g),expected);}
  assert.throws(()=>new A.IsHamiltonianGraphAlgorithm(null),TypeError);assert.throws(()=>A.IsHamiltonianGraphAlgorithm.IsHamiltonian(null),TypeError);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/HamiltonianGraphAlgorithmTests.cs::IsHamiltonianCyclesBuilder
test('Hamiltonian permutation builder: all 10! unique permutations without retaining factorial memory',()=>{
  const a=new A.IsHamiltonianGraphAlgorithm(make([],true,[0,1,2,3,4,5,6,7,8,9])),factorials=[1];for(let i=1;i<=10;++i)factorials[i]=factorials[i-1]*i;const seen=new Uint8Array(factorials[10]);let count=0;
  for(const p of a.EnumeratePermutations()){let rank=0;for(let i=0;i<10;++i){let smaller=0;for(let j=i+1;j<10;++j)if(p[j]<p[i])++smaller;rank+=smaller*factorials[9-i];}assert.equal(seen[rank],0);seen[rank]=1;++count;}
  assert.equal(count,factorials[10]);const small=new A.IsHamiltonianGraphAlgorithm(make([],true,[0,1,2,3,4]));assert.deepEqual(small.GetPermutations(),[...small.EnumeratePermutations()]);
});

// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/AllVerticesGraphAugmentorAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/AllVerticesGraphAugmentorAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/MultiSourceSinkGraphAugmentorAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/MultiSourceSinkGraphAugmentorAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/BipartiteToMaximumFlowGraphAugmentorAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/BipartiteToMaximumFlowGraphAugmentorAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/EdmondsKarpMaximumFlowAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/EdmondsKarpMaximumFlowAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/GraphBalancerAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/GraphBalancerAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/ReversedEdgeAugmentorAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumFlow/ReversedEdgeAugmentorAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumBipartiteMatchingAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/MaximumBipartiteMatchingAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/GraphPartition/KernighanLinAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/GraphPartition/KernighanLinAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/VertexColoring/VertexColoringAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/VertexColoring/VertexColoringAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/VertexCover/MinimumVertexCoverApproximationAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/VertexCover/MinimumVertexCoverApproximationAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::Constructor_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::Constructor
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::Constructor_Throws
test('Advanced constructors preserve source contracts and reject every required-null argument combination',()=>{
  const g=make([[0,1]]),ug=make([[0,1]],true),weights=()=>1,chain=new A.NormalizedMarkovEdgeChain(),left=[0],right=[1],factory=()=>10,capacities=new Map(g.Edges.map(e=>[e,1])),reverse=new A.ReversedEdgeAugmentorAlgorithm(g,ef);
  const fixtures=[
    [A.AllVerticesGraphAugmentorAlgorithm,[g,factory,ef],[0,1,2],true],
    [A.MultiSourceSinkGraphAugmentorAlgorithm,[g,factory,ef],[0,1,2],true],
    [A.BipartiteToMaximumFlowGraphAugmentorAlgorithm,[g,left,right,factory,ef],[0,1,2,3,4],true],
    [A.EdmondsKarpMaximumFlowAlgorithm,[g,weights,ef,reverse],[0,1,2,3],true],
    [A.GraphBalancerAlgorithm,[g,0,1,factory,ef,capacities],[0,1,2,3,4,5],false],
    [A.ReversedEdgeAugmentorAlgorithm,[g,ef],[0,1],false],
    [A.MaximumBipartiteMatchingAlgorithm,[g,left,right,factory,ef],[0,1,2,3,4],false],
    [A.TSP,[g,weights],[0,1],false],
    [A.EulerianTrailAlgorithm,[g],[0],true],
    [A.KernighanLinAlgorithm,[ug,1],[0],false],
    [A.VertexColoringAlgorithm,[ug],[0],false],
    [A.MinimumVertexCoverApproximationAlgorithm,[ug,Math.random],[0,1],false],
    [A.RandomWalkAlgorithm,[g,chain],[0,1],false],
    [A.CyclePoppingRandomTreeAlgorithm,[g,chain],[0,1],true],
    [A.CloneableVertexGraphExplorerAlgorithm,[g],[0],true],
  ];
  for(const[Type,args,nullable,host]of fixtures){
    const a=new Type(...args);assert.equal(a.VisitedGraph,args[0]);if(a instanceof AlgorithmBase)assert.equal(a.State,ComputationState.NotRunning);
    if('SourceToVertices'in a){assert.equal(a.SourceToVertices,left);assert.equal(a.VerticesToSink,right);}
    if('VertexFactory'in a)assert.equal(a.VertexFactory,factory);if('EdgeFactory'in a)assert.equal(a.EdgeFactory,ef);
    if('EdgeChain'in a)assert.equal(a.EdgeChain,chain);
    for(let mask=1;mask<1<<nullable.length;++mask){const invalid=args.slice();for(let i=0;i<nullable.length;++i)if(mask&(1<<i))invalid[nullable[i]]=null;assert.throws(()=>new Type(...invalid),undefined,`${Type.name} null mask ${mask}`);if(host)assert.throws(()=>new Type(null,...invalid),undefined,`${Type.name} hosted null mask ${mask}`);}
    if(host){assert.equal(new Type(null,...args).VisitedGraph,args[0]);const component=new AlgorithmBase(args[0]);assert.equal(new Type(component,...args).Services.Host,component);}
  }
  assert.equal(new A.RandomWalkAlgorithm(g).EndPredicate,undefined);assert.ok(new A.RandomWalkAlgorithm(g).EdgeChain);assert.ok(new A.CyclePoppingRandomTreeAlgorithm(g).Rand);
  assert.equal(new A.TSP(g,weights).VerticesColors,null);assert.deepEqual([...new A.TSP(g,weights).GetDistances()],[]);
  assert.deepEqual(new A.VertexColoringAlgorithm(ug).Colors,new Map());assert.equal(new A.MinimumVertexCoverApproximationAlgorithm(ug).CoverSet,null);
  assert.equal(new A.GraphBalancerAlgorithm(g,0,1,factory,ef,capacities).Capacities,capacities);
  assert.throws(()=>new A.GraphBalancerAlgorithm(g,2,1,factory,ef));assert.throws(()=>new A.GraphBalancerAlgorithm(g,0,2,factory,ef));
  assert.throws(()=>new A.EdmondsKarpMaximumFlowAlgorithm(make([[0,1]]),weights,ef,reverse));
  for(const key of ['AddVertexPredicate','ExploreVertexPredicate','AddEdgePredicate','FinishedPredicate']){const a=new A.CloneableVertexGraphExplorerAlgorithm(g);assert.equal(typeof a[key],'function');assert.throws(()=>a[key]=null,TypeError);}
  assert.throws(()=>new A.RandomWalkAlgorithm(g).EdgeChain=null,TypeError);assert.throws(()=>new A.CyclePoppingRandomTreeAlgorithm(g).Rand=null,TypeError);
});

// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/TSP/TSPTests.cs::ComputeWithRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ComputeWithRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/RandomWalkAlgorithmTests.cs::ComputeWithRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/RandomWalks/CyclePoppingRandomTreeAlgorithmTests.cs::ComputeWithRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::TryGetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::SetRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::SetRootVertex_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::ClearRootVertex
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::ComputeWithoutRoot_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::ComputeWithRoot
// Upstream: tests/QuikGraph.Tests/Algorithms/Exploration/CloneableVertexGraphExplorerAlgorithmTests.cs::ComputeWithRoot_Throws
test('Five advanced rooted algorithm families: all inherited root state/event and computation assertions',()=>{
  const build=(Type,g)=>Type===A.TSP?new Type(g,()=>1):new Type(g);
  for(const Type of[A.TSP,A.EulerianTrailAlgorithm,A.RandomWalkAlgorithm,A.CyclePoppingRandomTreeAlgorithm,A.CloneableVertexGraphExplorerAlgorithm]){
    const g=make([],false,[0]),a=build(Type,g);assert.equal(a.TryGetRootVertex(),undefined);let count=0;a.RootVertexChanged.add(()=>++count);a.ClearRootVertex();assert.equal(count,0);
    a.SetRootVertex(0);assert.equal(count,1);assert.equal(a.TryGetRootVertex(),0);a.SetRootVertex(0);assert.equal(count,1);a.SetRootVertex(1);assert.equal(count,2);assert.equal(a.TryGetRootVertex(),1);a.SetRootVertex(0);assert.equal(count,3);a.ClearRootVertex();assert.equal(count,4);assert.equal(a.TryGetRootVertex(),undefined);a.ClearRootVertex();assert.equal(count,4);assert.throws(()=>a.SetRootVertex(null),TypeError);
    const b=build(Type,g);assert.throws(()=>b.Compute(null),TypeError);assert.equal(b.TryGetRootVertex(),undefined);assert.doesNotThrow(()=>b.Compute(0));assert.equal(b.TryGetRootVertex(),0);
    const empty=make([]),c=build(Type,empty);if(Type===A.TSP||Type===A.EulerianTrailAlgorithm){assert.doesNotThrow(()=>c.Compute());empty.AddVertexRange([1,2]);assert.doesNotThrow(()=>build(Type,empty).Compute());}else assert.throws(()=>c.Compute());
    if(Type!==A.CloneableVertexGraphExplorerAlgorithm){const invalid=build(Type,make([]));assert.throws(()=>invalid.Compute(99));if(Type===A.RandomWalkAlgorithm||Type===A.CyclePoppingRandomTreeAlgorithm){invalid.SetRootVertex(99);assert.throws(()=>invalid.Compute());}}
    const object={};a.SetRootVertex(object);assert.equal(a.TryGetRootVertex(),object);
  }
});
test('Advanced algorithms preserve SameValueZero identity for NaN and signed-zero vertices',()=>{
  const graph=make([[NaN,0,2],[-0,1,2],[NaN,1,1]]),flow=new A.EdmondsKarpMaximumFlowAlgorithm(graph,e=>e.Tag);assert.equal(graph.VertexCount,3);assert.equal(flow.Compute(NaN,1),3);assert.throws(()=>flow.Compute(NaN,NaN));assert.throws(()=>flow.Compute(-0,+0));
  const reversed=new A.ReversedEdgeAugmentorAlgorithm(make([[NaN,0],[NaN,NaN]]));reversed.AddReversedEdges();for(const[e,r]of reversed.ReversedEdges){assert.ok(Object.is(e.Source,r.Target)||e.Source===r.Target);assert.ok(Object.is(e.Target,r.Source)||e.Target===r.Source);}reversed.Dispose();
  const g=make([[NaN,0],[0,NaN],[0,1],[1,NaN]]),chain=new A.NormalizedMarkovEdgeChain();chain.Rand=seeded(32);const tree=new A.CyclePoppingRandomTreeAlgorithm(g,chain);tree.Compute(NaN);assert.equal(tree.Successors.get(NaN),undefined);for(const start of[0,1]){let v=start;const seen=new Set();while(!Number.isNaN(v)){assert.ok(!seen.has(v));seen.add(v);v=tree.Successors.get(v).Target;}}
  const euler=new A.EulerianTrailAlgorithm(make([[NaN,0],[0,NaN],[0,1]]));euler.Compute(NaN);assert.equal(euler.Circuit.length,2);assert.equal([...euler.Trails(NaN)][0].length,2);
  const temporary=new A.EulerianTrailAlgorithm(make([[NaN,0]]));assert.equal(temporary.AddTemporaryEdges(ef).length,1);temporary.RemoveTemporaryEdges();
  const u=make([[NaN,0],[0,1],[1,NaN],[NaN,NaN]],true),cover=new A.MinimumVertexCoverApproximationAlgorithm(u,()=>0);cover.Compute();const covered=new Set(cover.CoverSet);for(const e of u.Edges)assert.ok(covered.has(e.Source)||covered.has(e.Target));
  assert.equal(A.IsEulerianGraphAlgorithm.IsEulerian(u),true);assert.equal(A.IsHamiltonianGraphAlgorithm.IsHamiltonian(u),true);const color=new A.VertexColoringAlgorithm(u);color.Compute();assert.equal(color.Colors.size,3);
  const matching=new A.MaximumBipartiteMatchingAlgorithm(make([[NaN,1],[0,2]]),[NaN,0],[1,2]);matching.Compute();assert.equal(matching.MatchedEdges.length,2);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ComputeEulerianPathCount
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::ComputeEulerianPathCount_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::AddTemporaryEdges_Throws
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::RemoveTemporaryEdges
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::RootedEulerianTrails_Throws
test('Eulerian count complete parameterized fixtures and temporary/root argument contracts',()=>{
  for(const[pairs,expected]of [[[],1],[[[1,2]],0],[[[1,2],[2,1]],1],[[[1,2],[2,1],[1,3]],1],[[[1,2],[2,1],[1,3],[1,4],[3,4],[3,4],[1,5]],2]]){const g=make(pairs),a=new A.EulerianTrailAlgorithm(g);assert.equal(A.EulerianTrailAlgorithm.ComputeEulerianPathCount(g),expected);const before=g.Edges;a.AddTemporaryEdges(ef);a.RemoveTemporaryEdges();assert.deepEqual(g.Edges,before);}
  assert.throws(()=>A.EulerianTrailAlgorithm.ComputeEulerianPathCount(null),TypeError);const a=new A.EulerianTrailAlgorithm(make([]));assert.throws(()=>a.AddTemporaryEdges(null),TypeError);assert.throws(()=>a.Trails(null),TypeError);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::MultipleEulerianTrailsGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::MultipleRootedEulerianTrailsGraph
test('Eulerian multi-trail source fixtures preserve exact path partitions and rooted prefixes',()=>{
  const pairs=[[1,2],[2,1],[1,3],[3,1],[4,2],[3,4],[4,3],[4,4]],g=make(pairs),a=new A.EulerianTrailAlgorithm(g);a.AddTemporaryEdges(ef);a.Compute();const summarize=ts=>ts.map(t=>t.map(e=>[e.Source,e.Target]));
  assert.deepEqual(summarize([...a.Trails()]),[[[1,3],[3,4],[4,4],[4,2]],[[4,3],[3,1],[1,2],[2,1]]]);
  assert.deepEqual(summarize([...a.Trails(2)]),[[[2,1],[1,3],[3,4],[4,4],[4,2]],[[2,4],[4,3],[3,1],[1,2]]]);
  assert.deepEqual(summarize([...a.Trails(3)]),[[[3,4],[4,4],[4,2]],[[3,4],[4,3],[3,1],[1,2],[2,1],[1,3]]]);
  assert.equal(a.Circuit.length,9);assert.ok(pathValid(a.Circuit));a.RemoveTemporaryEdges();assert.equal(g.EdgeCount,8);
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SingleRootedEulerianTrailGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::SingleRootedEulerianTrailGraph2
test('Eulerian single rooted source fixtures return every expected original edge',()=>{
  for(const[pairs,root,expected]of [[[['b','c'],['f','a'],['a','b'],['c','d'],['e','c'],['d','e'],['c','f'],['b','e']],'c',7],[[[1,2],[2,1],[1,3],[3,1],[2,4],[4,2],[3,4],[4,3],[4,4]],4,9]]){const g=make(pairs),a=new A.EulerianTrailAlgorithm(g);a.AddTemporaryEdges(ef);a.Compute();const trails=[...a.Trails(root)];assert.equal(trails.length,1);assert.equal(trails[0][0].Source,root);assert.equal(trails[0].length,expected);assert.ok(pathValid(trails[0]));assert.equal(new Set(trails[0]).size,expected);a.RemoveTemporaryEdges();}
});
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::NotEulerianTrailGraph
// Upstream: tests/QuikGraph.Tests/Algorithms/EulerianTrailAlgorithmTests.cs::RootedNotEulerianTrailGraph_Throws
test('Eulerian original GraphML no-trail and unavailable rooted-trail fixtures',()=>{
  const load=name=>{const xml=readFileSync(new URL(`./fixtures/GraphML/${name}`,import.meta.url),'utf8'),vs=[...xml.matchAll(/<node\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]),pairs=[...xml.matchAll(/<edge\b[^>]*\bsource="([^"]+)"[^>]*\btarget="([^"]+)"/g)].map(m=>[m[1],m[2]]);return make(pairs,false,vs);};
  const g=load('g.42.34.graphml');if(A.EulerianTrailAlgorithm.ComputeEulerianPathCount(g)!==0){const a=new A.EulerianTrailAlgorithm(g);a.AddTemporaryEdges(ef);a.Compute();assert.deepEqual([...a.Trails()],[]);assert.deepEqual(a.Circuit,[]);}
  const rooted=load('g.10.0.graphml'),a=new A.EulerianTrailAlgorithm(rooted);a.AddTemporaryEdges(ef);a.Compute();assert.throws(()=>[...a.Trails(rooted.Vertices[0])]);
});
