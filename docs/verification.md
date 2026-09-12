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

The 0.1.0 verification snapshot passes **8,379 executable JavaScript tests**. Its source audit maps **1,917 upstream methods** to JavaScript checks and gives the remaining **22 methods** explicit CLR host-runtime dispositions; no source methods lack a disposition. These mappings remain subject to the behavioral limits below.

The inventory contains **1,939 original NUnit test methods**, before inherited fixtures and parameter expansion. Node's reported test total includes generated cases and fixture subtests, so it is not directly comparable with that source-method count. A single JavaScript test can check several source methods, and one source fixture can generate many executable cases. The audit conservatively leaves full assertion-for-assertion port verification at zero; it does not convert name or comment coverage into a conformance percentage.

The [explicit platform-test dispositions](platform-test-boundaries.json) identify **22 original methods** that execute CLR-specific contracts: 21 use BinaryFormatter object reconstruction and one exercises Reflection.Emit IL generation. Each record includes its exact source identity, pinned source link, implementation evidence, and reason. The audit labels an unmapped method in this list `requires-host-runtime`; this is a disposition, not a passing test or completed port. These methods remain in the 1,939-method inventory. Binary serialization precondition validation is portable and is excluded from this list; JSON or browser-format roundtrips are not counted as BinaryFormatter compatibility.

Primary graph and shortest-path declarations have explicit vertex/edge types, including installed-consumer negative type checks. Other declarations are inferred from JavaScript and may expose `any`, broad constructor arguments, or fewer type relationships than the C# API. Passing the TypeScript consumers establishes the exercised import and type contracts, not full compile-time parity.

## Algorithm evidence

The original fixture directory contains **1,277 valid `g.*.graphml` algorithm graphs**, the DCT8 graph, and additional valid and intentionally malformed serialization fixtures. All 1,288 original files are retained under `test/fixtures/GraphML/`. Controlled legacy algorithm fixtures are extracted independently in the algorithm tests; their external DTD declarations are never fetched.

The structural matrix runs every `g.*.graphml` graph through connected, weak, and strong components; directed and undirected topological variants; backward ordering; strong and weak condensation; Prim and Kruskal forests; and transitive closure/reduction. Independent reachability traversals check component equivalence and transitive results. Both MST implementations are compared on the corpus, with exhaustive spanning-tree subset optimization on additional small weighted graphs to provide an oracle independent of either implementation.

Tarjan offline LCA is checked against independently constructed DFS-parent chains. Its original slow-corpus sampling runs every fifth fixture, up to the first 12 roots, and every ordered vertex pair. Additional branching-tree tests check every pair, equivalent edge-pair keys, unreachable vertices, and self queries. Long-chain tests with 15,000 vertices exercise iterative traversal without depending on the JavaScript call stack.

Shortest-path and traversal tests additionally use all-root corpus checks and independent reachability/min-plus reference calculations. Small-instance optimization checks enumerate assignments, cuts, tours, or path candidates where appropriate. Generated cases exercise negative weights, reachable negative cycles, isolated vertices, parallel edges, self-loops, object vertices, and `NaN` keys. These checks are input-specific; exponential algorithms still have exponential worst-case cost.

The extension-wrapper tests cover all 67 public test methods in upstream `AlgorithmExtensionsTests.cs` with source-linked cases. They verify constructor routing, directed/undirected dispatch, forward/backward sorting, result records, dictionary output, disposable observers, optional parameters, and null combinations. Additional regressions check mixed-type identity uniqueness, FNV-1 hash vectors, and reconstruction from the final cycle-popping successor tree.

## Package and browser evidence

Installed-package checks pack the distribution and install it into a separate consumer directory. They exercise ESM and CommonJS graph algorithms, import the browser ESM bundle, load the standalone global bundle, and compile strict TypeScript ESM/CommonJS consumers. This catches packaging, export, declaration, and missing-file problems that a source-tree import alone would miss. The standalone bundle check in Node's VM is not a DOM-rendering test.

The browser suite serves the built showcase in Chromium and exercises its runnable examples, graph editing controls, endpoint selection, code/API views, viewport controls, SVG download, light/dark themes, mobile-width layout, and a module worker import. Screenshots document the rendered state of that run. Browser validation does not establish Firefox/WebKit compatibility, physical touch or pen input, assistive-technology usability, long-running memory behavior, or external MSAGL/Graphviz engine qualification. The viewer renders through Canvas 2D; WebGPU performance is not claimed.

The current adapter tests validate the supplied JavaScript data models, callbacks, generated formats, and simulation contracts. They do not prove execution of a native MSAGL engine, Graphviz process, CLR DataSet, BinaryFormatter, or complete XSD validation. Those boundaries are specified in [compatibility](compatibility.md).

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

The release does not claim assertion-for-assertion execution of the complete NUnit suite, CLR-wide equality/overload behavior, native host-engine compatibility, or production-scale browser qualification. Review the generated unmapped-method list, [compatibility](compatibility.md), and CI artifacts together when assessing a particular application. A mapped test can still leave source branches unverified, while an unmapped source method may overlap independent tests elsewhere.
