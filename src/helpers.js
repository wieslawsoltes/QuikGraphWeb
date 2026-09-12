// Adapted from QuikGraph. Microsoft Public License (MS-PL); see LICENSE and NOTICE.
import { equals } from './core.js';
/** Cryptographically secure random source; the seed is intentionally ignored. */
export class CryptoRandom {
  constructor(_ignoredSeed) { this._buffer = new Uint32Array(1); }
  _uint() { globalThis.crypto.getRandomValues(this._buffer); return this._buffer[0]; }
  Next(minValue, maxValue) {
    if (arguments.length === 0) return this._uint() & 0x7fffffff;
    if (arguments.length === 1) { maxValue = minValue; minValue = 0; }
    if (!Number.isInteger(minValue) || !Number.isInteger(maxValue) || minValue < -2147483648 || maxValue > 2147483647 || minValue > maxValue) throw new RangeError('Expected ordered Int32 bounds.');
    if (minValue === maxValue) return minValue;
    const range = maxValue - minValue, limit = 4294967296 - (4294967296 % range);
    let value; do { value = this._uint(); } while (value >= limit);
    return minValue + value % range;
  }
  NextDouble() { return this._uint() / 4294967296; }
  NextBytes(buffer) {
    if (buffer == null) throw new TypeError('buffer is required.');
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.length);
    for (let offset = 0; offset < bytes.length; offset += 65536) globalThis.crypto.getRandomValues(bytes.subarray(offset, offset + 65536));
    if (bytes !== buffer) for (let i = 0; i < bytes.length; i++) buffer[i] = bytes[i];
  }
}
/** Graph equality with .NET-shaped comparer objects or JavaScript predicates. */
export const EquateGraphs = Object.freeze({
  Equate(left, right, vertexEquality = equals, edgeEquality = equals) {
    const comparer = (value, name) => { if (typeof value === 'function') return value; if (typeof value?.Equals === 'function') return value.Equals.bind(value); throw new TypeError(`${name} is required.`); };
    const vertexEquals = comparer(vertexEquality, 'vertexEquality'), edgeEquals = comparer(edgeEquality, 'edgeEquality');
    if (left == null) return right == null;
    if (right == null) return false;
    if (left === right) return true;
    if (left.IsDirected !== right.IsDirected || left.VertexCount !== right.VertexCount || left.EdgeCount !== right.EdgeCount) return false;
    const unmatchedVertices = [...right.Vertices];
    for (const vertex of left.Vertices) { const index = unmatchedVertices.findIndex(v => vertexEquals(vertex,v)); if (index < 0) return false; unmatchedVertices.splice(index,1); }
    const unmatchedEdges = [...right.Edges];
    for (const edge of left.Edges) { const index = unmatchedEdges.findIndex(e => edgeEquals(e,edge)); if (index < 0) return false; unmatchedEdges.splice(index,1); }
    return true;
  }
});
export const EnumerableHelpers = Object.freeze({ ForEach(values, action) { if (values == null || typeof action !== 'function') throw new TypeError('values and action are required.'); for (const value of values) action(value); } });
export const HashCodeHelpers = Object.freeze({
  Combine(...values) {
    if (values.length < 2 || values.length > 4) throw new RangeError('Two to four hashes expected.');
    let hash = 2166136261 | 0;
    for (const value of values) {
      if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new RangeError('Hash values must be Int32 integers.');
      for (let shift = 0; shift < 32; shift += 8) hash = Math.imul(hash, 16777619) ^ ((value >>> shift) & 255);
    }
    return hash;
  }
});
export const QuikGraphHelpers = Object.freeze({ ToTryFunc(fn) { if (typeof fn !== 'function') throw new TypeError('Function required.'); return value => fn(value) ?? undefined; } });
