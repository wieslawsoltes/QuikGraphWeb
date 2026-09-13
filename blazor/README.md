# QuikGraphWeb.Blazor

A .NET 8 / .NET 10 Razor Class Library containing the actual QuikGraphWeb graph/algorithm engine, native viewer, Graphviz WASM, MSAGL layout and XML-validation runtime. The NuGet package is self-contained and preserves MS-PL and bundled dependency notices.

```sh
dotnet add package QuikGraphWeb.Blazor --version 0.3.0
```

```razor
@using QuikGraphWeb.Blazor
<GraphViewer @ref="viewer" Vertices="vertices" Edges="edges" Ready="OnReady" />
@code {
    private GraphViewer viewer = default!;
    private GraphVertex[] vertices = [new("A", "Start"), new("B", "Finish")];
    private GraphEdge[] edges = [new("ab", "A", "B", 2, "Cost 2")];
}
```

## Graph component and models

`GraphViewer` wraps the existing accessible native viewer, including pan/zoom, vertex dragging, keyboard navigation, searchable vertex/edge inspection, selection, graph-edit requests, asynchronous layout cancellation, highlighted edges and SVG export. `Vertices`, `Edges` and `Directed` build an internally owned native model. `Model` accepts a shared typed `GraphModel`; `Graph` accepts a raw `IJSObjectReference` for any compatible native graph implementation. External models remain caller-owned. `LayoutMode` selects circle/grid; `ApplyMsaglLayoutAsync` provides real MSAGL Sugiyama, MDS and IPsepCola geometry and routing options.

`Options` applies other native viewer properties, including browser label callbacks. Replace data/options references or increment `Revision` after mutating nested data. Unrelated parent renders do not rebuild the graph. `Changed` reports selected DOM events; `Events` selects additional native events. Graph-edit events are requests: apply them to your model explicitly rather than assuming the wrapper silently mutates CLR collections. Native object identity is retained through references; JSON values are transferred by value.

Typed operations include fit/zoom, selecting a vertex, SVG export, shortest paths, stable-id highlighting, MSAGL layout and cancelling pending layout. Raw graph models may use arbitrary vertex types through generic interop; stable-string-id convenience methods apply to the typed model.

`GraphModel` offers atomic snapshot replacement, vertex/edge insertion/removal, snapshot reads, native graph access, Dijkstra/Bellman-Ford/DAG shortest paths, weak/strong components and Graphviz SVG export. IDs are unique nonempty strings; edge weights must be finite and endpoints must exist. Dijkstra rejects negative weights through the native engine; Bellman-Ford reports reachable negative cycles. Undirected typed graphs use the native undirected Dijkstra implementation. Removing by id retains the native edge instance, avoiding identity errors caused by reserializing a CLR DTO.

```csharp
model = await GraphModel.CreateAsync(module,
    new GraphSnapshot(true, vertices, edges));
var path = await model.ShortestPathAsync("A", "B");
var svg = await model.RenderGraphvizAsync(new { engine = "dot" });
```

## Complete native interop and optional engines

`QuikGraphModule` / `BrowserModule` exposes `GetExportsAsync`, `CreateAsync`, `InvokeAsync`, `CallAsync`, `GetAsync`, `SetAsync`, `SubscribeAsync` and `ReleaseAsync`. All root native exports remain available, including graph varieties, equality, algorithms, observers, collections, Petri nets, DOT/GraphML, NRBF and binary serialization. Additional namespaces are `Graphviz`, `Layout` and `Xml`. These browser dependencies are included locally; consumers do not install npm packages or fetch a CDN. Shared core imports retain class identity across graph/serialization/layout entry points.

Generic native interop reaches APIs beyond the typed convenience layer; it is not an exhaustive generated strongly typed C# QuikGraph port. Use browser functions for synchronous edge weights, comparers, heuristic functions and formatting callbacks: `BrowserFunction.Property`, `Constant`, `Setter`, or `Module("./graph-callbacks.js", "weight")`. No eval is used. `BrowserFunction.DotNet` returns a promise and cannot satisfy a synchronous graph-algorithm callback on Blazor Server. Cancellation of a C# interop wait does not preempt a synchronous JavaScript algorithm; use native cancellation/worker APIs where appropriate. Viewer layout cancellation discards stale results using the native implementation.

`GraphProvider` is an optional lifecycle provider with `RenderFragment<BrowserModule>` content for nonvisual graph work. Dispose subscriptions and external models before their provider. Modules belong to a component/circuit, not a Server-wide singleton. Created resources are session-owned; native factory results need explicit lifetime management. `IJSObjectReference.DisposeAsync` frees the handle, while `ReleaseAsync` also invokes native disposal. Generic event snapshots are bounded and may contain `$reference` or `$truncated`; read explicit data or native references for complete model traversal.

## Hosting and source build

Use interactive WebAssembly or Server. Prerender produces a host without invoking JavaScript. Static web assets resolve through the app base URI under `_content/QuikGraphWeb.Blazor`; deploy the full directory, including the local XML vendor runtime. Native browser security rules and existing engine compatibility boundaries remain applicable.

```sh
git submodule update --init --recursive
npm ci
npm run build
node blazor/build.mjs
dotnet run --project blazor/sample/Sample.csproj
dotnet run --project blazor/server/Server.csproj --urls http://localhost:5080
# Server sample: http://localhost:5080/probe/
```

The common lifecycle source, project/host templates and tests are generated from a reviewed commit-pinned source submodule. The result has no Dockyard NuGet dependency. The graph adapter, typed API and sample are ordinary reviewed source in this repository. Generated build files are ignored and recreated before packing.

CI packs both frameworks, inspects the nupkg, runs bridge and managed lifecycle/prerender checks, then restores and drives actual-package WebAssembly/Server consumers in Chromium. The sample verifies a known Dijkstra path, connected components, real MSAGL geometry, native viewer SVG and actual Graphviz WASM output, plus repeated unmount/remount at non-root paths. Packages, published samples and diagnostics are retained as artifacts. These checks do not certify every native algorithm or every browser/device.

## Releases

NuGet versions are independent of npm in `blazor/Version.props`. A validated version-changing PR merged to main publishes with `NUGET_API_KEY`, falling back to `NUGET_TOKEN` or `NUGET_KEY`. Manual dispatch defaults to validation-only. `blazor-v<version>` releases attach packages and the runnable WebAssembly sample without changing npm release tags. Update the shared source submodule and workflow pins together in a reviewed PR.
