import test from 'node:test';
import assert from 'node:assert/strict';
import { BidirectionalGraph, TaggedEdge, QuikGraphViewer, defineQuikGraphViewer } from '../src/index.js';

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
  viewer._viewport={width:800,height:480}; viewer._scale=1.5; viewer._pan={x:100,y:-50};
  Object.defineProperty(viewer,'clientWidth',{value:400,configurable:true});
  viewer._resizeViewport();
  assert.equal(viewer._scale,.75); assert.deepEqual(viewer._pan,{x:50,y:-25});
  viewer._resizeViewport();
  assert.equal(viewer._scale,.75); assert.deepEqual(viewer._pan,{x:50,y:-25});
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
