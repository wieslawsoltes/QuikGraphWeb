# Verification

QuikGraphWeb is validated through executable JavaScript tests, preserved upstream input data, mathematical reference checks, installed-package consumers, and browser integration tests. These provide different kinds of evidence. An exported class name or a source-test reference does not establish complete .NET behavioral or overload compatibility.

The reference source is QuikGraph commit `9cd6b49292e09041258708a37bed99c56177b0ef`. The source inventories cover its six maintained projects: Core, Graphviz, Serialization, Data, MSAGL, and Petri. Historical code under `src/Tmp` is outside that inventory.

## Reproduce the checks

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm run benchmark
```

`npm run check` builds the distributions and declarations, runs the JavaScript tests, generates the conformance audit, exercises installed-package consumers, and builds the showcase. The browser command is a separate check. CI runs the release verification on Node 22 and 24 and uploads its logs, audit output, browser screenshots, and other artifacts. Check the CI run attached to the exact release commit for the aggregate test total and final browser result; counts change as additional cases are added.

`docs/upstream-tests.tar.gz` preserves the original C# tests as reference material. It is not an executable test port. Node discovers and runs the `.test.js` and `.spec.js` files under `test/`.

## How to interpret the audit

`npm run audit` writes `test-results/conformance-audit.json` and `test-results/missing-members.json`. It also saves the identical [full report](conformance-audit.json) and a compact [count summary](conformance-summary.json) under `docs/`, so the checked source and npm package include reviewable audit evidence. The summary includes the full report's SHA-256 digest. Outputs contain no timestamps and preserve the exact recorded execution evidence. The report records Node version, test-file SHA-256 hashes and the test-event stream digest; event ordering may differ between independent runs. Passing test-name mappings are ignored when the corresponding test file changed after the recorded run. CI also uploads the generated verification artifacts. The JSON source inventories under `docs/` describe the pinned upstream source and retain their initial unverified/unported status; current source mappings are in the report.

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| Runtime export exists | A public name can be imported | Equivalent constructor overloads, defaults, results, or complexity |
| Runtime member name exists | Reflection or constructor-source inspection found the member name | Correct instance initialization, parameter rules, event timing, or behavior |
| TypeScript contract exists | The declaration name is available | CLR reflection, variance, exhaustive generic inference, or complete overload parity |
| Source test is mapped | A JavaScript test file references an original NUnit method and exercises related behavior | Every assertion, inherited fixture, parameter value, or exception subclass has been reproduced |
| JavaScript test passes | The executed assertions passed for the checked source and environment | All possible inputs, browser engines, host adapters, or deployment environments work |
| Original graph fixture passes | The tested operations work on that preserved graph | Exhaustive coverage of graphs with the same size or every algorithm family |

The historical 0.1.0 verification snapshot passed **8,379 executable JavaScript tests**. Its source audit maps **1,917 upstream methods** to JavaScript checks and gives the remaining **22 methods** explicit CLR host-runtime dispositions; no source methods lack a disposition. These mappings remain subject to the behavioral limits below.

The inventory contains **1,939 original NUnit test methods**, before inherited fixtures and parameter expansion. Node's reported test total includes generated cases and fixture subtests, so it is not directly comparable with that source-method count. A single JavaScript test can check several source methods, and one source fixture can generate many executable cases. The audit conservatively leaves full assertion-for-assertion port verification at zero; it does not convert name or comment coverage into a conformance percentage.

The [historical 0.1.0 platform-test dispositions](https://github.com/wieslawsoltes/QuikGraphWeb/blob/v0.1.0/docs/platform-test-boundaries.json) identified 22 methods requiring CLR facilities. The 0.2.0 work adds executable mappings for all 21 BinaryFormatter methods and reduces the remaining host-only disposition to one Reflection.Emit IL-generation method. Each current disposition retains the exact source identity, pinned link, implementation evidence and reason. These methods remain in the 1,939-method inventory. A method mapping records related executed behavior; it is not a claim that every inherited NUnit fixture and parameter has been reproduced. The aggregate JavaScript test count and current mapping totals come from the final release's generated audit and CI run.

Primary graph and shortest-path declarations have explicit vertex/edge types, including installed-consumer negative type checks. The optional runtime and binary entry points also have explicit public declarations and positive/negative consumer checks. Other declarations are inferred from JavaScript and may expose `any`, broad constructor arguments, or fewer type relationships than the C# API. Passing the TypeScript consumers establishes the exercised import and type contracts, not full compile-time parity.

The 0.2.0 verification snapshot passes **8,612 executable JavaScript tests**. It maps **1,938 source methods** with the single private Reflection.Emit disposition. Native .NET CI independently verifies **224 binary interchange cases**. CI fails if a source method loses its mapping/disposition, a mapped test file changes after the recorded passing run, or a public source name disappears. These gates enforce traceability and tested coverage, not assertion-for-assertion NUnit equivalence.

## Algorithm evidence

The original fixture directory contains **1,277 valid `g.*.graphml` algorithm graphs**, the DCT8 graph, and additional valid and intentionally malformed serialization fixtures. All 1,288 original files are retained under `test/fixtures/GraphML/`. Controlled legacy algorithm fixtures are extracted independently in the algorithm tests; their external DTD declarations are never fetched.

The structural matrix runs every `g.*.graphml` graph through connected, weak, and strong components; directed and undirected topological variants; backward ordering; strong and weak condensation; Prim and Kruskal forests; and transitive closure/reduction. Independent reachability traversals check component equivalence and transitive results. Both MST implementations are compared on the corpus, with exhaustive spanning-tree subset optimization on additional small weighted graphs to provide an oracle independent of either implementation.

Tarjan offline LCA is checked against independently constructed DFS-parent chains. Its original slow-corpus sampling runs every fifth fixture, up to the first 12 roots, and every ordered vertex pair. Additional branching-tree tests check every pair, equivalent edge-pair keys, unreachable vertices, and self queries. Long-chain tests with 15,000 vertices exercise iterative traversal without depending on the JavaScript call stack.

Shortest-path and traversal tests additionally use all-root corpus checks and independent reachability/min-plus reference calculations. Small-instance optimization checks enumerate assignments, cuts, tours, or path candidates where appropriate. Generated cases exercise negative weights, reachable negative cycles, isolated vertices, parallel edges, self-loops, object vertices, and `NaN` keys. These checks are input-specific; exponential algorithms still have exponential worst-case cost.

The extension-wrapper tests cover all 67 public test methods in upstream `AlgorithmExtensionsTests.cs` with source-linked cases. They verify constructor routing, directed/undirected dispatch, forward/backward sorting, result records, dictionary output, disposable observers, optional parameters, and null combinations. Additional regressions check mixed-type identity uniqueness, FNV-1 hash vectors, and reconstruction from the final cycle-popping successor tree.

## Native runtime and binary interoperability evidence

| Area | Executed evidence | Scope |
| --- | --- | --- |
| Graphviz | Bundled WASM engine execution across advertised layout engines; geometry, rank direction, multiple formats, loops, parallel edges, clusters, formatting events, diagnostics and worker checks | The packaged Graphviz/Viz build and advertised native formats; browser raster output uses SVG decoding and canvas |
| MSAGL.js | Actual published Microsoft engine across three layout algorithms, six supported routing modes and four directions; finite geometry, component packing, clusters, labels, constraints and SVG paths | Published MSAGL.js capabilities, with documented wrapper constraints and engine limitations |
| GraphML XSD | Native libxml2 validation of every one of the 1,277 legacy corpus graphs after explicit strict serialization; facets, content models, identities, endpoint references, error locations, worker execution and allocation tracking | Original GraphML schemas under XML Schema 1.0; no assertion that XSD defines property conversions it does not express |
| MS-NRBF | 85 original CLR fixtures, 85 reconstructed JavaScript-object outputs and 54 independently created JavaScript outputs accepted by the CLR verifier | 224 cross-runtime checks of supported concrete CLR types, values, references and cycles |

The NRBF fixtures were produced by Microsoft's BinaryFormatter against the original pinned QuikGraph source, its original assembly identity and signing key, hosted on .NET 8. Their manifest records hashes and expected public values. The raw-record pass checks decode/re-encode interoperability. The materialization pass reconstructs JavaScript graphs and objects before writing. The 54 fresh cases construct objects solely through the JavaScript API without reading reference bytes or metadata, so CLR acceptance is independent evidence for the writer rather than preservation of existing serialized records. The CLR verifier checks concrete root types, public snapshots, and explicit identity/cycle relationships. See [fixture generation and cross-runtime verification](https://github.com/wieslawsoltes/QuikGraphWeb/blob/main/tools/nrbf-fixtures/README.md) for exact commands and [binary scope](nrbf.md) for supported types.

The native XSD suite also verifies that failures precede graph mutation/factories/writers and that repeated success, parse failure, schema failure and disposal leave no tracked native documents or compiled schemas. Callback regressions confirm that an asynchronous result cannot be mistaken for completed validation. Graphviz releases wrapper references on disposal; its underlying WASM heap is garbage-collected because Viz does not expose a native heap destructor. Those two lifecycle claims are intentionally distinct.

## Package and browser evidence

Installed-package checks pack the distribution and install it into a separate consumer directory. They exercise ESM and CommonJS graph algorithms and optional runtime entry points, import browser ESM bundles, load the standalone core global bundle, and compile strict TypeScript ESM/CommonJS consumers. Self-contained engine imports are checked after packaging so missing vendor files or undeclared dependencies cannot be hidden by the development checkout. This catches packaging, export, declaration, and missing-file problems that a source-tree import alone would miss. The standalone bundle check in Node's VM is not a DOM-rendering test.

The browser suite serves the built 42-scenario showcase in Chromium and exercises graph editing, endpoint selection, code/API views, viewport controls, SVG download, light/dark themes, mobile-width layout, and worker imports. The new runtime scenarios expose editable Graphviz DOT and raster/vector downloads, MSAGL algorithm/direction/routing controls, native GraphML validation and NRBF file interchange. Viewer checks cover paginated vertex/edge inspection, keyboard selection and edit requests, native layout geometry, responsive framing, cancellation and stale-result rejection. Screenshots document the rendered state of the exact run. The final release CI artifacts establish which checks passed for that commit.

This evidence does not qualify Firefox/WebKit, physical touch/pen devices, assistive-technology usability or production-scale sessions. The viewer renders through Canvas 2D; WebGPU performance is not claimed. Supplied DataSet-shaped models remain JavaScript adapters, and arbitrary CLR assemblies or serialization callbacks are not executed by the browser library. Complete assertion-for-assertion NUnit and native plugin compatibility remain outside the verification claim.

## Performance observation

The following is one local run of `node scripts/benchmark.mjs` using Node **v24.19.0**, Linux x64. The graph has 50,000 vertices and 99,997 directed edges. Each measured operation checks its result before the observation is reported.

| Operation | Elapsed time | Correctness check |
| --- | ---: | --- |
| Build the graph | 139.435 ms | 50,000 vertices, 99,997 edges |
| Breadth-first traversal | 42.489 ms | All 50,000 vertices discovered |
| Dijkstra | 51.641 ms | Final shortest distance equals 49,999 |
| Strongly connected components | 80.148 ms | Exactly 50,000 components |
| Compressed sparse row conversion | 19.636 ms | All 99,997 edges retained |

These observations include allocation and JIT effects and can vary substantially with the machine, workload, engine, and concurrent activity. They are not browser measurements, percentile latency guarantees, or comparisons against .NET QuikGraph or another JavaScript library. CI produces a fresh observation for the checked release source.

## Remaining qualification

The release does not claim assertion-for-assertion execution of the complete NUnit suite, CLR-wide equality/overload behavior, arbitrary native/CLR plugin compatibility, or production-scale browser qualification. Review the generated unmapped-method list, [compatibility](compatibility.md), and CI artifacts together when assessing a particular application. A mapped test can still leave source branches unverified, while an unmapped source method may overlap independent tests elsewhere.
