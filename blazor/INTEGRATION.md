# Hosting and interop contract

Use interactive WebAssembly or Interactive Server. Static SSR renders a host/loading state; initialize only after `Ready`. Assets resolve relative to the app base URI under `_content/QuikGraphWeb.Blazor/`. Browser sessions and owned graphs belong to an app/circuit, not a cross-user Server singleton.

Native object methods are available through BrowserModule constructor/invoke/call/get/set/events. Returned functions use `InvokeReferenceAsync`, `CallReferenceAsync`, `GetReferenceAsync` and `CallFunctionAsync`, preserving identity in subsequent native calls. Synchronous graph selectors/comparers remain JavaScript functions. `BrowserFunction.DotNet` is asynchronous and only suitable where native APIs accept promises; canceling a wait does not interrupt arbitrary synchronous algorithms.

Complete DTO/geometry/string results use streamed `CallJsonAsync`, `InvokeJsonAsync`, `GetJsonAsync`; byte equivalents support binary results. The default explicit limit is 64 MiB. `SubscribeJsonAsync` transfers complete DTO notifications; `SubscribeAsync` is a bounded diagnostic snapshot of native graphs. `CallBatchAsync` preserves order but is not atomic. Wrap generic application values with `BrowserValue.Literal` so `$fn` data cannot become executable callback descriptors. Never accept untrusted executable module URLs.

Optional native DOM Razor factories use `BrowserTemplate<TItem>` and `BrowserFunction.RazorTemplate`. Register `AddQuikGraphWebBlazor` on services and `RegisterQuikGraphWebBlazor` on WASM RootComponents or Server CircuitOptions.RootComponents. Independent roots support callbacks, nested components and shadow-DOM input binding; outer cascading values do not automatically propagate. Put required CascadingValue components inside templates and preserve durable state outside recreated roots. The native canvas viewer itself is not a DOM template surface.

Dispose owned models/modules asynchronously. Dispose borrowed native graph/object handles without destroying their owners; `ReleaseAsync` destroys resources you own. Native handles retain identity, while DTOs are copies. Do not retain graph internals across a model Load that replaces the graph.

Source builds require recursive submodules, npm ci/build and `node blazor/build.mjs`. Consumers require neither Node nor Dockyard. CI restores actual packages for net8.0/net10.0 into WASM and Server (`/probe/`) and verifies native paths/components, real MSAGL/Graphviz results, streaming, function references, Razor callbacks and remounting. These tests do not establish every-browser or hybrid WebView qualification.

NuGet versioning is independent of npm in Version.props. Version-changing main merges publish after validation using NUGET_API_KEY (NUGET_TOKEN/NUGET_KEY aliases), reject conflicting immutable versions, verify downloaded public payloads and attach packages, symbols, samples and checksums to blazor-v* releases.
