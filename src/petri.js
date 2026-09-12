/** High-level Petri net semantics ported from QuikGraph.Petri. */
import { BidirectionalGraph, Edge, equals } from './core.js';
const required=(v,name='value')=>{if(v==null)throw new TypeError(`${name} cannot be null`);return v;};
/** Array with the upstream IList vocabulary; ordinary push/splice iteration also works. */
export class TokenList extends Array {
  static get [Symbol.species](){return Array;}
  get Count(){return this.length;} Add(v){this.push(v);} AddRange(values){for(const value of values)this.push(value);} Clear(){this.length=0;}
  Remove(value){const i=this.IndexOf(value);if(i<0)return false;this.splice(i,1);return true;} Contains(v){return this.IndexOf(v)>=0;}IndexOf(v){return this.findIndex(item=>equals(item,v));}get IsReadOnly(){return false;}Insert(index,value){if(!Number.isInteger(index)||index<0||index>this.length)throw new RangeError('Index out of range');this.splice(index,0,value);}RemoveAt(index){if(!Number.isInteger(index)||index<0||index>=this.length)throw new RangeError('Index out of range');this.splice(index,1);}CopyTo(array,index=0){if(index<0||array.length-index<this.length)throw new RangeError('Destination array is too small');for(let i=0;i<this.length;i++)array[index+i]=this[i];}
}
export class IdentityExpression { Evaluate(markings){return required(markings,'markings');} }
export class AlwaysTrueConditionExpression { IsEnabled(){return true;} }
export class Place {
  constructor(name){this.Name=required(name,'name');this.Marking=new TokenList();}
  ToString(){return `P(${this.Name}|${this.Marking.length})`;} toString(){return this.ToString();}
  ToStringWithMarking(){return this.ToString()+(this.Marking.length?'\n\t'+this.Marking.map(t=>t?.constructor?.name??typeof t).join('\n\t'):'');}
}
export class Transition {
  constructor(name){this.Name=required(name,'name');this.Condition=new AlwaysTrueConditionExpression();}
  get Condition(){return this._condition;}set Condition(v){this._condition=required(v,'Condition');}
  ToString(){return `T(${this.Name})`;}toString(){return this.ToString();}
}
export class Arc extends Edge {
  constructor(first,second){required(first);required(second);const input=first instanceof Place || ('Marking' in first);const place=input?first:second,transition=input?second:first;
    // Upstream represents both arc orientations as Place -> Transition in Graph.
    // IsInputArc determines simulation direction and ToString output.
    super(place,transition);this.Place=place;this.Transition=transition;this.IsInputArc=input;this.Annotation=new IdentityExpression();}
  get Annotation(){return this._annotation;}set Annotation(v){this._annotation=required(v,'Annotation');}
  ToString(){return this.IsInputArc?`${this.Place} -> ${this.Transition}`:`${this.Transition} -> ${this.Place}`;}toString(){return this.ToString();}
}
export class PetriGraph extends BidirectionalGraph { constructor(){super(true);} }
export class PetriNet {
  constructor(){this._places=[];this._transitions=[];this._arcs=[];this.Graph=new PetriGraph();}
  get Places(){return this._places.values();}get Transitions(){return this._transitions.values();}get Arcs(){return this._arcs.values();}
  AddPlace(name){const p=new Place(name);this.Graph.AddVertex(p);this._places.push(p);return p;}
  AddTransition(name){const t=new Transition(name);this.Graph.AddVertex(t);this._transitions.push(t);return t;}
  AddArc(first,second){const arc=new Arc(first,second);if(!this._places.includes(arc.Place)||!this._transitions.includes(arc.Transition))throw new Error('Arc endpoints must belong to this net');this.Graph.AddEdge(arc);this._arcs.push(arc);return arc;}
  Clone(){const result=new PetriNet();result._places.push(...this._places);result._transitions.push(...this._transitions);result._arcs.push(...this._arcs);result.Graph.AddVertexRange(this.Graph.Vertices);result.Graph.AddEdgeRange(this.Graph.Edges);return result;}
  ToString(){return '-----------------------------------------------\n'+`Places (${this._places.length})\n`+this._places.map(p=>`\t${p.ToStringWithMarking()}\n\n`).join('')+`Transitions (${this._transitions.length})\n`+this._transitions.map(t=>`\t${t}\n\n`).join('')+'Arcs\n'+this._arcs.map(a=>`\t${a}\n`).join('');}toString(){return this.ToString();}
}
const evaluate=(expression,tokens)=>typeof expression==='function'?expression(tokens):expression.Evaluate(tokens);
const enabled=(condition,tokens)=>typeof condition==='function'?condition(tokens):condition.IsEnabled(tokens);
/** Synchronous four-phase execution, including upstream shared-input conflict semantics. */
export class PetriNetSimulator {
  constructor(net){this.Net=required(net,'net');this._buffers=new Map();}
  Initialize(){this._buffers.clear();for(const t of this.Net.Transitions)this._buffers.set(t,{Tokens:new TokenList(),Enabled:false});}
  SimulateStep(){
    const transitions=[...this.Net.Transitions],arcs=[...this.Net.Arcs];
    for(const t of transitions)if(!this._buffers.has(t))throw new Error('Initialize simulator after changing transitions');
    for(const arc of arcs)if(arc.IsInputArc)this._buffers.get(arc.Transition).Tokens.AddRange(evaluate(arc.Annotation,arc.Place.Marking));
    for(const t of transitions){const b=this._buffers.get(t);b.Enabled=!!enabled(t.Condition,b.Tokens);}
    for(const arc of arcs){const b=this._buffers.get(arc.Transition);if(!b.Enabled)continue;if(arc.IsInputArc){const annotated=evaluate(arc.Annotation,arc.Place.Marking);if(annotated===arc.Place.Marking)arc.Place.Marking.length=0;else{const selected=[...annotated];for(const token of selected){const i=arc.Place.Marking.findIndex(value=>equals(value,token));if(i>=0)arc.Place.Marking.splice(i,1);}}}else for(const token of evaluate(arc.Annotation,b.Tokens))arc.Place.Marking.push(token);}
    for(const b of this._buffers.values()){b.Tokens.length=0;b.Enabled=false;}
  }
}
