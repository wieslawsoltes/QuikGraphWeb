import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// Playwright's pinned development dependency ships Babel's real JavaScript parser.
// Using that parser avoids treating quotes in regex literals as string delimiters.
const require = createRequire(import.meta.url);
const { babelParse } = require(resolve(dirname(require.resolve('playwright/package.json')), 'lib/transform/babelBundle.js'));

export function sourceComments(source, filename = 'audit-source.js') {
  return (babelParse(source, filename, true).comments ?? []).map(comment => comment.value);
}
