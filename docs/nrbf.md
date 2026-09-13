# Native .NET binary graph interchange

QuikGraphWeb reads and writes the actual **MS-NRBF** object graph format used by .NET `BinaryFormatter`. The implementation is plain JavaScript. It does not embed a CLR, load assemblies named in a payload, invoke serialization constructors, or execute serialized delegates. This follows the data-record approach described in Microsoft's [NRBF reader guidance](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-migration-guide/read-nrbf-payloads) and the [MS-NRBF protocol specification](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-nrbf/75b9fe09-be15-475f-85b8-ae7b7558cfe5).

## Graph API

```js
import {
  BidirectionalGraph, TaggedEdge,
  SerializeNrbfGraph, DeserializeNrbfGraph,
} from '@wieslawsoltes/quikgraphweb';

const graph = new BidirectionalGraph(false);
graph.AddVertex('isolated');
graph.AddVerticesAndEdge(new TaggedEdge('alpha', 'beta', 2.5));

const bytes = SerializeNrbfGraph(graph);
const restored = DeserializeNrbfGraph(bytes);
console.log(restored.Edges[0].Tag); // 2.5
console.log(restored.ContainsVertex('isolated')); // true
```

`SerializeNrbf` and `DeserializeNrbf` also accept supported edge classes, lists, queues, dictionaries, Graphviz color/size values, arrays, and exceptions. The dedicated graph helpers check that the root is a supported graph. `ToNrbfRecord` exposes the generated CLR records. `GetNrbfMetadata` returns the original type and field metadata for a materialized value.

The graph helpers support `AdjacencyGraph`, `ArrayAdjacencyGraph`, `BidirectionalGraph`, `ArrayBidirectionalGraph`, `BidirectionalAdapterGraph`, `ReversedBidirectionalGraph`, `UndirectedBidirectionalGraph`, `UndirectedGraph`, `ArrayUndirectedGraph`, `BidirectionalMatrixGraph`, `CompressedSparseRowGraph`, `ClusteredAdjacencyGraph`, and `EdgeListGraph`. They preserve graph type, endpoints, isolated vertices where the graph supports them, loops, parallel edges, edge tags and terminal indices, reference identity, cluster children and parent references. Imported mutable graphs remain mutable; serialization reads their current contents.

The existing QuikGraph extension names use this implementation by default:

```js
import {
  NrbfMemoryStream, SerializeToBinary, DeserializeFromBinary,
} from '@wieslawsoltes/quikgraphweb';

const stream = new NrbfMemoryStream();
SerializeToBinary(graph, stream);
stream.Position = 0;
const restored = DeserializeFromBinary(stream);
```

`NrbfMemoryStream` implements `Read`, `Write`, `Seek`, `SetLength`, `ToArray`, `Position`, `Length`, `Flush`, `Close`, and `Dispose`. A stream can instead supply synchronous `Write(buffer, offset, count)`/`Read(buffer, offset, count)` callbacks, or a `write(bytes)` callback and byte-producing `read()`/`ToArray()` method. An explicit formatter still works as the final extension argument. `QuikGraphNrbfFormatter(options)` applies graph and custom-type options through these stream methods.

## CLR generic types and registered custom data

JavaScript erases generic type parameters. Primitive vertices and known edge classes are inferred from nonempty graphs. Numeric vertices and numeric tags promote to CLR `Double` when their values require it. Imported type metadata supplies generic arguments when reserializing empty imported objects. Fresh empty graphs default to `Int32` vertices and `EquatableEdge<Int32>` edges; fresh empty edge lists default to `Edge<Int32>` elements. Specify `vertexType`, `edgeType`, `tagType`, `keyType`, or `valueType` when inference does not convey the intended CLR contract. A type is a string such as `System.Int32`, or `{name, library}` with an assembly-qualified library identity. Nested generic names use normal CLR syntax.

User classes require explicit registration. Type names in a file alone never cause constructor lookup in the browser. For an existing CLR class, use its actual field names, declared primitive widths, and assembly identity. Auto-properties commonly serialize as `<Name>k__BackingField`, and inherited private fields can include a base-type prefix. `DecodeNrbf` exposes those exact names.

```js
import {
  NrbfTypeRegistry, NrbfBinaryType,
  SerializeNrbf, DeserializeNrbf,
} from '@wieslawsoltes/quikgraphweb';

class Node {
  constructor(name) { this.name = name; this.next = null; }
}
const registry = new NrbfTypeRegistry().Register('Example.Node', {
  library: 'Example, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null',
  matches: value => value instanceof Node,
  create: () => Object.create(Node.prototype),
  populate: (target, members) => Object.assign(target, members),
  serialize(value, convert, record) {
    // The record is reserved before conversion, so references can point back to it.
    record.Members.name = value.name;
    record.Members.next = convert(value.next);
    record.MemberTypes.name = {type: NrbfBinaryType.String};
    record.MemberTypes.next = {type: NrbfBinaryType.Object};
    return record;
  },
});
const node = new Node('cycle');
node.next = node;
const copy = DeserializeNrbf(SerializeNrbf(node, {registry}), {registry});
console.log(copy.next === copy); // true
```

