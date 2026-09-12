import {performance} from 'node:perf_hooks';import * as Q from '../src/index.js';
const rows=[];const measure=(name,fn)=>{const start=performance.now(),result=fn();rows.push({name,milliseconds:Number((performance.now()-start).toFixed(3)),...result});};
let graph;
measure('Build 50,000 vertices / 99,997 edges',()=>{graph=new Q.BidirectionalGraph();for(let i=0;i<50000;i++)graph.AddVertex(i);for(let i=0;i<49999;i++){graph.AddEdge(new Q.TaggedEdge(i,i+1,1));if(i+2<50000)graph.AddEdge(new Q.TaggedEdge(i,i+2,3));}return{vertices:graph.VertexCount,edges:graph.EdgeCount};});
measure('Breadth-first traversal',()=>{let visited=0;const bfs=new Q.BreadthFirstSearchAlgorithm(graph);bfs.DiscoverVertex.add(()=>visited++);bfs.Compute(0);if(visited!==50000)throw new Error('Traversal failed');return{visited};});
measure('Dijkstra on sparse DAG',()=>{const d=new Q.DijkstraShortestPathAlgorithm(graph,e=>e.Tag);d.Compute(0);const distance=d.Distances.get(49999);if(distance!==49999)throw new Error('Shortest path failed');return{distance};});
measure('Strongly connected components',()=>{const s=new Q.StronglyConnectedComponentsAlgorithm(graph);s.Compute();if(s.ComponentCount!==50000)throw new Error('SCC failed');return{components:s.ComponentCount};});
measure('Compressed sparse row conversion',()=>{const csr=Q.GraphExtensions.ToCompressedRowGraph(graph);if(csr.EdgeCount!==graph.EdgeCount)throw new Error('CSR failed');return{edges:csr.EdgeCount};});
console.log(JSON.stringify({runtime:process.version,platform:process.platform,arch:process.arch,observations:rows,note:'One-run observations including JIT and allocation costs; not cross-library performance claims.'},null,2));
