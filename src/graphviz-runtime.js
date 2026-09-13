import { ArgumentException, ArgumentNullException, ArgumentOutOfRangeException, InvalidOperationException, NotSupportedException } from './core.js';
import { ToGraphviz } from './graphviz.js';

/** @typedef {Record<string, string|number|boolean|{html: string}>} GraphvizAttributes */
/** @typedef {{name: string, width: number|string, height: number|string}} GraphvizImageSize */
/** @typedef {{format?: string, engine?: string, yInvert?: boolean, reduce?: boolean, graphAttributes?: GraphvizAttributes, nodeAttributes?: GraphvizAttributes, edgeAttributes?: GraphvizAttributes, images?: GraphvizImageSize[]}} GraphvizRenderOptions */
/** @typedef {{name: string, attributes?: GraphvizAttributes}} GraphvizNodeDescription */
/** @typedef {{tail: string, head: string, attributes?: GraphvizAttributes}} GraphvizEdgeDescription */
/** @typedef {{name?: string, strict?: boolean, directed?: boolean, graphAttributes?: GraphvizAttributes, nodeAttributes?: GraphvizAttributes, edgeAttributes?: GraphvizAttributes, nodes?: GraphvizNodeDescription[], edges?: GraphvizEdgeDescription[], subgraphs?: GraphvizDescription[]}} GraphvizDescription */
/** @typedef {{level?: 'error'|'warning', message: string}} GraphvizDiagnostic */
/** @typedef {{status: 'success', output: string, errors: GraphvizDiagnostic[]} | {status: 'failure', output: undefined, errors: GraphvizDiagnostic[]}} GraphvizRenderResult */
/** @typedef {{status: 'success', output: Record<string,string>, errors: GraphvizDiagnostic[]} | {status: 'failure', output: undefined, errors: GraphvizDiagnostic[]}} GraphvizMultipleRenderResult */
/** @typedef {{ Vertices: Iterable<unknown>, Edges: Iterable<{Source: unknown, Target: unknown}>, IsDirected: boolean }} GraphvizGraphInput */
/** @typedef {string | GraphvizDescription | GraphvizGraphInput} GraphvizInput */
/** @typedef {{type?: 'image/png'|'image/jpeg'|'image/webp', scale?: number, width?: number, height?: number, quality?: number, background?: string, maxPixels?: number, renderOptions?: GraphvizRenderOptions}} GraphvizImageOptions */

/** A Graphviz syntax/layout failure, including the engine's complete diagnostics. */
export class GraphvizRenderException extends Error {
  /** @param {Array<{level?: string, message: string}>} diagnostics */
  constructor(diagnostics) {
    super(diagnostics.map(item => item.message).join('\n') || 'Graphviz rendering failed.');
    this.name = 'GraphvizRenderException';
    this.Diagnostics = Object.freeze(diagnostics.map(item => Object.freeze({ ...item })));
  }
}

const disposed = () => new InvalidOperationException('The Graphviz engine has been disposed.');
const required = (value, name) => { if (value == null) throw new ArgumentNullException(`${name} cannot be null.`); return value; };
const inputFor = (input, configure) => {
  required(input, 'input');
  if (typeof input === 'string') return input;
  if (typeof input !== 'object' || Array.isArray(input)) throw new ArgumentException('input must be DOT text, a QuikGraph graph, or a Graphviz graph description.');
  return 'Vertices' in input && 'Edges' in input ? ToGraphviz(input, configure) : input;
};
const successful = result => {
  if (result.status !== 'success') throw new GraphvizRenderException(result.errors);
  return result.output;
};

/**
 * Optional real Graphviz WebAssembly renderer. Initialize once, then reuse its
 * synchronous rendering methods. Import from the package's graphviz-runtime
 * entry point so graph algorithms do not acquire a WebAssembly dependency.
 */
export class GraphvizWasmEngine {
  /** @param {GraphvizRenderOptions} [options] */
  constructor(options = {}) {
    required(options, 'options');
    /** @private @type {any} */
    this._runtime = null;
    /** @type {Promise<GraphvizWasmEngine> | null} */
    this._initialization = null;
    this._disposed = false;
    this._options = copyOptions(options);
  }

