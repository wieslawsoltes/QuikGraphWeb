import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceComments } from '../scripts/source-comments.mjs';

test('Audit comments remain visible after GraphML regex literals with quotes', () => {
  const source = 'const pattern = /<node\\s+id="([^"]+)"[^>]*>/g;\n// upstream: FixtureTests.Method\nconst closing = /<\\/node>/;\n// upstream: FixtureTests.Second';
  assert.deepEqual(sourceComments(source).map(value => value.trim()), ['upstream: FixtureTests.Method', 'upstream: FixtureTests.Second']);
});

test('Audit comment parser ignores marker text in strings and template literals', () => {
  const source = 'const a = "// upstream: FakeTests.String"; const b = `\n// upstream: FakeTests.Template\n`; // upstream: RealTests.Inline\n/* upstream: RealTests.Block */';
  assert.deepEqual(sourceComments(source).map(value => value.trim()), ['upstream: RealTests.Inline', 'upstream: RealTests.Block']);
});

test('Audit comment parser distinguishes division, regex character classes and template expressions', () => {
  const source = 'const ratio = 6 / 2; const regex = /["\x27/]/; const value = `x${(() => { /* upstream: RealTests.Expression */ return ratio; })()}`;\n// upstream: RealTests.Last';
  assert.deepEqual(sourceComments(source).map(value => value.trim()), ['upstream: RealTests.Expression', 'upstream: RealTests.Last']);
});
