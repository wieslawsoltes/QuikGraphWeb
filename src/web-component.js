// QuikGraphWeb graph viewer, Microsoft Public License (MS-PL).
import { EqualityMap as Map, EqualitySet as Set, valueEquals } from './equality.js';
const HTMLElementBase = globalThis.HTMLElement ?? class {};
const sameVertex = valueEquals;
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
/** Reusable, dependency-free canvas graph viewer with pan, zoom and vertex dragging. */
export class QuikGraphViewer extends HTMLElementBase {
  constructor() {
    super(); this._graph = null; this.Positions = new Map(); this.VertexColors = new Map(); this.HighlightedEdges = new Set();
    this.VertexLabel = v => String(v); this.EdgeLabel = e => e.Tag == null ? '' : String(e.Tag);
    this._scale = 1; this._pan = { x:0, y:0 }; this._subscriptions = []; this._frame = 0; this._selected = null;
    this._selectedEdge = null; this._inspectionMode = 'vertices'; this._inspectionIndex = 0; this._inspectionQuery = ''; this._inspectionDirty = true; this._revision = 0; this._layoutGeneration = 0; this._pathCache = new WeakMap();
    if (!this.attachShadow) return;
    const shadow = this.attachShadow({mode:'open'});
    shadow.innerHTML = `<style>:host{display:block;min-height:240px;position:relative;contain:content;background:var(--graph-bg,#f8fafc);color:var(--graph-text,#334155);border-radius:inherit}canvas{display:block;width:100%;height:100%;min-height:240px;outline:none;touch-action:none}canvas:focus-visible{outline:2px solid #0f8b8d;outline-offset:-3px}.hint{position:absolute;bottom:12px;left:16px;font:11px system-ui;opacity:.65;pointer-events:none}.a11y{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}</style><canvas tabindex="0" role="img" aria-label="Interactive graph. Drag vertices to arrange them. Drag the background to pan. Use plus and minus to zoom; zero to fit."></canvas><div class="hint">Drag to arrange · Scroll to zoom · 0 to fit</div><div class="a11y" aria-live="polite"></div>`;
    this._canvas = shadow.querySelector('canvas'); this._ctx = this._canvas.getContext('2d');
    this._canvas.setAttribute('role','group');
    this._canvas.setAttribute('aria-describedby','graph-help');
    const help = document.createElement('span'); help.id = 'graph-help'; help.className = 'a11y'; help.textContent = 'Arrow keys navigate vertices. Shift and arrows move the selected vertex. Control and arrows pan. Enter selects a vertex. Delete requests removal. Plus and minus zoom; zero fits. Open Inspect graph for searchable vertex and edge lists.'; shadow.append(help);
    const inspection = document.createElement('details'); inspection.className = 'inspection'; inspection.innerHTML = '<summary>Inspect graph</summary><div class="inspection-body"><label>Show<select aria-label="Graph item type"><option value="vertices">Vertices</option><option value="edges">Edges</option></select></label><label>Find<input type="search" aria-label="Find graph items" placeholder="Label or endpoint"></label><div class="inspection-list" role="listbox" tabindex="0" aria-label="Graph vertices"></div><div class="inspection-pages"><button type="button" data-page="-1" aria-label="Previous graph items">Previous</button><span class="inspection-range"></span><button type="button" data-page="1" aria-label="Next graph items">Next</button></div><p class="inspection-help">Arrows: navigate · Enter: select · Delete: remove<br>Home / End: first / last · Page Up / Down: browse</p></div>'; shadow.append(inspection);
    const style = document.createElement('style'); style.textContent = '.inspection{position:absolute;top:10px;left:10px;z-index:1;max-width:min(340px,calc(100% - 20px));font:12px system-ui;background:var(--graph-node,#fff);border:1px solid var(--graph-edge,#a8b6c8);border-radius:7px;box-shadow:0 2px 8px #0001}.inspection summary{cursor:pointer;padding:7px 10px}.inspection-body{padding:0 10px 9px}.inspection-body label{display:flex;align-items:center;gap:8px;margin:7px 0}.inspection input,.inspection select,.inspection button{font:inherit;color:inherit;background:var(--graph-bg,#f8fafc);border:1px solid var(--graph-edge,#a8b6c8);border-radius:4px;padding:5px;min-width:0}.inspection input,.inspection select{flex:1;width:100%}.inspection-list{max-height:180px;overflow:auto;min-height:35px;outline-offset:2px}.inspection-option{padding:7px 6px;cursor:pointer;border-radius:4px;overflow-wrap:anywhere}.inspection-option[aria-selected=true]{background:#0d9c9224;box-shadow:inset 3px 0 #0d9c92}.inspection-pages{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:8px}.inspection button:disabled{opacity:.45;cursor:default}.inspection-range,.inspection-help{font-size:10px}.inspection-help{line-height:1.5;margin:8px 0 0;opacity:.8}.inspection :focus-visible{outline:2px solid #0d9c92;outline-offset:1px}'; shadow.append(style);
    this._inspection = inspection; this._inspectionList = inspection.querySelector('[role=listbox]');
    inspection.addEventListener('toggle',()=>{if(inspection.open)this._refreshInspection();});
    inspection.querySelector('select').addEventListener('change',event=>{this._inspectionMode=event.target.value;this._inspectionIndex=0;this._inspectionFiltered=null;this._refreshInspection();});
    inspection.querySelector('input').addEventListener('input',event=>{this._inspectionQuery=event.target.value;this._inspectionIndex=0;this._inspectionFiltered=null;this._refreshInspection();});
    for(const button of inspection.querySelectorAll('[data-page]'))button.addEventListener('click',()=>this._navigateInspection(Number(button.dataset.page)*50));
    this._inspectionList.addEventListener('keydown',event=>this._inspectionKey(event));
    this._inspectionList.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option){this._inspectionIndex=Number(option.dataset.index);this._activateInspection();this._inspectionList.focus();}});
    this._canvas.addEventListener('pointerdown',event => this._down(event));
    this._canvas.addEventListener('pointermove',event => this._move(event));
    this._canvas.addEventListener('pointerup',event => this._up(event));
    this._canvas.addEventListener('pointercancel',event => this._up(event));
    this._canvas.addEventListener('wheel',event => { event.preventDefault(); const point=this._point(event);this.Zoom(Math.exp(-event.deltaY*.001),point.x,point.y); },{passive:false});
    this._canvas.addEventListener('dblclick',event => {const p=this._world(this._point(event));this.dispatchEvent(new CustomEvent('graph-create-vertex',{detail:p,bubbles:true,composed:true}));});
    this._canvas.addEventListener('keydown',event => this._canvasKey(event));
  }
  connectedCallback() { this._attach(); this._resize?.disconnect(); if (globalThis.ResizeObserver) { this._resize = new ResizeObserver(()=>this._resizeViewport()); this._resize.observe(this); } this.Refresh(); }
  disconnectedCallback() {this._resize?.disconnect();if(this._frame)cancelAnimationFrame(this._frame);this._frame=0;this._detach();this.CancelLayout();}
  get Graph() {return this._graph;}
  set Graph(graph) {this.CancelLayout();this._detach();this._graph=graph;this._selected=null;this._selectedEdge=null;this._inspectionIndex=0;this._invalidateGraph();this.Positions.clear();this.HighlightedEdges.clear();this.VertexColors.clear();this._attach();this.Layout('circle');}
  _attach() { this._detach(); const graph = this._graph; if (graph) for (const name of ['VertexAdded','VertexRemoved','EdgeAdded','EdgeRemoved']) if (graph[name]?.subscribe) this._subscriptions.push(graph[name].subscribe(()=>{this._invalidateGraph();this.CancelLayout();this.Refresh();})); }
  _detach() {for(const sub of this._subscriptions)sub.dispose?.();this._subscriptions=[];}
  Layout(mode='circle') {
    this.CancelLayout();this.LayoutResult=null;this._layoutEdgeRoutes=null;this._layoutNodeRoutes=null;this._layoutClusters=null;
    this.Positions.clear(); const vertices=[...(this._graph?.Vertices??[])], n=vertices.length, columns=Math.max(1,Math.ceil(Math.sqrt(n)));
    const radius=Math.max(120,Math.min(500,n*13));
    vertices.forEach((v,i)=>this.Positions.set(v,mode==='grid'?{x:(i%columns-(columns-1)/2)*90,y:(Math.floor(i/columns)-(Math.ceil(n/columns)-1)/2)*80}:{x:Math.cos(2*Math.PI*i/n-Math.PI/2)*radius,y:Math.sin(2*Math.PI*i/n-Math.PI/2)*radius}));
    this.Fit();
  }
  /** Cancel pending asynchronous layout without changing the currently displayed positions. */
  CancelLayout() {this._layoutGeneration++;this._layoutController?.abort();this._layoutController=null;}
  /** Apply a complete async layout atomically. Graph edits and newer requests cancel stale results. */
  async LayoutAsync(adapter, options={}) {
    const execute=typeof adapter==='function'?adapter:adapter?.LayoutAsync??adapter?.Layout;
    if(typeof execute!=='function')throw new TypeError('Layout requires a function or an adapter with LayoutAsync or Layout.');
    this.CancelLayout();const generation=this._layoutGeneration,graph=this._graph,revision=this._revision,controller=new AbortController();this._layoutController=controller;
    const abortError=()=>new DOMException('Layout was cancelled.','AbortError'),abort=()=>controller.abort(options.signal?.reason);
    if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
    let rejectAbort;const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(abortError());controller.signal.addEventListener('abort',rejectAbort,{once:true});});
    try {
      if(controller.signal.aborted)throw abortError();
      const result=await Promise.race([Promise.resolve().then(()=>execute.call(adapter,graph,{...options,signal:controller.signal})),aborted]);
      if(controller.signal.aborted||generation!==this._layoutGeneration||graph!==this._graph||revision!==this._revision)throw abortError();
      const source=result?.Positions??result;if(!source||typeof source[Symbol.iterator]!=='function')throw new TypeError('Layout must return a Positions map.');
      const positions=new Map(source),next=new Map();
      for(const vertex of graph?.Vertices??[]){const p=positions.get(vertex);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new TypeError('Layout must provide finite x and y coordinates for every vertex.');next.set(vertex,{x:p.x,y:p.y});}
      this.Positions=next;this.LayoutResult=result;this._layoutEdgeRoutes=new Map((result.Edges??[]).map(edge=>[edge.Edge,edge]));this._layoutNodeRoutes=new Map((result.Nodes??[]).map(node=>[node.Vertex,node]));this._layoutClusters=[...(result.Clusters??[])].sort((a,b)=>b.Bounds.width*b.Bounds.height-a.Bounds.width*a.Bounds.height);this.Fit();this._emit('graph-layout-change',{positions:this.Positions,result});return result;
    } finally {controller.signal.removeEventListener('abort',rejectAbort);options.signal?.removeEventListener('abort',abort);if(generation===this._layoutGeneration)this._layoutController=null;}
  }
  _emit(name,detail){if(this.dispatchEvent)this.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true}));}
  _announce(message){const region=this.shadowRoot?.querySelector('.a11y');if(region)region.textContent=message;}
  _invalidateGraph(){this._revision++;this._inspectionDirty=true;this._inspectionFiltered=null;this.LayoutResult=null;this._layoutEdgeRoutes=null;this._layoutNodeRoutes=null;this._layoutClusters=null;}
  _inspectionItems(){
    if(this._inspectionDirty||!this._inspectionData){const vertices=[...(this._graph?.Vertices??[])],edges=[...(this._graph?.Edges??[])],degrees=new Map(vertices.map(v=>[v,{incoming:0,outgoing:0}]));for(const edge of edges){const s=degrees.get(edge.Source),t=degrees.get(edge.Target);if(s)s.outgoing++;if(t)t.incoming++;}this._inspectionData={vertices,edges,degrees};this._inspectionDirty=false;}
    if(!this._inspectionFiltered){const query=this._inspectionQuery.toLocaleLowerCase(),items=this._inspectionData[this._inspectionMode];this._inspectionFiltered=query?items.filter(item=>this._itemDescription(item).toLocaleLowerCase().includes(query)):items;}
    return this._inspectionFiltered;
  }
  _itemDescription(item){
    if(this._inspectionMode==='edges'){const label=String(this.EdgeLabel(item)??'');return `${this.VertexLabel(item.Source)} ${this._graph?.IsDirected?'to':'connected to'} ${this.VertexLabel(item.Target)}${label?`, ${label}`:''}`;}
    const degree=this._inspectionData?.degrees.get(item)??{incoming:0,outgoing:0};return `${this.VertexLabel(item)}; ${this._graph?.IsDirected?`${degree.incoming} incoming, ${degree.outgoing} outgoing`:`${degree.incoming+degree.outgoing} incident edges`}`;
  }
  _refreshInspection(){
    if(!this._inspection?.open)return;const items=this._inspectionItems(),list=this._inspectionList;this._inspectionIndex=Math.max(0,Math.min(this._inspectionIndex,items.length-1));const start=Math.floor(this._inspectionIndex/50)*50,end=Math.min(start+50,items.length),fragment=document.createDocumentFragment();
    for(let i=start;i<end;i++){const option=document.createElement('div');option.className='inspection-option';option.id=`graph-item-${i}`;option.dataset.index=String(i);option.setAttribute('role','option');option.setAttribute('aria-selected',String(i===this._inspectionIndex));option.setAttribute('aria-posinset',String(i+1));option.setAttribute('aria-setsize',String(items.length));option.textContent=this._itemDescription(items[i]);fragment.append(option);}list.replaceChildren(fragment);
    list.setAttribute('aria-label',`Graph ${this._inspectionMode}`);if(items.length)list.setAttribute('aria-activedescendant',`graph-item-${this._inspectionIndex}`);else{list.removeAttribute('aria-activedescendant');list.textContent='No matching graph items.';}
    this._inspection.querySelector('.inspection-range').textContent=items.length?`${start+1}–${end} of ${items.length}`:'0 items';this._inspection.querySelector('[data-page="-1"]').disabled=start===0;this._inspection.querySelector('[data-page="1"]').disabled=end===items.length;
    if(this.shadowRoot.activeElement===list)list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
  }
  _navigateInspection(delta){const items=this._inspectionItems();this._inspectionIndex=Math.max(0,Math.min(items.length-1,this._inspectionIndex+delta));this._refreshInspection();}
  _activateInspection(){const item=this._inspectionItems()[this._inspectionIndex];if(item===undefined)return;if(this._inspectionMode==='vertices')this.SelectVertex(item);else this.SelectEdge(item);this._refreshInspection();}
  _inspectionKey(event){let handled=true;if(event.key==='ArrowDown'||event.key==='ArrowRight')this._navigateInspection(1);else if(event.key==='ArrowUp'||event.key==='ArrowLeft')this._navigateInspection(-1);else if(event.key==='PageDown')this._navigateInspection(50);else if(event.key==='PageUp')this._navigateInspection(-50);else if(event.key==='Home'){this._inspectionIndex=0;this._refreshInspection();}else if(event.key==='End'){this._inspectionIndex=this._inspectionItems().length-1;this._refreshInspection();}else if(event.key==='Enter'||event.key===' ')this._activateInspection();else if(event.key==='Delete'){this._activateInspection();if(this._inspectionMode==='vertices'&&this._selected!=null)this._emit('graph-delete-vertex',{vertex:this._selected});else if(this._selectedEdge)this._emit('graph-delete-edge',{edge:this._selectedEdge});}else if(event.key==='Escape')this._canvas.focus();else handled=false;if(handled)event.preventDefault();}
  /** Select a graph vertex, scroll it into view, and notify both DOM and assistive technology. */
  SelectVertex(vertex){this._syncPositions();if(!this.Positions.has(vertex))throw new RangeError('The vertex is not present in this graph.');this._selected=vertex;this._selectedEdge=null;const p=this.Positions.get(vertex),width=this.clientWidth||800,height=this.clientHeight||480,x=p.x*this._scale+width/2+this._pan.x,y=p.y*this._scale+height/2+this._pan.y;if(x<35||x>width-35||y<35||y>height-35){this._pan.x=-p.x*this._scale;this._pan.y=-p.y*this._scale;}this._announce(`Selected vertex ${this.VertexLabel(vertex)}`);this._emit('graph-select',{vertex});this.Refresh();}
  /** Select an edge without changing the algorithm's highlighted-edge set. */
  SelectEdge(edge){const original=Array.from(this._graph?.Edges??[]).find(candidate=>valueEquals(candidate,edge));if(original===undefined)throw new RangeError('The edge is not present in this graph.');edge=original;this._selectedEdge=edge;this._selected=null;const a=this.Positions.get(edge.Source),b=this.Positions.get(edge.Target);if(a&&b){this._pan.x=-(a.x+b.x)/2*this._scale;this._pan.y=-(a.y+b.y)/2*this._scale;}this._announce(`Selected edge ${this.VertexLabel(edge.Source)} to ${this.VertexLabel(edge.Target)}${this.EdgeLabel(edge)?`, ${this.EdgeLabel(edge)}`:''}`);this._emit('graph-select-edge',{edge});this.Refresh();}
  _canvasKey(event){
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
    if(direction){if(event.ctrlKey||event.metaKey){this._pan.x+=direction[0]*30;this._pan.y+=direction[1]*30;this.Refresh();}else if(event.shiftKey&&this._selected!=null){this.CancelLayout();this.LayoutResult=null;this._layoutEdgeRoutes=null;this._layoutNodeRoutes=null;this._layoutClusters=null;const old=this.Positions.get(this._selected);if(old){const position={x:old.x+direction[0]*10/this._scale,y:old.y+direction[1]*10/this._scale};this.Positions.set(this._selected,position);this._emit('graph-layout-change',{vertex:this._selected,position});this._announce(`Moved ${this.VertexLabel(this._selected)} to ${Math.round(position.x)}, ${Math.round(position.y)}`);this.Refresh();}}else{const vertices=this._syncPositions(),index=vertices.findIndex(v=>sameVertex(v,this._selected)),step=direction[0]+direction[1]>0?1:-1;if(vertices.length)this.SelectVertex(vertices[index<0?(step>0?0:vertices.length-1):(index+step+vertices.length)%vertices.length]);}}
    else if(event.key==='0')this.Fit();else if(event.key==='+'||event.key==='=')this.Zoom(1.2);else if(event.key==='-')this.Zoom(1/1.2);else if(event.key==='Delete'&&this._selected!=null)this._emit('graph-delete-vertex',{vertex:this._selected});else if(event.key==='Enter'||event.key===' '){const vertex=this._selected??this._syncPositions()[0];if(vertex!==undefined)this.SelectVertex(vertex);}else if(event.key==='Home'||event.key==='End'){const vertices=this._syncPositions(),vertex=event.key==='Home'?vertices[0]:vertices.at(-1);if(vertex!==undefined)this.SelectVertex(vertex);}else return;event.preventDefault();
  }
  Fit() {
    if(!this.Positions.size){this._scale=1;this._pan={x:0,y:0};this.Refresh();return;}
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of this.Positions.values()){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}const bounds=this.LayoutResult?.Bounds;if(bounds){minX=Math.min(minX,bounds.x);minY=Math.min(minY,bounds.y);maxX=Math.max(maxX,bounds.x+bounds.width);maxY=Math.max(maxY,bounds.y+bounds.height);}
    const width=this.clientWidth||800,height=this.clientHeight||480;
    this._viewport={width,height};
    this._scale=Math.min(2,(width-100)/Math.max(100,maxX-minX),(height-100)/Math.max(100,maxY-minY));this._scale=Math.max(.03,this._scale);
    this._pan={x:-(minX+maxX)/2*this._scale,y:-(minY+maxY)/2*this._scale};this.Refresh();
  }
  _resizeViewport() {
    const width=this.clientWidth||800,height=this.clientHeight||480,previous=this._viewport;
    this._viewport={width,height};
    if(previous&&previous.width>0&&previous.height>0&&this.Positions.size){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(const p of this.Positions.values()){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}const bounds=this.LayoutResult?.Bounds;if(bounds){minX=Math.min(minX,bounds.x);minY=Math.min(minY,bounds.y);maxX=Math.max(maxX,bounds.x+bounds.width);maxY=Math.max(maxY,bounds.y+bounds.height);}
      const fit=(w,h)=>Math.max(.03,Math.min(2,(w-100)/Math.max(100,maxX-minX),(h-100)/Math.max(100,maxY-minY)));
      const factor=fit(width,height)/fit(previous.width,previous.height);
      this._scale=Math.max(.03,Math.min(8,this._scale*factor));
      this._pan={x:this._pan.x*factor,y:this._pan.y*factor};
    }
    this.Refresh();
  }
  Zoom(factor,x=(this.clientWidth||800)/2,y=(this.clientHeight||480)/2) {if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError('Zoom factor and coordinates must be finite; factor must be positive.');const before=this._world({x,y}),next=Math.max(.03,Math.min(8,this._scale*factor));this._scale=next;this._pan={x:x-(this.clientWidth||800)/2-before.x*next,y:y-(this.clientHeight||480)/2-before.y*next};this.Refresh();}
  Refresh(){if(this._frame||!this.isConnected)return;this._frame=requestAnimationFrame(()=>{this._frame=0;this._draw();});}
  _point(event){const rect=this._canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
  _world(p){return{x:(p.x-(this.clientWidth||800)/2-this._pan.x)/this._scale,y:(p.y-(this.clientHeight||480)/2-this._pan.y)/this._scale};}
  _hit(point){const p=this._world(point);for(const[v,pos]of this.Positions){const bounds=this._layoutNodeRoutes?.get(v)?.Bounds;if(bounds?p.x>=bounds.x&&p.x<=bounds.x+bounds.width&&p.y>=bounds.y&&p.y<=bounds.y+bounds.height:Math.hypot(p.x-pos.x,p.y-pos.y)<Math.max(20,12/this._scale))return v;}return undefined;}
  _down(event){if(this._drag||event.isPrimary===false||event.button>0)return;this._syncPositions();const point=this._point(event),vertex=this._hit(point),world=this._world(point),position=this.Positions.get(vertex);this._drag={vertex,point,pointerId:event.pointerId,offset:position?{x:world.x-position.x,y:world.y-position.y}:{x:0,y:0},moved:false};this._canvas.setPointerCapture(event.pointerId);if(vertex!==undefined){this._selected=vertex;this._selectedEdge=null;this.dispatchEvent(new CustomEvent('graph-select',{detail:{vertex},bubbles:true,composed:true}));this.shadowRoot.querySelector('.a11y').textContent=`Selected ${this.VertexLabel(vertex)}`;}this.Refresh();}
  _move(event){if(!this._drag||event.pointerId!==this._drag.pointerId)return;const point=this._point(event),dx=point.x-this._drag.point.x,dy=point.y-this._drag.point.y;this._drag.moved||=Math.abs(dx)+Math.abs(dy)>2;if(this._drag.vertex!==undefined){this.CancelLayout();this.LayoutResult=null;this._layoutEdgeRoutes=null;this._layoutNodeRoutes=null;this._layoutClusters=null;const world=this._world(point);this.Positions.set(this._drag.vertex,{x:world.x-this._drag.offset.x,y:world.y-this._drag.offset.y});}else{this._pan.x+=dx;this._pan.y+=dy;}this._drag.point=point;this.Refresh();}
  _up(event){if(!this._drag||event.pointerId!==this._drag.pointerId)return;if(this._drag?.vertex!==undefined&&this._drag.moved)this.dispatchEvent(new CustomEvent('graph-layout-change',{detail:{vertex:this._drag.vertex,position:this.Positions.get(this._drag.vertex)},bubbles:true,composed:true}));this._drag=null;if(this._canvas.hasPointerCapture(event.pointerId))this._canvas.releasePointerCapture(event.pointerId);}
  _syncPositions() {
    const vertices = Array.from(this._graph?.Vertices ?? []), alive = new Set(vertices);
    let ordinal = 0;
    for (const v of vertices) { if (!this.Positions.has(v)) { const angle = ordinal * Math.PI * (3 - Math.sqrt(5)), radius = 70 + Math.sqrt(ordinal) * 35; this.Positions.set(v, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }); } ++ordinal; }
    for (const v of this.Positions.keys()) if (!alive.has(v)) { this.Positions.delete(v); this.VertexColors.delete(v); }
    if (this._selected != null && !alive.has(this._selected)) this._selected = null;
    return vertices;
  }
  _edgeGeometry(edges) {
    const ids = new Map(Array.from(this.Positions.keys(), (v, i) => [v, i])), groups = new Map();
    for (const edge of edges) { const a = this.Positions.get(edge.Source), b = this.Positions.get(edge.Target); if (!a || !b) continue; const source = ids.get(edge.Source), target = ids.get(edge.Target), key = `${Math.min(source,target)}:${Math.max(source,target)}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push({ edge, a, b, source, target }); }
    const result = [];
    for (const group of groups.values()) for (let i = 0; i < group.length; ++i) { const g = group[i]; if (sameVertex(g.edge.Source, g.edge.Target)) { result.push({ ...g, loop: true, radius: 19 + i * 9, cx: g.a.x + 17, cy: g.a.y - 22 }); continue; } const dx=g.b.x-g.a.x,dy=g.b.y-g.a.y,length=Math.hypot(dx,dy)||1,offset=(i-(group.length-1)/2)*38*(g.source<=g.target?1:-1),cx=(g.a.x+g.b.x)/2-dy/length*offset,cy=(g.a.y+g.b.y)/2+dx/length*offset,sl=Math.hypot(cx-g.a.x,cy-g.a.y)||1,tl=Math.hypot(g.b.x-cx,g.b.y-cy)||1,sr=Math.min(20,length/3),tr=Math.min(24,length/3); result.push({ ...g, loop:false,cx,cy,sx:g.a.x+(cx-g.a.x)/sl*sr,sy:g.a.y+(cy-g.a.y)/sl*sr,tx:g.b.x-(g.b.x-cx)/tl*tr,ty:g.b.y-(g.b.y-cy)/tl*tr,ux:(g.b.x-cx)/tl,uy:(g.b.y-cy)/tl }); }
    return result;
  }
  _arrowPoints(arrow){if(!arrow?.Tip||!arrow?.Base)return null;const tip=arrow.Tip,base=arrow.Base,length=Math.hypot(tip.x-base.x,tip.y-base.y)||1,half=(arrow.Width??8)/2,dx=(tip.x-base.x)/length,dy=(tip.y-base.y)/length;return[tip,{x:base.x-dy*half,y:base.y+dx*half},{x:base.x+dy*half,y:base.y-dx*half}];}
  _nativePath(item){if(!item?.Path||typeof globalThis.Path2D!=='function')return null;let cached=this._pathCache.get(item);if(!cached||cached.source!==item.Path){cached={source:item.Path,path:new Path2D(item.Path)};this._pathCache.set(item,cached);}return cached.path;}
  _drawClusters(ctx,line,fill,text){if(typeof globalThis.Path2D!=='function')return;for(const cluster of this._layoutClusters??[]){const path=this._nativePath(cluster);if(!path)continue;ctx.fillStyle=fill;ctx.strokeStyle=line;ctx.lineWidth=1/Math.max(.5,this._scale);ctx.fill(path);ctx.stroke(path);if(cluster.Label?.Text){ctx.fillStyle=text;ctx.fillText(cluster.Label.Text,cluster.Label.Center.x,cluster.Label.Center.y);}}}
  _drawRoute(ctx,edge,route,text,fill,showLabels){
    const path=this._nativePath(route);if(!path)return false;ctx.stroke(path);for(const arrow of [route.SourceArrowhead,route.TargetArrowhead]){const points=this._arrowPoints(arrow);if(points){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.lineTo(points[2].x,points[2].y);ctx.closePath();ctx.fill();}}
    const label=String(this.EdgeLabel(edge)??'');if(showLabels&&label&&route.Label?.Center){const {x,y}=route.Label.Center,width=ctx.measureText(label).width;ctx.fillStyle=fill;ctx.fillRect(x-width/2-5,y-9,width+10,18);ctx.fillStyle=text;ctx.fillText(label,x,y);}return true;
  }
  _routeSvg(edge,route,color){let svg=`<path d="${escapeXml(route.Path)}" fill="none" stroke="${color}"/>`;for(const arrow of [route.SourceArrowhead,route.TargetArrowhead]){const points=this._arrowPoints(arrow);if(points)svg+=`<polygon points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${color}"/>`;}if(route.Label?.Center){const {x,y}=route.Label.Center;svg+=`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="12">${escapeXml(this.EdgeLabel(edge)??'')}</text>`;}return svg;}
  _draw(){
    const canvas=this._canvas,ctx=this._ctx;if(!ctx)return;const width=this.clientWidth,height=this.clientHeight,dpr=Math.min(2,globalThis.devicePixelRatio||1);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const styles=getComputedStyle(this),text=styles.getPropertyValue('--graph-text').trim()||'#334155',line=styles.getPropertyValue('--graph-edge').trim()||'#a8b6c8',fill=styles.getPropertyValue('--graph-node').trim()||'#fff';
    ctx.fillStyle=styles.getPropertyValue('--graph-dot').trim()||'#dce3eb';const spacing=24;ctx.beginPath();for(let x=width/2%spacing;x<width;x+=spacing)for(let y=height/2%spacing;y<height;y+=spacing){ctx.moveTo(x+.7,y);ctx.arc(x,y,.7,0,Math.PI*2);}ctx.fill();
    if(this._inspectionDirty)this._refreshInspection();if(!this._graph)return;const vertices=this._syncPositions();
    ctx.translate(width/2+this._pan.x,height/2+this._pan.y);ctx.scale(this._scale,this._scale);ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    const showLabels=vertices.length<250&&this._scale>.25,edges=[...this._graph.Edges];
    const left=(-width/2-this._pan.x)/this._scale-50,right=(width/2-this._pan.x)/this._scale+50,top=(-height/2-this._pan.y)/this._scale-50,bottom=(height/2-this._pan.y)/this._scale+50;
    this._drawClusters(ctx,line,fill,text);for(const g of this._edgeGeometry(edges)){const {edge,a,b}=g;if(!this._layoutEdgeRoutes?.has(edge)&&(Math.max(a.x,b.x,g.cx)<left||Math.min(a.x,b.x,g.cx)>right||Math.max(a.y,b.y,g.cy)<top||Math.min(a.y,b.y,g.cy)>bottom))continue;const highlighted=this.HighlightedEdges.has(edge)||edge===this._selectedEdge;ctx.strokeStyle=highlighted?'#0d9c92':line;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=(highlighted?3:1.5)/Math.max(.5,this._scale);if(this._drawRoute(ctx,edge,this._layoutEdgeRoutes?.get(edge),text,fill,showLabels))continue;ctx.beginPath();let x,y,ux,uy,lx,ly;if(g.loop){const angle=Math.PI*1.9;ctx.arc(g.cx,g.cy,g.radius,.25,angle);x=g.cx+Math.cos(angle)*g.radius;y=g.cy+Math.sin(angle)*g.radius;ux=-Math.sin(angle);uy=Math.cos(angle);lx=g.cx;ly=g.cy-g.radius-8;}else{ctx.moveTo(g.sx,g.sy);ctx.quadraticCurveTo(g.cx,g.cy,g.tx,g.ty);x=g.tx;y=g.ty;ux=g.ux;uy=g.uy;lx=.25*g.sx+.5*g.cx+.25*g.tx;ly=.25*g.sy+.5*g.cy+.25*g.ty;}ctx.stroke();if(this._graph.IsDirected){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-ux*9-uy*4,y-uy*9+ux*4);ctx.lineTo(x-ux*9+uy*4,y-uy*9-ux*4);ctx.closePath();ctx.fill();}if(showLabels){const label=String(this.EdgeLabel(edge)??'');if(label){const labelWidth=ctx.measureText(label).width;ctx.fillStyle=fill;ctx.fillRect(lx-labelWidth/2-5,ly-9,labelWidth+10,18);ctx.fillStyle=text;ctx.fillText(label,lx,ly);}}}
    for(const[v,p]of this.Positions){const sx=p.x*this._scale+width/2+this._pan.x,sy=p.y*this._scale+height/2+this._pan.y,native=this._layoutNodeRoutes?.get(v),bounds=native?.Bounds;if(bounds?bounds.x+bounds.width<left||bounds.x>right||bounds.y+bounds.height<top||bounds.y>bottom:sx<-30||sy<-30||sx>width+30||sy>height+30)continue;const path=this._nativePath(native);ctx.beginPath();if(!path)ctx.arc(p.x,p.y,vertices.length>1000?4:19,0,Math.PI*2);ctx.fillStyle=this.VertexColors.get(v)||fill;if(path)ctx.fill(path);else ctx.fill();ctx.lineWidth=(sameVertex(v,this._selected)?3:1.7)/Math.max(.65,this._scale);ctx.strokeStyle=sameVertex(v,this._selected)?'#0d9c92':line;if(path)ctx.stroke(path);else ctx.stroke();if(showLabels){ctx.fillStyle=text;ctx.fillText(native?String(this.VertexLabel(v)):String(this.VertexLabel(v)).slice(0,18),p.x,p.y);}}
    canvas.setAttribute('aria-label',`Graph with ${vertices.length} vertices and ${edges.length} edges. Arrow keys select vertices; Shift and arrows move; Control and arrows pan. Plus/minus zoom; zero fits. Inspect graph lists individual vertices and edges.`);
  }
  ToSvg(){
    this._syncPositions();const geometries=this._edgeGeometry(Array.from(this._graph?.Edges??[]));let minX=-200,minY=-200,maxX=200,maxY=200;for(const p of this.Positions.values()){minX=Math.min(minX,p.x-40);minY=Math.min(minY,p.y-40);maxX=Math.max(maxX,p.x+40);maxY=Math.max(maxY,p.y+40);}for(const g of geometries){const radius=g.loop?g.radius:0;minX=Math.min(minX,g.cx-radius-30);minY=Math.min(minY,g.cy-radius-30);maxX=Math.max(maxX,g.cx+radius+30);maxY=Math.max(maxY,g.cy+radius+30);}const bounds=this.LayoutResult?.Bounds;if(bounds){minX=Math.min(minX,bounds.x-30);minY=Math.min(minY,bounds.y-30);maxX=Math.max(maxX,bounds.x+bounds.width+30);maxY=Math.max(maxY,bounds.y+bounds.height+30);}let result=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="context-stroke"/></marker></defs>`;
    for(const cluster of this._layoutClusters??[])result+=`<path d="${escapeXml(cluster.Path)}" fill="#eff6ff" stroke="#94a3b8"/><text x="${cluster.Label?.Center.x??0}" y="${cluster.Label?.Center.y??0}" text-anchor="middle" font-family="sans-serif" font-size="12">${escapeXml(cluster.Label?.Text??'')}</text>`;for(const g of geometries){const color=(this.HighlightedEdges.has(g.edge)||g.edge===this._selectedEdge)?'#0d9c92':'#64748b';const route=this._layoutEdgeRoutes?.get(g.edge);if(route?.Path){result+=this._routeSvg(g.edge,route,color);continue;}let path,lx,ly;if(g.loop){const start=.25,end=Math.PI*1.9;path=`M${g.cx+Math.cos(start)*g.radius} ${g.cy+Math.sin(start)*g.radius} A${g.radius} ${g.radius} 0 1 1 ${g.cx+Math.cos(end)*g.radius} ${g.cy+Math.sin(end)*g.radius}`;lx=g.cx;ly=g.cy-g.radius-8;}else{path=`M${g.sx} ${g.sy} Q${g.cx} ${g.cy} ${g.tx} ${g.ty}`;lx=.25*g.sx+.5*g.cx+.25*g.tx;ly=.25*g.sy+.5*g.cy+.25*g.ty;}result+=`<path d="${path}" fill="none" stroke="${color}"${this._graph.IsDirected?' marker-end="url(#arrow)"':''}/><text x="${lx}" y="${ly-5}" text-anchor="middle" font-family="sans-serif" font-size="12">${escapeXml(this.EdgeLabel(g.edge)??'')}</text>`;}
    for(const[v,p]of this.Positions){const native=this._layoutNodeRoutes?.get(v),fill=escapeXml(this.VertexColors.get(v)||'#fff');result+=(native?.Path?`<path d="${escapeXml(native.Path)}" fill="${fill}" stroke="#64748b"/>`:`<circle cx="${p.x}" cy="${p.y}" r="19" fill="${fill}" stroke="#64748b"/>`)+`<text x="${p.x}" y="${p.y+4}" font-family="sans-serif" font-size="12" text-anchor="middle">${escapeXml(this.VertexLabel(v))}</text>`;}return result+'</svg>';
  }

}
/** Register explicitly, enabling multiple versions and use without browser globals. */
export function defineQuikGraphViewer(name='quikgraph-viewer'){if(!globalThis.customElements)throw new Error('Custom elements require a browser.');if(!customElements.get(name))customElements.define(name,name==='quikgraph-viewer'?QuikGraphViewer:class extends QuikGraphViewer {});return customElements.get(name);}
