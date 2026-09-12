import { EqualityMap as Map, EqualitySet as Set } from './equality.js';
// Collection algorithms adapted from QuikGraph under the Microsoft Public License.
import { requireValue, equals, defaultCompare, InvalidOperationException } from './core.js';
const pair = (Key, Value) => ({ Key, Value });
export const HeapDirection = Object.freeze({ Increasing: 0, Decreasing: 1 });
export const HeapConstants = Object.freeze({ Consistent: 'Is_Consistent', NotConsistent: 'Is_NOT_Consistent' });

class List extends Array {
  constructor(items = []) { super(); if (typeof items === 'number') { if (items < 0) throw new RangeError('Negative capacity.'); this.Capacity = items; } else { requireValue(items); for (const x of items) this.push(x); this.Capacity = this.length; } }
  static get [Symbol.species]() { return Array; }
  get Count() { return this.length; }
  Add(value) { this.push(value); }
  AddRange(values) { for (const v of requireValue(values)) this.push(v); }
  Contains(value) { return this.some(x => equals(x, value)); }
  IndexOf(value) { return this.findIndex(x => equals(x, value)); }
  Remove(value) { const i = this.IndexOf(value); if (i < 0) return false; this.splice(i, 1); return true; }
  RemoveAt(i) { if (!Number.isInteger(i) || i < 0 || i >= this.length) throw new RangeError('Index out of range.'); this.splice(i, 1); }
  RemoveAll(predicate) { requireValue(predicate); const kept = this.filter(x => !predicate(x)), n = this.length - kept.length; this.length = 0; this.AddRange(kept); return n; }
  Clear() { this.length = 0; }
  ToArray() { return Array.from(this); }
  TrimExcess() { this.Capacity = this.length; }
  Clone() { return new this.constructor(this); }
}
export class VertexList extends List {}
export class EdgeList extends List {}
class Dictionary extends Map {
  constructor(input) { if (typeof input === 'number') { if (input < 0) throw new RangeError('Negative capacity.'); super(); } else super(input); }
  get Count() { return this.size; } get Keys() { return Array.from(this.keys()); } get Values() { return Array.from(this.values()); }
  Add(key, value) { requireValue(key); if (this.has(key)) throw new TypeError('Duplicate key.'); this.set(key, value); }
  ContainsKey(key) { return this.has(requireValue(key)); }
  Remove(key) { return this.delete(requireValue(key)); }
  TryGetValue(key) { return this.get(requireValue(key)); }
  Clear() { this.clear(); }
  Clone() { return new this.constructor(this); }
}
export class VertexEdgeDictionary extends Dictionary { Clone() { const d = new VertexEdgeDictionary(); for (const [k, v] of this) d.set(k, typeof v.Clone === 'function' ? v.Clone() : new EdgeList(v)); return d; } }
export class EdgeEdgeDictionary extends Dictionary {}

/** FIFO ring queue with amortized O(1) enqueue and dequeue. */
export class Queue {
  constructor(items = []) { if (typeof items === 'number') { if (items < 0) throw new RangeError('Negative capacity.'); items = []; } this._a = Array.from(requireValue(items)); this._head = 0; }
  get Count() { return this._a.length - this._head; }
  Enqueue(v) { this._a.push(v); }
  Dequeue() { if (!this.Count) throw new InvalidOperationException('Queue is empty.'); const v = this._a[this._head]; this._a[this._head++] = undefined; if (this._head >= 1024 && this._head * 2 >= this._a.length) { this._a = this._a.slice(this._head); this._head = 0; } return v; }
  Peek() { if (!this.Count) throw new InvalidOperationException('Queue is empty.'); return this._a[this._head]; }
  Contains(v) { for (let i = this._head; i < this._a.length; ++i) if (equals(v, this._a[i])) return true; return false; }
  Clear() { this._a = []; this._head = 0; }
  ToArray() { return this._a.slice(this._head); }
  [Symbol.iterator]() { return this.ToArray()[Symbol.iterator](); }
}

