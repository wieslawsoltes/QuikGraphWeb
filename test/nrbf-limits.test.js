import test from 'node:test';
import assert from 'node:assert/strict';
import { DecodeNrbf, EncodeNrbf, NrbfArray, NrbfClass, NrbfFormatError } from '../src/nrbf.js';

test('NRBF limits aggregate expanded null-run arrays before allocating their elements',()=>{
  const root=new NrbfArray([new NrbfArray(Array(6).fill(null)),new NrbfArray(Array(6).fill(null))]);
  const bytes=EncodeNrbf(root);assert.ok(bytes.length<100);
  assert.throws(()=>DecodeNrbf(bytes,{maxArrayLength:6,maxTotalArrayLength:13}),error=>error instanceof NrbfFormatError&&/Total array length/.test(error.message));
  const decoded=DecodeNrbf(bytes,{maxArrayLength:6,maxTotalArrayLength:14});assert.equal(decoded.Root.Values[1].Values.length,6);
});
test('NRBF total allocation counts distinct arrays once and preserves alias cycles',()=>{
  const child=new NrbfArray([null,null,null]),root=new NrbfArray([child,child]);child.Values[0]=root;
  const bytes=EncodeNrbf(root),decoded=DecodeNrbf(bytes,{maxTotalArrayLength:5}).Root;
  assert.equal(decoded.Values[0],decoded.Values[1]);assert.equal(decoded.Values[0].Values[0],decoded);
  assert.throws(()=>DecodeNrbf(bytes,{maxTotalArrayLength:4}),/Total array length/);
});
test('NRBF per-array and aggregate limits also apply to empty and rectangular records',()=>{
  assert.equal(DecodeNrbf(EncodeNrbf(new NrbfArray()),{maxArrayLength:0,maxTotalArrayLength:0}).Root.Values.length,0);
  const record=new NrbfArray([null,null,null,null],{lengths:[2,2]});
  assert.throws(()=>DecodeNrbf(EncodeNrbf(record),{maxTotalArrayLength:3}),/Total array length/);
});
test('NRBF invalid resource limits cannot disable checks through NaN, Infinity or fractional values',()=>{
  const bytes=EncodeNrbf('bounded');
  for(const key of ['maxBytes','maxObjects','maxArrayLength','maxTotalArrayLength','maxStringBytes','maxMembers','maxDepth'])for(const value of [NaN,Infinity,-1,1.5])assert.throws(()=>DecodeNrbf(bytes,{[key]:value}),RangeError);
  assert.throws(()=>EncodeNrbf('bounded',{maxBytes:NaN}),RangeError);assert.throws(()=>EncodeNrbf('bounded',{maxDepth:Infinity}),RangeError);
});
test('NRBF library collection handles wide classes without argument-spread stack overflow',()=>{
  const count=140000,members=Object.create(null);for(let i=0;i<count;i++)members['m'+i]=null;
  const encoded=EncodeNrbf(new NrbfClass('Wide.Record',members));
  const decoded=DecodeNrbf(encoded,{maxMembers:count,maxObjects:count});assert.equal(Object.keys(decoded.Root.Members).length,count);assert.equal(decoded.Root.Members.m139999,null);
});
