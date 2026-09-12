import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/collections.js';
import { Edge, defaultCompare } from '../src/core.js';
// Upstream VertexListTests.Clone, EdgeListTests.Clone.
for (const T of [C.VertexList,C.EdgeList]) test(`${T.name}Tests.Clone`, () => { const v={},a=new T([v,2]),b=a.Clone(); b.Remove(2); assert.equal(a.Count,2); assert.equal(b.Count,1); assert.equal(b[0],v); });
// Upstream VertexEdgeDictionaryTests.Clone deep-copies each edge list.
test('VertexEdgeDictionaryTests.Clone', () => { const e=new Edge(1,2),a=new C.VertexEdgeDictionary([[1,new C.EdgeList([e])]]),b=a.Clone(); b.get(1).Add(new Edge(1,3)); assert.equal(a.get(1).Count,1); assert.equal(b.get(1)[0],e); });
// Upstream EdgeEdgeDictionaryTests.Clone.
test('EdgeEdgeDictionaryTests.Clone',()=>{const e=new Edge(1,2),r=new Edge(2,1),a=new C.EdgeEdgeDictionary([[e,r]]),b=a.Clone(); b.Remove(e); assert.equal(a.get(e),r); assert.equal(b.Count,0);});
// Upstream ForestDisjointSetTests.MakeSet/FindSet/AreInSameSet/Union/Contains.
test('ForestDisjointSetTests.FindSet/Union', () => { const s=new C.ForestDisjointSet(); s.MakeSet(1); s.MakeSet(2); assert.equal(s.SetCount,2); assert.equal(s.ElementCount,2); assert.equal(s.FindSet(1),1); assert.equal(s.FindSet(2),2); assert(!s.AreInSameSet(1,2)); assert(s.Union(1,2)); assert.equal(s.FindSet(2),1); assert.equal(s.SetCount,1); assert(s.AreInSameSet(1,2)); assert(!s.Union(2,1)); assert(s.Contains(1)); assert(!s.Contains(3)); });
test('ForestDisjointSetTests.MakeSet_Throws/FindSet_Throws',()=>{const s=new C.ForestDisjointSet(); assert.throws(()=>s.MakeSet(null)); assert.throws(()=>s.FindSet(1)); s.MakeSet(1); assert.throws(()=>s.MakeSet(1));});
// Upstream BinaryHeapTests.Capacity growth fixture, constructor default 16.
test('BinaryHeapTests.Capacity',()=>{const h=new C.BinaryHeap(0); assert.equal(h.Capacity,0); h.Add(1,1); assert.equal(h.Capacity,1); h.Add(1,2); assert.equal(h.Capacity,3); h.Add(1,3); assert.equal(h.Capacity,3); h.Add(1,4); assert.equal(h.Capacity,7); h.RemoveMinimum(); assert.equal(h.Capacity,7); assert.equal(new C.BinaryHeap().Capacity,16);});
// Upstream BinaryHeapTests.Update/MinimumUpdate/IndexOf.
test('BinaryHeapTests.Update/MinimumUpdate',()=>{const h=new C.BinaryHeap(); h.Add(3,'a');h.Add(1,'b');h.Add(2,'c');assert.equal(h.Minimum().Value,'b');h.Update(0,'a');assert.equal(h.Minimum().Value,'a');h.Update(5,'a');assert.equal(h.Minimum().Value,'b');assert(!h.MinimumUpdate(6,'a'));assert(h.MinimumUpdate(-1,'a'));assert.equal(h.RemoveMinimum().Value,'a');h.Update(7,'d');assert.equal(h.Count,3);assert.deepEqual(Array.from({length:3},()=>h.RemoveMinimum().Key),[1,2,7]);assert.throws(()=>h.RemoveMinimum());});
// Upstream BinaryHeapTests.GetEnumerator invalidated by mutation.
test('BinaryHeapTests.GetEnumerator invalidation',()=>{const h=new C.BinaryHeap();h.Add(1,'a');const it=h[Symbol.iterator]();assert.equal(it.next().value.Value,'a');h.Add(2,'b');assert.throws(()=>it.next());});
// Upstream BinaryQueueTests/FibonacciQueueTests.Enqueue/Update/Dequeue.
for(const T of [C.BinaryQueue,C.FibonacciQueue])test(`${T.name}Tests.Update/Dequeue`,()=>{const d=new Map([['a',3],['b',1],['c',2]]),q=new T(v=>d.get(v));for(const v of d.keys())q.Enqueue(v);assert.equal(q.Peek(),'b');d.set('a',0);q.Update('a');assert.equal(q.Dequeue(),'a');assert.equal(q.Dequeue(),'b');assert.equal(q.Dequeue(),'c');assert.equal(q.Count,0);assert.throws(()=>q.Peek());});
// Upstream FibonacciHeapTests.Enqueue/Dequeue/ChangeKey/Delete/Merge.
for(const direction of [C.HeapDirection.Increasing,C.HeapDirection.Decreasing])test(`FibonacciHeapTests.ChangeKey/Delete (${direction})`,()=>{const h=new C.FibonacciHeap(direction),cells=[];for(let i=0;i<100;i++)cells.push(h.Enqueue(i,i));assert.equal(h.Dequeue().Key,direction===0?0:99);const changed=cells[50];h.ChangeKey(changed,direction===0?-10:110);assert.equal(h.Top,changed);h.Delete(cells[70]);assert(cells[70].Removed);const keys=Array.from(h.GetDestructiveEnumerator(),p=>p.Key);assert.equal(keys.length,98);for(let i=1;i<keys.length;i++)assert(direction===0?keys[i-1]<=keys[i]:keys[i-1]>=keys[i]);});
test('FibonacciHeapTests.Merge',()=>{const a=new C.FibonacciHeap(),b=new C.FibonacciHeap(),cell=b.Enqueue(4,'b');a.Enqueue(3,'a');a.Merge(b);assert.equal(a.Count,2);assert.equal(b.Count,0);a.ChangeKey(cell,1);assert.equal(a.Dequeue().Value,'b');assert.equal(a.Dequeue().Value,'a');b.Enqueue(1,'new');assert.equal(b.Count,1);assert.throws(()=>a.ChangeKey(cell,0));});
// Upstream SoftHeapTests.Constructor/Add/RemoveMinimum (small heaps have no corrupted keys).
test('SoftHeapTests.Constructor/Add/RemoveMinimum',()=>{const h=new C.SoftHeap(1/3,100);assert.equal(h.MinRank,6);assert.equal(h.ErrorRate,1/3);for(const key of [4,1,7,3,1,5])h.Add(key,key);assert.equal(h.Count,6);assert.deepEqual(Array.from({length:6},()=>h.RemoveMinimum().Key),[1,1,3,4,5,7]);assert.equal(h.Count,0);assert.throws(()=>h.RemoveMinimum());assert.throws(()=>h.Add(100,'x'));assert.throws(()=>new C.SoftHeap(0,100));});
// Upstream SoftHeapTests.GetEnumerator intentionally yields no elements.
test('SoftHeapTests.GetEnumerator',()=>{const h=new C.SoftHeap(.5,100);h.Add(1,'a');assert.deepEqual([...h],[]);assert.equal(h.Count,1);});
// Regression: random Fibonacci operations validated against an independent Map oracle.
test('Fibonacci heap randomized key updates and removals',()=>{const h=new C.FibonacciHeap(),active=new Map();let seed=1,next=0;const rand=n=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)%n;for(let step=0;step<10000;step++){const op=rand(5);if(!active.size||op<2){const key=rand(100000),c=h.Enqueue(key,next++);active.set(c,key);}else if(op===2){const cell=[...active.keys()][rand(active.size)],key=rand(100000);h.ChangeKey(cell,key);active.set(cell,key);}else if(op===3){const cell=[...active.keys()][rand(active.size)];h.Delete(cell);active.delete(cell);}else{let min=Infinity;for(const k of active.values())min=Math.min(min,k);const top=h.Top;assert.equal(h.Dequeue().Key,min);active.delete(top);}assert.equal(h.Count,active.size);if(active.size)assert.equal(h.Top.Priority,Math.min(...active.values()));}while(h.Count){const top=h.Top;assert.equal(h.Dequeue().Key,Math.min(...active.values()));active.delete(top);}});
// Regression: soft heap must return every original entry exactly once even with key corruption.
test('Soft heap corruption workload preserves all entries',()=>{const h=new C.SoftHeap(.5,Infinity),seen=new Set();for(let i=0;i<20000;i++)h.Add((i*7919)%10007,i);while(h.Count){const p=h.RemoveMinimum();assert.equal(p.Key,(p.Value*7919)%10007);assert(!seen.has(p.Value));seen.add(p.Value);}assert.equal(seen.size,20000);});
test('Queue ring buffer ordering across compaction',()=>{const q=new C.Queue();for(let i=0;i<10000;i++)q.Enqueue(i);for(let i=0;i<8000;i++)assert.equal(q.Dequeue(),i);for(let i=10000;i<14000;i++)q.Enqueue(i);for(let i=8000;i<14000;i++)assert.equal(q.Dequeue(),i);assert.equal(q.Count,0);});

