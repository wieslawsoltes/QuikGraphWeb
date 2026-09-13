/** Optional native XSD 1.0 validation, backed by libxml2 compiled to WebAssembly. */
import { GraphMLResourceResolver, GraphMLDeserializer, GraphMLSerializer } from './serialization.js';

const schemaBase = 'quikgraphweb://schemas/graphml/1.1/';
const schemaNames = ['graphml.xsd', 'graphml-structure.xsd', 'graphml-attributes.xsd', 'graphml-parseinfo.xsd', 'xlink.xsd'];
const providers = new WeakMap();
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const constructionKey = Symbol('GraphMLSchemaValidator');

/** @typedef {{Message:string, FileName:string, LineNumber:number, ColumnNumber:number, Severity:string, Path:string|null}} GraphMLValidationDiagnostic */
/** @typedef {{IsValid:boolean, Errors:ReadonlyArray<GraphMLValidationDiagnostic>}} GraphMLValidationResult */
/** @typedef {{engineLoader?:()=>Promise<any>, engineUrl?:string|URL}} GraphMLSchemaValidatorOptions */

function inputText(input) {
  if (typeof input === 'string') return input;
  if (input instanceof Uint8Array) return decoder.decode(input);
  if (input instanceof ArrayBuffer) return decoder.decode(new Uint8Array(input));
  if (input?.ReadToEnd) { const text = input.ReadToEnd(); if (typeof text === 'string') return text; }
  const text = input?.documentElement?.outerHTML ?? input?.outerHTML;
  if (typeof text === 'string') return text;
  throw new TypeError('GraphML input must be XML text, UTF-8 bytes, an XML document, or a synchronous ReadToEnd reader');
}

function diagnostics(error, filename) {
  return Object.freeze((error.details?.length ? error.details : [{ message: error.message }]).map(d => Object.freeze({
    Message: String(d.message ?? 'XML validation failed').trim(),
    FileName: String(d.file || filename),
    LineNumber: Number(d.line) || 0,
    ColumnNumber: Number(d.col) || 0,
    Severity: d.level === 1 ? 'warning' : d.level === 3 ? 'fatal' : 'error',
    Path: d.xpath || null,
  })));
}

function schemaText(name) {
  const source = decoder.decode(GraphMLResourceResolver.GetResource(name));
  return source.replace(/schemaLocation="([^"]+)"/g, (_, location) => {
    const dependency = location.split('/').at(-1);
    if (!schemaNames.includes(dependency)) throw new Error(`Unbundled GraphML schema dependency: ${location}`);
    return `schemaLocation="${schemaBase}${dependency}"`;
  });
}

function registerSchemas(engine) {
  if (providers.has(engine)) return;
  const resources = Object.create(null);
  for (const name of schemaNames) resources[schemaBase + name] = encoder.encode(schemaText(name));
  const provider = new engine.XmlBufferInputProvider(resources);
  if (!engine.xmlRegisterInputProvider(provider)) throw new Error('libxml2 could not register the local GraphML schema resolver');
  // One immutable resolver per engine; do not clear the engine's global registry because
  // applications can also have unrelated input providers. No resolver is added per instance.
  providers.set(engine, provider);
}

/** Error containing the original libxml2 schema or parser diagnostics. */
export class GraphMLValidationError extends SyntaxError {
  /** @param {ReadonlyArray<GraphMLValidationDiagnostic>} errors @param {Error} [cause] */
  constructor(errors, cause) {
    super(errors.map(error => `${error.FileName}:${error.LineNumber}:${error.ColumnNumber}: ${error.Message}`).join('\n'), cause ? { cause } : undefined);
    this.name = 'GraphMLValidationError';
    this.Errors = errors;
  }
}

/** A reusable compiled GraphML schema. Create with CreateGraphMLSchemaValidator(). */
export class GraphMLSchemaValidator {
  constructor(key, engine, schema) {
    if (key !== constructionKey) throw new TypeError('Use await CreateGraphMLSchemaValidator()');
    this._engine = engine;
    this._schema = schema;
    this._disposed = false;
  }
  get IsDisposed() { return this._disposed; }
  get SchemaNamespace() { return 'http://graphml.graphdrawing.org/xmlns'; }
  get SchemaVersion() { return '1.1'; }
  _ensureActive() { if (this._disposed) throw new Error('GraphMLSchemaValidator is disposed'); }

