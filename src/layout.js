/** Ready-to-use Microsoft MSAGL geometry engine. Distributed as an optional bundled entry. */
import { Graph, Node, Edge, GeomGraph, GeomNode, GeomEdge, GeomLabel, Label, Point, Size,
  CurveFactory, Curve, LineSegment, BezierSeg, Ellipse, Polyline, Arrowhead,
  SugiyamaLayoutSettings, MdsLayoutSettings, FastIncrementalLayoutSettings,
  LayerDirectionEnum, EdgeRoutingMode, PlaneTransformation, layoutGeomGraph, routeEdges, iCurveToJSON,
} from '@msagl/core';
import { EqualityMap } from './equality.js';
import { ToMsaglGraph } from './msagl.js';

const point = p => ({ x: p.x, y: -p.y });
const rect = r => ({ x: r.left, y: -r.top, width: r.width, height: r.height });
const number = (v, name, min = 0) => { if (!Number.isFinite(v) || v < min) throw new RangeError(`${name} must be finite and at least ${min}`); return v; };
const positive = (v, name) => { number(v, name); if (!v) throw new RangeError(`${name} must be positive`); return v; };
const abort = signal => { if (signal?.aborted) throw signal.reason ?? new DOMException('Layout was aborted', 'AbortError'); };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
const fmt = n => String(Number(n.toFixed(6)));
const xy = p => `${fmt(p.x)} ${fmt(-p.y)}`;
const screenTransform = new PlaneTransformation(1,0,0,0,-1,0);

/** Converts MSAGL's exact curves to an SVG path, reflecting its upward Y axis. */
export function MsaglCurveToSvgPath(curve) {
  if (!curve) return '';
  const parts = [`M ${xy(curve.start)}`];
  function append(c) {
    if (c instanceof Curve) { for (const s of c.segs) append(s); }
    else if (c instanceof LineSegment) parts.push(`L ${xy(c.end)}`);
    else if (c instanceof BezierSeg) parts.push(`C ${xy(c.b[1])} ${xy(c.b[2])} ${xy(c.b[3])}`);
    else if (c instanceof Polyline) { const ps = [...c]; for (let i = 1; i < ps.length; i++) parts.push(`L ${xy(ps[i])}`); if(c.closed) parts.push('Z'); }
    else if (c instanceof Ellipse) {
      const rx = c.aAxis.length, ry = c.bAxis.length;
      const rotation = -Math.atan2(c.aAxis.y, c.aAxis.x) * 180 / Math.PI;
      const sweep = c.aAxis.x * c.bAxis.y - c.aAxis.y * c.bAxis.x < 0 ? 1 : 0;
      // Full ellipses need two SVG arcs because equal end points draw no arc.
      const count = Math.max(1, Math.ceil((c.parEnd - c.parStart) / Math.PI));
      for(let i = 1; i <= count; i++) parts.push(`A ${fmt(rx)} ${fmt(ry)} ${fmt(rotation)} 0 ${sweep} ${xy(c.value(c.parStart + (c.parEnd-c.parStart)*i/count))}`);
    } else throw new TypeError('Unsupported MSAGL curve type');
  }
  append(curve); return parts.join(' ');
}

