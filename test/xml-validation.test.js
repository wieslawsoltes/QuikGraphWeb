import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import * as engine from 'libxml2-wasm';
import { AdjacencyGraph, Edge } from '../src/core.js';
import { GraphMLDeserializer } from '../src/serialization.js';
import { CreateGraphMLSchemaValidator, GraphMLSchemaValidator, GraphMLValidationError, ValidateGraphMLSchema, DeserializeAndValidateGraphML } from '../src/xml-validation.js';

const wrap = (body, attributes = '') => `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" ${attributes}>${body}</graphml>`;
const graph = (attributes = '', nodes = '<node id="a"/><node id="b"/><edge id="e" source="a" target="b"/>') => wrap(`<graph id="G" edgedefault="directed" ${attributes}>${nodes}</graph>`);
const simple = () => { const g = new AdjacencyGraph(); g.AddVerticesAndEdge(new Edge('a', 'b')); return g; };

test('Compiled native GraphML XSD validates plain, byte and synchronous reader inputs', async () => {
  const validator = await CreateGraphMLSchemaValidator();
  try {
    const xml = validator.Serialize(simple(), {vertexIdentity: String});
    for (const input of [xml, new TextEncoder().encode(xml), new TextEncoder().encode(xml).buffer, {ReadToEnd:()=>xml}, {documentElement:{outerHTML:xml}}]) assert.equal(validator.Validate(input).IsValid, true);
    assert.equal(validator.SchemaNamespace, 'http://graphml.graphdrawing.org/xmlns');
    assert.equal(validator.SchemaVersion, '1.1');
    assert.deepEqual(validator.Deserialize(xml).Vertices, ['a', 'b']);
  } finally { validator.Dispose(); }
});

for (const [name, xml, expected] of [
  ['negative parse count', graph('parse.nodes="-1"'), /parse.nodes/],
  ['fractional edge count', graph('parse.edges="1.5"'), /parse.edges/],
  ['invalid order enumeration', graph('parse.order="sorted"'), /parse.order/],
  ['unknown attribute', graph('unknown="true"'), /unknown.*not allowed/],
  ['invalid node id token', graph('', '<node id="a b"/>'), /NMTOKEN/],
  ['duplicate node identities', graph('', '<node id="a"/><node id="a"/>'), /Duplicate key-sequence/],
  ['unresolved target key reference', graph('', '<node id="a"/><edge source="a" target="missing"/>'), /keyref/],
  ['required source attribute', graph('', '<node id="a"/><edge target="a"/>'), /source.*required/],
  ['invalid edge boolean', graph('', '<node id="a"/><edge source="a" target="a" directed="yes"/>'), /boolean/],
  ['invalid node degree', graph('', '<node id="a" parse.indegree="-1"/>'), /parse.indegree/],
  ['key after graph', wrap('<graph edgedefault="directed"/><key id="late"/>'), /key.*not expected/],
  ['unknown root child', wrap('<unknown/>'), /unknown.*not expected/],
  ['wrong namespace', '<graphml xmlns="urn:other"><graph edgedefault="directed"/></graphml>', /No matching global declaration/],
  ['malformed XML', '<graphml><graph></graphml>', /mismatch|Premature end/],
]) test(`Native GraphML XSD rejects ${name}`, async () => {
  const validator = await CreateGraphMLSchemaValidator();
  try {
    const result = validator.Validate(xml, {filename:'invalid.graphml'});
    assert.equal(result.IsValid, false);
    assert.ok(result.Errors.length);
    assert.match(result.Errors.map(e=>e.Message).join('\n'), expected);
    assert.ok(result.Errors.every(e=>e.FileName==='invalid.graphml' && e.LineNumber>0));
    assert.throws(()=>validator.ValidateAndThrow(xml), GraphMLValidationError);
  } finally { validator.Dispose(); }
});

test('Native schema catches constraints the structural GraphML deserializer accepts', async () => {
  const xml = graph('parse.nodes="-1" unexpected="present"');
  assert.equal(new GraphMLDeserializer().Deserialize(xml).EdgeCount, 1);
  const result = await ValidateGraphMLSchema(xml);
  assert.equal(result.IsValid, false);
  assert.ok(result.Errors.some(error=>error.Message.includes('parse.nodes')));
  assert.ok(result.Errors.some(error=>error.Message.includes('unexpected')));
});