/** Binary min-heap. Duplicate values retain upstream first-match update semantics. */
export class BinaryHeap {
  constructor(capacity = 16, priorityComparison = defaultCompare) { if (typeof capacity === 'function') { priorityComparison = capacity; capacity = 16; } if (!Number.isInteger(capacity) || capacity < 0) throw new RangeError('Negative capacity.'); this.Capacity = capacity; this.PriorityComparison = requireValue(priorityComparison); this._items = []; this._version = 0; }
  get Count() { return this._items.length; }
  _less(i, j) { return this.PriorityComparison(this._items[i].Key, this._items[j].Key) < 0; }
  _swap(i, j) { const x = this._items[i]; this._items[i] = this._items[j]; this._items[j] = x; }
  _up(i) { while (i > 0) { const p = (i - 1) >> 1; if (!this._less(i, p)) break; this._swap(i, p); i = p; } }
  _down(i) { for (;;) { const l = i * 2 + 1, r = l + 1; let min = i; if (l < this.Count && this._less(l, min)) min = l; if (r < this.Count && this._less(r, min)) min = r; if (min === i) break; this._swap(i, min); i = min; } }
  Add(priority, value) { requireValue(priority); if (this.Count >= this.Capacity) this.Capacity = this.Capacity * 2 + 1; this._items.push(pair(priority, value)); ++this._version; this._up(this.Count - 1); }
  Minimum() { if (!this.Count) throw new InvalidOperationException('Heap is empty.'); return { ...this._items[0] }; }
  RemoveMinimum() { const p = this.Minimum(), last = this._items.pop(); if (this.Count) { this._items[0] = last; this._down(0); } ++this._version; return p; }
  IndexOf(value) { return this._items.findIndex(x => equals(x.Value, value)); }
  Update(priority, value) { requireValue(priority); const i = this.IndexOf(value); if (i < 0) return this.Add(priority, value); const old = this._items[i].Key; this._items[i] = pair(priority, value); ++this._version; if (this.PriorityComparison(priority, old) > 0) this._down(i); else this._up(i); }
  MinimumUpdate(priority, value) { requireValue(priority); const i = this.IndexOf(value); if (i >= 0 && this.PriorityComparison(priority, this._items[i].Key) > 0) return false; this.Update(priority, value); return true; }
  ToArray() { return this._items.map(x => x.Value); }
  ToPairsArray() { return this._items.map(x => ({ ...x })); }
  *[Symbol.iterator]() { const version = this._version; for (let i = 0; i < this.Count; ++i) { if (version !== this._version) throw new InvalidOperationException('Collection modified during enumeration.'); yield { ...this._items[i] }; } if (version !== this._version) throw new InvalidOperationException('Collection modified during enumeration.'); }
  IsConsistent() { for (let i = 1; i < this.Count; ++i) if (this.PriorityComparison(this._items[(i - 1) >> 1].Key, this._items[i].Key) > 0) return false; return true; }
  _entry(i) { const p = this._items[i]; return p ? `${p.Key} ${p.Value == null ? 'null' : p.Value}` : 'null'; }
  ToString2() { return `${this.IsConsistent() ? HeapConstants.Consistent : HeapConstants.NotConsistent}: ${Array.from({ length: this.Capacity }, (_, i) => this._entry(i)).join(', ')}`; }
  ToStringTree() { let s = this.IsConsistent() ? HeapConstants.Consistent : HeapConstants.NotConsistent; for (let i = 0; i < this.Count; ++i) s += `\nindex${i} ${this._entry(i)} -> ${this._entry(2 * i + 1)} and ${this._entry(2 * i + 2)}`; return s; }
}
export class BinaryQueue {
  constructor(distanceFunc, distanceComparison = defaultCompare) { this._distance = requireValue(distanceFunc); this._heap = new BinaryHeap(requireValue(distanceComparison)); }
  get Count() { return this._heap.Count; }
  Contains(value) { return this._heap.IndexOf(value) >= 0; }
  Enqueue(value) { this._heap.Add(this._distance(requireValue(value)), value); }
  Dequeue() { return this._heap.RemoveMinimum().Value; }
  Peek() { return this._heap.Minimum().Value; }
  Update(value) { this._heap.Update(this._distance(requireValue(value)), value); }
  ToArray() { return this._heap.ToArray(); }
  ToPairsArray() { return this._heap.ToPairsArray(); }
  ToString2() { return this._heap.ToString2(); }
}