  /** @param {GraphvizRenderOptions} [options] */
  static async Create(options = {}) { return new GraphvizWasmEngine(options).Initialize(); }
  get IsInitialized() { return this._runtime !== null; }
  get IsDisposed() { return this._disposed; }
  get State() { return this._disposed ? 'Disposed' : this._runtime ? 'Ready' : this._initialization ? 'Initializing' : 'Uninitialized'; }
  get GraphvizVersion() { return this._ready().graphvizVersion; }
  get Engines() { return Object.freeze([...this._ready().engines]); }
  get Formats() { return Object.freeze([...this._ready().formats]); }

  /** Concurrent calls on this object share one WebAssembly initialization. */
  Initialize() {
    if (this._disposed) return Promise.reject(disposed());
    if (this._runtime) return Promise.resolve(this);
    if (!this._initialization) {
      this._initialization = import('@viz-js/viz').then(module => module.instance()).then(runtime => {
        if (this._disposed) throw disposed();
        this._runtime = runtime;
        return this;
      }).catch(error => { this._initialization = null; throw error; });
    }
    return this._initialization;
  }

  _ready() {
    if (this._disposed) throw disposed();
    if (!this._runtime) throw new InvalidOperationException('Await engine.Initialize() or CreateGraphvizEngine() before rendering.');
    return this._runtime;
  }

  _renderOptions(options = {}) {
    required(options, 'options');
    const result = { ...this._options, ...options };
    for (const key of ['graphAttributes', 'nodeAttributes', 'edgeAttributes']) {
      if (this._options[key] || options[key]) result[key] = { ...this._options[key], ...options[key] };
    }
    if (result.format === 'plaintext') result.format = 'plain';
    return result;
  }

  /** Returns Graphviz's success/failure result without hiding warnings. */
  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {GraphvizRenderResult} */
  Render(input, options = {}, configure) {
    const runtime = this._ready();
    const renderOptions = this._renderOptions(options);
    return runtime.render(inputFor(input, configure), renderOptions);
  }

  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {string} */
  RenderString(input, options = {}, configure) { return successful(this.Render(input, options, configure)); }

  /** Viz-compatible spelling, accepted by QuikGraph's existing ToSvg helper. */
  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @returns {string} */
  renderString(input, options = {}) { return this.RenderString(input, options); }

  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {string} */
  RenderSvg(input, options = {}, configure) { required(options, 'options'); return this.RenderString(input, { ...options, format: 'svg' }, configure); }

  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {Record<string, any>} */
  RenderJson(input, options = {}, configure) { required(options, 'options'); return JSON.parse(this.RenderString(input, { ...options, format: 'json' }, configure)); }

  /** Render several output formats in one Graphviz layout pass. */
  /** @param {GraphvizInput} input @param {string[]} formats @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {GraphvizMultipleRenderResult} */
  RenderFormats(input, formats, options = {}, configure) {
    const runtime = this._ready();
    required(formats, 'formats');
    if (!Array.isArray(formats) || !formats.length || formats.some(format => typeof format !== 'string' || !format.length)) throw new ArgumentException('formats must be a nonempty array of format names.');
    const renderOptions = this._renderOptions(options);
    return runtime.renderFormats(inputFor(input, configure), formats, renderOptions);
  }

  /** IDotEngine adapter. Returns output content; it does not write a file. */
  /** @param {string} imageType @param {string} dot @param {string} [outputFilePath] @returns {string} */
  Run(imageType, dot, outputFilePath) {
    required(imageType, 'imageType');
    return this.RenderString(dot, { format: imageType });
  }