function boundary(shape, width, height) {
  const p = new Point(0, 0);
  switch(String(shape ?? 'Ellipse').toLowerCase()) {
    case 'ellipse': case 'circle': case 'doublecircle': return CurveFactory.mkEllipse(width / 2, height / 2, p);
    case 'diamond': return CurveFactory.mkDiamond(width / 2, height / 2, p);
    case 'box': case 'rectangle': case 'rect': return CurveFactory.createRectangle(width, height, p);
    case 'roundedbox': case 'roundrect': return CurveFactory.mkRectangleWithRoundedCorners(width, height, Math.min(6,width/4), Math.min(6,height/4), p);
    case 'hexagon': return polygon(6,width,height);
    case 'octagon': return polygon(8,width,height);
    case 'triangle': return polygon(3,width,height);
    case 'parallelogram': return Polyline.mkClosedFromPoints([new Point(-width*.3,-height/2),new Point(width/2,-height/2),new Point(width*.3,height/2),new Point(-width/2,height/2)]);
    default: throw new RangeError(`Unsupported node shape: ${shape}`);
  }
}
function polygon(n,w,h) { return Polyline.mkClosedFromPoints(Array.from({length:n},(_,i)=>new Point(Math.cos(Math.PI/2+2*Math.PI*i/n)*w/2,Math.sin(Math.PI/2+2*Math.PI*i/n)*h/2))); }
function measure(text, options, entity, kind) {
  const measured = options.measureLabel?.(text, entity, kind);
  const fontSize = positive(options.fontSize ?? 14, 'fontSize');
  if (measured != null) return { width:number(measured.width,'label width'), height:number(measured.height,'label height') };
  const lines = String(text).split('\n');
  return {width: Math.max(0,...lines.map(l=>[...l].length))*fontSize*.6, height: text ? lines.length*fontSize*1.25 : 0};
}
function settingsFor(options, directed) {
  const algorithm = options.algorithm ?? (directed ? 'Sugiyama' : 'MDS');
  let settings;
  if (algorithm === 'Sugiyama') {
    settings = new SugiyamaLayoutSettings();
    const direction = options.direction ?? 'TB';
    if (!['TB','BT','LR','RL'].includes(direction)) throw new RangeError('direction must be TB, BT, LR, or RL');
    settings.layerDirection = LayerDirectionEnum[direction];
    settings.LayerSeparation = positive(options.layerSeparation ?? 50, 'layerSeparation');
  } else if (algorithm === 'MDS') {
    settings = new MdsLayoutSettings();
    if (options.iterations != null) settings.IterationsWithMajorization = number(options.iterations,'iterations');
    if (options.pivots != null) settings.PivotNumber = positive(options.pivots,'pivots');
  } else if (algorithm === 'IPsepCola') {
    settings = new FastIncrementalLayoutSettings();
    if (options.iterations != null) settings.MaxIterations = positive(options.iterations,'iterations');
    settings.AvoidOverlaps = options.avoidOverlaps ?? true;
  } else throw new RangeError('algorithm must be Sugiyama, MDS, or IPsepCola');
  settings.commonSettings.NodeSeparation = number(options.nodeSeparation ?? 24,'nodeSeparation');
  settings.commonSettings.PackingAspectRatio = positive(options.aspectRatio ?? 1.5,'aspectRatio');
  const routing = options.routing ?? 'Spline';
  if (!['Spline','SplineBundling','StraightLine','SugiyamaSplines','Rectilinear','None'].includes(routing)) throw new RangeError(`Unsupported edge routing mode: ${routing}`);
  settings.edgeRoutingSettings.EdgeRoutingMode = EdgeRoutingMode[routing];
  if(options.edgePadding != null) settings.edgeRoutingSettings.Padding = number(options.edgePadding,'edgePadding');
  return {settings,algorithm,routing};
}

/** Geometry and SVG in browser coordinates; original native geometry is available for advanced operations. */
export class MsaglLayoutResult {
  constructor(data) { Object.assign(this,data); }
  /** JSON-safe geometry excludes cyclic engine objects and caller-owned vertices. */
  ToJSON() {
    return {Engine:this.Engine,Algorithm:this.Algorithm,Routing:this.Routing,Bounds:this.Bounds,
      Nodes:this.Nodes.map(({Id,Center,Bounds,Path,Label})=>({Id,Center,Bounds,Path,Label})),
      Edges:this.Edges.map(({Source,Target,Path,Curve,Label,SourceArrowhead,TargetArrowhead})=>({Source,Target,Path,Curve,Label,SourceArrowhead,TargetArrowhead})),
      Clusters:this.Clusters.map(({Id,Bounds,Path,Label})=>({Id,Bounds,Path,Label}))};
  }
  ToSvg(options = {}) {
    const padding = number(options.padding ?? 12,'padding'), b=this.Bounds;
    const foreground=escape(options.foreground ?? '#334155'), fill=escape(options.nodeFill ?? '#f8fafc'), background=escape(options.background ?? 'transparent');
    const fontSize=positive(options.fontSize ?? 14,'fontSize');
    const out=[`<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${fmt(b.x-padding)} ${fmt(b.y-padding)} ${fmt(Math.max(1,b.width+padding*2))} ${fmt(Math.max(1,b.height+padding*2))}"><title>${escape(options.title ?? this.Graph.Id ?? 'Graph layout')}</title><rect x="${fmt(b.x-padding)}" y="${fmt(b.y-padding)}" width="${fmt(Math.max(1,b.width+padding*2))}" height="${fmt(Math.max(1,b.height+padding*2))}" fill="${background}"/>`];
    for(const cluster of [...this.Clusters].sort((a,b)=>b.Bounds.width*b.Bounds.height-a.Bounds.width*a.Bounds.height)) out.push(`<path d="${cluster.Path}" fill="${escape(options.clusterFill ?? '#eff6ff')}" stroke="${foreground}"/>`);
    for(const e of this.Edges) {
      if(e.Path) out.push(`<path d="${e.Path}" fill="none" stroke="${foreground}"/>`);
      for(const arrow of [e.SourceArrowhead,e.TargetArrowhead]) if(arrow) {
        const {Tip:t,Base:a}=arrow, dx=t.x-a.x, dy=t.y-a.y, length=Math.hypot(dx,dy);
        if(length) { const w=arrow.Width/2, nx=-dy/length*w, ny=dx/length*w; out.push(`<path d="M ${fmt(t.x)} ${fmt(t.y)} L ${fmt(a.x+nx)} ${fmt(a.y+ny)} L ${fmt(a.x-nx)} ${fmt(a.y-ny)} Z" fill="${foreground}"/>`); }
      }
    }
    for(const n of this.Nodes) out.push(`<path d="${n.Path}" fill="${fill}" stroke="${foreground}"/>`);
    for(const {Label:l} of [...this.Nodes,...this.Edges,...this.Clusters]) if(l?.Text) {
      const lines=String(l.Text).split('\n');
      out.push(`<text x="${fmt(l.Center.x)}" y="${fmt(l.Center.y)}" text-anchor="middle" dominant-baseline="middle" font-family="${escape(options.fontFamily ?? 'system-ui, sans-serif')}" font-size="${fontSize}" fill="${foreground}">`);
      for(let i=0;i<lines.length;i++) out.push(`<tspan x="${fmt(l.Center.x)}" dy="${fmt(i ? fontSize*1.25 : -(lines.length-1)*fontSize*.625)}">${escape(lines[i])}</tspan>`);
      out.push('</text>');
    }
    out.push('</svg>'); return out.join('');
  }
}

