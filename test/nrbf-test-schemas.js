import { NrbfTypeRegistry } from '../src/nrbf.js';
import { Edge } from '../src/core.js';
export class NrbfTestVertex {
  Equals(other){return other instanceof NrbfTestVertex&&other.ID===this.ID;}
  GetHashCode(){let h=0;for(const c of this.ID)h=Math.imul(h,31)+c.codePointAt(0)|0;return h;}
  toString(){return this.ID;}
}
export class NrbfTestEdge extends Edge {
  Equals(other){return other instanceof NrbfTestEdge&&other.ID===this.ID;}
  GetHashCode(){let h=0;for(const c of this.ID)h=Math.imul(h,31)+c.codePointAt(0)|0;return h;}
}
export function createFixtureRegistry(){const registry=new NrbfTypeRegistry();for(const [name,C]of[['EquatableTestVertex',NrbfTestVertex],['EquatableTestEdge',NrbfTestEdge]])registry.Register('QuikGraph.Serialization.Tests.'+name,{create:()=>Object.create(C.prototype),populate:(target,members)=>{for(const[k,v]of Object.entries(members)){const prop=k.match(/<([^>]+)>k__BackingField$/)?.[1]??k;Object.defineProperty(target,prop,{value:v,writable:true,enumerable:true,configurable:true});}}});return registry;}
