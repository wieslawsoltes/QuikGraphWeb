// upstream: tests/QuikGraph.Data.Tests/DataRelationEdgeTests.cs::Construction
// upstream: tests/QuikGraph.Data.Tests/DataRelationEdgeTests.cs::Construction_Throws
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphPopulatorAlgorithmTests.cs::Construction
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphPopulatorAlgorithmTests.cs::Construction_Throws
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphPopulatorAlgorithmTests.cs::Compute
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphExtensionsTests.cs::ToGraph
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphExtensionsTests.cs::ToGraphviz
// upstream: tests/QuikGraph.Data.Tests/DataSetGraphvizAlgorithmTests.cs::Constructor
import test from 'node:test';import assert from 'node:assert/strict';
import { BidirectionalGraph } from '../src/core.js';
import {DataRelationEdge,DataSetGraph,DataSetGraphPopulatorAlgorithm,DataSetGraphvizAlgorithm,DataSetGraphExtensions}from '../src/data.js';
const fixture=()=>{const parent={TableName:'Parent',Columns:[{ColumnName:'Id',DataType:{Name:'Int32'},Unique:true}]},child={TableName:'Child',Columns:[{ColumnName:'ParentId',DataType:{Name:'Int32'}}]},relation={ParentTable:parent,ChildTable:child,RelationName:'Parent Child'};return {Tables:[parent,child],Relations:[relation]};};
// Source: QuikGraph.Data.Tests/DataRelationEdgeTests.cs
 test('DataRelationEdgeTests.Constructor',()=>{const data=fixture(),e=new DataRelationEdge(data.Relations[0]);assert.equal(e.Relation,data.Relations[0]);assert.equal(e.Source,data.Tables[0]);assert.equal(e.Target,data.Tables[1]);assert.throws(()=>new DataRelationEdge(null));});
// Source: DataSetGraphPopulatorAlgorithmTests.cs
 test('DataSetGraphPopulatorAlgorithmTests.Compute',()=>{const data=fixture(),graph=new BidirectionalGraph(),a=new DataSetGraphPopulatorAlgorithm(graph,data);assert.equal(a.VisitedGraph,graph);assert.equal(a.DataSet,data);a.Compute();assert.equal(graph.VertexCount,2);assert.equal(graph.EdgeCount,1);assert.equal(graph.OutEdges(data.Tables[0])[0].Target,data.Tables[1]);assert.equal(a.State,3);});
 test('DataSetGraphPopulatorAlgorithmTests.Constructor_Throws',()=>{assert.throws(()=>new DataSetGraph(null));assert.throws(()=>new DataSetGraphPopulatorAlgorithm(null,fixture()));assert.throws(()=>new DataSetGraphPopulatorAlgorithm(new BidirectionalGraph(),null));});
// Source: DataSetGraphExtensionsTests.cs and DataSetGraphvizAlgorithmTests.cs
 test('DataSetGraphExtensionsTests.ToGraph / ToGraphviz',()=>{const data=fixture(),g=DataSetGraphExtensions.ToGraph(data);assert.equal(g.DataSet,data);const dot=DataSetGraphExtensions.ToGraphviz(g);assert.match(dot,/shape=record/);assert.match(dot,/Parent/);assert.match(dot,/unique/);assert.match(dot,/0 -> 1 \[label="Parent Child"\]/);assert.equal(new DataSetGraphvizAlgorithm(g).Generate(),dot);});
