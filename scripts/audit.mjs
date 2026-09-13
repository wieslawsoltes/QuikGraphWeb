import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sourceComments } from './source-comments.mjs';

const api = JSON.parse(await readFile('docs/api-inventory.json', 'utf8'));
const inventory = JSON.parse(await readFile('docs/test-inventory.json', 'utf8'));
const platformManifest = JSON.parse(await readFile('docs/platform-test-boundaries.json', 'utf8'));
assert.equal(platformManifest.upstreamCommit, inventory.upstream.commit);
const platformBoundaries = new Map(platformManifest.tests.map(boundary => [boundary.id, boundary]));
assert.equal(platformBoundaries.size, platformManifest.tests.length, 'Platform dispositions must have unique source IDs.');
for (const boundary of platformBoundaries.values()) assert(inventory.tests.some(test => test.id === boundary.id), `Unknown source runtime boundary ${boundary.id}`);
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
const mappingEvidence = new Map();
const fileReferences = [];
function addMapping(test, file, evidence) {
  if (!mappings.has(test.id)) mappings.set(test.id, new Set());
  mappings.get(test.id).add(file);
  if (!mappingEvidence.has(test.id)) mappingEvidence.set(test.id, []);
  mappingEvidence.get(test.id).push(evidence);
}
for (const { file, text } of sources) {
  for (const comment of sourceComments(text)) for (const match of comment.matchAll(/^[ \t*]*upstream:[ \t]*([^\r\n]+)/gmi)) {
    for (const reference of match[1].split(/\s*,\s*/)) {
      const rawId = reference.trim();
      const id = rawId.startsWith('QuikGraph') && rawId.includes('/') ? 'tests/' + rawId : rawId;
      const fileMatches = inventory.sourceFiles.filter(source => source.path === id || (!id.includes('/') && source.path.endsWith('/' + id)));
      if (fileMatches.length === 1) { fileReferences.push({ sourceFile: fileMatches[0].path, javascriptFile: file }); continue; }
      const exact = inventory.tests.find(test => test.id === id);
      const short = inventory.tests.filter(test => `${test.fixture}.${test.name}` === id);
      const test = exact ?? (short.length === 1 ? short[0] : undefined);
      assert(test, `Unknown or ambiguous upstream test reference ${id} in ${file}`);
      addMapping(test, file, { kind: 'explicit-source-reference', file, reference: id });
    }
  }
}
const executedMapping = { capturedPassedTests: 0, matchedPassedNames: 0, staleSourceFiles: [], available: false };
let runManifest;
try { runManifest = JSON.parse(await readFile('test-results/test-run.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (runManifest) {
  executedMapping.available = true;
  executedMapping.runExitCode = runManifest.exitCode;
  executedMapping.nodeVersion = runManifest.nodeVersion;
  executedMapping.testSourceHashes = runManifest.sourceFiles;
  const currentHashes = new Map(sources.map(source => [source.file, createHash('sha256').update(source.text).digest('hex')]));
  const validFiles = new Set();
  for (const source of runManifest.sourceFiles) {
    if (currentHashes.get(source.file) === source.sha256) validFiles.add(source.file);
    else executedMapping.staleSourceFiles.push(source.file);
  }
  const eventText = await readFile('test-results/test-events.jsonl', 'utf8');
  executedMapping.eventStreamSha256 = createHash('sha256').update(eventText).digest('hex');
  const events = eventText.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  for (const event of events) {
    if (event.status !== 'passed' || !validFiles.has(event.file)) continue;
    executedMapping.capturedPassedTests++;
    const name = /^(\w+)\.([\w]+(?:\s*\/\s*[\w]+)*)(?:$|[\s(:-])/.exec(event.name);
    if (!name) continue;
    let matched = false;
    for (const method of name[2].split(/\s*\/\s*/)) {
      const candidates = inventory.tests.filter(test => test.fixture === name[1] && test.name === method);
      if (candidates.length !== 1) continue;
      addMapping(candidates[0], event.file, { kind: 'passed-test-name-reference', file: event.file, testName: event.name, line: event.line }); matched = true;
    }
    if (matched) executedMapping.matchedPassedNames++;
  }
}
const tests = inventory.tests.map(test => ({ id: test.id, status: mappings.has(test.id) ? 'mapped-js-test-unverified' : platformBoundaries.has(test.id) ? 'requires-host-runtime' : 'unported', mappedFiles: [...(mappings.get(test.id) ?? [])], evidence: mappingEvidence.get(test.id) ?? [], ...(platformBoundaries.has(test.id) ? { runtimeBoundary: platformBoundaries.get(test.id) } : {}) }));
const countBy = list => list.reduce((counts, item) => (counts[item.status] = (counts[item.status] ?? 0) + 1, counts), {});
const report = {
  schemaVersion: 1,
  upstreamCommit: api.upstream.commit,
  explanation: 'Export presence establishes name coverage only. Mappings come from explicit source comments or exact existing Fixture.Method identities in passing Node test names, with source-file hashes checked against the recorded run. They do not prove all upstream assertions, parameters, fixture inheritance or exception semantics have been ported. No method is counted as fully ported without a behavioral review. The requires-host-runtime disposition comes from the explicitly reviewed CLR backend method list; it is not a passing test or a browser serialization equivalence claim. Member presence uses runtime static/prototype reflection and lexical constructor-field/event initialization; it does not validate overloads, parameter rules, instance defaults or algorithm results.',
  counts: { runtimeExports: sourceNames.size, publicTypeDeclarations: declarations.length, api: countBy(declarations), publicMemberSignatures: memberResults.length, members: countBy(memberResults), upstreamTestMethods: tests.length, javascriptTestFiles: testFiles.length, testMappings: countBy(tests), platformSpecificSourceMethods: platformBoundaries.size, fileLevelReferences: fileReferences.length, verifiedFullTestPorts: 0 },
  api: declarations,
  members: memberResults,
  fileReferences,
  executedMapping,
  tests,
};
await mkdir('test-results', { recursive: true });
const serializedReport = JSON.stringify(report, null, 2) + '\n';
await writeFile('test-results/conformance-audit.json', serializedReport);
await writeFile('test-results/missing-members.json', JSON.stringify(memberResults.filter(member => member.status === 'runtime-member-name-missing'), null, 2) + '\n');
// Keep reviewable, reproducible evidence inside the repository and npm package.
// A source-test mapping is deliberately not counted as a complete test port.
await writeFile('docs/conformance-audit.json', serializedReport);
await writeFile('docs/conformance-summary.json', JSON.stringify({
  schemaVersion: report.schemaVersion,
  upstreamCommit: report.upstreamCommit,
  report: 'conformance-audit.json',
  reportSha256: createHash('sha256').update(serializedReport).digest('hex'),
  explanation: report.explanation,
  counts: report.counts,
}, null, 2) + '\n');
console.log(JSON.stringify({ upstreamCommit: report.upstreamCommit, ...report.counts }, null, 2));
// Source identities are a release gate; they still do not imply assertion parity.
assert.equal(executedMapping.runExitCode, 0, 'Run the passing JavaScript suite before the conformance audit.');
assert.equal(executedMapping.staleSourceFiles.length, 0, 'Rerun tests after changing mapped source files.');
assert.equal(tests.filter(test => test.status === 'unported').length, 0, 'Every source test needs executable mapping or an explicit platform disposition.');
assert.equal(declarations.filter(type => /missing$/.test(type.status)).length, 0, 'Public source API declarations must remain accounted for.');
assert.equal(memberResults.filter(member => member.status === 'runtime-member-name-missing').length, 0, 'Public source member names must remain accounted for.');
