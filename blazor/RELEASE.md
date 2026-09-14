# QuikGraphWeb.Blazor 0.3.1

Updates the pinned shared runtime to tested Dockyard revision `1c895b7184451071e1c7131063249d2d9eb145b9`, retaining a self-contained package.

- Preserve cyclic/deep native argument graphs and shared callback identity without mutating inputs.
- Preserve callable property/method/disposal access; add `CallFunctionJsonAsync<T>` for complete streamed callable results.
- Await concurrent native/module/subscription cleanup and asynchronous unsubscribe, continuing cleanup after individual failures.
- Honor initialization-wait cancellation independently for each caller and prevent late native construction after disposal.
- Run expanded JavaScript and managed lifetime/identity regressions in the package-consumer matrix.

Typed graph models, interactive viewer, native algorithms, Graphviz WASM, MSAGL geometry and XML validation remain available with their existing identity and compatibility contracts. The .NET 8/.NET 10 WebAssembly/Server samples verify native shortest paths, MSAGL layout and actual Graphviz output before publishing. The release verifies downloaded public NuGet payloads and includes symbols and runnable samples.