test('Schema errors retain filename, line, column, path and immutable detail records', async () => {
  const xml = wrap('\n  <graph edgedefault="directed" parse.edges="-1"/>\n');
  const result = await ValidateGraphMLSchema(xml, {filename:'input.graphml'});
  assert.equal(result.Errors[0].LineNumber, 2);
  assert.equal(result.Errors[0].ColumnNumber, 0); // libxml2 does not supply an XSD attribute column.
  assert.equal(result.Errors[0].Path, '/*/*');
  assert.equal(result.Errors[0].Severity, 'error');
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.Errors)); assert.ok(Object.isFrozen(result.Errors[0]));
  const syntax = await ValidateGraphMLSchema('<graphml>\n  </wrong>', {filename:'malformed.graphml'});
  assert.ok(syntax.Errors.some(error=>error.ColumnNumber>0));
});

test('Validation failure happens before graph mutations, factory calls and output writes', async () => {
  const validator = await CreateGraphMLSchemaValidator();
  try {
    const destination = new AdjacencyGraph(); destination.AddVertex('keep');
    let factories = 0, writes = 0;
    assert.throws(()=>validator.Deserialize(graph('parse.nodes="-1"'), {graph:destination, vertexFactory:()=>{factories++;}}), GraphMLValidationError);
    assert.deepEqual(destination.Vertices,['keep']); assert.equal(factories,0);
    assert.throws(()=>validator.Serialize(simple(), {vertexIdentity:vertex=> vertex+' illegal id', writer:()=>writes++}), GraphMLValidationError);
    assert.equal(writes,0);
    validator.Serialize(simple(), {writer:xml=>{writes++;assert.match(xml,/graphml/);}});assert.equal(writes,1);
    let reads=0;
    const copy=validator.Deserialize({ReadToEnd(){reads++;return graph();}});
    assert.equal(reads,1);assert.equal(copy.EdgeCount,1);
  } finally { validator.Dispose(); }
});

test('One-shot async convenience validates before deserializing and releases native objects', async () => {
  const copied=await DeserializeAndValidateGraphML(graph());assert.equal(copied.EdgeCount,1);
  await assert.rejects(DeserializeAndValidateGraphML(graph('parse.order="unknown"')),GraphMLValidationError);
});

test('GraphML XSD validates ports, nested graphs and hyperedges independently of flat graph conversion', async () => {
  const xml=wrap('<graph id="G" edgedefault="directed"><node id="a"><port name="p"/><graph id="inner" edgedefault="undirected"><node id="b"/></graph></node><node id="c"/><hyperedge id="h"><endpoint node="a" port="p"/><endpoint node="c"/></hyperedge></graph>');
  const v=await CreateGraphMLSchemaValidator();
  try { assert.equal(v.Validate(xml).IsValid,true); assert.throws(()=>v.Deserialize(xml),/Nested graphs, hyperedges and ports/); }
  finally { v.Dispose(); }
});

test('Canonical GraphML XSD data content is separate from QuikGraph property conversion', async () => {
  // GraphML XSD permits opaque data: attr.type is metadata, not a dynamically selected XML type.
  const xml=wrap('<key id="k" for="node" attr.name="count" attr.type="int"/><graph edgedefault="directed"><node id="a"><data key="k">not an integer</data></node></graph>');
  const v=await CreateGraphMLSchemaValidator();
  try { assert.equal(v.Validate(xml).IsValid,true);assert.throws(()=>v.Deserialize(xml),/Invalid GraphML int/); }
  finally { v.Dispose(); }
});

test('WASM validation never fetches xsi locations, external DTDs or entity payloads', async () => {
  const originalFetch=globalThis.fetch;let fetches=0;
  const v=await CreateGraphMLSchemaValidator();
  globalThis.fetch=()=>{fetches++;throw new Error('Network access forbidden by test');};
  try {
    const xml=wrap('<graph edgedefault="directed"/>','xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns https://unreachable.invalid/schema.xsd"');
    assert.equal(v.Validate(xml).IsValid,true);
    assert.equal(v.Validate('<!DOCTYPE graphml SYSTEM "https://unreachable.invalid/graphml.dtd">'+graph()).IsValid,true);
    const entity='<!DOCTYPE graphml [<!ENTITY forbidden SYSTEM "file:///unreadable">]>'+wrap('<desc>&forbidden;</desc><graph edgedefault="directed"/>');
    assert.equal(v.Validate(entity).IsValid,false);
    assert.equal(fetches,0);
  } finally { globalThis.fetch=originalFetch;v.Dispose(); }
});