export class ForestDisjointSet {
  constructor(capacity = 0) { if (capacity < 0) throw new RangeError('Negative capacity.'); this._elements = new Map(); this.SetCount = 0; }
  get ElementCount() { return this._elements.size; }
  Contains(v) { return this._elements.has(requireValue(v)); }
  MakeSet(v) { requireValue(v); if (this._elements.has(v)) throw new TypeError('Element already exists.'); const e = { Value: v, Rank: 0 }; e.Parent = e; this._elements.set(v, e); ++this.SetCount; }
  _find(v) { let e = this._elements.get(requireValue(v)); if (!e) throw new TypeError('Element is not in the disjoint set.'); let root = e; while (root.Parent !== root) root = root.Parent; while (e.Parent !== e) { const p = e.Parent; e.Parent = root; e = p; } return root; }
  FindSet(v) { return this._find(v).Value; }
  AreInSameSet(a, b) { return this._find(a) === this._find(b); }
  Union(a, b) { let x = this._find(a), y = this._find(b); if (x === y) return false; if (x.Rank < y.Rank) x.Parent = y; else { y.Parent = x; if (x.Rank === y.Rank) ++x.Rank; } --this.SetCount; return true; }
}

export class FibonacciHeapLinkedList {
  constructor() { this.First = null; this._last = null; }
  AddLast(cell) { cell.Previous = this._last; cell.Next = null; if (this._last) this._last.Next = cell; else this.First = cell; this._last = cell; }
  Remove(cell) { if (cell.Previous) cell.Previous.Next = cell.Next; else if (this.First === cell) this.First = cell.Next; if (cell.Next) cell.Next.Previous = cell.Previous; else if (this._last === cell) this._last = cell.Previous; cell.Previous = cell.Next = null; }
  MergeLists(list) { if (!list.First) return; if (this._last) this._last.Next = list.First; else this.First = list.First; list.First.Previous = this._last; this._last = list._last; list.First = list._last = null; }
  *[Symbol.iterator]() { let c = this.First; while (c) { yield c; c = c.Next; } }
}
export class FibonacciHeapCell {
  constructor(priority, value) { this.Priority = priority; this.Value = value; this.Marked = false; this.Degree = 0; this.Removed = false; this.Parent = null; this.Children = new FibonacciHeapLinkedList(); this.Previous = this.Next = null; }
  ToKeyValuePair() { return pair(this.Priority, this.Value); }
}
/** Fibonacci heap with O(1) amortized insert/decrease-key and O(log n) delete-min. */
export class FibonacciHeap {
  constructor(direction = HeapDirection.Increasing, priorityComparison = defaultCompare) { if (direction !== 0 && direction !== 1) throw new RangeError('Invalid heap direction.'); this.Direction = direction; this.PriorityComparison = requireValue(priorityComparison); this._roots = new FibonacciHeapLinkedList(); this._top = null; this.Count = 0; this._owner = { parent: null }; }
  get IsEmpty() { return this.Count === 0; } get Top() { return this._top; }
  _compare(a, b) { return this.PriorityComparison(a, b) * (this.Direction === 0 ? 1 : -1); }
  _ownerRoot(o) { while (o.parent) o = o.parent; return o; }
  _check(c) { requireValue(c); if (c.Removed || !c._owner || this._ownerRoot(c._owner) !== this._ownerRoot(this._owner)) throw new InvalidOperationException('Cell does not belong to this heap.'); }
  Enqueue(priority, value) { requireValue(priority); const c = new FibonacciHeapCell(priority, value); c._owner = this._owner; this._roots.AddLast(c); if (!this._top || this._compare(priority, this._top.Priority) < 0) this._top = c; ++this.Count; return c; }
  _cut(c, p) { p.Children.Remove(c); --p.Degree; c.Parent = null; c.Marked = false; this._roots.AddLast(c); }
  _cascade(c) { for (let p = c.Parent; p; p = c.Parent) { if (!c.Marked) { c.Marked = true; break; } this._cut(c, p); c = p; } }
  ChangeKey(c, priority) { this._check(c); requireValue(priority); const comparison = this._compare(priority, c.Priority); if (comparison > 0) { this.Delete(c); c.Priority = priority; c.Removed = false; c._owner = this._owner; this._roots.AddLast(c); ++this.Count; if (!this._top || this._compare(priority, this._top.Priority) < 0) this._top = c; return; } c.Priority = priority; const p = c.Parent; if (p && this._compare(c.Priority, p.Priority) < 0) { this._cut(c, p); this._cascade(p); } if (!this._top || this._compare(c.Priority, this._top.Priority) < 0) this._top = c; }
  Delete(c) { this._check(c); const p = c.Parent; if (p) { this._cut(c, p); this._cascade(p); } this._top = c; this.Dequeue(); }
  Dequeue() { const z = this._top; if (!z) throw new InvalidOperationException('Heap is empty.'); for (const child of Array.from(z.Children)) { z.Children.Remove(child); child.Parent = null; child.Marked = false; this._roots.AddLast(child); } this._roots.Remove(z); z.Removed = true; z.Parent = null; z.Degree = 0; --this.Count; this._top = null; if (this.Count) this._consolidate(); return z.ToKeyValuePair(); }
  _consolidate() { const degrees = []; for (const node of Array.from(this._roots)) { if (node.Parent) continue; let x = node; while (degrees[x.Degree]) { let y = degrees[x.Degree]; degrees[x.Degree] = undefined; if (this._compare(y.Priority, x.Priority) < 0) [x, y] = [y, x]; this._roots.Remove(y); y.Parent = x; y.Marked = false; x.Children.AddLast(y); ++x.Degree; } degrees[x.Degree] = x; } for (const c of this._roots) if (!this._top || this._compare(c.Priority, this._top.Priority) < 0) this._top = c; }
  Merge(heap) { requireValue(heap); if (heap === this) throw new TypeError('Cannot merge a heap with itself.'); if (heap.Direction !== this.Direction || heap.PriorityComparison !== this.PriorityComparison) throw new TypeError('Heaps must use identical ordering.'); if (!heap.Count) return; if (!this._top || this._compare(heap._top.Priority, this._top.Priority) < 0) this._top = heap._top; this._roots.MergeLists(heap._roots); this.Count += heap.Count; this._ownerRoot(heap._owner).parent = this._ownerRoot(this._owner); heap.Count = 0; heap._top = null; heap._owner = { parent: null }; }
  *[Symbol.iterator]() { const stack = Array.from(this._roots).reverse(); while (stack.length) { const c = stack.pop(); yield c.ToKeyValuePair(); const children = Array.from(c.Children); for (let i = children.length - 1; i >= 0; --i) stack.push(children[i]); } }
  *GetDestructiveEnumerator() { while (this.Count) yield this.Dequeue(); }
  DrawHeap() { const lines = []; let column = 0; const stack = Array.from(this._roots, c => ({ c, level: 0 })).reverse(); while (stack.length) { const { c, level } = stack.pop(); const label = `${c.Priority}${c.Marked ? '*' : ''} `; lines[level] = (lines[level] ?? '').padEnd(column, ' ') + label; const children = Array.from(c.Children); if (children.length) { for (let i = children.length - 1; i >= 0; --i) stack.push({ c: children[i], level: level + 1 }); } else column += label.length; } return lines.join('\n'); }
}
export class FibonacciQueue {
  constructor(...args) { let distance, compare = defaultCompare; if (typeof args[0] === 'number') { if (args[0] < 0) throw new RangeError('Negative capacity.'); distance = args[2]; compare = args.length > 3 ? args[3] : defaultCompare; } else if (args[0] instanceof globalThis.Map) { const map = args[0]; distance = v => { if (!map.has(v)) throw new TypeError('Key not found.'); return map.get(v); }; compare = args.length > 1 ? args[1] : defaultCompare; } else { distance = args[0]; compare = args.length > 1 ? args[1] : defaultCompare; } this._distance = requireValue(distance); this._heap = new FibonacciHeap(HeapDirection.Increasing, requireValue(compare)); this._cells = new Map(); }
  get Count() { return this._heap.Count; }
  Contains(v) { return this._cells.has(v) && !this._cells.get(v).Removed; }
  Enqueue(v) { requireValue(v); this._cells.set(v, this._heap.Enqueue(this._distance(v), v)); }
  Dequeue() { return this._heap.Dequeue().Value; }
  Peek() { if (!this.Count) throw new InvalidOperationException('Queue is empty.'); return this._heap.Top.Value; }
  Update(v) { requireValue(v); const c = this._cells.get(v); if (c && !c.Removed) this._heap.ChangeKey(c, this._distance(v)); else throw new InvalidOperationException('Vertex has not been enqueued or was removed.'); }
  ToArray() { return Array.from(this._heap, p => p.Value); }
}

