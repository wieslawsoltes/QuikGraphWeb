// upstream: tests/QuikGraph.MSAGL.Tests/MsaglDefaultGraphPopulatorTests.cs::Constructor
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglDefaultGraphPopulatorTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglDefaultGraphPopulatorTests.cs::Compute
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglDefaultGraphPopulatorTests.cs::Handlers
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglDefaultGraphPopulatorTests.cs::Add_Throws
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglIdentifiableGraphPopulatorTests.cs::Constructor
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglIdentifiableGraphPopulatorTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglIdentifiableGraphPopulatorTests.cs::Compute
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglIdentifiableGraphPopulatorTests.cs::Handlers
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglToStringGraphPopulatorTests.cs::Constructor
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglToStringGraphPopulatorTests.cs::Compute
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglToStringGraphPopulatorTests.cs::Handlers
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglGraphExtensionsTests.cs::CreatePopulators
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglGraphExtensionsTests.cs::ToMsaglGraph
import test from 'node:test';import assert from 'node:assert/strict';
import {AdjacencyGraph,UndirectedGraph,Edge}from '../src/core.js';
import {MsaglDefaultGraphPopulator,MsaglIdentifiableGraphPopulator,MsaglToStringGraphPopulator,MsaglVertexEventArgs,MsaglEdgeEventArgs,ToMsaglGraph,CreateMsaglPopulator}from '../src/msagl.js';
const fixture=Type=>{const g=new Type();g.AddVertexRange([1,2,3]);g.AddEdge(new Edge(1,2));g.AddEdge(new Edge(2,3));return g;};
// Source: MsaglDefaultGraphPopulatorTests, MsaglIdentifiableGraphPopulatorTests, MsaglToStringGraphPopulatorTests + shared base Compute_Test and Handlers_Test.
for(const Type of[AdjacencyGraph,UndirectedGraph])for(const variant of['Default','Identifiable','ToString'])test(`Msagl${variant}GraphPopulatorTests.Compute ${Type.name}`,()=>{const graph=fixture(Type),p=variant==='Default'?new MsaglDefaultGraphPopulator(graph):variant==='Identifiable'?new MsaglIdentifiableGraphPopulator(graph,v=>'v'+v):new MsaglToStringGraphPopulator(graph,'node-{0}');assert.equal(p.MsaglGraph,null);let nodes=0,edges=0;p.NodeAdded.add((sender,args)=>{assert.equal(sender,p);assert.equal(args.Node.UserData,args.Vertex);nodes++;});p.EdgeAdded.add((sender,args)=>{assert.equal(args.MsaglEdge.UserData,args.Edge);edges++;});p.Compute();const result=p.MsaglGraph;assert.equal(nodes,3);assert.equal(edges,2);assert.equal(result.Directed,graph.IsDirected);assert.equal(result.NodeCount,3);assert.equal(result.EdgeCount,2);assert.equal(p.State,3);p.Compute();assert.equal(nodes,6);assert.equal(edges,4);assert.equal(p.MsaglGraph.NodeCount,3);});
test('MSAGL constructors and event arguments reject null',()=>{assert.throws(()=>new MsaglDefaultGraphPopulator(null));assert.throws(()=>new MsaglIdentifiableGraphPopulator(fixture(AdjacencyGraph),null));assert.throws(()=>new MsaglVertexEventArgs(null,{}));assert.throws(()=>new MsaglEdgeEventArgs({},null));const p=new MsaglDefaultGraphPopulator(fixture(AdjacencyGraph));assert.throws(()=>p.AddNode(null));assert.throws(()=>p.AddEdge(null));});
test('MsaglGraphExtensionsTests.ToMsaglGraph / CreateMsaglPopulator',()=>{const g=fixture(AdjacencyGraph);const m=ToMsaglGraph(g,(_,args)=>{args.Node.LabelText='node '+args.Vertex;});assert.equal(m.FindNode('0').LabelText,'node 1');const p=CreateMsaglPopulator(g,v=>'v'+v);p.Compute();assert.equal(p.MsaglGraph.FindNode('v2').UserData,2);});
test('MSAGL layout requires real adapter and forwards full drawing graph',async()=>{const g=ToMsaglGraph(fixture(AdjacencyGraph));assert.throws(()=>g.Layout(),/adapter/);const result=await g.Layout({Layout:async(model,options)=>({nodes:model.NodeCount,layout:options.layout})},{layout:'sugiyama'});assert.deepEqual(result,{nodes:3,layout:'sugiyama'});});

