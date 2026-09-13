import test from 'node:test';
import assert from 'node:assert/strict';
import { MsaglLayoutEngine, LayoutGraph, LayoutGraphAsync, MsaglCurveToSvgPath } from '../dist/layout.js';
import { MsaglDrawingGraph } from '../src/msagl.js';
import { AdjacencyGraph, Edge } from '../src/core.js';

function fixture() { const g=new MsaglDrawingGraph('workflow');g.AddEdge('a','b');g.AddEdge('a','c');g.AddEdge('b','d');g.AddEdge('c','d');g.AddNode('isolated');return g; }
function finiteResult(r) {
  for(const n of r.Nodes) { for(const v of Object.values(n.Center)) assert.ok(Number.isFinite(v));assert.ok(n.Bounds.width>0&&n.Bounds.height>0);assert.match(n.Path,/^M /); }
  for(const v of Object.values(r.Bounds))assert.ok(Number.isFinite(v));
  for(const e of r.Edges) {assert.ok(!/NaN|Infinity|undefined/.test(e.Path));if(r.Routing!=='None')assert.ok(e.Path.length>5);}
}
function intersects(a,b) {return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+1e-6&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+1e-6;}
function contains(a,b) {return b.x>=a.x-1e-6&&b.y>=a.y-1e-6&&b.x+b.width<=a.x+a.width+1e-6&&b.y+b.height<=a.y+a.height+1e-6;}

