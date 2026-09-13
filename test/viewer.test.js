import test from 'node:test';
import assert from 'node:assert/strict';
import { BidirectionalGraph, TaggedEdge, EquatableEdge, QuikGraphViewer, defineQuikGraphViewer } from '../src/index.js';

test('Viewer renders copied equatable endpoints and retains canonical vertex positions', () => {
  class Vertex {
    constructor(id) { this.id = id; }
    Equals(other) { return other instanceof Vertex && other.id === this.id; }
    GetHashCode() { return 1; } // Deliberate collisions exercise equality checks.
    toString() { return this.id; }
  }
  const graph = new BidirectionalGraph(), a = new Vertex('a'), b = new Vertex('b');
  graph.AddVertexRange([a, b]);
  graph.AddEdge(new TaggedEdge(new Vertex('a'), new Vertex('b'), 'copied'));
  graph.AddEdge(new TaggedEdge(new Vertex('a'), new Vertex('a'), 'loop'));
  const viewer = new QuikGraphViewer(); viewer.Graph = graph;
  viewer.VertexColors.set(new Vertex('a'), '#123456');
  const svg = viewer.ToSvg();
  assert.equal(viewer.Positions.size, 2);
  assert.equal(viewer.Positions.get(new Vertex('a')), viewer.Positions.get(a));
  assert.equal([...svg.matchAll(/<circle /g)].length, 2);
  assert.equal([...svg.matchAll(/<path d="M[^\"]+" fill="none"/g)].length, 2);
  assert.match(svg, /copied/); assert.match(svg, /loop/); assert.match(svg, /fill="#123456"/);
  graph.RemoveVertex(new Vertex('b')); viewer.ToSvg();
  assert.equal(viewer.Positions.size, 1);
});

test('Viewer resizing preserves relative camera framing', () => {
  const viewer = new QuikGraphViewer();
  Object.defineProperties(viewer, {clientWidth:{value:800,configurable:true},clientHeight:{value:480,configurable:true}});
  viewer.Positions.set('left',{x:-300,y:-100});viewer.Positions.set('right',{x:300,y:100});
  viewer._viewport={width:800,height:480}; viewer._scale=1.5; viewer._pan={x:100,y:-50};
  Object.defineProperty(viewer,'clientWidth',{value:400,configurable:true});
  viewer._resizeViewport();
  const factor=(300/600)/(700/600);
  assert.equal(viewer._scale,1.5*factor); assert.deepEqual(viewer._pan,{x:100*factor,y:-50*factor});
  viewer._resizeViewport();
  assert.equal(viewer._scale,1.5*factor); assert.deepEqual(viewer._pan,{x:100*factor,y:-50*factor});
});

test('Viewer supports multiple tag names and preserves an existing registration', () => {
  const original = globalThis.customElements, registry = new Map();
  globalThis.customElements = {
    get: name => registry.get(name),
    define(name, constructor) {
      assert(!registry.has(name));
      assert(![...registry.values()].includes(constructor), 'browser registries reject repeated constructors');
      registry.set(name, constructor);
    }
  };
  try {
    const first = defineQuikGraphViewer('graph-one'), second = defineQuikGraphViewer('graph-two');
    assert.notEqual(first, second);
    assert(new first() instanceof QuikGraphViewer);
    assert(new second() instanceof QuikGraphViewer);
    assert.equal(defineQuikGraphViewer(), QuikGraphViewer);
    assert.equal(defineQuikGraphViewer('graph-one'), first);
  } finally {
    if (original === undefined) delete globalThis.customElements;
    else globalThis.customElements = original;
  }
});

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const sampleGraph=()=>{const graph=new BidirectionalGraph();graph.AddVerticesAndEdge(new TaggedEdge('a','b',7));return graph;};