/** Chazelle soft heap. Returned priorities may be corrupted within ErrorRate's bound. */
export class SoftHeap {
  constructor(maximumErrorRate, keyMaxValue, comparison = defaultCompare) { this.KeyMaxValue = requireValue(keyMaxValue); if (!(maximumErrorRate > 0 && maximumErrorRate <= 0.5)) throw new RangeError('Error rate must be in (0, 0.5].'); this.KeyComparison = requireValue(comparison); this.ErrorRate = maximumErrorRate; this.MinRank = 2 + 2 * Math.ceil(Math.log2(1 / maximumErrorRate)); this.Count = 0; this._header = {}; this._tail = { Rank: Infinity, Prev: this._header }; this._header.Next = this._tail; }
  Add(key, value) { requireValue(key); if (this.KeyComparison(key, this.KeyMaxValue) >= 0) throw new RangeError('Key must be below the maximum sentinel.'); const cell = { Key: key, Value: value, Next: null }; this._meld({ CKey: key, Rank: 0, Next: null, Child: null, IL: cell, ILTail: cell }); ++this.Count; }
  // Winner must be Next (the branch shifted after its list is consumed); upstream swapped the branches.
  _meld(node) { let to = this._header.Next; while (node.Rank > to.Rank) to = to.Next; const prev = to.Prev; while (node.Rank === to.Rank) { let top, bottom; if (this.KeyComparison(to.Queue.CKey, node.CKey) > 0) { top = node; bottom = to.Queue; } else { top = to.Queue; bottom = node; } node = { CKey: top.CKey, Rank: top.Rank + 1, Next: top, Child: bottom, IL: top.IL, ILTail: top.ILTail }; to = to.Next; } const head = prev === to.Prev ? {} : prev.Next; Object.assign(head, { Queue: node, Rank: node.Rank, Prev: prev, Next: to }); prev.Next = head; to.Prev = head; this._fixMin(head); }
  _fixMin(head) { if (head === this._header) return; let min = head.Next === this._tail ? head : head.Next.SuffixMin; while (head !== this._header) { if (this.KeyComparison(min.Queue.CKey, head.Queue.CKey) > 0) min = head; head.SuffixMin = min; head = head.Prev; } }
  _shift(v) { v.IL = v.ILTail = null; if (!v.Next && !v.Child) { v.CKey = this.KeyMaxValue; return v; } v.Next = this._shift(v.Next); if (this.KeyComparison(v.Next.CKey, v.Child.CKey) > 0) [v.Child, v.Next] = [v.Next, v.Child]; v.IL = v.Next.IL; v.ILTail = v.Next.ILTail; v.CKey = v.Next.CKey; if (v.Rank > this.MinRank && (v.Rank % 2 === 1 || v.Child.Rank < v.Rank - 1)) { v.Next = this._shift(v.Next); if (this.KeyComparison(v.Next.CKey, v.Child.CKey) > 0) [v.Child, v.Next] = [v.Next, v.Child]; if (this.KeyComparison(v.Next.CKey, this.KeyMaxValue) !== 0 && v.Next.IL) { v.Next.ILTail.Next = v.IL; v.IL = v.Next.IL; if (!v.ILTail) v.ILTail = v.Next.ILTail; v.CKey = v.Next.CKey; } } if (this.KeyComparison(v.Child.CKey, this.KeyMaxValue) === 0) { if (this.KeyComparison(v.Next.CKey, this.KeyMaxValue) === 0) { v.Child = v.Next = null; } else { v.Child = v.Next.Child; v.Next = v.Next.Next; } } return v; }
  RemoveMinimum() { if (!this.Count) throw new InvalidOperationException('Heap is empty.'); let head = this._header.Next.SuffixMin; while (!head.Queue.IL) { let tmp = head.Queue, children = 0; while (tmp.Next) { tmp = tmp.Next; ++children; } if (children < Math.trunc(head.Rank / 2)) { head.Prev.Next = head.Next; head.Next.Prev = head.Prev; this._fixMin(head.Prev); tmp = head.Queue; while (tmp.Next) { this._meld(tmp.Child); tmp = tmp.Next; } } else { head.Queue = this._shift(head.Queue); if (this.KeyComparison(head.Queue.CKey, this.KeyMaxValue) === 0) { head.Prev.Next = head.Next; head.Next.Prev = head.Prev; head = head.Prev; } this._fixMin(head); } head = this._header.Next.SuffixMin; } const cell = head.Queue.IL; head.Queue.IL = cell.Next; if (!head.Queue.IL) head.Queue.ILTail = null; --this.Count; return pair(cell.Key, cell.Value); }
  // Upstream deliberately exposes an empty enumerator: soft heaps cannot be enumerated.
  *[Symbol.iterator]() {}
}
