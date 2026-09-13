# Third-party runtime notices

QuikGraphWeb's own source is distributed under the Microsoft Public License in
`LICENSE`. Optional engine entry points contain the following separately licensed
software. Their license texts are included in every npm package and browser
archive under `dist/licenses` (or `licenses` at the browser archive root).

| Component | Version | License | Included in |
| --- | --- | --- | --- |
| [Viz.js](https://github.com/mdaines/viz-js) | 3.30.0 | MIT | Graphviz runtime |
| [Graphviz](https://graphviz.org/) | 16.0.0 | EPL-2.0 | Graphviz WASM |
| [Expat](https://github.com/libexpat/libexpat) | 2.8.4 | MIT | Graphviz WASM |
| [Microsoft MSAGL.js](https://github.com/microsoft/msagljs) | @msagl/core 1.1.24 | MIT | Layout runtime |
| [queue-typescript](https://github.com/sfkiwi/queue-typescript) | 1.0.1 | MIT | Layout runtime |
| [stack-typescript](https://github.com/sfkiwi/stack-typescript) | 1.0.4 | MIT | Layout runtime |
| reliable-random, Chris Milson | 0.0.1 | Apache-2.0 | Layout runtime |
| [typescript-string-operations](https://github.com/sevensc/typescript-string-operations) | 1.6.1 | MIT | Layout runtime |
| [libxml2-wasm](https://github.com/jameslan/libxml2-wasm) | 0.7.2 | MIT | XML validation runtime |
| [libxml2](https://gitlab.gnome.org/GNOME/libxml2) | As embedded by libxml2-wasm 0.7.2 | MIT | XML validation WASM |

The original copyright and license notices for libxml2 are preserved verbatim in
`libxml2-wasm-LICENSE.libxml2.txt`. The npm distribution of
typescript-string-operations declares MIT in its package metadata but does not
include a standalone license file; its published declaration and the standard MIT
terms are reproduced in `typescript-string-operations.txt` without inventing an
upstream copyright notice.

## Corresponding engine source

The Graphviz and Expat binaries are the unmodified WASM payload published in
`@viz-js/viz@3.30.0`. The complete corresponding source and build instructions are
available from these public upstream locations:

- [Viz.js 3.30.0 source and build scripts](https://github.com/mdaines/viz-js/tree/99da545270e6e7b127a5c7ba65974b8a604a6358)
- [Graphviz 16.0.0 complete source archive](https://gitlab.com/api/v4/projects/4207231/packages/generic/graphviz-releases/16.0.0/graphviz-16.0.0.tar.gz)
- [Expat 2.8.4 complete source](https://github.com/libexpat/libexpat/tree/R_2_8_4)
- [MSAGL.js source for the published package](https://github.com/microsoft/msagljs/tree/bfe12ae695d9ca467c74f65430b7aeb64651dd3a)
- [libxml2-wasm source and reproducible native build](https://github.com/jameslan/libxml2-wasm)

The npm lockfile pins the exact dependency tarballs and integrity hashes. Build
scripts bundle the optional modules and preserve source maps. QuikGraphWeb does
not change Graphviz's license or claim ownership of these engines.
