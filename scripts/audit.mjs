import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const api = JSON.parse(await readFile('docs/api-inventory.json', 'utf8'));
const inventory = JSON.parse(await readFile('docs/test-inventory.json', 'utf8'));
const runtime = await import('../src/index.js');
assert.equal(api.upstream.commit, inventory.upstream.commit);
assert.equal(api.types.length, api.counts.publicTypeDeclarations);
assert.equal(inventory.tests.length, inventory.counts.testMethods);
const sourceNames = new Set(Object.keys(runtime));
const declaredContracts = new Set();
for (const file of (await readdir('dist').catch(() => [])).filter(file => file.endsWith('.d.ts'))) {
  const declaration = await readFile('dist/' + file, 'utf8');
  for (const match of declaration.matchAll(/export\s+(?:declare\s+)?(?:interface|type)\s+(\w+)/g)) declaredContracts.add(match[1]);
}
function runtimeType(type) {
  const qualifiedName = type.id.slice(type.namespace.length + 1).replace(/`\d+/g, '');
  return qualifiedName.split('.').reduce((value, name) => value?.[name], runtime) ?? runtime[type.name];
}
const declarations = api.types.map(type => {
  const qualifiedName = type.id.slice(type.namespace.length + 1).replace(/`\d+/g, '');
  const nestedValue = qualifiedName.split('.').reduce((value, name) => value?.[name], runtime);
  return { id: type.id, name: type.name, module: type.module, kind: type.kind, status: type.path.includes('/Compatibility/') ? 'dotnet-framework-polyfill' : sourceNames.has(type.name) || nestedValue !== undefined ? 'runtime-export-present-unverified' : ['interface', 'delegate'].includes(type.kind) ? (declaredContracts.has(type.name) ? 'typescript-contract-present-unverified' : 'typescript-contract-not-built-or-missing') : 'runtime-export-missing' };
});
const helperFunctions = new Map();
for (const filename of (await readdir('src')).filter(file => file.endsWith('.js'))) {
  const source = await readFile('src/' + filename, 'utf8');
  const masked = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, value => value.replace(/[^\n]/g, ' '));
  for (const match of masked.matchAll(/\bfunction\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
    const start = match.index + match[0].length - 1;
    let depth = 1, end = start + 1;
    while (end < masked.length && depth) { if (masked[end] === '{') depth++; else if (masked[end] === '}') depth--; end++; }
    helperFunctions.set(match[1], source.slice(start, end));
  }
}
const runtimeMemberCache = new Map();
function runtimeMembers(value) {
  if (runtimeMemberCache.has(value)) return runtimeMemberCache.get(value);
  const instance = new Set(), statics = new Set();
  const seenHelpers = new Set();
  function collect(source, helper = false) {
    for (const match of source.matchAll(/\bthis\.(\w+)\s*(?:=(?!=|>)|\?\?=|\|\|=|&&=)/g)) instance.add(match[1]);
    for (const match of source.matchAll(/\bevents\(\s*this\s*,\s*['"]([^'"]+)['"]/g)) for (const name of match[1].split(' ')) instance.add(name);
    for (const match of source.matchAll(/\b(\w+)\(\s*this(?:\s*,|\s*\))/g)) if (helperFunctions.has(match[1]) && !seenHelpers.has(match[1])) { seenHelpers.add(match[1]); collect(helperFunctions.get(match[1]), true); }
    if (helper || /Object\.(?:defineProperties|defineProperty|assign)\(\s*this\b/.test(source)) {
      for (const match of source.matchAll(/Object\.(?:defineProperties|assign)\([^,]+,\s*\{/g)) { let depth = 1, end = match.index + match[0].length; const start = end; while (end < source.length && depth) { if (source[end] === '{') depth++; else if (source[end] === '}') depth--; end++; } for (const property of source.slice(start, end - 1).matchAll(/(?:^|[,{])\s*["']?([A-Za-z_$]\w*)["']?\s*:/g)) instance.add(property[1]); }
      for (const match of source.matchAll(/Object\.defineProperty\([^,]+,\s*['"]([^'"]+)['"]/g)) instance.add(match[1]);
    }
  }
  if (value != null) {
    for (let current = value; current && current !== Function.prototype && current !== Object.prototype; current = Object.getPrototypeOf(current)) {
      for (const name of Object.getOwnPropertyNames(current)) statics.add(name);
      if (typeof current === 'function') {
        for (const name of Object.getOwnPropertyNames(current.prototype ?? {})) instance.add(name);
        collect(Function.prototype.toString.call(current));
      }
    }
    for (let prototype = value.prototype; prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype)) for (const name of Object.getOwnPropertyNames(prototype)) instance.add(name);
  }
  const result = { instance, statics };
  runtimeMemberCache.set(value, result);
  return result;
}
const typesById = new Map(api.types.map(type => [type.id, type]));
const memberResults = (api.members ?? []).map(member => {
  const type = typesById.get(member.typeId), value = runtimeType(type), observed = runtimeMembers(value);
  let status;
  if (member.path.includes('/Compatibility/')) status = 'dotnet-framework-polyfill';
  else if (member.interfaceMember) status = 'interface-contract-unverified';
  else if (member.name === 'GetEnumerator' && typeof value?.prototype?.[Symbol.iterator] === 'function') status = 'javascript-iteration-adaptation';
  else if (member.kind === 'operator' || member.kind === 'indexer') status = 'language-adaptation-unverified';
  else if (member.kind === 'constructor') status = typeof value === 'function' ? 'constructor-export-present-overloads-unverified' : 'runtime-member-name-missing';
  else status = (member.isStatic ? observed.statics : observed.instance).has(member.name) ? 'runtime-member-name-present-unverified' : 'runtime-member-name-missing';
  return { id: member.id, typeId: member.typeId, typeName: member.typeName, name: member.name, kind: member.kind, signature: member.signature, status, path: member.path, line: member.line };
});
const testFiles = (await readdir('test', { recursive: true })).filter(file => /\.(test|spec)\.(?:m?js)$/.test(file)).sort();
const sources = await Promise.all(testFiles.map(async file => ({ file: 'test/' + file, text: await readFile('test/' + file, 'utf8') })));
const mappings = new Map();
const fileReferences = [];
for (const { file, text } of sources) {
  for (const match of text.matchAll(/^[ \t]*\/\/[ \t]*upstream:[ \t]*([^\r\n]+)/gmi)) {
    for (const reference of match[1].split(/\s*,\s*/)) {
      const rawId = reference.trim();
      const id = rawId.startsWith('QuikGraph') && rawId.includes('/') ? 'tests/' + rawId : rawId;
      const fileMatches = inventory.sourceFiles.filter(source => source.path === id || (!id.includes('/') && source.path.endsWith('/' + id)));
      if (fileMatches.length === 1) { fileReferences.push({ sourceFile: fileMatches[0].path, javascriptFile: file }); continue; }
      const exact = inventory.tests.find(test => test.id === id);
      const short = inventory.tests.filter(test => `${test.fixture}.${test.name}` === id);
      const test = exact ?? (short.length === 1 ? short[0] : undefined);
      assert(test, `Unknown or ambiguous upstream test reference ${id} in ${file}`);
      if (!mappings.has(test.id)) mappings.set(test.id, []);
      mappings.get(test.id).push(file);
    }
  }
}
const tests = inventory.tests.map(test => ({ id: test.id, status: mappings.has(test.id) ? 'mapped-js-test-unverified' : 'unported', mappedFiles: mappings.get(test.id) ?? [] }));
const countBy = list => list.reduce((counts, item) => (counts[item.status] = (counts[item.status] ?? 0) + 1, counts), {});
const report = {
  schemaVersion: 1,
  upstreamCommit: api.upstream.commit,
  explanation: 'Export presence establishes name coverage only. Mapped JavaScript tests identify related executable test files; they do not prove all upstream assertions, parameters, fixture inheritance or exception semantics have been ported. No method is counted as fully ported without a behavioral review. Member presence uses runtime static/prototype reflection and lexical constructor-field/event initialization; it does not validate overloads, parameter rules, instance defaults or algorithm results.',
  counts: { runtimeExports: sourceNames.size, publicTypeDeclarations: declarations.length, api: countBy(declarations), publicMemberSignatures: memberResults.length, members: countBy(memberResults), upstreamTestMethods: tests.length, javascriptTestFiles: testFiles.length, testMappings: countBy(tests), fileLevelReferences: fileReferences.length, verifiedFullTestPorts: 0 },
  api: declarations,
  members: memberResults,
  fileReferences,
  tests,
};
await mkdir('test-results', { recursive: true });
await writeFile('test-results/conformance-audit.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('test-results/missing-members.json', JSON.stringify(memberResults.filter(member => member.status === 'runtime-member-name-missing'), null, 2) + '\n');
console.log(JSON.stringify({ upstreamCommit: report.upstreamCommit, ...report.counts }, null, 2));
