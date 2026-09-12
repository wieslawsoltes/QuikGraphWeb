// QuikGraphWeb graph viewer, Microsoft Public License (MS-PL).
const HTMLElementBase = globalThis.HTMLElement ?? class {};
const sameVertex = (a, b) => a === b || (Number.isNaN(a) && Number.isNaN(b));
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
/** Reusable, dependency-free canvas graph viewer with pan, zoom and vertex dragging. */
export class QuikGraphViewer extends HTMLElementBase {
  constructor() {
    super(); this._graph = null; this.Positions = new Map(); this.VertexColors = new Map(); this.HighlightedEdges = new Set();
    this.VertexLabel = v => String(v); this.EdgeLabel = e => e.Tag == null ? '' : String(e.Tag);
    this._scale = 1; this._pan = { x:0, y:0 }; this._subscriptions = []; this._frame = 0; this._selected = null;
    if (!this.attachShadow) return;
    const shadow = this.attachShadow({mode:'open'});
    shadow.innerHTML = `<style>:host{display:block;min-height:240px;position:relative;contain:content;background:var(--graph-bg,#f8fafc);color:var(--graph-text,#334155);border-radius:inherit}canvas{display:block;width:100%;height:100%;min-height:240px;outline:none;touch-action:none}canvas:focus-visible{outline:2px solid #0f8b8d;outline-offset:-3px}.hint{position:absolute;bottom:12px;left:16px;font:11px system-ui;opacity:.65;pointer-events:none}.a11y{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}</style><canvas tabindex="0" role="img" aria-label="Interactive graph. Drag vertices to arrange them. Drag the background to pan. Use plus and minus to zoom; zero to fit."></canvas><div class="hint">Drag to arrange · Scroll to zoom · 0 to fit</div><div class="a11y" aria-live="polite"></div>`;
    this._canvas = shadow.querySelector('canvas'); this._ctx = this._canvas.getContext('2d');
    this._canvas.addEventListener('pointerdown',event => this._down(event));
    this._canvas.addEventListener('pointermove',event => this._move(event));
    this._canvas.addEventListener('pointerup',event => this._up(event));
    this._canvas.addEventListener('pointercancel',event => this._up(event));
    this._canvas.addEventListener('wheel',event => { event.preventDefault(); const point=this._point(event);this.Zoom(Math.exp(-event.deltaY*.001),point.x,point.y); },{passive:false});
    this._canvas.addEventListener('dblclick',event => {const p=this._world(this._point(event));this.dispatchEvent(new CustomEvent('graph-create-vertex',{detail:p,bubbles:true,composed:true}));});
    this._canvas.addEventListener('keydown',event => {if(event.key==='0')this.Fit();else if(event.key==='+'||event.key==='=')this.Zoom(1.2);else if(event.key==='-')this.Zoom(1/1.2);else if(event.key==='Delete'&&this._selected!=null)this.dispatchEvent(new CustomEvent('graph-delete-vertex',{detail:{vertex:this._selected},bubbles:true,composed:true}));else return;event.preventDefault();});
  }
  connectedCallback() { this._attach(); if (globalThis.ResizeObserver) { this._resize = new ResizeObserver(()=>this.Refresh()); this._resize.observe(this); } this.Refresh(); }
  disconnectedCallback() {this._resize?.disconnect();if(this._frame)cancelAnimationFrame(this._frame);this._frame=0;this._detach();}
  get Graph() {return this._graph;}
  set Graph(graph) {this._detach();this._graph=graph;this._selected=null;this.Positions.clear();this.HighlightedEdges.clear();this.VertexColors.clear();this._attach();this.Layout('circle');}
  _attach() { this._detach(); const graph = this._graph; if (graph) for (const name of ['VertexAdded','VertexRemoved','EdgeAdded','EdgeRemoved']) if (graph[name]?.subscribe) this._subscriptions.push(graph[name].subscribe(()=>this.Refresh())); }
  _detach() {for(const sub of this._subscriptions)sub.dispose?.();this._subscriptions=[];}
  Layout(mode='circle') {
    this.Positions.clear(); const vertices=[...(this._graph?.Vertices??[])], n=vertices.length, columns=Math.max(1,Math.ceil(Math.sqrt(n)));
    const radius=Math.max(120,Math.min(500,n*13));
    vertices.forEach((v,i)=>this.Positions.set(v,mode==='grid'?{x:(i%columns-(columns-1)/2)*90,y:(Math.floor(i/columns)-(Math.ceil(n/columns)-1)/2)*80}:{x:Math.cos(2*Math.PI*i/n-Math.PI/2)*radius,y:Math.sin(2*Math.PI*i/n-Math.PI/2)*radius}));
    this.Fit();
  }
  Fit() {
    if(!this.Positions.size){this._scale=1;this._pan={x:0,y:0};this.Refresh();return;}
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of this.Positions.values()){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
    const width=this.clientWidth||800,height=this.clientHeight||480;
    this._scale=Math.min(2,(width-100)/Math.max(100,maxX-minX),(height-100)/Math.max(100,maxY-minY));this._scale=Math.max(.03,this._scale);
    this._pan={x:-(minX+maxX)/2*this._scale,y:-(minY+maxY)/2*this._scale};this.Refresh();
  }
  Zoom(factor,x=(this.clientWidth||800)/2,y=(this.clientHeight||480)/2) {if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError('Zoom factor and coordinates must be finite; factor must be positive.');const before=this._world({x,y}),next=Math.max(.03,Math.min(8,this._scale*factor));this._scale=next;this._pan={x:x-(this.clientWidth||800)/2-before.x*next,y:y-(this.clientHeight||480)/2-before.y*next};this.Refresh();}
  Refresh(){if(this._frame||!this.isConnected)return;this._frame=requestAnimationFrame(()=>{this._frame=0;this._draw();});}
  _point(event){const rect=this._canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
  _world(p){return{x:(p.x-(this.clientWidth||800)/2-this._pan.x)/this._scale,y:(p.y-(this.clientHeight||480)/2-this._pan.y)/this._scale};}
  _hit(point){const p=this._world(point);for(const[v,pos]of this.Positions)if(Math.hypot(p.x-pos.x,p.y-pos.y)<Math.max(20,12/this._scale))return v;return undefined;}
  _down(event){if(this._drag||event.isPrimary===false||event.button>0)return;this._syncPositions();const point=this._point(event),vertex=this._hit(point),world=this._world(point),position=this.Positions.get(vertex);this._drag={vertex,point,pointerId:event.pointerId,offset:position?{x:world.x-position.x,y:world.y-position.y}:{x:0,y:0},moved:false};this._canvas.setPointerCapture(event.pointerId);if(vertex!==undefined){this._selected=vertex;this.dispatchEvent(new CustomEvent('graph-select',{detail:{vertex},bubbles:true,composed:true}));this.shadowRoot.querySelector('.a11y').textContent=`Selected ${this.VertexLabel(vertex)}`;}this.Refresh();}
  _move(event){if(!this._drag||event.pointerId!==this._drag.pointerId)return;const point=this._point(event),dx=point.x-this._drag.point.x,dy=point.y-this._drag.point.y;this._drag.moved||=Math.abs(dx)+Math.abs(dy)>2;if(this._drag.vertex!==undefined){const world=this._world(point);this.Positions.set(this._drag.vertex,{x:world.x-this._drag.offset.x,y:world.y-this._drag.offset.y});}else{this._pan.x+=dx;this._pan.y+=dy;}this._drag.point=point;this.Refresh();}
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
  _draw(){
    const canvas=this._canvas,ctx=this._ctx;if(!ctx)return;const width=this.clientWidth,height=this.clientHeight,dpr=Math.min(2,globalThis.devicePixelRatio||1);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const styles=getComputedStyle(this),text=styles.getPropertyValue('--graph-text').trim()||'#334155',line=styles.getPropertyValue('--graph-edge').trim()||'#a8b6c8',fill=styles.getPropertyValue('--graph-node').trim()||'#fff';
    ctx.fillStyle=styles.getPropertyValue('--graph-dot').trim()||'#dce3eb';const spacing=24;ctx.beginPath();for(let x=width/2%spacing;x<width;x+=spacing)for(let y=height/2%spacing;y<height;y+=spacing){ctx.moveTo(x+.7,y);ctx.arc(x,y,.7,0,Math.PI*2);}ctx.fill();
    if(!this._graph)return;const vertices=this._syncPositions();
    ctx.translate(width/2+this._pan.x,height/2+this._pan.y);ctx.scale(this._scale,this._scale);ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    const showLabels=vertices.length<250&&this._scale>.25,edges=[...this._graph.Edges];
    const left=(-width/2-this._pan.x)/this._scale-50,right=(width/2-this._pan.x)/this._scale+50,top=(-height/2-this._pan.y)/this._scale-50,bottom=(height/2-this._pan.y)/this._scale+50;
    for(const g of this._edgeGeometry(edges)){const {edge,a,b}=g;if(Math.max(a.x,b.x,g.cx)<left||Math.min(a.x,b.x,g.cx)>right||Math.max(a.y,b.y,g.cy)<top||Math.min(a.y,b.y,g.cy)>bottom)continue;const highlighted=this.HighlightedEdges.has(edge);ctx.strokeStyle=highlighted?'#0d9c92':line;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=(highlighted?3:1.5)/Math.max(.5,this._scale);ctx.beginPath();let x,y,ux,uy,lx,ly;if(g.loop){const angle=Math.PI*1.9;ctx.arc(g.cx,g.cy,g.radius,.25,angle);x=g.cx+Math.cos(angle)*g.radius;y=g.cy+Math.sin(angle)*g.radius;ux=-Math.sin(angle);uy=Math.cos(angle);lx=g.cx;ly=g.cy-g.radius-8;}else{ctx.moveTo(g.sx,g.sy);ctx.quadraticCurveTo(g.cx,g.cy,g.tx,g.ty);x=g.tx;y=g.ty;ux=g.ux;uy=g.uy;lx=.25*g.sx+.5*g.cx+.25*g.tx;ly=.25*g.sy+.5*g.cy+.25*g.ty;}ctx.stroke();if(this._graph.IsDirected){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-ux*9-uy*4,y-uy*9+ux*4);ctx.lineTo(x-ux*9+uy*4,y-uy*9-ux*4);ctx.closePath();ctx.fill();}if(showLabels){const label=String(this.EdgeLabel(edge)??'');if(label){const labelWidth=ctx.measureText(label).width;ctx.fillStyle=fill;ctx.fillRect(lx-labelWidth/2-5,ly-9,labelWidth+10,18);ctx.fillStyle=text;ctx.fillText(label,lx,ly);}}}
    for(const[v,p]of this.Positions){const sx=p.x*this._scale+width/2+this._pan.x,sy=p.y*this._scale+height/2+this._pan.y;if(sx<-30||sy<-30||sx>width+30||sy>height+30)continue;ctx.beginPath();ctx.arc(p.x,p.y,vertices.length>1000?4:19,0,Math.PI*2);ctx.fillStyle=this.VertexColors.get(v)||fill;ctx.fill();ctx.lineWidth=(v===this._selected?3:1.7)/Math.max(.65,this._scale);ctx.strokeStyle=v===this._selected?'#0d9c92':line;ctx.stroke();if(showLabels){ctx.fillStyle=text;ctx.fillText(String(this.VertexLabel(v)).slice(0,18),p.x,p.y);}}
    canvas.setAttribute('aria-label',`Graph with ${vertices.length} vertices and ${edges.length} edges. Drag vertices to arrange; background to pan. Plus/minus to zoom, zero to fit.`);
  }
  ToSvg(){
    this._syncPositions();const geometries=this._edgeGeometry(Array.from(this._graph?.Edges??[]));let minX=-200,minY=-200,maxX=200,maxY=200;for(const p of this.Positions.values()){minX=Math.min(minX,p.x-40);minY=Math.min(minY,p.y-40);maxX=Math.max(maxX,p.x+40);maxY=Math.max(maxY,p.y+40);}for(const g of geometries){const radius=g.loop?g.radius:0;minX=Math.min(minX,g.cx-radius-30);minY=Math.min(minY,g.cy-radius-30);maxX=Math.max(maxX,g.cx+radius+30);maxY=Math.max(maxY,g.cy+radius+30);}let result=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX-minX} ${maxY-minY}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="context-stroke"/></marker></defs>`;
    for(const g of geometries){const color=this.HighlightedEdges.has(g.edge)?'#0d9c92':'#64748b';let path,lx,ly;if(g.loop){const start=.25,end=Math.PI*1.9;path=`M${g.cx+Math.cos(start)*g.radius} ${g.cy+Math.sin(start)*g.radius} A${g.radius} ${g.radius} 0 1 1 ${g.cx+Math.cos(end)*g.radius} ${g.cy+Math.sin(end)*g.radius}`;lx=g.cx;ly=g.cy-g.radius-8;}else{path=`M${g.sx} ${g.sy} Q${g.cx} ${g.cy} ${g.tx} ${g.ty}`;lx=.25*g.sx+.5*g.cx+.25*g.tx;ly=.25*g.sy+.5*g.cy+.25*g.ty;}result+=`<path d="${path}" fill="none" stroke="${color}"${this._graph.IsDirected?' marker-end="url(#arrow)"':''}/><text x="${lx}" y="${ly-5}" text-anchor="middle" font-family="sans-serif" font-size="12">${escapeXml(this.EdgeLabel(g.edge)??'')}</text>`;}
    for(const[v,p]of this.Positions)result+=`<circle cx="${p.x}" cy="${p.y}" r="19" fill="${escapeXml(this.VertexColors.get(v)||'#fff')}" stroke="#64748b"/><text x="${p.x}" y="${p.y+4}" font-family="sans-serif" font-size="12" text-anchor="middle">${escapeXml(this.VertexLabel(v))}</text>`;return result+'</svg>';
  }

}
/** Register explicitly, enabling multiple versions and use without browser globals. */
export function defineQuikGraphViewer(name='quikgraph-viewer'){if(!globalThis.customElements)throw new Error('Custom elements require a browser.');if(!customElements.get(name))customElements.define(name,QuikGraphViewer);return QuikGraphViewer;}
