# QuikGraphWeb 0.1.0

Initial reusable JavaScript graph library and interactive graph laboratory, adapting QuikGraph's maintained Core, Graphviz, Serialization, Data, MSAGL and Petri modules.

Install `npm install @wieslawsoltes/quikgraphweb`. The release includes native ESM, CommonJS, standalone browser bundles, TypeScript declarations, source, documentation and 38 runnable examples. Browser and showcase archives are included as separate assets, with SHA-256 checksums.

The prepared release passes 8,379 JavaScript tests. The source audit accounts for all 1,939 NUnit methods: 1,917 have executable JavaScript mappings and 22 require the CLR host facilities listed in `docs/platform-test-boundaries.json`. Mappings do not claim mechanically verified assertion-for-assertion NUnit equivalence.

Validation includes source-linked JavaScript tests, the original GraphML graph corpus, mathematical oracles for core graph algorithms, installed-package consumer tests, and Chromium integration checks. CI verifies the release commit and publishes the exact release tarball with npm provenance.

Read `docs/compatibility.md` for JavaScript identity/out-parameter conventions, external-engine adapters, intentional upstream bug fixes, algorithm complexity and remaining assertion-level .NET conformance limits. The preserved C# test corpus is reference material and is not counted as executed JavaScript tests.
