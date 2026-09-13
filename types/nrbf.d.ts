export declare const NrbfPrimitiveType: Readonly<{Boolean:1;Byte:2;Char:3;Decimal:5;Double:6;Int16:7;Int32:8;Int64:9;SByte:10;Single:11;TimeSpan:12;DateTime:13;UInt16:14;UInt32:15;UInt64:16;Null:17;String:18}>;
export declare const NrbfBinaryType: Readonly<{Primitive:0;String:1;Object:2;SystemClass:3;Class:4;ObjectArray:5;StringArray:6;PrimitiveArray:7}>;
export interface NrbfMemberType {type:number;primitive?:number;name?:string;library?:string;}
export declare class NrbfFormatError extends Error {constructor(message:string);}
export declare class NrbfPrimitive<T=unknown> {constructor(type:number,value:T);Type:number;Value:T;valueOf():T;toString():string;}
export declare class NrbfDecimal {constructor(value:string|number|bigint);Value:string;toString():string;}
export declare class NrbfDateTime {constructor(data:bigint|string|number);Data:bigint;readonly Ticks:bigint;readonly Kind:number;}
export declare class NrbfClass {constructor(typeName:string,members?:Record<string,unknown>,memberTypes?:Record<string,NrbfMemberType>,libraryName?:string|null);TypeName:string;LibraryName:string|null;Members:Record<string,any>;MemberTypes:Record<string,NrbfMemberType>;IsValueType?:boolean;}
export interface NrbfArrayOptions {lengths?:number[];lowerBounds?:number[];arrayType?:number;elementType?:NrbfMemberType;}
export declare class NrbfArray<T=unknown> implements Iterable<T> {constructor(values?:Iterable<T>,options?:NrbfArrayOptions);Values:T[];Lengths:number[];LowerBounds:number[];ArrayType:number;ElementType:NrbfMemberType;GetValue(...indices:number[]):T;[Symbol.iterator]():Iterator<T>;}
export declare class NrbfDocument<T=unknown> {constructor(root:T,objects?:Map<number,unknown>,libraries?:Map<number,string>);Root:T;Objects:Map<number,unknown>;Libraries:Map<number,string>;}
export interface NrbfOptions {maxBytes?:number;maxObjects?:number;maxArrayLength?:number;maxTotalArrayLength?:number;maxStringBytes?:number;maxMembers?:number;maxDepth?:number;allowTrailingBytes?:boolean;resolveMemberTypes?:(typeName:string,memberNames:string[])=>NrbfMemberType[];}
export interface NrbfSchema<T extends object=any> {library?:string;memberTypes?:Record<string,NrbfMemberType>;matches?:(value:object)=>boolean;create:(record:NrbfClass)=>T;populate:(target:T,members:Record<string,any>,record:NrbfClass)=>void;serialize?:(value:T,convert:(value:unknown)=>unknown,record:NrbfClass)=>NrbfClass;}
export interface NrbfMaterializationOptions {allowUnknownTypes?:boolean;resolveType?:(typeName:string,libraryName:string|null)=>NrbfSchema|undefined;}
export declare class NrbfTypeRegistry {Types:Map<string,NrbfSchema>;Register<T extends object>(typeName:string,schema:NrbfSchema<T>):this;Materialize<T=unknown>(document:NrbfDocument|unknown,options?:NrbfMaterializationOptions):T;}
export type NrbfBytes=ArrayBuffer|ArrayBufferView;
export interface NrbfWritableStream {CanWrite?:boolean;Write?:(buffer:Uint8Array,offset:number,count:number)=>unknown;write?:(buffer:Uint8Array)=>unknown;}
export interface NrbfReadableStream {CanRead?:boolean;Read?:(buffer:Uint8Array,offset:number,count:number)=>number;ToArray?:()=>NrbfBytes;read?:()=>NrbfBytes;}
export declare function DecodeNrbf<T=unknown>(bytes:NrbfBytes,options?:NrbfOptions):NrbfDocument<T>;
export declare function EncodeNrbf(value:unknown,options?:NrbfOptions):Uint8Array;
export interface NrbfFormatterOptions extends NrbfOptions,NrbfMaterializationOptions {registry?:NrbfTypeRegistry;toRecord?:(value:unknown)=>unknown;}
export declare class NrbfFormatter {constructor(options?:NrbfFormatterOptions);Options:NrbfFormatterOptions;Registry:NrbfTypeRegistry|null;Serialize(value:unknown,stream?:NrbfWritableStream):Uint8Array;Deserialize<T=unknown>(stream:NrbfBytes|NrbfReadableStream):T;}
