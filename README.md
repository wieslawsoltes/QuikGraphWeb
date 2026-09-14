# QuikGraphWeb

Graph structures, algorithms and interactive viewing for JavaScript, TypeScript and Blazor.

[![npm](https://img.shields.io/npm/v/%40wieslawsoltes%2Fquikgraphweb)](https://www.npmjs.com/package/@wieslawsoltes/quikgraphweb)
[![npm downloads](https://img.shields.io/npm/dm/%40wieslawsoltes%2Fquikgraphweb)](https://www.npmjs.com/package/@wieslawsoltes/quikgraphweb)
[![QuikGraphWeb.Blazor on NuGet](https://img.shields.io/nuget/v/QuikGraphWeb.Blazor?label=QuikGraphWeb.Blazor&logo=nuget)](https://www.nuget.org/packages/QuikGraphWeb.Blazor)
[![NuGet downloads](https://img.shields.io/nuget/dt/QuikGraphWeb.Blazor)](https://www.nuget.org/packages/QuikGraphWeb.Blazor)
[![Blazor CI](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/blazor.yml/badge.svg)](https://github.com/wieslawsoltes/QuikGraphWeb/actions/workflows/blazor.yml)

## JavaScript

```sh
npm install @wieslawsoltes/quikgraphweb
```

The [complete JavaScript guide](README.web.md) preserves API examples, native engines, tests, compatibility and licensing. [Open the web demo](https://wieslawsoltes.github.io/QuikGraphWeb/).

## Blazor

```sh
dotnet add package QuikGraphWeb.Blazor --version 0.3.2
```

Use the NuGet install command once its public-payload-verified `blazor-v0.3.2` release is present. An accepted upload alone is not proof of public availability; see [publication recovery](blazor/PUBLISHING.md).

The .NET 8/.NET 10 package supports interactive WebAssembly and Server with locally bundled graph APIs, Graphviz WASM, MSAGL and XML validation. It includes typed `GraphModel`, `GraphViewer`, `GraphProvider`, graph editing/snapshots, shortest paths, components, layout and SVG export. Consumers need neither npm nor a CDN.

See the [Blazor guide](blazor/README.md), [integration contract](blazor/INTEGRATION.md), [sample](blazor/sample/Demo.razor) and [release notes](blazor/RELEASE.md). Advanced APIs remain accessible through identity-preserving native object/function interop.

```sh
git submodule update --init --recursive
npm ci
npm run build
node blazor/build.mjs
dotnet run --project blazor/sample/Sample.csproj
# Or: dotnet run --project blazor/server/Server.csproj
```

Source builds require the .NET 10 SDK with .NET 8 targeting support. The Server sample uses `/probe/`. CI restores actual nupkg consumers for both hosts/frameworks and tests native graph algorithms, MSAGL geometry, real Graphviz output, streams, Razor callbacks and remounting.

`blazor/Version.props` independently versions NuGet. Version-changing main merges publish after validation with `NUGET_API_KEY` (`NUGET_TOKEN`/`NUGET_KEY` aliases), verify public payloads and create `blazor-v*` releases with symbols, sample archives and checksums. Native compatibility boundaries remain applicable. See [LICENSE](LICENSE), [NOTICE](NOTICE) and [third-party notices](THIRD_PARTY_NOTICES.md).
