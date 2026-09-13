import * as Q from '../src/index.js';
export const weight=e=>Number(e.Tag??1),palette=['#beece2','#cce1fa','#ecd9fc','#ffe1b5','#facfdb','#dbe8b2'];
const pathText=path=>path?.map(e=>`${e.Source} → ${e.Target} (${weight(e)})`)??[];
function graphFrom(triples,undirected=false,vertices){const graph=undirected?new Q.UndirectedGraph():new Q.BidirectionalGraph();if(vertices)graph.AddVertexRange(vertices);for(const[s,t,w=1]of triples)graph.AddVerticesAndEdge(new Q.TaggedEdge(s,t,w));return graph;}
const weighted=()=>graphFrom([['A','B',4],['A','C',2],['B','C',1],['B','D',5],['C','D',8],['C','E',10],['D','E',2],['D','F',6],['E','F',3],['E','G',5],['F','H',2],['G','H',1]],false,['A','B','C','D','E','F','G','H']);
const undirected=()=>graphFrom([['A','B',4],['A','C',2],['B','C',1],['B','D',5],['C','D',8],['C','E',10],['D','E',2],['D','F',6],['E','F',3],['E','G',5],['F','H',2],['G','H',1]],true,['A','B','C','D','E','F','G','H']);
const cyclic=()=>graphFrom([['A','B'],['B','C'],['C','A'],['C','D'],['D','E'],['E','F'],['F','D'],['F','G'],['G','H'],['H','G']]);
const ring=()=>graphFrom([['A','B',2],['B','C',3],['C','D',2],['D','E',4],['E','A',1]]);
const sample=(id,group,label,description,setup=weighted,kind=id)=>({id,group,label,description,setup,kind});
export const scenarios=[
 sample('dijkstra','Paths & traversal','Dijkstra shortest path','Find the lowest-cost route through a weighted graph.'),
 sample('astar','Paths & traversal','A* search','Explore shortest paths using an admissible heuristic. This example uses the zero heuristic.'),
 sample('bfs','Paths & traversal','Breadth-first search','Traverse vertices level by level and inspect tree-edge events.'),
 sample('dfs','Paths & traversal','Depth-first search','Explore a graph with an iterative depth-first traversal.'),
 sample('bellman','Paths & traversal','Bellman–Ford','Find shortest paths with negative weights and detect reachable negative cycles.',()=>graphFrom([['A','B',4],['A','C',5],['B','C',-2],['B','D',6],['C','D',3],['D','E',1]])),
 sample('dag','Paths & traversal','DAG shortest path','Use topological order to solve shortest paths in a directed acyclic graph.'),
 sample('floyd','Paths & traversal','Floyd–Warshall','Compute the complete all-pairs distance matrix.'),
 sample('yen','Paths & traversal','Yen k-shortest paths','Enumerate three distinct loopless routes in increasing total weight.'),
 sample('hoffman','Paths & traversal','Hoffman–Pavley','Inspect ranked shortest paths and their edge sequences.'),
 sample('scc','Structure & connectivity','Strong components','Group vertices that can reach one another in both directions.',cyclic),
 sample('connected','Structure & connectivity','Connected components','Find connected components in an undirected graph.',()=>graphFrom([['A','B'],['B','C'],['D','E'],['F','G']],true,['A','B','C','D','E','F','G','H'])),
 sample('weak','Structure & connectivity','Weak components','Group directed vertices while ignoring edge orientation.',cyclic),
 sample('topological','Structure & connectivity','Topological ordering','Order dependencies so every source precedes its targets.'),
 sample('condensation','Structure & connectivity','Condensation graph','Collapse strongly connected components into a directed acyclic graph.',cyclic),
 sample('closure','Structure & connectivity','Transitive closure','Add direct edges for every reachable vertex pair.'),
 sample('reduction','Structure & connectivity','Transitive reduction','Remove redundant edges while preserving reachability.'),
 sample('lca','Structure & connectivity','Least common ancestor','Answer offline ancestor queries in a rooted tree.',()=>graphFrom([['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G']])),
 sample('kruskal','Optimization','Kruskal spanning tree','Sort edges and build a minimum-cost spanning forest.',undirected),
 sample('prim','Optimization','Prim spanning tree','Grow a minimum-cost spanning forest using a priority queue.',undirected),
 sample('flow','Optimization','Maximum flow','Send as much flow as possible through a capacity-constrained network.',()=>graphFrom([['S','A',16],['S','B',13],['A','B',10],['B','A',4],['A','C',12],['C','B',9],['B','D',14],['D','C',7],['C','T',20],['D','T',4]],false,['S','A','B','C','D','T'])),
 sample('matching','Optimization','Bipartite matching','Find a maximum matching between two disjoint sets.',()=>graphFrom([['A','X'],['A','Y'],['B','Y'],['B','Z'],['C','X']],false,['A','B','C','X','Y','Z'])),
 sample('hungarian','Optimization','Hungarian assignment','Find the minimum total assignment cost in a square cost matrix.',()=>graphFrom([['Agent 1','Task 1',9],['Agent 1','Task 2',2],['Agent 1','Task 3',7],['Agent 2','Task 1',6],['Agent 2','Task 2',4],['Agent 2','Task 3',3],['Agent 3','Task 1',5],['Agent 3','Task 2',8],['Agent 3','Task 3',1]])),
 sample('tsp','Optimization','Traveling salesperson','Compute an exact minimum Hamiltonian tour on this small graph.',()=>graphFrom([['A','B',10],['A','C',15],['A','D',20],['B','A',10],['B','C',35],['B','D',25],['C','A',15],['C','B',35],['C','D',30],['D','A',20],['D','B',25],['D','C',30]])),
 sample('partition','Optimization','Graph partition','Improve a balanced partition using Kernighan–Lin swaps.',undirected),
 sample('coloring','Analysis & simulation','Vertex coloring','Assign colors so adjacent vertices have different colors.',undirected),
 sample('cover','Analysis & simulation','Vertex cover','Build an approximate vertex cover for an undirected graph.',undirected),
 sample('clique','Analysis & simulation','Maximum clique','Search for the largest fully connected vertex subset.',undirected),
 sample('pagerank','Analysis & simulation','PageRank','Compute the upstream QuikGraph rank recurrence.',cyclic),
 sample('euler','Analysis & simulation','Eulerian trail','Build a circuit that visits every edge exactly once.',ring),
 sample('walk','Analysis & simulation','Random walk','Use a round-robin edge chain for reproducible walk events.',cyclic),
 sample('petri','Analysis & simulation','Petri net','Move typed tokens through places, transitions, and annotated arcs.',()=>{const net=new Q.PetriNet(),waiting=net.AddPlace('Waiting'),done=net.AddPlace('Done'),transition=net.AddTransition('Process');waiting.Marking.push('token 1','token 2');net.AddArc(waiting,transition);net.AddArc(transition,done);const g=net.Graph;g.sampleNet=net;return g;}),
 sample('graphviz','Formats & adapters','Graphviz DOT','Generate DOT with formatting callbacks, labels, and graph attributes.'),
 sample('graphml','Formats & adapters','GraphML round trip','Serialize typed vertex and edge metadata and read the graph back.'),
 sample('xml','Formats & adapters','XML round trip','Use portable XML graph serialization with custom identities.'),
 sample('data','Formats & adapters','DataSet relations','Adapt JavaScript table and relation objects into a graph.',()=>{const users={TableName:'Users',Columns:[{ColumnName:'Id',DataType:'int',Unique:true}]},orders={TableName:'Orders',Columns:[{ColumnName:'UserId',DataType:'int'}]},items={TableName:'Items',Columns:[{ColumnName:'OrderId',DataType:'int'}]};return Q.DataSetToGraph({Tables:[users,orders,items],Relations:[{ParentTable:users,ChildTable:orders,RelationName:'UserOrders'},{ParentTable:orders,ChildTable:items,RelationName:'OrderItems'}]});}),
 sample('msagl','Formats & adapters','MSAGL drawing adapter','Convert a graph into a drawing model. An external engine can supply layout.'),
 sample('storage','Structures & collections','Graph representations','Compare mutable, array-backed, reversed, and compressed graph representations.'),
 sample('collections','Structures & collections','Heaps & disjoint sets','Exercise priority queues and union-find with graph weights.'),
 {...sample('graphviz-render','Native engines','Graphviz rendering','Render editable DOT using the real Graphviz WebAssembly engine. Choose any native engine or output format, reuse positioned DOT, and export SVG, PNG, JPEG or WebP.'),async:true},
 {...sample('msagl-layout','Native engines','MSAGL layout & routing','Apply layered, multidimensional-scaling or force-directed layout and native edge routing to the interactive graph.'),async:true},
 {...sample('graphml-validate','Native engines','GraphML schema validation','Validate editable GraphML against the complete embedded XSD using libxml2 WebAssembly. Inspect precise diagnostics.'),async:true},
 {...sample('binary','Native engines','BinaryFormatter interchange','Write and read actual .NET NRBF graph files, preserving graph structure, vertex identities and edge tags.'),async:true},
];

