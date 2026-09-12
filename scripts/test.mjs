import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = (await readdir('test', { recursive: true })).filter(file => /\.(test|spec)\.(?:m?js)$/.test(file)).sort().map(file => 'test/' + file);
if (!files.length) throw new Error('No JavaScript tests found.');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
