import type {IEdge,IGraph} from './core.js';
import type {NrbfOptions,NrbfMaterializationOptions,NrbfTypeRegistry,NrbfClass,NrbfDocument,NrbfArray,NrbfBytes,NrbfReadableStream,NrbfWritableStream} from './nrbf.js';
export interface NrbfClrType {name:string;library:string;}
export interface QuikGraphNrbfOptions extends NrbfOptions,NrbfMaterializationOptions {maxGraphVertices?:number;maxGraphEdges?:number;registry?:NrbfTypeRegistry;vertexType?:string|NrbfClrType;edgeType?:string|NrbfClrType;tagType?:string|NrbfClrType;keyType?:string|NrbfClrType;valueType?:string|NrbfClrType;toRecord?:(value:object,convert:(value:unknown)=>unknown,reserve:(record:NrbfClass)=>NrbfClass)=>NrbfClass;}
export declare function GetNrbfMetadata(value:unknown):NrbfClass|NrbfArray|undefined;
export declare function ToNrbfRecord(value:unknown,options?:QuikGraphNrbfOptions):unknown;
export declare function SerializeNrbf(value:unknown,options?:QuikGraphNrbfOptions):Uint8Array;
export declare function DeserializeNrbf<T=unknown>(bytes:NrbfBytes|NrbfDocument|NrbfClass|NrbfArray,options?:QuikGraphNrbfOptions):T;
export declare function SerializeNrbfGraph<TVertex,TEdge extends IEdge<TVertex>>(graph:IGraph<TVertex,TEdge>,options?:QuikGraphNrbfOptions):Uint8Array;
export declare function DeserializeNrbfGraph<TGraph extends IGraph<any,any>=IGraph<any,any>>(bytes:NrbfBytes|NrbfDocument|NrbfClass,options?:QuikGraphNrbfOptions):TGraph;
export declare class QuikGraphNrbfFormatter {constructor(options?:QuikGraphNrbfOptions);Options:QuikGraphNrbfOptions;Serialize(value:unknown,stream?:NrbfWritableStream):Uint8Array;Deserialize<T=unknown>(stream:NrbfBytes|NrbfReadableStream):T;}

export declare class NrbfMemoryStream implements NrbfReadableStream,NrbfWritableStream {constructor(bytesOrCapacity?:NrbfBytes|number,options?:{maxBytes?:number});readonly CanRead:boolean;readonly CanWrite:boolean;readonly CanSeek:boolean;readonly Length:number;Position:number;Read(buffer:Uint8Array,offset:number,count:number):number;Write(buffer:Uint8Array,offset?:number,count?:number):void;Seek(offset:number,origin?:0|1|2|'Begin'|'Current'|'End'):number;SetLength(length:number):void;ToArray():Uint8Array;Flush():void;Dispose():void;Close():void;}
