// Rebuild the pinned source inventory. This does not translate or execute C# tests.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const upstream = resolve(process.argv[2] ?? '../upstream');
const modules = ['QuikGraph', 'QuikGraph.Data', 'QuikGraph.Graphviz', 'QuikGraph.MSAGL', 'QuikGraph.Petri', 'QuikGraph.Serialization'];
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: upstream, encoding: 'utf8' });
assert.equal(revision.status, 0, 'Upstream path must be a Git checkout.');
const sha = revision.stdout.trim();
const provenance = { repository: 'https://github.com/KeRNeLith/QuikGraph', commit: sha, modules, excluded: ['src/Tmp', 'tests/Tmp', 'build and package infrastructure'], license: 'MS-PL' };
const hash = text => createHash('sha256').update(text).digest('hex');
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
function maskComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, value => value.replace(/[^\n]/g, ' '));
}
function maskCode(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|@"(?:""|[^"])*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, value => value.replace(/[^\n]/g, ' '));
}
function typeScopes(text) {
  const code = maskCode(text);
  const scopes = [];
  for (const match of code.matchAll(/\b(?:(public|internal|private|protected)\s+)?(?:(?:abstract|sealed|static|partial|readonly|ref)\s+)*(class|struct|interface|enum)\s+(\w+)(\s*<[^>{}]+>)?/g)) {
    const start = code.indexOf('{', match.index + match[0].length);
    if (start < 0) continue;
    let depth = 1, end = start + 1;
    while (end < code.length && depth) { if (code[end] === '{') depth++; else if (code[end] === '}') depth--; end++; }
    scopes.push({ name: match[3], kind: match[2], access: match[1] ?? 'internal', start, end, offset: match.index, genericParameters: match[4]?.trim() ?? '' });
  }
  return scopes;
}
const types = [];
const members = [];
const sourceFiles = [];
const tests = [];
const testFiles = [];
for (const module of modules) {
  for (const filename of (await readdir(resolve(upstream, 'src', module), { recursive: true })).filter(file => file.endsWith('.cs')).sort()) {
    const path = `src/${module}/${filename.replaceAll('\\', '/')}`;
    const text = await readFile(resolve(upstream, path), 'utf8');
    sourceFiles.push({ path, sha256: hash(text) });
    const masked = maskComments(text);
    const namespace = /\bnamespace\s+([\w.]+)/.exec(masked)?.[1] ?? module;
    const scopes = typeScopes(text);
    const declaration = /\bpublic\s+(?:(?:abstract|sealed|static|partial|readonly|ref)\s+)*(class|struct|interface|enum)\s+(\w+)(\s*<[^>{}]+>)?/g;
    for (const match of masked.matchAll(declaration)) {
      const ancestors = scopes.filter(scope => scope.start < match.index && scope.end > match.index && scope.name !== match[2]);
      if (ancestors.some(scope => scope.access !== 'public')) continue;
      const qualifiedName = [...ancestors.map(scope => scope.name), match[2]].join('.');
      const parameters = match[3]?.slice(match[3].indexOf('<') + 1, -1).split(',').map(value => value.trim()) ?? [];
      types.push({ id: `${namespace}.${qualifiedName}${parameters.length ? '`' + parameters.length : ''}`, name: match[2], namespace, kind: match[1], genericParameters: parameters, declarationHeader: masked.slice(match.index, masked.indexOf('{', match.index + match[0].length)).replace(/\s+/g, ' ').trim(), module, path, line: lineAt(text, match.index), status: 'unverified', sourceUrl: `${provenance.repository}/blob/${sha}/${path}#L${lineAt(text, match.index)}` });
    }
    for (const match of masked.matchAll(/\bpublic\s+delegate\s+[^;{}]+?\s+(\w+)(\s*<[^>{}]+>)?\s*\(/g)) {
      const parameters = match[2]?.slice(match[2].indexOf('<') + 1, -1).split(',').map(value => value.trim()) ?? [];
      types.push({ id: `${namespace}.${match[1]}${parameters.length ? '`' + parameters.length : ''}`, name: match[1], namespace, kind: 'delegate', genericParameters: parameters, declarationHeader: masked.slice(match.index, masked.indexOf(';', match.index + match[0].length)).replace(/\s+/g, ' ').trim(), module, path, line: lineAt(text, match.index), status: 'unverified', sourceUrl: `${provenance.repository}/blob/${sha}/${path}#L${lineAt(text, match.index)}` });
    }
    const code = maskCode(text);
    const signatureEnd = start => {
      let round = 0, square = 0, cursor = start;
      for (; cursor < code.length; cursor++) {
        const c = code[cursor];
        if (!round && !square && (c === '{' || c === ';' || (c === '=' && !/\boperator\s*[!=<>]*$/.test(code.slice(start, cursor))))) break;
        if (c === '(') round++; else if (c === ')') round--;
        if (c === '[') square++; else if (c === ']') square--;
      }
      return cursor;
    };
    function recordMember(start, owner, interfaceMember = false) {
      const end = signatureEnd(start);
      const signature = masked.slice(start, end).replace(/^[ \t]*#.*$/gm, '').trim().replace(/\s+/g, ' ');
      if (!signature || /\b(?:class|struct|interface|enum|delegate)\b/.test(signature)) return;
      const clean = signature.replace(/\[[^\]]*\]/g, '').trim();
      let prefix = (clean.includes('(') ? clean.slice(0, clean.indexOf('(')) : clean).trim();
      if (prefix.endsWith('>')) { let depth = 0, cursor = prefix.length - 1; for (; cursor >= 0; cursor--) { if (prefix[cursor] === '>') depth++; else if (prefix[cursor] === '<' && --depth === 0) break; } if (cursor >= 0) prefix = prefix.slice(0, cursor).trim(); }
      const name = /\bthis\s*\[/.test(signature) ? 'this[]' : /\boperator\b/.test(prefix) ? prefix.slice(prefix.indexOf('operator')).trim() : /([A-Za-z_]\w*)\s*$/.exec(prefix)?.[1];
      if (!name) return;
      const ancestry = scopes.filter(scope => scope.start < owner.offset && scope.end > owner.offset && scope.name !== owner.name);
      if (owner.access !== 'public' || ancestry.some(scope => scope.access !== 'public')) return;
      const arity = owner.genericParameters ? owner.genericParameters.slice(1, -1).split(',').length : 0;
      const typeId = `${namespace}.${[...ancestry.map(scope => scope.name), owner.name].join('.')}${arity ? '`' + arity : ''}`;
      const kind = name === owner.name ? 'constructor' : name === 'this[]' ? 'indexer' : name.startsWith('operator') ? 'operator' : /\bevent\b/.test(clean) ? 'event' : clean.includes('(') ? 'method' : code[end] === '{' || code.slice(end, end + 2) === '=>' ? 'property' : 'field';
      members.push({ id: `${typeId}::${name}@${path}:${lineAt(text, start)}`, typeId, typeName: owner.name, name, kind, signature, isStatic: /\b(?:static|const)\b/.test(clean), interfaceMember, module, path, line: lineAt(text, start), status: 'unverified' });
    }
    for (const match of code.matchAll(/\bpublic\s+/g)) {
      const owner = scopes.filter(scope => scope.start < match.index && scope.end > match.index).sort((a, b) => b.start - a.start)[0];
      if (owner) recordMember(match.index, owner);
    }
    for (const owner of scopes.filter(scope => scope.kind === 'interface' && scope.access === 'public')) {
      let cursor = owner.start + 1;
      while (cursor < owner.end - 1) {
        while (/\s/.test(code[cursor] ?? '')) cursor++;
        if (code[cursor] === '#') { cursor = code.indexOf('\n', cursor) + 1; if (!cursor) break; continue; }
        if (code[cursor] === '[') { cursor = code.indexOf(']', cursor) + 1; if (!cursor) break; continue; }
        if (cursor >= owner.end - 1) break;
        const start = cursor, end = signatureEnd(start);
        if (end >= owner.end) break;
        if (!code.slice(start, end).includes('public ')) recordMember(start, owner, true);
        cursor = end + 1;
        if (code[end] === '{') { let depth = 1; while (cursor < owner.end && depth) { if (code[cursor] === '{') depth++; else if (code[cursor] === '}') depth--; cursor++; } }
      }
    }
  }
  const directory = `tests/${module}.Tests`;
  for (const filename of (await readdir(resolve(upstream, directory), { recursive: true })).filter(file => file.endsWith('.cs')).sort()) {
    const path = `${directory}/${filename.replaceAll('\\', '/')}`;
    const text = await readFile(resolve(upstream, path), 'utf8');
    testFiles.push({ path, sha256: hash(text) });
    const masked = maskComments(text);
    const namespace = /\bnamespace\s+([\w.]+)/.exec(masked)?.[1] ?? `${module}.Tests`;
    const scopes = typeScopes(text);
    // NUnit attributes precede the method; values are retained instead of guessing expanded case counts.
    const method = /((?:\s*\[(?:[^\]"']|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')*\])+\s*)(?:public|protected|internal|private)\s+(?:(?:static|virtual|override|sealed|async|new)\s+)*(?:[\w.<>,?\[\]]+)\s+(\w+)(?:\s*<[^>]+>)?\s*\(/g;
    for (const match of masked.matchAll(method)) {
      const attributes = match[1].trim();
      if (!/\[(?:Test|TestCase|TestCaseSource|Theory)(?:\s*\(|\s*\])/.test(attributes)) continue;
      const line = lineAt(text, match.index + match[0].lastIndexOf(match[2]));
      const fixture = scopes.filter(scope => scope.start < match.index && scope.end > match.index).sort((a, b) => b.start - a.start)[0]?.name;
      tests.push({ id: `${path}::${match[2]}`, name: match[2], fixture, namespace, module, path, line, attributes, literalTestCaseCount: (attributes.match(/\[TestCase\s*\(/g) ?? []).length, usesTestCaseSource: /\[TestCaseSource\s*\(/.test(attributes), status: 'unported', sourceUrl: `${provenance.repository}/blob/${sha}/${path}#L${line}` });
    }
  }
}
const declarationCount = types.length;
const mergedTypes = new Map();
for (const type of types) {
  const existing = mergedTypes.get(type.id);
  if (existing) existing.declarations.push({ path: type.path, line: type.line });
  else mergedTypes.set(type.id, { ...type, declarations: [{ path: type.path, line: type.line }] });
}
types.splice(0, types.length, ...mergedTypes.values());
const duplicateTestIds = new Set(tests.filter(test => tests.filter(other => other.id === test.id).length > 1).map(test => test.id));
for (const test of tests) {
  if (duplicateTestIds.has(test.id)) test.id = `${test.path}::${test.fixture}.${test.name}`;
}
types.sort((a, b) => a.id.localeCompare(b.id));
tests.sort((a, b) => a.id.localeCompare(b.id));
await mkdir('docs', { recursive: true });
await writeFile('docs/api-inventory.json', JSON.stringify({ schemaVersion: 2, upstream: provenance, scope: 'Public type declarations and lexically extracted public member signatures, including implicit interface members, in the six active modules. Conditional source declarations are retained. Runtime name presence is not overload or behavioral conformance. Internal source helpers are excluded from the public type count.', counts: { sourceFiles: sourceFiles.length, publicTypeDeclarations: types.length, sourceDeclarationOccurrences: declarationCount, publicMemberSignatures: members.length }, sourceFiles, types, members }, null, 2) + '\n');
await writeFile('docs/test-inventory.json', JSON.stringify({ schemaVersion: 1, upstream: provenance, scope: 'Statically declared NUnit test methods in the six active module test projects, including inherited fixture base declarations. Parameterized cases and inherited fixture instantiations are not expanded. Preserved C# files are reference material, not JavaScript test ports.', counts: { sourceFiles: testFiles.length, testMethods: tests.length, literalTestCases: tests.reduce((sum, test) => sum + test.literalTestCaseCount, 0), testCaseSourceMethods: tests.filter(test => test.usesTestCaseSource).length }, sourceFiles: testFiles, tests }, null, 2) + '\n');
console.log(`Inventoried ${types.length} public types, ${members.length} public member signatures and ${tests.length} NUnit methods at ${sha}.`);
