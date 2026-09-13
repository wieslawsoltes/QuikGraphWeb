import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,execute,executeAsync} from '../examples/scenarios.js';
for(const scenario of scenarios.filter(s=>!s.async))test(`showcase: ${scenario.label}`,()=>{
  const graph=scenario.setup(),vertices=[...graph.Vertices],result=execute(scenario.id,graph,vertices[0],vertices.at(-1));
  assert.notEqual(result.result,undefined,'Every example must expose its computed result.');
  assert.ok(result.code.length>20);assert.ok(result.highlight.every(e=>e&&e.Source!=null&&e.Target!=null));
  if(scenario.id==='dijkstra')assert.equal(result.result.distance,16);
  if(scenario.id==='flow')assert.equal(result.result.maximumFlow,23);
  if(scenario.id==='tsp')assert.equal(result.result.cost,80);
  if(scenario.id==='hungarian')assert.deepEqual(result.result.assignment,[1,0,2]);
  if(scenario.id==='matching')assert.equal(result.result.count,3);
  if(scenario.id==='euler')assert.equal(result.highlight.length,5);
  if(scenario.id==='scc')assert.equal(result.result.componentCount,3);
  if(scenario.id==='petri')assert.deepEqual(result.result.after,[{place:'Waiting',tokens:[]},{place:'Done',tokens:['token 1','token 2']}]);
  if(scenario.id==='graphml'||scenario.id==='xml')assert.equal(result.result.roundTrip.edges,graph.EdgeCount);
});

test('Optional showcase forwards engine options, exposes images and rejects stale work',async()=>{
 const graph=scenarios[0].setup(),vertices=[...graph.Vertices],svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L1 1"/></svg>',calls=[];
 const engine={GraphvizVersion:'test',Formats:['svg','plain','dot'],Engines:['dot','neato','nop2'],RenderString(dot,options){calls.push({dot,options});return options.format==='dot'?'digraph{a[pos="0,0"]}':'graph 1 2 3';},RenderSvg(dot,options){calls.push({dot,options});return svg;},async RenderImage(dot,options){calls.push({dot,options});return new Blob(['png']);}};
 const rendered=await executeAsync('graphviz-render',graph,vertices[0],vertices.at(-1),{engine:'neato',text:'digraph { A -> B }',loadRuntime:async name=>{assert.equal(name,'graphviz');return engine;}});
 assert.equal(rendered.previewSvg,svg);assert.deepEqual(calls[0],{dot:'digraph { A -> B }',options:{engine:'neato'}});assert.equal((await rendered.download()).size,3);assert.equal(calls[1].options.type,'image/png');assert.deepEqual(calls[1].options.renderOptions,{engine:'neato'});
 const controller=new AbortController();await assert.rejects(executeAsync('graphviz-render',graph,vertices[0],vertices.at(-1),{signal:controller.signal,loadRuntime:async()=>{controller.abort();return engine;}}),{name:'AbortError'});assert.equal(calls.length,2,'Cancelled initialization must not execute engine work');assert.deepEqual(rendered.formats,['svg','plain','dot']);assert.deepEqual(rendered.engines,['dot','neato','nop2']);assert.equal(rendered.exportFormat('plain'),'graph 1 2 3');assert.deepEqual(calls[2].options,{format:'plain',engine:'neato'});assert.match(rendered.prepareDot(),/pos=/);assert.deepEqual(calls[3].options,{format:'dot',engine:'dot'});
});

test('Schema showcase retains native diagnostics and layout showcases expose computed routes',async()=>{
 const graph=scenarios[0].setup(),source=[...graph.Vertices][0],invalid={IsValid:false,Errors:[{Message:'Invalid non-negative integer',LineNumber:2,ColumnNumber:4}]};
 const validation=await executeAsync('graphml-validate',graph,source,undefined,{text:'invalid XML',loadRuntime:async()=>({Validate(text,options){assert.equal(text,'invalid XML');assert.equal(options.filename,'example.graphml');return invalid;}})});
 assert.equal(validation.result,invalid);assert.match(validation.summary,/1 diagnostic/);
 const positions=new Map([...graph.Vertices].map((vertex,i)=>[vertex,{x:i*30,y:50}])),layout={Positions:positions,Edges:[...graph.Edges].map(Edge=>({Edge,Path:'M0 0L30 50'})),Bounds:{x:0,y:0,width:240,height:100},ToSvg:()=>'<svg/>'};
 const result=await executeAsync('msagl-layout',graph,source,undefined,{algorithm:'MDS',direction:'LR',routing:'Rectilinear',loadRuntime:async()=>({async LayoutGraphAsync(g,options){assert.equal(g,graph);assert.equal(options.algorithm,'MDS');assert.equal(options.direction,'LR');assert.equal(options.routing,'Rectilinear');return layout;}})});
 assert.equal(result.layoutResult,layout);assert.equal(result.result.nodes.length,graph.VertexCount);assert.equal(result.result.edges.length,graph.EdgeCount);assert.equal(result.previewSvg,'<svg/>');
});

test('Binary showcase round-trips actual NRBF bytes and imports graph tags',async()=>{
 const codec=await import('../src/binary-serialization.js'),graph=scenarios[0].setup(),settings={loadRuntime:async name=>{assert.equal(name,'binary');return codec;}};
 const encoded=await executeAsync('binary',graph,'A','H',settings);assert(encoded.binaryBytes instanceof Uint8Array);assert(encoded.binaryBytes.length>100);assert.equal(encoded.result.roundTrip.vertices,8);assert.equal(encoded.result.roundTrip.edges,12);assert.equal(encoded.result.edgeList[0],'A → B  weight=4');
 const imported=await executeAsync('binary',graph,'A','H',{...settings,bytes:encoded.binaryBytes});assert.equal(imported.importedGraph.EdgeCount,12);assert.equal([...imported.importedGraph.Edges][0].Tag,4);
 await assert.rejects(executeAsync('binary',graph,'A','H',{...settings,bytes:new Uint8Array([1,2,3])}),{name:'NrbfFormatError'});
});