  /** Validate XML with the bundled official GraphML 1.1 XSD, including its imports/redefines.
   * @param {string|Uint8Array|ArrayBuffer|any} input
   * @param {{filename?:string}} [options]
   * @returns {GraphMLValidationResult}
   */
  Validate(input, options = {}) {
    this._ensureActive();
    const xml = inputText(input), filename = String(options.filename ?? 'graph.graphml');
    const engine = this._engine;
    let document;
    try {
      document = engine.XmlDocument.fromString(xml, {
        url: filename,
        option: engine.ParseOption.XML_PARSE_NONET | engine.ParseOption.XML_PARSE_NO_XXE | engine.ParseOption.XML_PARSE_BIG_LINES,
      });
      this._schema.validate(document);
      return Object.freeze({ IsValid: true, Errors: Object.freeze([]) });
    } catch (error) {
      // Libxml2 rejects unresolved entity-reference trees with XmlError; report that
      // as a failed validation too. JavaScript/runtime errors still propagate.
      if (!(error instanceof engine.XmlError)) throw error;
      return Object.freeze({ IsValid: false, Errors: diagnostics(error, filename) });
    } finally {
      document?.dispose();
    }
  }

  /** @returns {GraphMLValidationResult} */
  ValidateAndThrow(input, options = {}) {
    const result = this.Validate(input, options);
    if (!result.IsValid) throw new GraphMLValidationError(result.Errors);
    return result;
  }

  /** Validate before invoking a factory, assigning properties, or mutating a graph. */
  Deserialize(input, options = {}) {
    this._ensureActive();
    const text = inputText(input);
    this.ValidateAndThrow(text, { filename: options.filename });
    return new GraphMLDeserializer(options).Deserialize(text, options.graph, options.vertexFactory, options.edgeFactory);
  }

  /** Serialize and validate before invoking an optional output writer. */
  Serialize(graph, options = {}) {
    this._ensureActive();
    const text = new GraphMLSerializer(options).Serialize(graph, options);
    this.ValidateAndThrow(text, { filename: options.filename });
    const writer = options.writer;
    if (writer !== undefined && writer !== null) {
      if (typeof writer === 'function') writer(text);
      else if (typeof writer.Write === 'function') writer.Write(text);
      else if (typeof writer.write === 'function') writer.write(text);
      else throw new TypeError('writer must be a callback or expose Write/write');
    }
    return text;
  }

  /** Release the compiled native schema. Repeated disposal is harmless. */
  Dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._schema.dispose();
    this._schema = null;
    this._engine = null;
  }
  dispose() { this.Dispose(); }
  [Symbol.dispose ?? Symbol.for('Symbol.dispose')]() { this.Dispose(); }
}

/** Load WebAssembly once and compile an independent, disposable GraphML XSD validator.
 * @param {GraphMLSchemaValidatorOptions} [options]
 * @returns {Promise<GraphMLSchemaValidator>}
 */
export async function CreateGraphMLSchemaValidator(options = {}) {
  if (!options || typeof options !== 'object') throw new TypeError('options must be an object');
  if (options.engineLoader !== undefined && typeof options.engineLoader !== 'function') throw new TypeError('engineLoader must be a function');
  // The build redirects this default import to the shipped vendor module.
  const engine = await (options.engineLoader ? options.engineLoader() : options.engineUrl ? import(String(options.engineUrl)) : import('libxml2-wasm'));
  for (const name of ['XmlDocument', 'XsdValidator', 'XmlError', 'XmlLibError', 'XmlBufferInputProvider', 'xmlRegisterInputProvider']) {
    if (!engine?.[name]) throw new TypeError(`The XML engine does not expose ${name}`);
  }
  registerSchemas(engine);
  let document;
  try {
    document = engine.XmlDocument.fromString(schemaText('graphml.xsd'), { url: schemaBase + 'graphml.xsd' });
    return new GraphMLSchemaValidator(constructionKey, engine, engine.XsdValidator.fromDoc(document));
  } catch (error) {
    if (!(error instanceof engine.XmlLibError)) throw error;
    throw new GraphMLValidationError(diagnostics(error, 'graphml.xsd'), error);
  } finally {
    document?.dispose();
  }
}

/** Validate one document, releasing the compiled schema even on failure. */
export async function ValidateGraphMLSchema(input, options = {}) {
  const validator = await CreateGraphMLSchemaValidator(options);
  try { return validator.Validate(input, options); } finally { validator.Dispose(); }
}

/** An asynchronous counterpart that performs real XSD validation before deserialization. */
export async function DeserializeAndValidateGraphML(input, options = {}) {
  const validator = await CreateGraphMLSchemaValidator(options);
  try { return validator.Deserialize(input, options); } finally { validator.Dispose(); }
}