  /** Create a browser SVG element without inserting it into the document. */
  /** @param {GraphvizInput} input @param {GraphvizRenderOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {SVGSVGElement} */
  RenderSvgElement(input, options = {}, configure) {
    this._ready();
    if (typeof DOMParser !== 'function') throw new NotSupportedException('RenderSvgElement requires a browser DOM. Use RenderSvg for a portable SVG string.');
    const document = new DOMParser().parseFromString(this.RenderSvg(input, options, configure), 'image/svg+xml');
    if (document.querySelector('parsererror')) throw new GraphvizRenderException([{ level: 'error', message: 'The generated SVG could not be parsed.' }]);
    return /** @type {SVGSVGElement} */ (/** @type {unknown} */ (document.documentElement));
  }

  /** Browser raster export. Uses the actual Graphviz SVG layout and canvas. */
  /** @param {GraphvizInput} input @param {GraphvizImageOptions} [options] @param {(algorithm: import('./graphviz.js').GraphvizAlgorithm) => void} [configure] @returns {Promise<Blob>} */
  async RenderImage(input, options = {}, configure) {
    this._ready();
    required(options, 'options');
    const type = options.type ?? 'image/png';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new ArgumentException(`Unsupported image type: ${type}`);
    const scale = positive(options.scale ?? 1, 'scale');
    const maxPixels = positive(options.maxPixels ?? 16777216, 'maxPixels');
    if (options.quality !== undefined && (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1)) throw new ArgumentOutOfRangeException('quality must be between zero and one.');
    if (typeof Image !== 'function' || typeof document === 'undefined') throw new NotSupportedException('RenderImage requires a browser document and canvas. Use RenderSvg in Node or a worker.');
    const svg = this.RenderSvg(input, options.renderOptions, configure);
    const dimensions = svgDimensions(svg);
    let width = options.width == null ? undefined : positive(options.width, 'width');
    let height = options.height == null ? undefined : positive(options.height, 'height');
    if (width === undefined) width = height === undefined ? dimensions.width : height * dimensions.width / dimensions.height;
    if (height === undefined) height = width * dimensions.height / dimensions.width;
    width = Math.ceil(width * scale); height = Math.ceil(height * scale);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width * height > maxPixels) throw new ArgumentOutOfRangeException(`Raster image exceeds maxPixels (${maxPixels}).`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new GraphvizRenderException([{ level: 'error', message: 'The browser could not decode the rendered SVG.' }])); image.src = url; });
      this._ready();
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new NotSupportedException('A 2D canvas context is unavailable.');
      if (options.background || type === 'image/jpeg') { context.fillStyle = options.background ?? '#ffffff'; context.fillRect(0, 0, width, height); }
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new GraphvizRenderException([{ level: 'error', message: 'The browser could not encode the raster image.' }])), type, options.quality));
      if (blob.type !== type) throw new NotSupportedException(`This browser cannot encode ${type}.`);
      this._ready();
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }

  /** Release this engine's references; repeated disposal is safe. */
  Dispose() { this._disposed = true; this._runtime = null; this._initialization = null; }
  dispose() { this.Dispose(); }
}

/** @param {GraphvizRenderOptions} [options] @returns {Promise<GraphvizWasmEngine>} */
export function CreateGraphvizEngine(options = {}) { return GraphvizWasmEngine.Create(options); }

function copyOptions(options) {
  const copy = { ...options };
  for (const key of ['graphAttributes', 'nodeAttributes', 'edgeAttributes']) if (copy[key]) copy[key] = { ...copy[key] };
  if (copy.images) copy.images = copy.images.map(image => ({ ...image }));
  return copy;
}

function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new ArgumentOutOfRangeException(`${name} must be finite and greater than zero.`);
  return value;
}

function svgDimensions(svg) {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const length = name => {
    const match = root.match(new RegExp(`\\b${name}=["']([\\d.]+)(px|pt|pc|in|cm|mm)?["']`, 'i'));
    if (!match) return undefined;
    return +match[1] * ({ px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 }[match[2]?.toLowerCase() ?? 'px']);
  };
  const viewBox = root.match(/\bviewBox=["']([^"']+)["']/i)?.[1].trim().split(/[\s,]+/).map(Number);
  return { width: positive(length('width') ?? viewBox?.[2] ?? 1, 'SVG width'), height: positive(length('height') ?? viewBox?.[3] ?? 1, 'SVG height') };
}
