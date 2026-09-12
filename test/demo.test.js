import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,execute} from '../examples/scenarios.js';
for(const scenario of scenarios)test(`showcase: ${scenario.label}`,()=>{
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