test('Explicit Dispose releases every native schema/document allocation on success and failure', async () => {
  engine.diag.configure({enabled:true});
  try {
    for(let i=0;i<30;i++) {
      const v=await CreateGraphMLSchemaValidator();
      assert.equal(v.Validate(graph()).IsValid,true);
      assert.equal(v.Validate('<graphml>').IsValid,false);
      assert.equal(v.Validate(graph('parse.nodes="-1"')).IsValid,false);
      v.Dispose();v.Dispose();v.dispose();
      assert.equal(v.IsDisposed,true);
      assert.throws(()=>v.Validate(graph()),/disposed/);
      assert.throws(()=>v.Deserialize(graph()),/disposed/);
      assert.throws(()=>v.Serialize(simple()),/disposed/);
    }
    assert.deepEqual(engine.diag.report(),{});
  } finally { engine.diag.configure({enabled:false}); }
});

test('Independent validators remain usable after another validator is disposed', async () => {
  const [a,b]=await Promise.all([CreateGraphMLSchemaValidator(),CreateGraphMLSchemaValidator()]);
  a.Dispose();try { assert.equal(b.Validate(graph()).IsValid,true); } finally { b.Dispose(); }
});

test('Input and loader mistakes reject explicitly instead of reporting valid XML',async()=>{
  assert.throws(()=>new GraphMLSchemaValidator(),/CreateGraphMLSchemaValidator/);
  await assert.rejects(CreateGraphMLSchemaValidator(null),TypeError);
  await assert.rejects(CreateGraphMLSchemaValidator({engineLoader:1}),TypeError);
  await assert.rejects(CreateGraphMLSchemaValidator({engineLoader:async()=>({})}),/XmlDocument/);
  const v=await CreateGraphMLSchemaValidator({engineLoader:async()=>engine});
  try {for(const bad of[null,42,{},new Uint8Array([255])])assert.throws(()=>v.Validate(bad),TypeError);}
  finally{v.Dispose();}
});

test('Native GraphML XSD validates normalized original graph corpus with exact graph counts',async()=>{
  const directory=new URL('./fixtures/GraphML/',import.meta.url);
  const files=(await readdir(directory)).filter(name=>/^g\..*\.graphml$/.test(name)).sort();
  assert.equal(files.length,1277);
  const validator=await CreateGraphMLSchemaValidator();
  try {
    for(const name of files) {
      // The original corpus uses pre-XSD GraphML without a namespace/edgedefault.
      // Preserve topology through the explicit existing legacy reader, then validate its strict serialization.
      const original=new GraphMLDeserializer({allowLegacy:true}).Deserialize(await readFile(new URL(name,directory),'utf8'));
      const xml=validator.Serialize(original);
      const copy=validator.Deserialize(xml);
      assert.equal(copy.VertexCount,original.VertexCount,name);
      assert.equal(copy.EdgeCount,original.EdgeCount,name);
      assert.equal(copy.IsDirected,original.IsDirected,name);
    }
  }finally{validator.Dispose();}
});

test('Compiled GraphML validation runs in an isolated worker without DOM globals',async()=>{
  const url=new URL('../src/xml-validation.js',import.meta.url).href;
  const script=`const { parentPort } = await import('node:worker_threads');const { CreateGraphMLSchemaValidator } = await import(${JSON.stringify(url)});const v=await CreateGraphMLSchemaValidator();try{parentPort.postMessage({valid:v.Validate(${JSON.stringify(graph())}).IsValid,invalid:v.Validate(${JSON.stringify(graph('parse.edges="-1"'))}).IsValid,dom:typeof document});}finally{v.Dispose();}`;
  const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(script)),{type:'module'});
  try {
    const result=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code)reject(new Error(`Worker exit ${code}`));});});
    assert.deepEqual(result,{valid:true,invalid:false,dom:'undefined'});
  }finally{await worker.terminate();}
});
