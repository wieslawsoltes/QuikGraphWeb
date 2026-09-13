import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { AdjacencyGraph, Edge } from '../src/core.js';
import { DeserializeAndValidateFromGraphML, GraphMLExtensions } from '../src/serialization.js';
import { CreateGraphMLSchemaValidator } from '../src/xml-validation.js';

const xml = '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="title" for="graph" attr.name="Title" attr.type="string"/><graph edgedefault="directed"><data key="title">replaced</data><node id="a"/><node id="b"/><edge id="e" source="a" target="b"/></graph></graphml>';
function setup(validateSchema) {
  const graph = new AdjacencyGraph(); graph.Title = 'original'; graph.AddVertex('keep');
  const trace = [];
  graph.VertexAdded.add(()=>trace.push('added'));
  return {
    graph, trace,
    read: input=>DeserializeAndValidateFromGraphML(graph,input??xml,id=>{trace.push('vertex');return id;},(s,t)=>{trace.push('edge');return new Edge(s,t);},{validateSchema}),
    unchanged(){assert.deepEqual(graph.Vertices,['keep']);assert.equal(graph.EdgeCount,0);assert.equal(graph.Title,'original');assert.deepEqual(trace,[]);},
  };
}

for(const result of[false,{IsValid:false},{IsValid:false,Errors:[{Message:'schema rejected'}]}])test(`Synchronous schema callback rejection prevents factories and graph/property mutation: ${JSON.stringify(result)}`,()=>{
  const state=setup(()=>result);
  assert.throws(()=>state.read(),error=>error instanceof SyntaxError&&error.message==='GraphML schema validation failed'&&(!result?.Errors||error.Errors===result.Errors));
  state.unchanged();
});

test('Thrown validation errors preserve their identity and leave the destination unchanged',()=>{
  const rejection=new Error('Specific schema diagnostic'),state=setup(()=>{throw rejection;});
  assert.throws(()=>state.read(),error=>error===rejection);state.unchanged();
});

test('Promise-returning callbacks reject synchronously without an unhandled asynchronous rejection',async()=>{
  for(const validate of[()=>Promise.resolve(false),async()=>({IsValid:true}),async()=>{throw new Error('Async schema failed');}]) {
    const state=setup(validate);
    assert.throws(()=>state.read(),/Promise or thenable.*DeserializeAndValidateGraphML/);
    state.unchanged();
  }
  await setImmediate();
});

test('Plain thenables are rejected without invoking their continuation',()=>{
  let invocations=0;
  const state=setup(()=>({then(){invocations++;}}));
  assert.throws(()=>state.read(),/Promise or thenable/);
  assert.equal(invocations,0);state.unchanged();
});

test('A throwing then accessor cannot advance deserialization',()=>{
  const failure=new Error('bad then accessor'),state=setup(()=>({get then(){throw failure;}}));
  assert.throws(()=>state.read(),error=>error===failure);state.unchanged();
});

for(const result of[undefined,null,true,{IsValid:true}])test(`Void/positive schema results preserve callback compatibility: ${JSON.stringify(result)}`,()=>{
  let validations=0;
  const state=setup(text=>{validations++;assert.equal(text,xml);assert.deepEqual(state.trace,[]);return result;});
  assert.equal(state.read(),state.graph);
  assert.equal(validations,1);assert.deepEqual(state.graph.Vertices,['keep','a','b']);assert.equal(state.graph.EdgeCount,1);assert.equal(state.graph.Title,'replaced');
});

test('Stateful readers are consumed once and the exact validated text is deserialized',()=>{
  let reads=0,validated;
  const state=setup(text=>{validated=text;return true;});
  state.read({ReadToEnd(){reads++;return reads===1?xml:'';}});
  assert.equal(reads,1);assert.equal(validated,xml);assert.equal(state.graph.EdgeCount,1);
});

test('Missing callback preserves structural conversion and nonfunction callbacks are errors',()=>{
  for(const absent of[null,undefined]){const state=setup(absent);state.read();assert.equal(state.graph.EdgeCount,1);}
  for(const invalid of[false,true,{},'schema']){const state=setup(invalid);assert.throws(()=>state.read(),/validateSchema must be/);state.unchanged();}
});

test('Native XSD result callback rejects schema-invalid XML before the legacy API mutates a graph',async()=>{
  const validator=await CreateGraphMLSchemaValidator();
  try {
    const state=setup(text=>validator.Validate(text));
    assert.throws(()=>state.read(xml.replace('edgedefault="directed"','edgedefault="directed" parse.nodes="-1"')),error=>error instanceof SyntaxError&&error.Errors.some(d=>d.Message.includes('parse.nodes')));
    state.unchanged();
    const copy=new AdjacencyGraph();
    assert.equal(GraphMLExtensions.DeserializeAndValidateFromGraphML(copy,xml,undefined,undefined,{validateSchema:text=>validator.ValidateAndThrow(text)}),copy);
    assert.equal(copy.EdgeCount,1);
  }finally{validator.Dispose();}
});

test('Validation callback retains its options receiver',()=>{
  const destination=new AdjacencyGraph();
  const options={marker:'original callback context',validateSchema(text){assert.equal(this,options);assert.equal(this.marker,'original callback context');assert.equal(text,xml);return true;}};
  DeserializeAndValidateFromGraphML(destination,xml,undefined,undefined,options);
  assert.equal(destination.EdgeCount,1);
});
