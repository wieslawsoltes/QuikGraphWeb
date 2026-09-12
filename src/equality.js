// QuikGraphWeb equality collections, Microsoft Public License (MS-PL).
// Native identity is retained unless a key explicitly supplies a .NET-style Equals method.
export function valueEquals(a, b) { return a === b || (a !== a && b !== b) || (a != null && typeof a.Equals === 'function' && !!a.Equals(b)); }
const NativeMap = globalThis.Map;
const NativeSet = globalThis.Set;
const hasEquality = value => value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.Equals === 'function';
const hashKey = value => typeof value.GetHashCode === 'function' ? value.GetHashCode() : undefined;
// Consume the same set-like protocol as native Set composition, then index its keys
// with explicit equality so a native Set supplied by a caller also compares correctly.
function equalitySetArgument(other) {
  if (other == null || (typeof other !== 'object' && typeof other !== 'function')) throw new TypeError('Expected a set-like object.');
  const size = Number(other.size);
  if (Number.isNaN(size)) throw new TypeError('Set-like size must be numeric.');
  if (Math.trunc(size) < 0) throw new RangeError('Set-like size must be nonnegative.');
  if (typeof other.has !== 'function' || typeof other.keys !== 'function') throw new TypeError('Set-like object must provide has() and keys().');
  return other instanceof EqualitySet ? other : new EqualitySet({ [Symbol.iterator]: () => other.keys() });
}
/** Map with explicit Equals/GetHashCode key semantics and native primitive/reference-key fast paths. */
export class EqualityMap extends NativeMap {
  constructor(entries) { super(); this._buckets = null; if (entries != null) for (const [key, value] of entries) this.set(key, value); }
  _canonicalKey(key) {
    if (NativeMap.prototype.has.call(this, key) || !hasEquality(key)) return key;
    const bucket = this._buckets?.get(hashKey(key));
    if (bucket) for (const candidate of bucket) if (valueEquals(candidate, key)) return candidate;
    return key;
  }
  has(key) { if (NativeMap.prototype.has.call(this, key)) return true; if (!hasEquality(key)) return false; return NativeMap.prototype.has.call(this, this._canonicalKey(key)); }
  get(key) { if (NativeMap.prototype.has.call(this, key) || !hasEquality(key)) return NativeMap.prototype.get.call(this, key); return NativeMap.prototype.get.call(this, this._canonicalKey(key)); }
  set(key, value) {
    if (NativeMap.prototype.has.call(this, key) || !hasEquality(key)) { NativeMap.prototype.set.call(this, key, value); return this; }
    const hash = hashKey(key); this._buckets ??= new NativeMap(); let bucket = this._buckets.get(hash);
    if (bucket) for (const candidate of bucket) if (valueEquals(candidate, key)) { NativeMap.prototype.set.call(this, candidate, value); return this; }
    if (!bucket) { bucket = []; this._buckets.set(hash, bucket); }
    bucket.push(key); NativeMap.prototype.set.call(this, key, value); return this;
  }
  delete(key) {
    const canonical = this._canonicalKey(key);
    if (!NativeMap.prototype.delete.call(this, canonical)) return false;
    if (hasEquality(canonical)) { const hash = hashKey(canonical), bucket = this._buckets.get(hash); if (bucket) { const index = bucket.indexOf(canonical); if (index >= 0) bucket.splice(index, 1); if (!bucket.length) this._buckets.delete(hash); } }
    return true;
  }
  clear() { NativeMap.prototype.clear.call(this); this._buckets?.clear(); }
}
/** Set with the same explicit key equality rules as EqualityMap. */
export class EqualitySet extends NativeSet {
  constructor(values) { super(); this._index = null; if (values != null) for (const value of values) this.add(value); }
  add(value) { if (!hasEquality(value)) { NativeSet.prototype.add.call(this, value); return this; } this._index ??= new EqualityMap(); if (!this._index.has(value)) { this._index.set(value, value); NativeSet.prototype.add.call(this, value); } return this; }
  has(value) { if (NativeSet.prototype.has.call(this, value)) return true; return hasEquality(value) && (this._index?.has(value) ?? false); }
  delete(value) { if (!hasEquality(value)) return NativeSet.prototype.delete.call(this, value); if (!this._index?.has(value)) return false; const canonical = this._index.get(value); this._index.delete(value); return NativeSet.prototype.delete.call(this, canonical); }
  clear() { NativeSet.prototype.clear.call(this); this._index?.clear(); }
  union(other) { const right = equalitySetArgument(other), result = new EqualitySet(this); for (const value of right) result.add(value); return result; }
  intersection(other) { const right = equalitySetArgument(other), result = new EqualitySet(), smaller = this.size <= right.size ? this : right, larger = smaller === this ? right : this; for (const value of smaller) if (larger.has(value)) result.add(value); return result; }
  difference(other) { const right = equalitySetArgument(other), result = new EqualitySet(); for (const value of this) if (!right.has(value)) result.add(value); return result; }
  symmetricDifference(other) { const right = equalitySetArgument(other), result = this.difference(right); for (const value of right) if (!this.has(value)) result.add(value); return result; }
  isSubsetOf(other) { const right = equalitySetArgument(other); if (this.size > right.size) return false; for (const value of this) if (!right.has(value)) return false; return true; }
  isSupersetOf(other) { const right = equalitySetArgument(other); return right.isSubsetOf(this); }
  isDisjointFrom(other) { const right = equalitySetArgument(other), smaller = this.size <= right.size ? this : right, larger = smaller === this ? right : this; for (const value of smaller) if (larger.has(value)) return false; return true; }
}
