# CLR reference fixtures

These fixtures are produced by Microsoft's `BinaryFormatter` running the original QuikGraph source. They are independent inputs to the JavaScript NRBF reader and writer. They cover all upstream binary graph families, integer and original custom test vertex/edge types, inherited edge fields, reference identity and cycles, the Graphviz value structures, serializable collections and exceptions, every NRBF primitive array type, rectangular arrays, and arrays with nonzero lower bounds.

The reference libraries compile unchanged source from QuikGraph commit `9cd6b49292e09041258708a37bed99c56177b0ef`. The projects use the original `netstandard2.0` feature defines, version `2.5.0.0`, and the upstream signing key. They target .NET 8 only to provide a supported host for generating these historical format fixtures. The JavaScript package does not depend on .NET.

`NETSTANDARD2_0` matters: the upstream undirected graph types provide explicit `ISerializable` implementations under this symbol so that their runtime delegate fields are reconstructed instead of serialized. `ForestDisjointSet<int>` cannot be serialized by the reference library: its nested `Element` is not marked `[Serializable]`. That upstream failure is recorded in the manifest rather than represented by a fabricated fixture.

## Reproduce

Install the [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0), then run from the QuikGraphWeb root:

```sh
git clone https://github.com/KeRNeLith/QuikGraph ../upstream
git -C ../upstream checkout 9cd6b49292e09041258708a37bed99c56177b0ef
dotnet run --project tools/nrbf-fixtures/Fixtures.csproj --configuration Release -- generate test/fixtures/nrbf
```

If the upstream checkout is elsewhere, pass `-p:UpstreamRoot=/absolute/path/to/QuikGraph` before `--`. All references are framework references; `NuGet.Config` clears external package feeds. The checked fixtures were generated using SDK 8.0.425 and runtime 8.0.31. The manifest records the upstream revision, assembly identities, byte lengths, SHA-256 values, and expected public values. `clr-schemas.json` separately records field names and declared types directly from CLR serialization metadata, including `ISerializable` members and inherited private fields.

## Verify JavaScript output in .NET

The `verify` command reads a directory of JavaScript-produced `.nrbf` files named after the corresponding fixture. It creates the expected values independently, deserializes the JavaScript output, checks the concrete CLR root type, and compares full public value snapshots. Shared-reference and cyclic fixtures also check their identity relationships.

```sh
node tools/nrbf-fixtures/roundtrip.mjs test-results/nrbf-roundtrip
dotnet run --project tools/nrbf-fixtures/Fixtures.csproj --configuration Release -- verify test-results/nrbf-roundtrip
node tools/nrbf-fixtures/hydrate.mjs test-results/nrbf-hydrated
dotnet run --project tools/nrbf-fixtures/Fixtures.csproj --configuration Release -- verify test-results/nrbf-hydrated
node tools/nrbf-fixtures/fresh.mjs test-results/nrbf-fresh
dotnet run --project tools/nrbf-fixtures/Fixtures.csproj --configuration Release -- verify test-results/nrbf-fresh
```

`roundtrip.mjs` verifies each original checksum, parses its inert NRBF records in JavaScript, and re-encodes them. `hydrate.mjs` reconstructs all fixtures as JavaScript objects, using an explicit registry for the original custom test classes, then serializes those objects again. `fresh.mjs` separately constructs graph objects, all edge families, Graphviz values and graph exceptions through the public JavaScript API. It never reads the original fixture bytes, record metadata or snapshots. All three sets must be accepted by .NET as the corresponding original concrete CLR types with matching values. This separates preservation of existing records from interoperability of newly created JavaScript graphs.

The program only accepts fixture names known to its source and uses a serialization binder restricted to types emitted while serializing those controlled reference values. It reports each comparison and exits unsuccessfully if any comparison fails. This is a development interoperability tool for controlled fixtures; it is not a general-purpose reader for external BinaryFormatter data. The JavaScript implementation parses inert records and never loads CLR assemblies or executes serialization callbacks.

For runtime environments where `dotnet` CLI process inspection is unavailable, the SDK MSBuild entry point can be invoked directly to compile the same projects, followed by the generated `Fixtures.dll` with `dotnet`.
