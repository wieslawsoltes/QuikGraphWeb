import { relative } from 'node:path';

// The audit consumes only real test runner events, never guessed template names.
export default async function* report(events) {
  for await (const event of events) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const data = event.data;
    yield JSON.stringify({ status: event.type === 'test:pass' ? 'passed' : 'failed', name: data.name, file: data.file ? relative(process.cwd(), data.file).replaceAll('\\', '/') : undefined, line: data.line, column: data.column, nesting: data.nesting }) + '\n';
  }
}