// Upstream collection Constructors tests: capacities, copy constructors and no implicit items.
for(const T of [C.VertexList,C.EdgeList])test(`${T.name}Tests.Constructors`,()=>{assert.equal(new T().Count,0);assert.equal(new T(12).Count,0);const a=new T([1,2]),b=new T(a);assert.equal(b.Count,2);assert.deepEqual([...b],[1,2]);b.Add(3);assert.equal(a.Count,2);});
for(const T of [C.VertexEdgeDictionary,C.EdgeEdgeDictionary])test(`${T.name}Tests.Constructors`,()=>{assert.equal(new T().Count,0);assert.equal(new T(12).Count,0);assert.throws(()=>new T(-1));});
// Upstream BinaryQueueTests.Constructors / Constructor_Throws.
test('BinaryQueueTests.Constructors',()=>{assert.equal(new C.BinaryQueue(()=>1).Count,0);assert.equal(new C.BinaryQueue(()=>1,defaultCompare).Count,0);});
test('BinaryQueueTests.Constructor_Throws',()=>{assert.throws(()=>new C.BinaryQueue(null));assert.throws(()=>new C.BinaryQueue(()=>1,null));});
// Upstream FibonacciQueueTests.Constructors exact overload matrix.
test('FibonacciQueueTests.Constructors',()=>{for(const args of [[()=>1],[0,null,()=>1],[12,null,()=>1],[0,[1,2],()=>1],[0,null,()=>1,defaultCompare],[12,[1,2,3],()=>1,defaultCompare],[new Map()],[new Map([[1,12],[2,42]])],[new Map(),defaultCompare],[new Map([[1,12],[2,42]]),defaultCompare]]){const q=new C.FibonacciQueue(...args);assert.equal(q.Count,0);assert(!q.Contains(1));}});
test('FibonacciQueueTests.Constructor_Throws',()=>{for(const args of [[null],[-1,[],()=>1],[-1,[],null],[12,[],null],[12,null,null],[12,[],()=>1,null],[new Map(),null],[null,defaultCompare],[null,null]])assert.throws(()=>new C.FibonacciQueue(...args));});
// Upstream QueueTestsBase.Contains_Test/Enqueue_Test/Peek_Test/Dequeue_Test, including duplicate values.
for(const T of [C.BinaryQueue,C.FibonacciQueue]){
 test(`${T.name}Tests.Contains`,()=>{const q=new T(()=>1);assert(!q.Contains(1));q.Enqueue(1);assert(q.Contains(1));assert(!q.Contains(2));q.Enqueue(2);assert(q.Contains(2));});
 test(`${T.name}Tests.Enqueue`,()=>{const q=new T(()=>1);q.Enqueue(1);q.Enqueue(2);q.Enqueue(1);assert.equal(q.Count,3);assert.deepEqual(q.ToArray().sort(),[1,1,2]);});
 test(`${T.name}Tests.Peek`,()=>{const q=new T(v=>v);q.Enqueue(3);q.Enqueue(1);q.Enqueue(2);assert.equal(q.Peek(),1);assert.equal(q.Peek(),1);assert.equal(q.Count,3);});
 test(`${T.name}Tests.Peek_Throws`,()=>assert.throws(()=>new T(()=>1).Peek()));
 test(`${T.name}Tests.Dequeue`,()=>{const q=new T(v=>v);for(const v of [3,1,4,2])q.Enqueue(v);assert.deepEqual([q.Dequeue(),q.Dequeue(),q.Dequeue(),q.Dequeue()],[1,2,3,4]);assert.equal(q.Count,0);});
 test(`${T.name}Tests.Dequeue_Throws`,()=>assert.throws(()=>new T(()=>1).Dequeue()));
 test(`${T.name}Tests.ToArray`,()=>{const q=new T(v=>v),a=[3,1,4,2];for(const v of a)q.Enqueue(v);assert.deepEqual(q.ToArray().sort(),[1,2,3,4]);assert.equal(q.Count,4);const snapshot=q.ToArray();q.Dequeue();assert.equal(snapshot.length,4);});
}
test('BinaryQueueTests.ToPairsArray',()=>{const q=new C.BinaryQueue(v=>v*2);for(const v of [1,2,3])q.Enqueue(v);const pairs=q.ToPairsArray();assert.deepEqual(pairs,[{Key:2,Value:1},{Key:4,Value:2},{Key:6,Value:3}]);});
test('BinaryQueueTests.ToString2',()=>{const q=new C.BinaryQueue(()=>1);assert(q.ToString2().startsWith('Is_Consistent'));for(const v of [1,2,2,3,1])q.Enqueue(v);assert(q.ToString2().startsWith('Is_Consistent'));q.Dequeue();q.Dequeue();assert(q.ToString2().startsWith('Is_Consistent'));});
// Upstream BinaryHeapTests Constructor / Constructor_Throws / IndexOf / Minimum / Add.
test('BinaryHeapTests.Constructor',()=>{for(const capacity of [0,12,42]){const h=new C.BinaryHeap(capacity,defaultCompare);assert.equal(h.Capacity,capacity);assert.equal(h.Count,0);assert.equal(h.PriorityComparison,defaultCompare);}assert.equal(new C.BinaryHeap(defaultCompare).Capacity,16);});
test('BinaryHeapTests.Constructor_Throws',()=>{assert.throws(()=>new C.BinaryHeap(-1));assert.throws(()=>new C.BinaryHeap(12,null));});
test('BinaryHeapTests.IndexOf',()=>{const h=new C.BinaryHeap();assert.equal(h.IndexOf('a'),-1);h.Add(1,'a');h.Add(2,'b');assert.equal(h.IndexOf('a'),0);assert.equal(h.IndexOf('b'),1);assert.equal(h.IndexOf('c'),-1);});
test('BinaryHeapTests.Minimum',()=>{const h=new C.BinaryHeap();for(const k of [4,2,3,1])h.Add(k,k);assert.deepEqual(h.Minimum(),{Key:1,Value:1});assert.equal(h.Count,4);});
test('BinaryHeapTests.Minimum_Throws',()=>assert.throws(()=>new C.BinaryHeap().Minimum()));
test('BinaryHeapTests.RemoveMinimum_Throws',()=>assert.throws(()=>new C.BinaryHeap().RemoveMinimum()));
test('BinaryHeapTests.Add',()=>{const h=new C.BinaryHeap();for(const k of [1,1,1,-2147483648,24])h.Add(k,k);assert.equal(h.Count,5);assert(h.IsConsistent());assert.equal(h.Minimum().Key,-2147483648);});
test('BinaryHeapTests.ToArray',()=>{const h=new C.BinaryHeap();for(const v of [1,3,2])h.Add(v,v);assert.deepEqual(h.ToArray().sort(),[1,2,3]);assert.equal(h.Count,3);});
test('BinaryHeapTests.ToPairsArray',()=>{const h=new C.BinaryHeap();h.Add(1,'a');h.Add(2,'b');assert.deepEqual(h.ToPairsArray(),[{Key:1,Value:'a'},{Key:2,Value:'b'}]);});
test('BinaryHeapTests.ToString2',()=>{const h=new C.BinaryHeap(2);assert.equal(h.ToString2(),'Is_Consistent: null, null');h.Add(1,'a');assert.equal(h.ToString2(),'Is_Consistent: 1 a, null');});
test('BinaryHeapTests.ToStringTree',()=>{const h=new C.BinaryHeap(2);h.Add(1,'a');h.Add(2,'b');assert.equal(h.ToStringTree(),'Is_Consistent\nindex0 1 a -> 2 b and null\nindex1 2 b -> null and null');});
// Upstream ForestDisjointSetTests Constructor/Contains/FindSet across value and object identity.
test('ForestDisjointSetTests.Constructor',()=>{for(const capacity of [0,12]){const s=new C.ForestDisjointSet(capacity);assert.equal(s.SetCount,0);assert.equal(s.ElementCount,0);}});
test('ForestDisjointSetTests.Contains',()=>{const s=new C.ForestDisjointSet(),a={},b={};assert(!s.Contains(a));s.MakeSet(a);assert(s.Contains(a));assert(!s.Contains(b));});
test('ForestDisjointSetTests.AreInSameSet',()=>{const s=new C.ForestDisjointSet(),a={},b={};s.MakeSet(a);s.MakeSet(b);assert(s.AreInSameSet(a,a));assert(!s.AreInSameSet(a,b));s.Union(a,b);assert(s.AreInSameSet(a,b));assert(s.AreInSameSet(b,a));});
// Upstream SoftHeapTests.Add_Throws / Constructor_Throws validation.
test('SoftHeapTests.Add_Throws',()=>{const h=new C.SoftHeap(1/3,25);assert.throws(()=>h.Add(null,1));assert.throws(()=>h.Add(25,1));assert.throws(()=>h.Add(26,1));});
test('SoftHeapTests.Constructor_Throws',()=>{for(const [r,max,cmp]of [[1/3,null,defaultCompare],[-1,25,defaultCompare],[0,25,defaultCompare],[.6,25,defaultCompare],[1/3,25,null]])assert.throws(()=>new C.SoftHeap(r,max,cmp));});
// Upstream edge dictionary equality follows equatable-edge values, including fresh equivalent keys.
test('EdgeEdgeDictionary equatable key lookup',async()=>{const {EquatableEdge}=await import('../src/core.js');const a=new EquatableEdge(1,2),b=new EquatableEdge(2,1),m=new C.EdgeEdgeDictionary([[a,b]]);assert.equal(m.get(new EquatableEdge(1,2)),b);assert.throws(()=>m.Add(new EquatableEdge(1,2),a));assert(m.delete(new EquatableEdge(1,2)));assert.equal(m.Count,0);});