test('Async viewer layouts apply canonical coordinates and exact routed geometry atomically', async()=>{
  const viewer=new QuikGraphViewer(),graph=sampleGraph();viewer.Graph=graph;const edge=[...graph.Edges][0];
  const result={Positions:new Map([['a',{x:1,y:2}],['b',{x:30,y:40}]]),Edges:[{Edge:edge,Path:'M1 2 C8 5 20 9 30 40',TargetArrowhead:{Tip:{x:30,y:40},Base:{x:30,y:30},Width:8},Label:{Center:{x:18,y:19}}}],Bounds:{x:0,y:0,width:60,height:80}};
  const events=[];viewer.dispatchEvent=e=>{events.push(e);return true;};
  assert.equal(await viewer.LayoutAsync({LayoutAsync:async(g,o)=>{assert.equal(g,graph);assert.equal(o.signal.aborted,false);return result;}}),result);
  assert.deepEqual([...viewer.Positions],[['a',{x:1,y:2}],['b',{x:30,y:40}]]);assert.notEqual(viewer.Positions.get('a'),result.Positions.get('a'));
  assert.match(viewer.ToSvg(),/M1 2 C8 5 20 9 30 40/);assert.match(viewer.ToSvg(),/<polygon points="30,40 26,30 34,30"/);assert.match(viewer.ToSvg(),/x="18" y="19"/);
  assert.equal(events.at(-1).type,'graph-layout-change');assert.equal(events.at(-1).detail.result,result);
  viewer.Layout('grid');assert.doesNotMatch(viewer.ToSvg(),/M1 2 C8 5 20 9 30 40/);
});

test('Graph changes and later async layouts prevent stale geometry from replacing current positions',async()=>{
  const viewer=new QuikGraphViewer();viewer.Graph=sampleGraph();const first=deferred(),second=deferred();
  const old=viewer.LayoutAsync(()=>first.promise);const oldRejection=assert.rejects(old,{name:'AbortError'});
  const next=viewer.LayoutAsync(()=>second.promise);second.resolve(new Map([['a',{x:40,y:50}],['b',{x:60,y:70}]]));await next;await oldRejection;
  first.resolve(new Map([['a',{x:-9,y:-9}],['b',{x:-8,y:-8}]]));await Promise.resolve();assert.equal(viewer.Positions.get('a').x,40);
  const delayed=deferred(),pending=viewer.LayoutAsync(()=>delayed.promise),rejected=assert.rejects(pending,{name:'AbortError'});viewer.Graph.AddVertex('c');await rejected;
  delayed.resolve(new Map([['a',{x:0,y:0}],['b',{x:0,y:0}]]));assert.equal(viewer.Positions.get('a').x,40);
});

test('Native node boundaries and nested cluster geometry share layout coordinates and SVG bounds',async()=>{
 const viewer=new QuikGraphViewer();viewer.Graph=sampleGraph();const outer='M-500 -300 L500 -300 L500 300 L-500 300 Z',inner='M-100 -100 L100 -100 L100 100 L-100 100 Z',node='M-80 -20 L80 -20 L80 20 L-80 20 Z';
 await viewer.LayoutAsync(()=>({Positions:new Map([['a',{x:0,y:0}],['b',{x:100,y:50}]]),Nodes:[{Vertex:'a',Path:node,Bounds:{x:-80,y:-20,width:160,height:40}}],Clusters:[{Path:inner,Bounds:{x:-100,y:-100,width:200,height:200},Label:{Text:'inner',Center:{x:0,y:-90}}},{Path:outer,Bounds:{x:-500,y:-300,width:1000,height:600},Label:{Text:'outer',Center:{x:0,y:-290}}}],Bounds:{x:-500,y:-300,width:1000,height:600}}));
 const svg=viewer.ToSvg();assert(svg.includes(node));assert(svg.indexOf(outer)<svg.indexOf(inner));assert(svg.indexOf(inner)<svg.indexOf(node));assert.match(svg,/viewBox="-530 -330 1060 660"/);assert.equal(viewer._scale,380/600);
 const point={x:400+viewer._pan.x+70*viewer._scale,y:240+viewer._pan.y};assert.equal(viewer._hit(point),'a','Wide native node bounds remain interactive beyond the old circle radius');
 viewer.SelectVertex('a');viewer._canvasKey({key:'ArrowDown',shiftKey:true,preventDefault(){}});assert.doesNotMatch(viewer.ToSvg(),/M-80 -20 L80 -20/);
});

