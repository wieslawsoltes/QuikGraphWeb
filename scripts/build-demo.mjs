import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
await rm('site', { recursive: true, force: true });
await mkdir('site', { recursive: true });
await cp('examples', 'site', { recursive: true });
for (const file of (await readdir('site', { recursive: true })).filter(file => file.endsWith('.js'))) {
  const demoScript = await readFile('site/' + file, 'utf8');
  await writeFile('site/' + file, demoScript.replaceAll('../src/index.js', './src/index.js').replaceAll('../dist/', './dist/'));
}
await cp('dist', 'site/dist', { recursive: true });
await cp('src', 'site/src', { recursive: true });
await cp('docs', 'site/docs', { recursive: true });
await writeFile('site/.nojekyll', '');
console.log('Built standalone showcase in site/.');