// upstream: tests/QuikGraph.MSAGL.Tests/Events/MsaglEdgeEventArgsTests.cs::Constructor
// upstream: tests/QuikGraph.MSAGL.Tests/Events/MsaglEdgeEventArgsTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.MSAGL.Tests/Events/MsaglVertexEventArgsTests.cs::Constructor
// upstream: tests/QuikGraph.MSAGL.Tests/Events/MsaglVertexEventArgsTests.cs::Constructor_Throws
test('MSAGL event argument constructors retain exact objects and reject each null',()=>{const vertex={},node={},edge=new Edge(1,2),drawingEdge={};const v=new MsaglVertexEventArgs(vertex,node),e=new MsaglEdgeEventArgs(edge,drawingEdge);assert.equal(v.Vertex,vertex);assert.equal(v.Node,node);assert.equal(e.Edge,edge);assert.equal(e.MsaglEdge,drawingEdge);for(const Type of[MsaglVertexEventArgs,MsaglEdgeEventArgs])for(const args of[[null,{}],[{},null],[null,null]])assert.throws(()=>new Type(...args),TypeError);});
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglGraphExtensionsTests.cs::CreatePopulators_Throws
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglToStringGraphPopulatorTests.cs::Constructor_Throws
test('MSAGL factory validates graph and explicit format/identity arguments',()=>{const g=new AdjacencyGraph();for(const args of[[null],[null,String],[g,null],[null,null],[null,'Format {0}']])assert.throws(()=>CreateMsaglPopulator(...args),TypeError);assert.throws(()=>new MsaglToStringGraphPopulator(null),TypeError);});
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglIdentifiableGraphPopulatorTests.cs::VertexId
// upstream: tests/QuikGraph.MSAGL.Tests/MsaglToStringGraphPopulatorTests.cs::VertexId
test('MSAGL vertex identities and custom formatter source cases',()=>{const g=new AdjacencyGraph();g.AddVerticesAndEdgeRange([new Edge(1,2),new Edge(2,3)]);g.AddVertexRange([5,6]);const p=new MsaglIdentifiableGraphPopulator(g,v=>'MyTestId'+v);p.Compute();assert.equal(p.MsaglGraph.FindNode('MyTestId0'),undefined);assert.ok(p.MsaglGraph.FindNode('MyTestId1'));const nullProvider={GetFormat:()=>null},provider={GetFormat(type){return type==='ICustomFormatter'?this:null;},Format(_,value){return 'MySpecialFormatProvider '+value;}};for(const [format,fp,prefix,suffix]of[[null,null,'',''],[null,nullProvider,'',''],['MyTestFormat {0} Vertex',null,'MyTestFormat ',' Vertex'],['MyTestFormat {0} Vertex',nullProvider,'MyTestFormat ',' Vertex'],[null,provider,'MySpecialFormatProvider ',''],['MyTestFormat {0} Vertex',provider,'MyTestFormat MySpecialFormatProvider ',' Vertex']]){const populator=new MsaglToStringGraphPopulator(g,format,fp);populator.Compute();assert.equal(populator.MsaglGraph.FindNode(prefix+'0'+suffix),undefined);assert.ok(populator.MsaglGraph.FindNode(prefix+'1'+suffix));}});

test('MSAGL endpoint mapping recognizes custom Equals vertices',()=>{class V{constructor(id){this.ID=id;}Equals(other){return other instanceof V&&this.ID===other.ID;}GetHashCode(){return this.ID;}}const g=new AdjacencyGraph();g.AddVertexRange([new V(1),new V(2)]);g.AddEdge(new Edge(new V(1),new V(2)));const drawing=ToMsaglGraph(g);assert.equal(drawing.NodeCount,2);assert.equal([...drawing.Edges][0].Source,'0');assert.equal([...drawing.Edges][0].Target,'1');});
