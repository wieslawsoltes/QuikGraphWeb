import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DecodeNrbf, EncodeNrbf} from '../../src/nrbf.js';

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(here, '../../test/fixtures/nrbf');
const output = resolve(process.argv[2] ?? 'test-results/nrbf-roundtrip');
if (output === input) throw new Error('Output must differ from the original fixture directory.');
const manifest = JSON.parse(await readFile(resolve(input, 'manifest.json'), 'utf8'));
await mkdir(output, {recursive: true});
for (const fixture of manifest.fixtures) {
  const original = await readFile(resolve(input, fixture.file));
  const hash = createHash('sha256').update(original).digest('hex');
  if (hash !== fixture.sha256) throw new Error(`${fixture.name}: original fixture checksum differs`);
  const encoded = EncodeNrbf(DecodeNrbf(original));
  await writeFile(resolve(output, fixture.file), encoded);
}
console.log(`Re-encoded ${manifest.fixtures.length} independently generated CLR fixtures into ${output}`);
