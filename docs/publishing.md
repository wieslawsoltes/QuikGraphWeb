# Publishing

The project follows ReactiveWeb's versioned release-artifact flow.

1. Change `version` in package.json and package-lock.json together. Update CHANGELOG and release notes.
2. Push the tested source to `main`. CI verifies Node 22/24, packs and installs consumers, runs Chromium examples, and archives distributions.
3. For a new version, CI creates `v<version>` pointing at the verified commit and uploads the npm `.tgz`, standalone browser archive, showcase archive, and SHA256SUMS.txt.
4. The reusable npm workflow checks the release tag/version/commit, verifies SHA-256, tests that exact tarball in installed consumers, and checks whether the npm version exists.
5. If absent, publish the tarball with the repository `NPM_TOKEN`, public access and provenance. Download the public artifact again, compare its integrity, and rerun consumer smoke tests.

No npm token is written into source or package archives. `NPM_TOKEN` needs publication rights to `@wieslawsoltes/quikgraphweb`; configure token bypass for automated 2FA according to your npm account. Trusted publishing can be used when configured for this repository/workflow.

Manual recovery: run **Publish npm registry** with `tag`, `expected_sha`, and `dist_tag` (`latest` or `next`). The release must already exist and the SHA must identify it. Existing versions are immutable: a different package cannot overwrite an existing npm version, and differing integrity fails verification.

GitHub Pages deployment is independent of npm publication. If repository Pages creation needs additional repository configuration, release packages remain available through npm and GitHub release assets.