export const label=v=>typeof v==='object'?(v.TableName??v.Name??String(v)):String(v);
const edgeSummary=es=>[...es].map(e=>`${label(e.Source)} → ${label(e.Target)}${e.Tag==null?'':`  weight=${weight(e)}`}`);

export function execute(id,g,source,target){
 let algorithm,result,highlight=[],colors=new Map(),code='',summary='Completed successfully.';
 const run=(name,...args)=>{algorithm=new Q[name](g,...args);return algorithm;};
 if(['dijkstra','astar','bellman','dag'].includes(id)){const name={dijkstra:g.IsDirected?'DijkstraShortestPathAlgorithm':'UndirectedDijkstraShortestPathAlgorithm',astar:'AStarShortestPathAlgorithm',bellman:'BellmanFordShortestPathAlgorithm',dag:'DagShortestPathAlgorithm'}[id];algorithm=run(name,weight,...(id==='astar'?[()=>0]:[]));algorithm.Compute(source);highlight=algorithm.TryGetPath(target)??[];result={source:label(source),target:label(target),distance:algorithm.Distances.get(target),path:edgeSummary(highlight),distances:algorithm.Distances,...(id==='bellman'?{negativeCycle:algorithm.FoundNegativeCycle}:{})};summary=highlight.length?`Route cost ${algorithm.Distances.get(target)} · ${highlight.length} edges`:'No nonempty route to target.';code=`const algorithm = new Q.${name}(graph, edge => edge.Tag${id==='astar'?', vertex => 0':''});\nalgorithm.Compute(source);\nconst path = algorithm.TryGetPath(target);\nconst distance = algorithm.Distances.get(target);`;
 }else if(id==='bfs'||id==='dfs'){algorithm=run(id==='bfs'?'BreadthFirstSearchAlgorithm':'DepthFirstSearchAlgorithm');const order=[];algorithm.DiscoverVertex.add(v=>order.push(label(v)));algorithm.TreeEdge.add(e=>highlight.push(e));algorithm.Compute(source);result={discoveryOrder:order,treeEdges:edgeSummary(highlight)};code=`const search = new Q.${algorithm.constructor.name}(graph);\nsearch.DiscoverVertex.add(vertex => console.log(vertex));\nsearch.TreeEdge.add(edge => console.log(edge));\nsearch.Compute(source);`;
 }else if(id==='floyd'){algorithm=run('FloydWarshallAllShortestPathAlgorithm',weight);algorithm.Compute();highlight=algorithm.TryGetPath(source,target)??[];result={distances:algorithm.Distances,path:edgeSummary(highlight)};
 }else if(id==='yen'||id==='hoffman'){let paths;if(id==='yen'){algorithm=new Q.YenShortestPathsAlgorithm(g,source,target,3,weight);paths=[...algorithm.Execute()].map(p=>p.Edges??p);}else{algorithm=run('HoffmanPavleyRankedShortestPathAlgorithm',weight);algorithm.ShortestPathCount=3;algorithm.Compute(source,target);paths=algorithm.ComputedShortestPaths;}highlight=paths[0]??[];result=paths.map((p,i)=>({rank:i+1,cost:p.reduce((n,e)=>n+weight(e),0),edges:edgeSummary(p)}));
 }else if(['scc','connected','weak'].includes(id)){algorithm=run({scc:'StronglyConnectedComponentsAlgorithm',connected:'ConnectedComponentsAlgorithm',weak:'WeaklyConnectedComponentsAlgorithm'}[id]);algorithm.Compute();result={componentCount:algorithm.ComponentCount,components:algorithm.Components};for(const[v,c]of algorithm.Components)colors.set(v,palette[c%palette.length]);summary=`${algorithm.ComponentCount} components found.`;
 }else if(id==='topological'){algorithm=run('SourceFirstTopologicalSortAlgorithm');algorithm.Compute();result={order:algorithm.SortedVertices};algorithm.SortedVertices.forEach((v,i)=>colors.set(v,palette[i%palette.length]));
 }else if(id==='condensation'){algorithm=run('CondensationGraphAlgorithm');algorithm.Compute();result={components:[...algorithm.CondensedGraph.Vertices].map(c=>[...c.Vertices]),edges:[...algorithm.CondensedGraph.Edges].map(e=>({source:[...e.Source.Vertices],target:[...e.Target.Vertices],originalEdges:e.Edges.length}))};
 }else if(id==='closure'||id==='reduction'){algorithm=run(id==='closure'?'TransitiveClosureAlgorithm':'TransitiveReductionAlgorithm',...(id==='closure'?[(s,t)=>new Q.TaggedEdge(s,t,1)]:[]));algorithm.Compute();const resultGraph=id==='closure'?algorithm.TransitiveClosure:algorithm.TransitiveReduction;highlight=[...resultGraph.Edges].filter(e=>[...g.Edges].includes(e));result={vertices:resultGraph.VertexCount,edges:resultGraph.EdgeCount,edgeList:edgeSummary(resultGraph.Edges)};
 }else if(id==='lca'){const pairs=[new Q.SEquatableEdge('D','E'),new Q.SEquatableEdge('D','G')];algorithm=run('TarjanOfflineLeastCommonAncestorAlgorithm');algorithm.Compute(source,pairs);result=pairs.map(p=>({pair:[p.Source,p.Target],ancestor:algorithm.Ancestors.get(p)}));
 }else if(id==='kruskal'||id==='prim'){algorithm=run(id==='kruskal'?'KruskalMinimumSpanningTreeAlgorithm':'PrimMinimumSpanningTreeAlgorithm',weight);algorithm.TreeEdge.add(e=>highlight.push(e));algorithm.Compute();result={cost:highlight.reduce((n,e)=>n+weight(e),0),edges:edgeSummary(highlight)};summary=`Forest cost ${result.cost} · ${highlight.length} edges`;
 }else if(id==='flow'){algorithm=run('EdmondsKarpMaximumFlowAlgorithm',weight,(s,t)=>new Q.TaggedEdge(s,t,0));algorithm.Compute(source,target);result={maximumFlow:algorithm.MaxFlow,residualCapacities:[...algorithm.ResidualCapacities].map(([e,c])=>({edge:`${e.Source} → ${e.Target}`,residual:c}))};summary=`Maximum flow: ${algorithm.MaxFlow}`;
 }else if(id==='matching'){algorithm=run('MaximumBipartiteMatchingAlgorithm',['A','B','C'],['X','Y','Z']);algorithm.Compute();highlight=[...algorithm.MatchedEdges];result={matching:edgeSummary(highlight),count:highlight.length};
 }else if(id==='hungarian'){const costs=[[9,2,7],[6,4,3],[5,8,1]];algorithm=new Q.HungarianAlgorithm(costs);algorithm.Compute();result={costs,assignment:algorithm.AgentsTasks};for(const [i,j]of Array.from(algorithm.AgentsTasks).entries())if(Number.isInteger(j))highlight.push(...[...g.Edges].filter(e=>e.Source===`Agent ${i+1}`&&e.Target===`Task ${j+1}`));code='const assignment = new Q.HungarianAlgorithm([[9, 2, 7], [6, 4, 3], [5, 8, 1]]);\nassignment.Compute();\nconsole.log(assignment.AgentsTasks);';
 }else if(id==='tsp'){algorithm=run('TSP',weight);algorithm.Compute(source);highlight=[...(algorithm.ResultPath?.Edges??[])];result={cost:algorithm.BestCost,tour:edgeSummary(highlight)};
 }else if(id==='partition'){algorithm=run('KernighanLinAlgorithm');algorithm.Compute();result=algorithm.Partition;for(const v of result.VertexSetA)colors.set(v,palette[0]);for(const v of result.VertexSetB)colors.set(v,palette[1]);
 }else if(id==='coloring'){algorithm=run('VertexColoringAlgorithm');algorithm.Compute();result={colors:algorithm.Colors};for(const[v,c]of algorithm.Colors)colors.set(v,palette[c%palette.length]);
 }else if(id==='cover'){algorithm=run('MinimumVertexCoverApproximationAlgorithm',()=>.25);algorithm.Compute();result={cover:algorithm.CoverSet};for(const v of algorithm.CoverSet)colors.set(v,palette[0]);
 }else if(id==='clique'){algorithm=run('BronKerboschMaximumCliqueAlgorithm');algorithm.Compute();result={maximumClique:algorithm.MaximumClique,maximalCliques:algorithm.MaximalCliques};for(const v of algorithm.MaximumClique)colors.set(v,palette[0]);
 }else if(id==='pagerank'){algorithm=run('PageRankAlgorithm');algorithm.Compute();result={ranks:algorithm.Ranks,iterations:algorithm.Iterations};const max=Math.max(...algorithm.Ranks.values());for(const[v,r]of algorithm.Ranks)colors.set(v,`hsl(173 55% ${92-40*r/max}%)`);
 }else if(id==='euler'){algorithm=run('EulerianTrailAlgorithm');algorithm.Compute(source);highlight=[...algorithm.Circuit];result={circuit:edgeSummary(highlight)};
 }else if(id==='walk'){algorithm=run('RandomWalkAlgorithm',new Q.RoundRobinEdgeChain());algorithm.TreeEdge.add(e=>highlight.push(e));algorithm.Generate(source,12);result={steps:edgeSummary(highlight)};
 }else if(id==='petri'){const net=g.sampleNet,before=[...net.Places].map(p=>({place:p.Name,tokens:[...p.Marking]}));algorithm=new Q.PetriNetSimulator(net);algorithm.Initialize();algorithm.SimulateStep();result={before,after:[...net.Places].map(p=>({place:p.Name,tokens:[...p.Marking]}))};highlight=[...g.Edges];code='const net = new Q.PetriNet();\nconst input = net.AddPlace("Waiting"), output = net.AddPlace("Done");\nconst process = net.AddTransition("Process");\ninput.Marking.push("token 1", "token 2");\nnet.AddArc(input, process); net.AddArc(process, output);\nconst simulator = new Q.PetriNetSimulator(net);\nsimulator.Initialize(); simulator.SimulateStep();';
 }else if(id==='graphviz'){algorithm=run('GraphvizAlgorithm');algorithm.FormatVertex.add((_s,args)=>args.VertexFormat.Label=label(args.Vertex));algorithm.FormatEdge.add((_s,args)=>args.EdgeFormat.Label.Value=String(weight(args.Edge)));result=algorithm.Generate();code='const dot = new Q.GraphvizAlgorithm(graph);\ndot.FormatEdge.add((sender, args) => {\n  args.EdgeFormat.Label.Value = String(args.Edge.Tag);\n});\nconsole.log(dot.Generate());';
 }else if(id==='graphml'){const xml=Q.SerializeToGraphML(g);const restored=Q.DeserializeFromGraphML(xml);result={xml,roundTrip:{vertices:restored.VertexCount,edges:restored.EdgeCount}};code='const xml = Q.SerializeToGraphML(graph);\nconst restored = Q.DeserializeFromGraphML(xml);';
 }else if(id==='xml'){const xml=Q.SerializeToXml(g),restored=Q.DeserializeFromXml(xml);result={xml,roundTrip:{vertices:restored.VertexCount,edges:restored.EdgeCount}};
 }else if(id==='data'){result=Q.DataSetToGraphviz(g);
 }else if(id==='msagl'){const drawing=Q.ToMsaglGraph(g);result={nodes:[...drawing.Nodes].map(n=>({id:n.Id,label:n.LabelText})),edges:[...drawing.Edges].map(e=>({source:e.Source,target:e.Target})),layout:'Call drawing.Layout(adapter, options) with your MSAGL-compatible engine.'};
 }else if(id==='storage'){const csr=Q.GraphExtensions.ToCompressedRowGraph(g);const array=Q.GraphExtensions.ToArrayBidirectionalGraph(g);const reversed=new Q.ReversedBidirectionalGraph(g);result={mutable:{vertices:g.VertexCount,edges:g.EdgeCount},array:{vertices:array.VertexCount,edges:array.EdgeCount},compressed:{vertices:csr.VertexCount,edges:csr.EdgeCount},reversed:edgeSummary(reversed.Edges)};
 }else if(id==='collections'){const sets=Q.ComputeDisjointSet(g),heap=new Q.BinaryHeap();for(const e of g.Edges)heap.Add(weight(e),e);const priorities=[];while(heap.Count)priorities.push(heap.RemoveMinimum().Key);result={setCount:sets.SetCount,vertices:[...g.Vertices],priorities};code='const sets = Q.ComputeDisjointSet(graph);\nconsole.log(sets.SetCount);\n// BinaryHeap, FibonacciHeap, Queue, BinaryQueue and FibonacciQueue\n// are also available from the package.';
 }
 if(!code)code=`const algorithm = new Q.${algorithm?.constructor.name??id}(graph${['kruskal','prim','floyd','tsp'].includes(id)?', edge => edge.Tag':''});\nalgorithm.Compute(${['tsp','euler'].includes(id)?'source':''});\n// Inspect the result and subscribe to algorithm events.\nconsole.log(algorithm);`;
 return{result,highlight,colors,code,summary};
}

