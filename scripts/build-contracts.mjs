// Emit erased interface/delegate contracts from the pinned C# declaration inventory.
// Native CLR types that have no declared web counterpart are represented as unknown.
import { readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
const inventory = JSON.parse(await readFile('docs/api-inventory.json', 'utf8'));
const declared = new Set();
for (const file of (await readdir('dist')).filter(file => file.endsWith('.d.ts'))) {
  const source = await readFile('dist/' + file, 'utf8');
  for (const match of source.matchAll(/export\s+(?:declare\s+)?(?:interface|type)\s+(\w+)/g)) declared.add(match[1]);
}
const contracts = inventory.types.filter(type => ['interface', 'delegate'].includes(type.kind) && !type.path.includes('/Compatibility/') && !declared.has(type.name));
const byName = new Map(inventory.types.map(type => [type.name, type]));
const genericClasses = new Set(['Edge', 'EquatableEdge', 'SEdge', 'SEquatableEdge', 'UndirectedEdge', 'EquatableUndirectedEdge', 'SUndirectedEdge', 'TaggedEdge', 'EquatableTaggedEdge', 'STaggedEdge', 'SEquatableTaggedEdge', 'TaggedUndirectedEdge', 'STaggedUndirectedEdge', 'TermEdge', 'EquatableTermEdge', 'SReversedEdge', 'AdjacencyGraph', 'BidirectionalGraph', 'UndirectedGraph', 'ArrayAdjacencyGraph', 'ArrayBidirectionalGraph', 'ArrayUndirectedGraph', 'EventHook', 'VertexEventArgs', 'EdgeEventArgs', 'UndirectedEdgeEventArgs', 'ShortestPathAlgorithmBase', 'UndirectedShortestPathAlgorithmBase', 'DijkstraShortestPathAlgorithm', 'UndirectedDijkstraShortestPathAlgorithm', 'AStarShortestPathAlgorithm', 'BellmanFordShortestPathAlgorithm', 'DagShortestPathAlgorithm', 'FloydWarshallAllShortestPathAlgorithm', 'SortedPath']);
const split = input => {
  const result = []; let depth = 0, start = 0;
  for (let i = 0; i < input.length; i++) { if ('<(['.includes(input[i])) depth++; else if ('>)]'.includes(input[i])) depth--; else if (input[i] === ',' && depth === 0) { result.push(input.slice(start, i).trim()); start = i + 1; } }
  if (input.slice(start).trim()) result.push(input.slice(start).trim()); return result;
};
const stripAttributes = text => text.replace(/\[[A-Za-z_][^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
function convert(type, parameters) {
  type = type.trim().replace(/^(?:in|out|ref|params|this)\s+/, '').replace(/^System\./, '');
  if (parameters.has(type)) return type;
  if (type.endsWith('[]')) return convert(type.slice(0, -2), parameters) + '[]';
  if (type.endsWith('?')) return convert(type.slice(0, -1), parameters) + ' | null';
  if (/^(?:byte|sbyte|short|ushort|int|uint|long|ulong|float|double|decimal|Int32|Int64|Single|Double)$/.test(type)) return 'number';
  if (type === 'bool' || type === 'Boolean') return 'boolean';
  if (['string', 'char', 'String'].includes(type)) return 'string';
  if (type === 'void') return 'void';
  const generic = /^([\w.]+)<([\s\S]*)>$/.exec(type);
  const name = (generic?.[1] ?? type).split('.').pop();
  const args = generic ? split(generic[2]).map(value => convert(value, parameters)) : [];
  if (['IEnumerable', 'IEnumerator'].includes(name)) return `${name === 'IEnumerable' ? 'Iterable' : 'Iterator'}<${args[0] ?? 'unknown'}>`;
  if (['IList', 'List', 'ICollection', 'IReadOnlyCollection', 'IReadOnlyList'].includes(name)) return `Array<${args[0] ?? 'unknown'}>`;
  if (['IDictionary', 'Dictionary', 'IReadOnlyDictionary'].includes(name)) return `Map<${args[0] ?? 'unknown'}, ${args[1] ?? 'unknown'}>`;
  if (['ISet', 'HashSet', 'SortedSet'].includes(name)) return `Set<${args[0] ?? 'unknown'}>`;
  if (name === 'Func') return `(${args.slice(0, -1).map((arg, index) => `arg${index}: ${arg}`).join(', ')}) => ${args.at(-1) ?? 'unknown'}`;
  if (name === 'Action') return `(${args.map((arg, index) => `arg${index}: ${arg}`).join(', ')}) => void`;
  if (name === 'IDisposable') return 'Runtime.IDisposable';
  const known = byName.get(name);
  if (known && !known.path.includes('/Compatibility/')) {
    if (known.kind === 'enum') return `(typeof Runtime.${name})[keyof typeof Runtime.${name}]`;
    if (['interface', 'delegate'].includes(known.kind)) return `${declared.has(name) ? 'Runtime.' : ''}${name}${args.length ? '<' + args.join(', ') + '>' : ''}`;
    return `Runtime.${name}${args.length && genericClasses.has(name) ? '<' + args.join(', ') + '>' : ''}`;
  }
  return 'unknown';
}
const parameterNames = type => type.genericParameters.map(value => value.replace(/^(?:in|out)\s+/, '').trim());
function generics(names) {
  return names.length ? '<' + names.map(name => name === 'TEdge' && names.includes('TVertex') ? 'TEdge extends Runtime.IEdge<TVertex> = Runtime.IEdge<TVertex>' : name + ' = unknown').join(', ') + '>' : '';
}
function callable(signature, name, outerParameters) {
  const clean = stripAttributes(signature).replace(/^public\s+delegate\s+/, '').replace(/^(?:public\s+)?(?:(?:static|virtual|abstract|override|sealed|new)\s+)*/, '');
  const open = clean.indexOf('('), close = clean.lastIndexOf(')');
  if (open < 0 || close < open) return null;
  const prefix = clean.slice(0, open).trim(), nameIndex = prefix.lastIndexOf(name);
  if (nameIndex < 0) return null;
  const returnType = prefix.slice(0, nameIndex).trim();
  const methodTypes = /^<(.+)>$/.exec(prefix.slice(nameIndex + name.length).trim());
  const genericNames = methodTypes ? split(methodTypes[1]).map(value => value.replace(/^(?:in|out)\s+/, '')) : [];
  const parameters = new Set([...outerParameters, ...genericNames]);
  const args = [], outputs = [];
  for (const parameter of split(clean.slice(open + 1, close))) {
    const parsed = /^(?:(out|ref|in|params|this)\s+)?(.+?)\s+(@?\w+)(?:\s*=.*)?$/.exec(parameter);
    if (!parsed) continue;
    const type = convert(parsed[2], parameters), arg = parsed[3].replace(/^@/, '');
    if (parsed[1] === 'out') outputs.push(type);
    else args.push(`${arg}: ${type}`);
  }
  const result = outputs.length ? (outputs.length === 1 ? outputs[0] : '[' + outputs.join(', ') + ']') + ' | undefined' : convert(returnType, parameters);
  return { generics: genericNames.length ? '<' + genericNames.join(', ') + '>' : '', args: args.join(', '), result };
}
let output = `/** Type-only C# interface/delegate contracts adapted to JS iterables, Maps and direct TryGet results. */\nimport type * as Runtime from './index.js';\n`;
const emitted = new Set();
for (const type of contracts) {
  if (emitted.has(type.name)) continue;
  emitted.add(type.name);
  if (type.name === 'TryFunc') {
    output += `export type TryFunc<T1, T2, T3 = never, T4 = never, T5 = never> = [T5] extends [never] ? [T4] extends [never] ? [T3] extends [never] ? (arg1: T1) => T2 | undefined : (arg1: T1, arg2: T2) => T3 | undefined : (arg1: T1, arg2: T2, arg3: T3) => T4 | undefined : (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T5 | undefined;\n`;
    continue;
  }
  const names = parameterNames(type), parameters = new Set(names);
  if (type.kind === 'delegate') {
    const call = callable(type.declarationHeader, type.name, parameters);
    output += `export type ${type.name}${generics(names)} = ${call ? '(' + call.args + ') => ' + call.result : '(...args: unknown[]) => unknown'};\n`;
    continue;
  }
  const header = type.declarationHeader.split(/\bwhere\b/)[0];
  const colon = header.indexOf(':');
  const bases = colon >= 0 ? split(header.slice(colon + 1)).map(value => convert(value, parameters)).filter(value => value !== 'unknown') : [];
  output += `export type ${type.name}${generics(names)} = ${bases.length ? bases.join(' & ') + ' & ' : ''}{\n`;
  const members = inventory.members.filter(member => member.typeId === type.id);
  const emittedMembers = new Set();
  for (const member of members) {
    if (member.kind === 'constructor' || member.kind === 'operator' || member.kind === 'indexer') continue;
    let declaration;
    if (member.kind === 'method') {
      const call = callable(member.signature, member.name, parameters);
      if (!call) continue;
      declaration = `  ${member.name}${call.generics}(${call.args}): ${call.result};`;
    } else {
      const prefix = stripAttributes(member.signature).replace(/^(?:public\s+)?(?:event\s+)?/, '').slice(0, -member.name.length).trim();
      const result = convert(prefix, parameters);
      declaration = `  ${member.name}: ${member.kind === 'event' ? (result === 'unknown' ? 'Runtime.EventHook<[sender: unknown, args: unknown]>' : 'Runtime.EventHook<Parameters<' + result + '>>') : result};`;
    }
    if (!emittedMembers.has(declaration)) { emittedMembers.add(declaration); output += declaration + '\n'; }
  }
  output += '}\n';
}
await writeFile('dist/contracts.d.ts', output);
await appendFile('dist/index.d.ts', "\nexport * from './contracts.js';\n");
console.log(`Generated ${emitted.size} additional interface and delegate contracts.`);
