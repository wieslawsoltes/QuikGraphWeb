# Changelog

## 0.2.0

- Bundled Graphviz 16.0.0 WASM engine with all advertised engines and native formats, SVG/JSON geometry, browser raster export, diagnostics, workers and lifecycle APIs.
- Bundled Microsoft MSAGL.js layout with Sugiyama, MDS and IPSepCola, six routing modes, labels, nested clusters, exact SVG geometry and explicit positioning constraints.
- Native libxml2 WASM validation against the original GraphML schemas, structured diagnostics, reusable validators and validation before graph mutation. Synchronous schema callbacks now reject invalid and asynchronous results correctly.
- Actual MS-NRBF/BinaryFormatter wire-format reading and writing, QuikGraph object reconstruction, explicit custom-type registries, primitive values and arrays, reference identity and cycles. Independent .NET interoperability checks gate distribution and publication.
- Viewer keyboard and screen-reader graph inspection, paginated vertex/edge lists, asynchronous layout integration, cancellation and stale-result protection, and native node/edge/cluster rendering.
- Expanded graph laboratory to 42 examples with editable native-engine inputs, layout controls, schema diagnostics and binary import/export.
- Explicit TypeScript contracts and installed ESM/CommonJS tests for every new entry point. Consumer installations are isolated from development dependencies.
- Separate optional engine bundles, pinned build dependencies and complete bundled-engine license notices. Existing core graph/algorithm APIs remain available from the main entry point.
- Source-linked binary tests replace 21 former CLR BinaryFormatter dispositions. The private Reflection.Emit backend test remains platform-specific; full assertion-for-assertion NUnit equivalence is not claimed.

## 0.1.0

- Initial JavaScript adaptation of QuikGraph's six maintained modules, pinned to upstream commit `9cd6b49292e09041258708a37bed99c56177b0ef`.
- Graph representations, edge families, priority queues and heaps, traversal/path/structural/optimization algorithms, observers and services.
- Graphviz, GraphML/XML/DGML, DataSet-shaped adapters, MSAGL drawing bridge and Petri-net simulation.
- Reusable graph viewer and 38 executable laboratory examples in light and dark themes.
- Source-linked tests, full upstream graph fixture corpus, independent graph oracles, API/test inventory, strict package declaration/consumer validation.
- ESM/CommonJS/browser distributions with an exact-tarball GitHub release and npm provenance publication pipeline.
- Documented .NET runtime adaptations, external layout/binary-serialization adapters and remaining assertion-level test parity limits.