/** Microsoft MSAGL's Sugiyama, MDS and IPSepCola algorithms and native edge routers. */
export class MsaglLayoutEngine {
  constructor(options = {}) { this.Options={...options}; }
  Layout(input, options = {}) {
    if(input == null) throw new TypeError('graph cannot be null');
    options={...this.Options,...options}; abort(options.signal);
    const drawing = input.Nodes != null && typeof input.AddNode === 'function' ? input : ToMsaglGraph(input);
    const {settings,algorithm,routing}=settingsFor(options,drawing.Directed);
    const graph=new Graph(String(drawing.Id ?? '')), geometry=new GeomGraph(graph);
    geometry.layoutSettings=settings;
    const padding=number(options.padding ?? 10,'padding'); geometry.margins={left:padding,right:padding,top:padding,bottom:padding};
    const nodes=[],edges=[],clusters=[],byId=new Map(),byVertex=new EqualityMap();
    for(const node of drawing.Nodes) {
      abort(options.signal);
      const id=String(node.Id); if(byId.has(id)) throw new RangeError(`Duplicate node id: ${id}`);
      const native=new Node(id), geom=new GeomNode(native), vertex=input===drawing ? (node.UserData ?? node.Id) : node.UserData;
      const label=String(options.vertexLabel?.(vertex,node) ?? node.LabelText ?? id), size=measure(label,options,node,'node');
      const nodeSize=options.nodeSize?.(vertex,node);
      const width=positive(nodeSize?.width ?? node.Attr?.Width ?? options.nodeWidth ?? Math.max(40,size.width+24),'node width');
      const height=positive(nodeSize?.height ?? node.Attr?.Height ?? options.nodeHeight ?? Math.max(30,size.height+16),'node height');
      geom.boundaryCurve=boundary(options.nodeShape?.(vertex,node) ?? node.Attr?.Shape,width,height);
      const item={id,node,native,geom,vertex,label,size}; nodes.push(item);byId.set(id,item);byVertex.set(vertex,item);
    }
    const resolve = key => byVertex.get(key) ?? byId.get(String(key));
    const clusterById=new Map();
    for(const def of options.clusters ?? []) {
      const id=String(def.id); if(clusterById.has(id) || byId.has(id)) throw new RangeError(`Duplicate cluster id: ${id}`);
      const native=new Graph(id), geom=new GeomGraph(native);geom.layoutSettings=settings;
      const margin=number(def.padding ?? padding,'cluster padding');geom.margins={left:margin,right:margin,top:margin,bottom:margin};
      const label=String(def.label ?? id),size=measure(label,options,def,'cluster');geom.labelSize=new Size(size.width,size.height);
      const item={id,native,geom,def,label,size};clusterById.set(id,item);clusters.push(item);
    }
    // Validate hierarchy before linking, so cycles cannot enter the native engine.
    for(const c of clusters) {
      const seen=new Set([c.id]);let p=c.def.parentId;
      while(p!=null) { p=String(p);if(seen.has(p)) throw new RangeError('Cluster hierarchy contains a cycle');seen.add(p);const parent=clusterById.get(p);if(!parent) throw new RangeError(`Unknown parent cluster: ${p}`);p=parent.def.parentId; }
      (c.def.parentId == null ? graph : clusterById.get(String(c.def.parentId)).native).addNode(c.native);
      for(const key of c.def.nodes ?? []) {const n=resolve(key);if(!n) throw new RangeError('Unknown node in cluster');if(n.native.parent) throw new RangeError(`Node belongs to multiple clusters: ${n.id}`);c.native.addNode(n.native);}
    }
    for(const n of nodes) if(!n.native.parent) graph.addNode(n.native);
    // MSAGL skips translating truly empty nested graphs. A private geometry-only
    // anchor gives an empty cluster a nondegenerate body and makes packing and
    // hierarchy transforms follow the same path as ordinary populated clusters.
    for(const c of clusters) if(c.native.isEmpty()) {
      let id=`__quikgraph_layout_empty_${c.id}`;while(byId.has(id)||clusterById.has(id))id+='_' ;
      const anchor=new Node(id),geom=new GeomNode(anchor);geom.boundaryCurve=CurveFactory.createRectangle(1,1,new Point(0,0));c.native.addNode(anchor);
    }
    for(const edge of drawing.Edges) {
      const source=byId.get(String(edge.Source)),target=byId.get(String(edge.Target));if(!source||!target) throw new RangeError('Edge endpoint does not belong to the graph');
      const native=new Edge(source.native,target.native),geom=new GeomEdge(native);
      if(drawing.Directed && options.arrows !== false) {geom.targetArrowhead=new Arrowhead();geom.targetArrowhead.length=positive(options.arrowLength ?? 8,'arrowLength');}
      const original=edge.UserData ?? edge,label=String(options.edgeLabel?.(original,edge) ?? edge.LabelText ?? ''),size=measure(label,options,edge,'edge');
      if(label) {native.label=new Label(native);new GeomLabel(native.label,new Size(Math.max(1,size.width),Math.max(1,size.height)));}
      edges.push({edge,original,native,geom,label});
    }
    options.configure?.({Graph:graph,GeometryGraph:geometry,Settings:settings,Nodes:byId,Edges:edges});
    const token={get canceled(){return Boolean(options.signal?.aborted);},throwIfCanceled(){abort(options.signal);}};
    if(nodes.length || clusters.length) layoutGeomGraph(geometry,token);
    abort(options.signal);
    if(options.constraints?.length) {
      if(clusters.length) throw new RangeError('Post-layout constraints on nested clusters are not supported');
      applyConstraints(nodes,options.constraints,resolve);
      for(const e of edges) {e.geom.requireRouting();if(e.geom.label)e.geom.label.isPositioned=false;}
      if(routing!=='None') routeEdges(geometry,edges.map(e=>e.geom),token);
      geometry.pumpTheBoxToTheGraphWithMargins();
    }
    // Layered layout can pre-route edges even when the caller requests node positions only.
    if(routing==='None') for(const e of edges)e.geom.requireRouting();
    const positions=new EqualityMap();
    const outputNodes=nodes.map(n=>{const center=point(n.geom.center),bounds=rect(n.geom.boundingBox);positions.set(n.vertex,center);return {Id:n.id,Vertex:n.vertex,Node:n.node,Center:center,Bounds:bounds,Path:MsaglCurveToSvgPath(n.geom.boundaryCurve),Label:{Text:n.label,Center:center,Bounds:{x:center.x-n.size.width/2,y:center.y-n.size.height/2,...n.size}}};});
    const arrow=(a,base)=>a?.tipPosition&&base?{Tip:point(a.tipPosition),Base:point(base),Width:a.width||Math.max(5,a.length*.75)}:null;
    const outputEdges=edges.map(e=>({Edge:e.original,Source:String(e.edge.Source),Target:String(e.edge.Target),Path:MsaglCurveToSvgPath(e.geom.curve),Curve:e.geom.curve?iCurveToJSON(e.geom.curve.transform(screenTransform)):null,Label:e.geom.label?{Text:e.label,Center:point(e.geom.label.center),Bounds:rect(e.geom.label.boundingBox)}:null,SourceArrowhead:arrow(e.geom.sourceArrowhead,e.geom.curve?.start),TargetArrowhead:arrow(e.geom.targetArrowhead,e.geom.curve?.end)}));
    const outputClusters=clusters.map(c=>{const b=rect(c.geom.boundingBox);return {Id:c.id,Bounds:b,Path:MsaglCurveToSvgPath(c.geom.boundaryCurve),Label:{Text:c.label,Center:{x:b.x+b.width/2,y:b.y+c.size.height/2+padding},Bounds:{x:b.x,y:b.y,width:c.size.width,height:c.size.height}}};});
    const bounds=nodes.length||clusters.length?rect(geometry.boundingBox):{x:0,y:0,width:0,height:0};
    for(const n of outputNodes) for(const v of Object.values(n.Center)) if(!Number.isFinite(v)) throw new Error('MSAGL produced a non-finite node coordinate');
    const result=new MsaglLayoutResult({Engine:'Microsoft MSAGL.js 1.1.24',Graph:drawing,Algorithm:algorithm,Routing:routing,Positions:positions,Nodes:outputNodes,Edges:outputEdges,Clusters:outputClusters,Bounds:bounds,GeometryGraph:geometry,EngineGraph:graph});
    abort(options.signal);drawing.LayoutResult=result;return result;
  }
  /** Promise API for viewer integration. For off-thread execution use a Worker. */
  async LayoutAsync(graph,options={}) { abort(options.signal);await Promise.resolve();return this.Layout(graph,options); }
}

