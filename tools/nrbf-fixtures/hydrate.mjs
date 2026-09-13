import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DeserializeNrbf, SerializeNrbf} from '../../src/binary-serialization.js';
import {createFixtureRegistry} from '../../test/nrbf-test-schemas.js';

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(here, '../../test/fixtures/nrbf');
const output = resolve(process.argv[2] ?? 'test-results/nrbf-hydrated');
if (output === input) throw new Error('Output must differ from the original fixture directory.');
const manifest = JSON.parse(await readFile(resolve(input, 'manifest.json'), 'utf8'));
await mkdir(output, {recursive: true});
for (const fixture of manifest.fixtures) {
  const original = await readFile(resolve(input, fixture.file));
  if (createHash('sha256').update(original).digest('hex') !== fixture.sha256) throw new Error(`${fixture.name}: original fixture checksum differs`);
  const registry = createFixtureRegistry();
  const materialized = DeserializeNrbf(original, {registry});
  await writeFile(resolve(output, fixture.file), SerializeNrbf(materialized, {registry}));
}
console.log(`Materialized and serialized ${manifest.fixtures.length} CLR fixtures through JavaScript objects into ${output}`);