test('Malformed and aborted layout results retain previous geometry',async()=>{
  const viewer=new QuikGraphViewer();viewer.Graph=sampleGraph();const before=[...viewer.Positions];
  await assert.rejects(viewer.LayoutAsync(()=>new Map([['a',{x:0,y:0}],['b',{x:NaN,y:5}]])),/finite x and y/);assert.deepEqual([...viewer.Positions],before);
  await assert.rejects(viewer.LayoutAsync(()=>({Positions:[]})),/every vertex/);assert.deepEqual([...viewer.Positions],before);
  const controller=new AbortController();controller.abort();let called=false;await assert.rejects(viewer.LayoutAsync(()=>{called=true;return new Map();},{signal:controller.signal}),{name:'AbortError'});assert.equal(called,false);
  const running=new AbortController(),never=viewer.LayoutAsync(()=>new Promise(()=>{}),{signal:running.signal}),rejected=assert.rejects(never,{name:'AbortError'});running.abort();await rejected;
  await assert.rejects(viewer.LayoutAsync({}),/Layout requires/);
});

test('Keyboard navigation, movement, deletion and selection work with zero and NaN vertices',()=>{
  const viewer=new QuikGraphViewer(),graph=new BidirectionalGraph();graph.AddVerticesAndEdge(new TaggedEdge(0,NaN,3));viewer.Graph=graph;const events=[];viewer.dispatchEvent=e=>{events.push(e);return true;};
  const key=(key,modifiers={})=>{let prevented=false;viewer._canvasKey({key,...modifiers,preventDefault(){prevented=true;}});assert.equal(prevented,true);};
  key('ArrowRight');assert.equal(viewer._selected,0);key('ArrowRight');assert(Number.isNaN(viewer._selected));const before={...viewer.Positions.get(NaN)};key('ArrowRight',{shiftKey:true});assert(viewer.Positions.get(NaN).x>before.x);assert.equal(events.at(-1).type,'graph-layout-change');
  key('Delete');assert.equal(events.at(-1).type,'graph-delete-vertex');assert(Number.isNaN(events.at(-1).detail.vertex));key('Home');assert.equal(viewer._selected,0);key('End');assert(Number.isNaN(viewer._selected));
  const pan=viewer._pan.x;key('ArrowRight',{ctrlKey:true});assert.equal(viewer._pan.x,pan+30);
  assert.throws(()=>viewer.SelectVertex('missing'),RangeError);viewer.SelectEdge([...graph.Edges][0]);assert.equal(events.at(-1).type,'graph-select-edge');assert.equal(viewer._selected,null);assert.throws(()=>viewer.SelectEdge(new TaggedEdge(0,NaN,3)),RangeError);
});

test('Graph inspection indexes vertex degrees, edges and filters without materializing all DOM entries',()=>{
  const viewer=new QuikGraphViewer(),graph=new BidirectionalGraph();graph.AddVertexRange(Array.from({length:10000},(_,i)=>`v${i}`));graph.AddEdge(new TaggedEdge('v0','v1','weight 7'));graph.AddEdge(new TaggedEdge('v0','v0','loop'));viewer.Graph=graph;
  assert.equal(viewer._inspectionItems().length,10000);assert.equal(viewer._itemDescription('v0'),'v0; 1 incoming, 2 outgoing');
  viewer._inspectionMode='edges';viewer._inspectionFiltered=null;assert.equal(viewer._inspectionItems().length,2);assert.equal(viewer._itemDescription([...graph.Edges][0]),'v0 to v1, weight 7');
  viewer._inspectionQuery='loop';viewer._inspectionFiltered=null;assert.equal(viewer._inspectionItems().length,1);graph.RemoveEdge([...graph.Edges][1]);assert.equal(viewer._inspectionItems().length,0);
});

test('Edge inspection canonicalizes custom-equatable edge copies',()=>{
 const graph=new BidirectionalGraph(),edge=new EquatableEdge('a','b'),viewer=new QuikGraphViewer();graph.AddVerticesAndEdge(edge);viewer.Graph=graph;const events=[];viewer.dispatchEvent=event=>events.push(event);viewer.SelectEdge(new EquatableEdge('a','b'));assert.equal(viewer._selectedEdge,edge);assert.equal(events[0].detail.edge,edge);
});
