# Blazor publication and recovery

`blazor/Version.props` versions NuGet separately from npm. The validation pipeline packs the real component and restores it into .NET 8/.NET 10 WebAssembly and Interactive Server consumers. A version-changing main merge publishes only after those checks pass.

After upload, public-payload verification waits up to 720 seconds, retrying unavailable downloads and transient network, rate-limit and server failures. Permanent failures and conflicting immutable payloads remain fatal. Fourteen offline verifier tests cover these rules. Only NuGet's root repository signature is excluded from payload comparison.

An accepted upload or duplicate-upload conflict is not proof of public availability. QuikGraphWeb.Blazor 0.3.1 returned HTTP 404 from public endpoints after successful upload; its original release run is 34823163759. A new source/runtime release does not establish that the old version is available. Do not replace existing package bytes or manufacture a successful release tag.

Rerun only the original failed publish job to reuse its validated artifacts. The manual read-only **NuGet availability** workflow accepts the original main-branch Blazor run ID, validates its origin, downloads the exact tested artifact and compares the public payload. It does not upload packages, create releases or change version numbers. A persistent 404 requires checking NuGet package validation status; the GitHub secret does not expose that account dashboard.

The availability diagnostic is independent of source PR tests because it inspects an already-uploaded historical release. The actual release pipeline still requires a successful public-payload comparison before announcing a release. Build and hosting instructions are in README.md and INTEGRATION.md.