/** Axis alignment, fixed centers and minimum center separation solved as difference constraints. */
function applyConstraints(nodes,constraints,resolve) {
  for(const axis of ['x','y']) {
    const parents=nodes.map((_,i)=>i),index=new Map(nodes.map((n,i)=>[n,i]));
    const root=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
    const idx=key=>{const n=resolve(key);if(!n)throw new RangeError('Constraint references an unknown node');return index.get(n);};
    for(const c of constraints) {
      if(!['x','y'].includes(c.axis))throw new RangeError('Constraint axis must be x or y');
      if(c.axis!==axis)continue;
      if(c.type==='align') {if(!Array.isArray(c.nodes)||!c.nodes.length)throw new RangeError('Alignment needs nodes');const first=idx(c.nodes[0]);for(const key of c.nodes)parents[root(idx(key))]=root(first);}
      else if(c.type!=='pin'&&c.type!=='separate')throw new RangeError('Constraint type must be align, pin or separate');
    }
    const groups=[...new Set(nodes.map((_,i)=>root(i)))],groupIds=new Map(groups.map((v,i)=>[v,i])),anchor=groups.length;
    const group=key=>groupIds.get(root(idx(key)));
    const values=new Array(groups.length).fill(0),counts=new Array(groups.length).fill(0);
    for(let i=0;i<nodes.length;i++){const g=groupIds.get(root(i));values[g]+=point(nodes[i].geom.center)[axis];counts[g]++;}
    for(let i=0;i<values.length;i++)values[i]/=counts[i];values.push(0);
    const edges=[];
    for(const c of constraints)if(c.axis===axis){
      if(c.type==='separate')edges.push([group(c.before),group(c.after),number(c.gap??0,'constraint gap')]);
      if(c.type==='pin'||(c.type==='align'&&c.coordinate!=null)) {const g=group(c.type==='pin'?c.node:c.nodes[0]),v=c.coordinate;if(!Number.isFinite(v))throw new RangeError('Constraint coordinate must be finite');edges.push([anchor,g,v],[g,anchor,-v]);}
    }
    let changed=false;
    for(let step=0;step<values.length;step++){changed=false;for(const[a,b,w]of edges)if(values[b]+1e-8<values[a]+w){values[b]=values[a]+w;changed=true;}if(!changed)break;}
    if(changed)throw new RangeError('Layout constraints are inconsistent');
    const offset=values[anchor];
    for(let i=0;i<nodes.length;i++){const p=point(nodes[i].geom.center);p[axis]=values[groupIds.get(root(i))]-offset;nodes[i].geom.center=new Point(p.x,-p.y);}
  }
}

export function LayoutGraph(graph,options={}) { return new MsaglLayoutEngine().Layout(graph,options); }
export async function LayoutGraphAsync(graph,options={}) { return new MsaglLayoutEngine().LayoutAsync(graph,options); }