for(const algorithm of ['Sugiyama','MDS','IPsepCola'])for(const routing of ['Spline','SplineBundling','StraightLine','SugiyamaSplines','Rectilinear','None']) {
  test(`Actual MSAGL ${algorithm} layout / ${routing} routes and packs disconnected components`,()=>{
    const g=fixture(),r=LayoutGraph(g,{algorithm,routing});finiteResult(r);assert.equal(r.Nodes.length,5);assert.equal(r.Edges.length,4);
    assert.equal(r.GeometryGraph.graph,r.EngineGraph);assert.equal(g.LayoutResult,r);
    for(let i=0;i<r.Nodes.length;i++)for(let j=i+1;j<r.Nodes.length;j++)assert.ok(!intersects(r.Nodes[i].Bounds,r.Nodes[j].Bounds),'node rectangles must not overlap');
    if(routing==='None')for(const e of r.Edges){assert.equal(e.Path,'');assert.equal(e.Curve,null);assert.equal(e.TargetArrowhead,null);}
    else for(const e of r.Edges){assert.ok(e.TargetArrowhead);assert.ok(Math.hypot(e.TargetArrowhead.Tip.x-e.TargetArrowhead.Base.x,e.TargetArrowhead.Tip.y-e.TargetArrowhead.Base.y)>0);}
  });
}
for(const direction of ['TB','BT','LR','RL'])test(`Actual MSAGL respects ${direction} layer direction and configured sizes`,()=>{
  const r=LayoutGraph(fixture(),{direction,nodeWidth:90,nodeHeight:40,layerSeparation:80}),p=r.Positions;
  const axis=direction==='TB'||direction==='BT'?'y':'x',sign=direction==='TB'||direction==='LR'?1:-1;
  assert.ok((p.get('b')[axis]-p.get('a')[axis])*sign>=100);assert.ok((p.get('d')[axis]-p.get('b')[axis])*sign>=100);
  for(const n of r.Nodes){assert.ok(Math.abs(n.Bounds.width-90)<1e-6);assert.ok(Math.abs(n.Bounds.height-40)<1e-6);}
});
test('Actual MSAGL preserves loops, parallel edges and labels, and SVG escapes caller text',()=>{
  const g=fixture();g.AddEdge('a','a').LabelText='loop';g.AddEdge('a','b').LabelText='<script>&"';g.FindNode('a').LabelText='line 1\nline 2';
  const r=LayoutGraph(g);finiteResult(r);assert.equal(r.Edges.length,6);assert.notEqual(r.Edges[0].Path,r.Edges[5].Path);assert.ok(r.Edges[4].Path.length>50);
  assert.ok(r.Edges[5].Label.Bounds.width>0);assert.ok(r.Edges[5].Label.Center.x!==0||r.Edges[5].Label.Center.y!==0);
  const svg=r.ToSvg({title:'<script>alert(1)</script>',fontFamily:'a" onload="x'});
  assert.ok(svg.startsWith('<svg '));assert.match(svg,/&lt;script&gt;/);assert.doesNotMatch(svg,/<script|onload="x/);assert.match(svg,/<tspan/);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
  assert.doesNotThrow(()=>JSON.stringify(r.ToJSON()));assert.equal(r.ToJSON().Nodes[0].Vertex,undefined);
});
test('Nested clusters enclose their nodes and route edges across the hierarchy',()=>{
  const r=LayoutGraph(fixture(),{clusters:[{id:'inner',nodes:['a','b'],parentId:'outer'},{id:'outer',nodes:['c'],label:'group'}]});finiteResult(r);
  const inner=r.Clusters.find(c=>c.Id==='inner'),outer=r.Clusters.find(c=>c.Id==='outer');
  assert.ok(contains(outer.Bounds,inner.Bounds));for(const id of ['a','b'])assert.ok(contains(inner.Bounds,r.Nodes.find(n=>n.Id===id).Bounds));
  assert.ok(contains(outer.Bounds,r.Nodes.find(n=>n.Id==='c').Bounds));assert.match(r.ToSvg(),/>group<\/tspan>/);
});
test('Nested empty clusters receive valid packed bounds without exposing placeholder vertices',()=>{
  const r=LayoutGraph(new MsaglDrawingGraph(),{clusters:[{id:'outer'},{id:'inner',parentId:'outer'}]});
  assert.equal(r.Nodes.length,0);assert.equal(r.Positions.size,0);assert.equal(r.Edges.length,0);
  assert.ok(contains(r.Clusters[0].Bounds,r.Clusters[1].Bounds));assert.doesNotMatch(r.ToSvg(),/NaN|Infinity|__quikgraph_layout_empty/);
});
test('Serialized routed curve coordinates and exact SVG endpoints match native geometry after reflection',()=>{
  const r=LayoutGraph(fixture(),{routing:'StraightLine'}),edge=r.Edges[0];
  const native=[...r.EngineGraph.deepEdges][0];const geom=native.getAttr(0);
  // MSAGL's documented geometry attribute occupies slot 0.
  assert.equal(edge.Curve.type,'lineSegment');
  assert.deepEqual(edge.Curve.data.start,{x:geom.curve.start.x,y:-geom.curve.start.y});assert.deepEqual(edge.Curve.data.end,{x:geom.curve.end.x,y:-geom.curve.end.y});
  const path=edge.Path.match(/^M ([^ ]+) ([^ ]+) L ([^ ]+) ([^ ]+)$/);
  assert.ok(path);assert.ok(Math.abs(Number(path[1])-edge.Curve.data.start.x)<1e-5);assert.ok(Math.abs(Number(path[2])-edge.Curve.data.start.y)<1e-5);
  assert.ok(Math.abs(Number(path[3])-edge.Curve.data.end.x)<1e-5);assert.ok(Math.abs(Number(path[4])-edge.Curve.data.end.y)<1e-5);
});
test('Layout adapter preserves QuikGraph vertex and edge identity including custom equality',()=>{
  class Vertex {constructor(id){this.id=id;}Equals(other){return other instanceof Vertex&&other.id===this.id;}GetHashCode(){return this.id;}toString(){return String(this.id);}}
  const a=new Vertex(1),b=new Vertex(2),g=new AdjacencyGraph();g.AddVerticesAndEdge(new Edge(a,b));const edge=[...g.Edges][0];
  const r=LayoutGraph(g,{vertexLabel:v=>'Node '+v.id});assert.equal(r.Nodes[0].Vertex,a);assert.equal(r.Edges[0].Edge,edge);assert.deepEqual(r.Positions.get(new Vertex(1)),r.Positions.get(a));assert.equal(r.Nodes[0].Label.Text,'Node 1');
});
test('Ready-to-use engine executes through the existing drawing.Layout adapter API',()=>{
  const g=fixture(),engine=new MsaglLayoutEngine({direction:'LR'}),r=g.Layout(engine,{routing:'StraightLine'});assert.equal(r.Algorithm,'Sugiyama');assert.equal(r.Routing,'StraightLine');assert.ok(r.Positions.get('b').x>r.Positions.get('a').x);
});
test('Axis constraints enforce alignment, fixed centers and minimum center separations before rerouting',()=>{
  const constraints=[{type:'pin',axis:'x',node:'a',coordinate:10},{type:'pin',axis:'y',node:'a',coordinate:20},{type:'align',axis:'y',nodes:['a','b']},{type:'separate',axis:'x',before:'a',after:'b',gap:150}];
  const r=LayoutGraph(fixture(),{constraints,routing:'Rectilinear'});finiteResult(r);assert.deepEqual(r.Positions.get('a'),{x:10,y:20});assert.equal(r.Positions.get('b').y,20);assert.ok(r.Positions.get('b').x>=160-1e-6);assert.ok(r.Edges[0].Path.length>0);
});
test('Contradictory, unknown-node and invalid constraints fail without replacing a prior result',()=>{
  const g=fixture(),before=LayoutGraph(g);
  assert.throws(()=>LayoutGraph(g,{constraints:[{type:'pin',axis:'x',node:'a',coordinate:0},{type:'pin',axis:'x',node:'a',coordinate:1}]}),/inconsistent/);
  assert.equal(g.LayoutResult,before);
  assert.throws(()=>LayoutGraph(g,{constraints:[{type:'separate',axis:'x',before:'absent',after:'a',gap:1}]}),/unknown node/);
  assert.throws(()=>LayoutGraph(g,{constraints:[{type:'align',axis:'z',nodes:['a']}]}),/axis/);
});
test('Cancellation, repeated use and async layout preserve lifecycle guarantees',async()=>{
  const g=fixture(),engine=new MsaglLayoutEngine(),first=engine.Layout(g),controller=new AbortController(),error=new Error('stop');controller.abort(error);
  assert.throws(()=>engine.Layout(g,{signal:controller.signal}),e=>e===error);await assert.rejects(engine.LayoutAsync(g,{signal:controller.signal}),e=>e===error);assert.equal(g.LayoutResult,first);
  const second=await LayoutGraphAsync(g,{direction:'LR'});assert.notEqual(second,first);assert.notEqual(second.GeometryGraph,first.GeometryGraph);assert.deepEqual(first.ToJSON(),LayoutGraph(g).ToJSON());
  const pending=new AbortController(),promise=LayoutGraphAsync(g,{signal:pending.signal});pending.abort(error);await assert.rejects(promise,e=>e===error);
});
test('All supported node boundaries export finite exact SVG paths and closed geometry',()=>{
  for(const shape of ['Ellipse','Box','RoundedBox','Diamond','Triangle','Hexagon','Octagon','Parallelogram']) {
    const g=new MsaglDrawingGraph();g.AddNode(shape).Attr.Shape=shape;const r=LayoutGraph(g);finiteResult(r);
    const geom=[...r.GeometryGraph.nodesBreadthFirst][0];assert.equal(MsaglCurveToSvgPath(geom.boundaryCurve),r.Nodes[0].Path);
    assert.ok(geom.boundaryCurve.closed || geom.boundaryCurve.start.sub(geom.boundaryCurve.end).length<1e-6);
  }
});
test('Caller label metrics and sizing callbacks run once per node and bound the geometry',()=>{
  let calls=0;const r=LayoutGraph(fixture(),{nodeSize:()=>{calls++;return {width:120,height:50};},measureLabel:()=>({width:90,height:20})});assert.equal(calls,5);
  for(const n of r.Nodes){assert.equal(n.Bounds.width,120);assert.equal(n.Bounds.height,50);assert.equal(n.Label.Bounds.width,90);}
});
test('Empty and undirected graphs have explicit valid results',()=>{
  const empty=LayoutGraph(new MsaglDrawingGraph());assert.deepEqual(empty.Bounds,{x:0,y:0,width:0,height:0});assert.deepEqual(empty.Nodes,[]);assert.doesNotMatch(empty.ToSvg(),/NaN|Infinity/);
  const g=fixture();g.Directed=false;const r=LayoutGraph(g);assert.equal(r.Algorithm,'MDS');for(const e of r.Edges)assert.equal(e.TargetArrowhead,null);
});
test('Invalid layout inputs are rejected before native geometry is committed',()=>{
  assert.throws(()=>LayoutGraph(null),TypeError);
  for(const options of [{algorithm:'unknown'},{routing:'RectilinearToCenter'},{direction:'unknown'},{nodeWidth:0},{nodeHeight:Infinity},{nodeSeparation:-1},{aspectRatio:0},{fontSize:NaN},{nodeShape:()=>'<path>'}])assert.throws(()=>LayoutGraph(fixture(),options));
  for(const clusters of [[{id:'a',nodes:[]}],[{id:'x',parentId:'y'},{id:'y',parentId:'x'}],[{id:'x',nodes:['a']},{id:'y',nodes:['a']}],[{id:'x',nodes:['absent']}],[{id:'x',parentId:'absent'}]])assert.throws(()=>LayoutGraph(fixture(),{clusters}));
});