const runtimes=new Map();
async function runtime(name){
  if(!runtimes.has(name)){
    const pending=name==='graphviz'?import('../dist/quikgraphweb-graphviz.js').then(module=>module.CreateGraphvizEngine()):name==='layout'?import('../dist/quikgraphweb-layout.js'):name==='binary'?import('../dist/binary-serialization.js'):import('../dist/quikgraphweb-xml-validation.js').then(module=>module.CreateGraphMLSchemaValidator());
    runtimes.set(name,pending);pending.catch(()=>runtimes.delete(name));
  }
  return runtimes.get(name);
}
function checkSignal(signal){if(signal?.aborted)throw new DOMException('The operation was cancelled.','AbortError');}
/** Optional engines initialize on demand and are reused between sample executions. */
export async function executeAsync(id,graph,source,target,options={}){
  checkSignal(options.signal);const load=options.loadRuntime??runtime;let result,summary,code,previewSvg,layoutResult,download,binaryBytes,importedGraph,formats,engines,exportFormat,prepareDot;
  if(id==='graphviz-render'){
    const engine=await load('graphviz');checkSignal(options.signal);const dot=options.text??execute('graphviz',graph,source,target).result,algorithm=options.engine??'dot';
    previewSvg=engine.RenderSvg(dot,{engine:algorithm});result={engine:algorithm,version:engine.GraphvizVersion,svg:previewSvg};summary=`Graphviz ${algorithm} rendered ${previewSvg.length.toLocaleString()} SVG characters.`;
    formats=engine.Formats;engines=engine.Engines;exportFormat=(format,text=dot,selectedEngine=algorithm)=>engine.RenderString(text,{format,engine:selectedEngine});prepareDot=(text=dot)=>engine.RenderString(text,{format:'dot',engine:'dot'});download=async(type='image/png')=>engine.RenderImage(dot,{renderOptions:{engine:algorithm},type,scale:2});code="import { CreateGraphvizEngine } from '@wieslawsoltes/quikgraphweb/graphviz';\nconst engine = await CreateGraphvizEngine();\nconst svg = engine.RenderSvg(dot, { engine: '"+algorithm+"' });\nconst png = await engine.RenderImage(dot, { renderOptions: { engine: '"+algorithm+"' }, type: 'image/png', scale: 2 });";
  }else if(id==='msagl-layout'){
    const module=await load('layout');checkSignal(options.signal);layoutResult=await module.LayoutGraphAsync(graph,{algorithm:options.algorithm??'Sugiyama',direction:options.direction??'TB',routing:options.routing??'Spline',nodeWidth:38,nodeHeight:38,signal:options.signal});checkSignal(options.signal);
    previewSvg=layoutResult.ToSvg();result={algorithm:options.algorithm??'Sugiyama',routing:options.routing??'Spline',bounds:layoutResult.Bounds,nodes:[...layoutResult.Positions].map(([vertex,position])=>({vertex:label(vertex),...position})),edges:layoutResult.Edges.map(edge=>({source:label(edge.Edge.Source),target:label(edge.Edge.Target),path:edge.Path}))};summary=`Positioned ${layoutResult.Positions.size} vertices and routed ${layoutResult.Edges.length} edges.`;
    code="import { MsaglLayoutEngine } from '@wieslawsoltes/quikgraphweb/layout';\nconst engine = new MsaglLayoutEngine();\nconst result = await viewer.LayoutAsync(engine, {\n  algorithm: '"+(options.algorithm??'Sugiyama')+"', direction: '"+(options.direction??'TB')+"', routing: '"+(options.routing??'Spline')+"'\n});\nconst svg = result.ToSvg();";
  }else if(id==='graphml-validate'){
    const validator=await load('schema');checkSignal(options.signal);result=validator.Validate(options.text??Q.SerializeToGraphML(graph),{filename:'example.graphml'});summary=result.IsValid?'The document is valid against the complete GraphML schema.':`Schema validation found ${result.Errors.length} diagnostic${result.Errors.length===1?'':'s'}.`;
    code="import { CreateGraphMLSchemaValidator } from '@wieslawsoltes/quikgraphweb/xml-validation';\nconst validator = await CreateGraphMLSchemaValidator();\nconst result = validator.Validate(xml, { filename: 'example.graphml' });\nconsole.log(result.IsValid, result.Errors);\nvalidator.Dispose();";
  }else if(id==='binary'){
    const module=await load('binary');checkSignal(options.signal);binaryBytes=options.bytes??module.SerializeNrbfGraph(graph);const restored=module.DeserializeNrbfGraph(binaryBytes,{maxBytes:10*1024*1024});
    if(options.bytes)importedGraph=restored;result={format:'NRBF / BinaryFormatter',bytes:binaryBytes.byteLength,header:[...binaryBytes.slice(0,64)].map(byte=>byte.toString(16).padStart(2,'0')).join(' '),roundTrip:{type:restored.constructor.name,vertices:restored.VertexCount,edges:restored.EdgeCount},vertices:[...restored.Vertices].map(label),edgeList:edgeSummary(restored.Edges)};summary=`${options.bytes?'Imported':'Round-tripped'} ${restored.VertexCount} vertices and ${restored.EdgeCount} edges in ${binaryBytes.byteLength.toLocaleString()} NRBF bytes.`;
    code="import { SerializeNrbfGraph, DeserializeNrbfGraph } from '@wieslawsoltes/quikgraphweb/binary';\nconst bytes = SerializeNrbfGraph(graph);\nconst restored = DeserializeNrbfGraph(bytes, { maxBytes: 10 * 1024 * 1024 });\nconsole.log(restored.VertexCount, restored.EdgeCount);";
  }else return execute(id,graph,source,target);
  checkSignal(options.signal);return{result,highlight:[],colors:new Map(),code,summary,previewSvg,layoutResult,download,binaryBytes,importedGraph,formats,engines,exportFormat,prepareDot};
}