`create`, `populate`, `serialize`, `matches`, and `resolveType` are application callbacks. Only callbacks the application explicitly supplies execute. A custom vertex can implement `Equals` and `GetHashCode` in its registered JavaScript prototype; imported graphs then use the existing QuikGraphWeb equality-aware dictionaries. `allowUnknownTypes: true` retains unknown types as inert `NrbfClass` records rather than inventing application behavior.

## Records and exact values

The `./nrbf` module exports `DecodeNrbf`, `EncodeNrbf`, `NrbfDocument`, `NrbfClass`, `NrbfArray`, `NrbfPrimitive`, `NrbfDecimal`, `NrbfDateTime`, `NrbfTypeRegistry`, and `NrbfFormatter`. `./binary-serialization` exports the graph and stream APIs above. Both sets are also available from the main package.

The codec supports typed class metadata and reused metadata IDs; system and assembly-qualified classes; strings; boxed primitives; object references; all object-graph array record forms; multidimensional, jagged, and nonzero-bound arrays; null runs; shared references and cycles. Types-always payloads generated by normal `BinaryFormatter` serialization are self-describing. Legacy untyped class records require the caller's `resolveMemberTypes(typeName, memberNames)` callback because their primitive member layout is absent from the stream.

`Int64`, `UInt64`, and `TimeSpan` ticks preserve integer precision through `bigint`. `NrbfDecimal` preserves representable decimal digits without passing through a JavaScript `number`. `NrbfDateTime` retains ticks and kind bits; it does not force a lossy conversion into `Date`. `NrbfPrimitive` retains boxed primitive width and kind, including a boxed `TimeSpan`. A raw `NrbfArray` exposes flattened `Values`, `Lengths`, `LowerBounds`, and `GetValue(...indices)`. Materialized arrays retain shape in the nonenumerable `NrbfShape` property and native metadata for re-emission.

QuikGraph exceptions are reconstructed as the corresponding JavaScript exception classes. `ClrTypeName`, `ClrStackTrace`, `HResult`, `Source`, and serialized exception data retain their native meaning. `ToString()` reproduces the retained CLR message/inner-exception text and stack data; a fresh browser error cannot manufacture a native CLR stack trace.

## Bounds and runtime boundaries

Default decoding limits are 64 MiB input, one million objects, ten million cells in one array, ten million array cells in total, 16 MiB per string, 100,000 members in one class, and 256 nested inline records. Graph materialization also limits aggregate constructed vertices to one million, aggregate expanded edges to ten million, and recursive materialization depth to 256. Configure `maxBytes`, `maxObjects`, `maxArrayLength`, `maxTotalArrayLength`, `maxStringBytes`, `maxMembers`, `maxDepth`, `maxGraphVertices`, and `maxGraphEdges` for your workload. Malformed records fail with `NrbfFormatError`. Invalid stream arguments and missing custom schemas fail explicitly. Matrix dimensions and CSR ranges are validated before graph allocation or edge expansion.

This API serializes graph data. It does not transfer JavaScript event listeners, closures, executable CLR delegates, remoting method calls, assembly loading, or CLR serialization callbacks. A raw record roundtrip can retain inert metadata that graph materialization does not execute. Logical graph event hooks are initialized for the new JavaScript instance. Registered custom schemas are the integration point for application-specific behavior. These runtime facilities are distinct from the tested NRBF graph data contract.

The pinned upstream `ForestDisjointSet` itself fails `BinaryFormatter` serialization because its nested `Element` is not marked serializable. The reference producer records this upstream failure; the implementation does not claim a working native interchange contract where the upstream library has none.

## Verification

[`test/fixtures/nrbf/manifest.json`](../test/fixtures/nrbf/manifest.json) records genuine reference bytes, SHA-256 digests, exact CLR root types, runtime versions, and public-value snapshots. The producer compiles the unchanged pinned QuikGraph source with its serialization-enabled .NET Standard feature symbols and original signing key. Fixtures cover every graph representation listed above, primitive and custom vertices, all edge variants, collections, Graphviz values, exceptions, reference cycles, and all primitive array types.

The native CI job runs three independent checks: decode/re-encode reference records; materialize reference records into actual JavaScript graph/value classes and emit new records; and construct fresh JavaScript objects without reading fixture bytes or retained metadata. A .NET reference process deserializes every emitted file and compares both its CLR root type and its public values. Commands and exact fixture provenance are in [`tools/nrbf-fixtures/README.md`](../tools/nrbf-fixtures/README.md).

`test/nrbf-graphs.test.js` now provides executable checks for all 21 source methods previously classified as requiring a BinaryFormatter host. This is source-method mapping plus native interoperability evidence. It does not assert that every original NUnit inherited case and parameter combination has been independently compared assertion for assertion. The one remaining runtime-only source test exercises an internal `ILGenerator`/`Reflection.Emit` path; it is listed in [`platform-test-boundaries.json`](platform-test-boundaries.json).
