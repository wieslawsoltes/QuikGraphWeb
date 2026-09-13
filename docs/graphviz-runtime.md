# Graphviz WebAssembly rendering

The optional `@wieslawsoltes/quikgraphweb/graphviz-runtime` entry point contains a real Graphviz WebAssembly engine. Its ESM, CommonJS and standalone browser builds include the engine, so callers do not need to implement an adapter or install an additional package. The main graph library does not load this entry point or its WebAssembly payload.

The implementation uses [`@viz-js/viz` 3.30.0](https://github.com/mdaines/viz-js), containing Graphviz 16.0.0. The [official Viz API](https://viz-js.com/api/) describes its native graph descriptions, layout engines, rendering options, image-size declarations and output diagnostics. Graphviz and Viz retain their own license notices in the optional distribution.

## Initialize once, render synchronously

```js
import { AdjacencyGraph, Edge } from '@wieslawsoltes/quikgraphweb';
import { CreateGraphvizEngine } from '@wieslawsoltes/quikgraphweb/graphviz-runtime';

const graph = new AdjacencyGraph();
graph.AddVerticesAndEdge(new Edge('Compile', 'Test'));
graph.AddVerticesAndEdge(new Edge('Test', 'Publish'));

const engine = await CreateGraphvizEngine({ engine: 'dot' });
const svg = engine.RenderSvg(graph, {
  graphAttributes: { rankdir: 'LR' },
  nodeAttributes: { shape: 'box', style: 'rounded' },
}, algorithm => {
  algorithm.FormatVertex.add((_, args) => {
    args.VertexFormat.Label = args.Vertex;
  });
});

// Node: await writeFile('pipeline.svg', svg, 'utf8');
// Browser: place the result in an image or use engine.RenderSvgElement(graph).
engine.Dispose();
```

`CreateGraphvizEngine` returns a promise because WebAssembly initialization is asynchronous. Rendering methods are synchronous after initialization. For explicit lifecycle control, construct `new GraphvizWasmEngine(options)` and await `Initialize()`. Concurrent initialization calls on the same engine share one promise. Reuse that engine for multiple graphs; separate instances have independent WASM heaps. The entry point also works in Node workers. Synchronous layout runs on the calling thread; use a worker for large interactive workloads.

`IsInitialized`, `IsDisposed` and `State` expose lifecycle state. `Dispose()` is idempotent, prevents future use and releases the wrapper's references to the runtime. WebAssembly memory is reclaimed by the JavaScript garbage collector; the underlying Viz API does not expose a deterministic native heap destructor. Disposing while initialization is pending prevents that initialization from restoring a usable engine.

## Existing QuikGraph APIs

The engine implements the existing rendering contracts:

```js
import { GraphvizAlgorithm, GraphvizImageType, ToSvg } from '@wieslawsoltes/quikgraphweb';

const svg = ToSvg(graph, engine);
const renderer = new GraphvizAlgorithm(graph, GraphvizImageType.Svg);
const sameFormat = renderer.Generate(engine, 'graph.svg');
```

`Run(imageType, dot, outputFilePath)` returns rendered content. The path argument is accepted for `IDotEngine` compatibility; this renderer performs no filesystem writes. Set `GraphvizImageType.Svg` when using `GraphvizAlgorithm.Generate`: its historical default is PNG, whose native raster plugin is absent from this WebAssembly build. `PlainText` maps to Graphviz's `plain` output.

Every rendering method accepts DOT text, a QuikGraph graph, or a native Viz graph description with `nodes`, `edges` and `subgraphs`. QuikGraph formatting events run while producing DOT. The optional `configure` callback applies to QuikGraph inputs. Explicit attributes in DOT/native descriptions override node/edge defaults from render options.

## Formats, diagnostics and geometry

Read `engine.Engines`, `engine.Formats` and `engine.GraphvizVersion` for the exact capabilities of the bundled runtime. The engines are `circo`, `dot`, `fdp`, `neato`, `nop`, `nop1`, `nop2`, `osage`, `patchwork`, `sfdp` and `twopi`; the `nop` variants use Graphviz's existing-position behavior. Text/vector output includes SVG, DOT, plain, JSON, xdot, PostScript, EPS and the other advertised Graphviz formats. Unsupported formats produce an error; they are never replaced silently with another format.

```js
const geometry = engine.RenderJson('digraph { a -> b -> c }');
console.log(geometry.objects?.map(node => [node.name, node.pos]));

const result = engine.RenderFormats('digraph { a -> b }', ['svg', 'json', 'plain']);
if (result.status === 'success') {
  console.log(result.output.svg);
}
console.log(result.errors); // warnings are retained on successful renders too
```

`Render` and `RenderFormats` return discriminated success/failure results and Graphviz diagnostics. `RenderString`, `RenderSvg`, `RenderJson` and `Run` throw `GraphvizRenderException` on a layout or syntax failure; its `Diagnostics` property contains all engine errors and warnings. Invalid input types and lifecycle misuse throw the corresponding QuikGraph argument/operation errors. A malformed graph does not poison the engine for subsequent graphs.

JSON coordinates and drawing operations are Graphviz output, with Graphviz's coordinate system and units. They include cluster bounding boxes, node positions and dimensions, edge splines, labels and drawing operations. They are not converted into viewer coordinates automatically.

## Browser SVG and raster images

Import the standalone browser bundle lazily to load Graphviz only when needed:

```js
const { CreateGraphvizEngine } = await import('./dist/quikgraphweb-graphviz.js');
const engine = await CreateGraphvizEngine();
const element = engine.RenderSvgElement('digraph { a -> b }');
document.querySelector('#diagram').replaceChildren(element);

const png = await engine.RenderImage('digraph { a -> b }', {
  type: 'image/png',
  scale: 2,
  background: '#ffffff',
});
const url = URL.createObjectURL(png);
const download = document.createElement('a');
download.href = url;
download.download = 'graph.png';
download.click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

`RenderSvgElement` creates a detached SVG DOM element. It requires `DOMParser`; Node callers use `RenderSvg` instead. Treat authored Graphviz labels and URLs as document content when deciding whether to insert generated SVG into a page; an image/blob preview is appropriate when DOM links are unnecessary.

`RenderImage` uses the real Graphviz SVG output and the browser's image decoder/canvas encoder. It returns PNG, JPEG or WebP as a `Blob`, supports dimensions, proportional scaling, quality and background, and revokes its temporary SVG URL on success and failure. One explicit dimension preserves the source aspect ratio; specifying both allows resizing. The default maximum is 16,777,216 pixels and can be changed with `maxPixels`. JPEG defaults to a white background. Unsupported encoders produce a `NotSupportedException` rather than returning a blob of another MIME type.

Raster conversion requires a browser document and canvas. The Graphviz WASM build does not include native PNG/JPEG/GIF plugins, and this entry point does not add a Node canvas dependency. Node can render SVG, JSON and every advertised native text/vector format directly. External image references remain subject to browser loading and canvas origin rules. Image-size declarations specify layout dimensions; they do not download image files into Graphviz.

## Verification

The runtime tests execute the bundled Graphviz engine across every advertised layout engine, inspect independent node/edge geometry and rank direction, render clusters/HTML labels/loops/parallel edges, check all three input forms and existing QuikGraph formatting contracts, and run multiple formats in one operation. Additional tests cover diagnostics and recovery, attribute precedence, initialization races, disposal, an independent Node worker, and environment-specific DOM/raster failures. Browser tests exercise the standalone optional bundle and actual image output in the showcase.
