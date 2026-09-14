# QuikGraphWeb.Blazor

`QuikGraphWeb.Blazor` 0.3.2 targets .NET 8/.NET 10. The package locally includes native graph APIs, Graphviz WASM, MSAGL layouts and XML validation, preserving shared core identity and dependency notices. Public NuGet availability is confirmed only by the validation-gated `blazor-v0.3.2` release; see [PUBLISHING.md](PUBLISHING.md) when a registry upload has not become downloadable.

## Viewer and models

```razor
@using QuikGraphWeb.Blazor
<GraphViewer Vertices="vertices" Edges="edges" Directed="true" Style="height:500px" />
@code {
    private GraphVertex[] vertices = [new("A", "Start"), new("B", "Finish")];
    private GraphEdge[] edges = [new("ab", "A", "B", 3)];
}
```

The native viewer retains pan/zoom, dragging, keyboard inspection, selection/edit requests and accessible graph lists. Use `Changed` for native events, then apply authorized edits to your graph state. After `Ready`, use Fit, Zoom, SelectVertex, SVG export, highlighting, MSAGL layout and cancellation helpers.

`GraphModel` owns a stable-string-ID native graph with load/snapshot, add/remove vertices/edges, Dijkstra/Bellman-Ford/DAG path helpers, connected components and Graphviz rendering. Supply `Model` to the viewer or a borrowed native `Graph` handle. Changing a model notifies attached viewers. DTO snapshots and large geometry/SVG outputs are streamed; typed graph application data is literal, not executable callback descriptors.

Use the bundled `Graphviz`, `Layout` and `Xml` namespaces through `Module` for advanced native features. Returned functions use reference APIs, not JSON. The [sample](sample/Demo.razor) validates an exact shortest path, actual MSAGL geometry and real Graphviz WASM SVG.

See [INTEGRATION.md](INTEGRATION.md) for hosting, templates, ownership and publication. Generic native access complements typed convenience APIs; this is not an exhaustive generated C# QuikGraph port. Native limitations remain applicable.

## Lifecycle in 0.3.2

`GraphViewer.IsReady` and `IsDisposed` expose lifecycle state. Concurrent disposal awaits the same native cleanup, releases handles after errors and preserves failures. Queued callbacks stop after removal. Razor factories provide awaitable teardown, coalesced updates and safe late-import/root-creation cleanup. Actual-package tests move, update and recreate template roots in both hosts.
