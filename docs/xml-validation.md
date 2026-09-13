# Native GraphML XML Schema validation

QuikGraphWeb includes a real XML Schema 1.0 validator in WebAssembly. The optional `xml-validation` entry point loads libxml2-wasm 0.7.2 and validates against the same GraphML 1.1 schema resources embedded in the original QuikGraph serialization module. The complete `graphml.xsd` redefinition and imported structure and XLink schemas are compiled by libxml2; validation is not a list of selected GraphML checks.

The core graph algorithms do not load the XML engine. The published package includes the engine module and its embedded WebAssembly bytes, so using this feature requires no additional package installation, native executable, CDN request, or schema download. GraphML schemas use an in-memory resolver with fixed bundled resources. Document `xsi:schemaLocation` attributes cannot redirect validation to another schema. External DTDs and entities are not loaded.

## Reuse a compiled schema

```js
import { CreateGraphMLSchemaValidator } from '@wieslawsoltes/quikgraphweb/xml-validation';

const validator = await CreateGraphMLSchemaValidator();
try {
  const result = validator.Validate(xml, { filename: 'network.graphml' });
  if (!result.IsValid) {
    for (const error of result.Errors) {
      console.error(error.FileName, error.LineNumber, error.ColumnNumber, error.Message);
    }
  }

  // Throws GraphMLValidationError before invoking vertex/edge factories or changing a graph.
  const graph = validator.Deserialize(xml);
  const checkedXml = validator.Serialize(graph);
} finally {
  validator.Dispose();
}
```

Initialization is asynchronous because it loads WebAssembly. After initialization, validation uses a reusable compiled native schema synchronously. Reusing one validator avoids recompilation for batches. `Validate` returns an immutable `{ IsValid, Errors }` record, and `ValidateAndThrow` throws on validation failure. Diagnostics include libxml2's message, filename, line, column, severity, and XPath when available. An unavailable line or column is `0`; an unavailable XPath is `null`. An XML parser error can carry a column while an XSD attribute error commonly has only a line and XPath.

`Dispose()` and its `dispose()` alias release the compiled schema and can be called repeatedly. Every temporary document is released in `finally`, including parse and validation failures. Disposing one validator does not affect other validators. The engine and one immutable in-memory resource resolver remain cached in the JavaScript realm for reuse; the code does not clear the process-wide libxml input-provider registry because the host may have registered other providers. Terminating a worker releases its entire engine realm.

Supported inputs are XML strings, UTF-8 `Uint8Array`/`ArrayBuffer` values, XML DOM documents/elements, and synchronous readers exposing `ReadToEnd()`. Convenience deserialization consumes a reader exactly once. Browser `File`/`Blob` values can be read with `await file.text()` before validation.

## One document

```js
import {
  ValidateGraphMLSchema,
  DeserializeAndValidateGraphML,
} from '@wieslawsoltes/quikgraphweb/xml-validation';

const result = await ValidateGraphMLSchema(xml);
const graph = await DeserializeAndValidateGraphML(xml);
```

These helpers create and dispose their schema automatically. For repeated validation use a reusable validator. The older synchronous `DeserializeAndValidateFromGraphML` API accepts an explicit synchronous `validateSchema` callback. Pass either `xml => validator.ValidateAndThrow(xml)` or `xml => validator.Validate(xml)` after initializing a native validator. The callback can throw, return `false`, or return `{ IsValid: false, Errors }` to reject a document. Returned diagnostics are preserved on the thrown `SyntaxError.Errors`. Void, null, `true`, and `{ IsValid: true }` results permit conversion. An absent/null callback retains the existing structural and lexical validation behavior.

That synchronous API rejects Promise/thenable results before invoking graph factories or mutating the destination; it does not pretend an asynchronous callback has completed. Rejections from actual returned promises are observed to avoid an unhandled rejection, and a plain thenable's continuation is never invoked. Use `DeserializeAndValidateGraphML` when native engine initialization should be asynchronous. Both callback validation and subsequent parsing receive the same text, and a stateful `ReadToEnd` reader is consumed once.

## Browser and worker use

```html
<script type="module">
  import { CreateGraphMLSchemaValidator } from './dist/xml-validation.js';
  const validator = await CreateGraphMLSchemaValidator();
  // Use validator.Validate(text); dispose it when the view is closed.
</script>
```

The package's `dist/vendor` directory must be served alongside `dist/xml-validation.js`. A bundler can instead consume the npm subpath. `engineUrl` or `engineLoader` can select a separately hosted compatible libxml2-wasm module when needed.

The same API works in a module Web Worker and Node worker threads and requires no DOM globals. For large documents, initialize a validator once inside a worker and send XML strings through `postMessage`; synchronous native validation then runs off the UI thread. Cancellation can be implemented by terminating that worker. This module does not create a hidden worker or promise asynchronous execution after initialization.

## Schema validity and graph conversion

Validation checks the original XSD's content models, required and forbidden attributes, enumerations and numeric facets, identity uniqueness, and edge endpoint key references. Examples that the nonvalidating GraphML reader can accept but XSD rejects include `parse.nodes="-1"`, `parse.order="sorted"`, unknown graph attributes, and node IDs containing spaces.

The official GraphML XSD permits nested graphs, ports, and hyperedges. The validator validates them, while conversion to QuikGraph's flat graph model still rejects these constructs, matching the original serializer's scope. XSD validity and graph conversion are separate operations.

GraphML's `attr.type` is metadata: the official XSD does not dynamically type the text in each `<data>` element based on a key declaration. `Deserialize` additionally applies QuikGraph's property conversions and key-scope checks, so an XSD-valid string can still fail an integer conversion. The validator does not claim checks the official schema does not express.

The old upstream `g.*.graphml` fixtures predate the modern GraphML namespace and required `edgedefault` attribute. They do not become XSD-valid by enabling `allowLegacy`. Tests read them with the existing explicit legacy reader, serialize strict GraphML, validate that output, and confirm topology counts after deserialization. No input namespace or attribute is silently repaired by schema validation.

External resources and DTD entities are not expanded. A document relying on an unresolved entity cannot be validated successfully; libxml2 can report this as an input/internal validation error without a source location. The XML Schema implementation is libxml2's XSD 1.0 implementation, not XSD 1.1; it does not support XSD 1.1 assertions or override constructs.

## Verification and provenance

The native integration tests cover all 1,277 original graph corpus files after explicit legacy conversion; malformed XML; numeric and enumeration facets; required/unknown attributes; duplicate identities and unresolved endpoint references; nested graph/port/hyperedge validity; graph conversion ordering; no document-controlled network reads; immutable diagnostic locations; repeat disposal with libxml2's native allocation tracker; independent validator lifetimes; and actual validation in a Node worker thread. Browser validation is also exercised in the sample-app integration checks.

Engine source and API: [libxml2-wasm](https://github.com/jameslan/libxml2-wasm). Schema provenance: the GraphML resources in the pinned [QuikGraph Serialization source](https://github.com/KeRNeLith/QuikGraph/tree/9cd6b49292e09041258708a37bed99c56177b0ef/src/QuikGraph.Serialization). Both libxml2-wasm and libxml2 license texts are included with the distributed vendor engine.
