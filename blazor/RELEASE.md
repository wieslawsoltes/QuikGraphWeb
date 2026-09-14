# QuikGraphWeb.Blazor 0.3.2

Adopts validated shared runtime c833be49d472583b6f56225862e0aa7d201c1da7 from merged Dockyard PR #5. Fixes concurrent visual teardown, late template imports/creation, queued callbacks after removal and retained cleanup failures. Adds lifecycle state, awaitable factory disposal and coalesced updates, plus bounded publication verification retries.

Preserves graph models/viewer, native algorithms, Graphviz WASM, MSAGL geometry, XML validation, streamed outputs and native callback contracts. New shared/managed lifetime tests and real template movement/update/recreation run with the .NET 8/.NET 10 package-restored WebAssembly/Server samples.

Package upload and public availability are distinct: NuGet payload verification must succeed before this GitHub release is created. Earlier 0.3.1 availability failures are not waived or corrected by a version bump, and original immutable package bytes must not be replaced. The read-only NuGet availability workflow diagnoses original main-release artifacts without uploading or creating releases. See PUBLISHING.md.
