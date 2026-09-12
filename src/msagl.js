import { EqualityMap as Map, EqualitySet as Set } from './equality.js';
/** MSAGL drawing bridge. The drawing data model is portable; layout requires an injected engine. */
import { EventHook } from './core.js';
import { AlgorithmBase } from './algorithm-base.js';
const required=(v,name='value')=>{if(v==null)throw new TypeError(`${name} cannot be null`);return v;};
export class MsaglNode { constructor(id){this.Id=String(required(id,'id'));this.LabelText=this.Id;this.Attr={Shape:'Ellipse'};this.UserData=null;} }
export class MsaglEdge { constructor(source,target){this.Source=source;this.Target=target;this.Attr={};this.LabelText='';this.UserData=null;} }
export class MsaglDrawingGraph {
  constructor(id=''){this.Id=id;this.Directed=true;this._nodes=new Map();this._edges=[];this.Attr={};}
  get Nodes(){return this._nodes.values();}get Edges(){return this._edges.values();}get NodeCount(){return this._nodes.size;}get EdgeCount(){return this._edges.length;}
  AddNode(id){id=String(required(id,'id'));if(!this._nodes.has(id))this._nodes.set(id,new MsaglNode(id));return this._nodes.get(id);}
  FindNode(id){return this._nodes.get(String(id));}
  AddEdge(source,target){const s=this.AddNode(source),t=this.AddNode(target),e=new MsaglEdge(s.Id,t.Id);this._edges.push(e);return e;}
  /** adapter implements Layout(drawingGraph, options), returning geometry or a Promise. */
  Layout(adapter,options={}){if(!adapter||typeof adapter.Layout!=='function')throw new TypeError('MSAGL layout requires an adapter implementing Layout(graph, options)');return adapter.Layout(this,options);}
}
export class MsaglVertexEventArgs {constructor(vertex,node){this.Vertex=required(vertex,'vertex');this.Node=required(node,'node');}}
export class MsaglEdgeEventArgs {constructor(edge,msaglEdge){this.Edge=required(edge,'edge');this.MsaglEdge=required(msaglEdge,'msaglEdge');}}
export class MsaglGraphPopulator extends AlgorithmBase {
  constructor(graph,graphFactory=()=>new MsaglDrawingGraph()){super(graph);this.GraphFactory=graphFactory;this.MsaglGraph=null;this.NodeAdded=new EventHook();this.EdgeAdded=new EventHook();}
  OnNodeAdded(args){this.NodeAdded.emit(this,args);}OnEdgeAdded(args){this.EdgeAdded.emit(this,args);}
  InternalCompute(){this.MsaglGraph=this.GraphFactory();this.MsaglGraph.Directed=this.VisitedGraph.IsDirected;for(const vertex of this.VisitedGraph.Vertices){this.ThrowIfCancellationRequested();const node=this.AddNode(vertex);node.UserData=vertex;this.OnNodeAdded(new MsaglVertexEventArgs(vertex,node));}for(const edge of this.VisitedGraph.Edges){this.ThrowIfCancellationRequested();const msaglEdge=this.AddEdge(edge);msaglEdge.UserData=edge;this.OnEdgeAdded(new MsaglEdgeEventArgs(edge,msaglEdge));}}
  AddNode(){throw new Error('Override AddNode in a graph populator');}AddEdge(){throw new Error('Override AddEdge in a graph populator');}
}
export class MsaglDefaultGraphPopulator extends MsaglGraphPopulator {
  Initialize(){this._verticesIds=new Map();}
  Clean(){this._verticesIds=null;}
  GetVertexId(){return String(this._verticesIds.size);}GetVertexLabel(id,vertex){return `${id}: ${vertex}`;}
  AddNode(vertex){required(vertex,'vertex');const id=String(this.GetVertexId(vertex));this._verticesIds.set(vertex,id);const node=this.MsaglGraph.AddNode(id);node.Attr.Shape='Box';node.LabelText=this.GetVertexLabel(id,vertex);return node;}
  AddEdge(edge){required(edge,'edge');return this.MsaglGraph.AddEdge(this._verticesIds.get(edge.Source),this._verticesIds.get(edge.Target));}
}
export class MsaglIdentifiableGraphPopulator extends MsaglGraphPopulator {
  constructor(graph,vertexIdentity,graphFactory){super(graph,graphFactory);this.VertexIdentity=required(vertexIdentity,'vertexIdentity');}
  AddNode(vertex){return this.MsaglGraph.AddNode(this.VertexIdentity(vertex));}AddEdge(edge){return this.MsaglGraph.AddEdge(this.VertexIdentity(edge.Source),this.VertexIdentity(edge.Target));}
}
export class MsaglToStringGraphPopulator extends MsaglDefaultGraphPopulator {
  constructor(graph,format=null,formatProvider=null,graphFactory){super(graph,graphFactory);this.Format=format??'{0}';this.FormatProvider=formatProvider;}
  FormatValue(vertex,specifier){const provider=this.FormatProvider;if(typeof provider==='function')return provider(vertex,specifier);const formatter=provider?.GetFormat?.('ICustomFormatter');return formatter?.Format?formatter.Format(specifier,vertex,provider):String(vertex);}
  GetVertexId(vertex){return this.Format.replace(/\{0(?::([^}]+))?\}/g,(_,specifier)=>this.FormatValue(vertex,specifier));}
}
export function CreateMsaglPopulator(graph,formatOrIdentity,formatProvider){if(arguments.length>1)required(formatOrIdentity,'formatOrIdentity');return typeof formatOrIdentity==='function'?new MsaglIdentifiableGraphPopulator(graph,formatOrIdentity):arguments.length>1?new MsaglToStringGraphPopulator(graph,formatOrIdentity,formatProvider):new MsaglDefaultGraphPopulator(graph);}
export function ToMsaglGraph(graph,nodeAdded=null,edgeAdded=null,options={}){const p=options.vertexIdentity?new MsaglIdentifiableGraphPopulator(graph,options.vertexIdentity,options.graphFactory):new MsaglDefaultGraphPopulator(graph,options.graphFactory);if(nodeAdded)p.NodeAdded.add(nodeAdded);if(edgeAdded)p.EdgeAdded.add(edgeAdded);p.Compute();return p.MsaglGraph;}
export const MsaglGraphExtensions=Object.freeze({CreateMsaglPopulator,ToMsaglGraph});
