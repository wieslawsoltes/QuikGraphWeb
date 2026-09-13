# QuikGraphWeb 0.2.0

This release completes the remaining usable engine integrations and binary interchange for the web port of QuikGraph's maintained Core, Graphviz, Serialization, Data, MSAGL and Petri modules.

Install `npm install @wieslawsoltes/quikgraphweb@0.2.0`. The release includes native ESM, CommonJS, standalone browser bundles, explicit TypeScript declarations for the new APIs, source, documentation and 42 runnable examples. Browser and showcase archives are included as separate assets, with SHA-256 checksums.

- `graphviz-runtime`: actual Graphviz 16.0.0 WebAssembly rendering, all advertised engines and native formats, SVG/JSON and browser raster export.
- `layout`: actual Microsoft MSAGL.js layouts, routing, labels, clusters, exact geometry and explicit positioning constraints.
- `xml-validation`: actual libxml2 GraphML XML Schema validation, structured diagnostics and checked serialization/deserialization.
- `nrbf` and `binary-serialization`: actual .NET binary-format interchange, registered QuikGraph types, primitive arrays, custom schemas, identity and cycles; also exported from the main package.
- The viewer integrates native layout geometry and searchable keyboard/ARIA inspection. The sample exposes native rendering, layout, validation and binary import/export.

The release passes **8,612 JavaScript tests** and **224 actual .NET interoperability checks**. The source audit accounts for all 1,939 original NUnit methods: 1,938 have executable JavaScript mappings and one tests the private CLR Reflection.Emit backend. The 21 former BinaryFormatter boundaries now have source-linked JavaScript checks using genuine CLR fixtures. Mappings do not claim mechanically verified assertion-for-assertion NUnit equivalence.

Validation includes the original graph corpus, independent mathematical checks, actual native engines, isolated installed-package consumers, strict positive/negative TypeScript consumers, Chromium interactions and original .NET object reconstruction in both directions. The native .NET interoperability job blocks distribution if any cross-runtime case fails. CI verifies the exact release commit and publishes the same checked tarball with npm provenance.

Optional engine payloads load through separate entry points. Their original licenses and corresponding-source links accompany the npm and browser distributions. Read `docs/compatibility.md`, `docs/verification.md`, `docs/nrbf.md` and `THIRD_PARTY_NOTICES.md` for exact scope, runtime adaptations and evidence. The preserved C# reference archive is not counted as executed JavaScript tests.
