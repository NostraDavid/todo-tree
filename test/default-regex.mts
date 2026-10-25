import QUnit from 'qunit';
import { fixture } from './tree-boundary.mts';
function matches(f: ReturnType<typeof fixture>, text: string) {
  return [...text.matchAll(f.utils.getRegexForEditorSearch(true))].map(match => ({
    text: match[0],
    line: text.slice(0, match.index).split('\n').length,
  }));
}

for (const newline of ['\n', '\r\n']) {
  QUnit.test(`manifest default: HTML opener does not borrow the next line, newline=${JSON.stringify(newline)}`, assert => {
    const f = fixture();
    const text = ['TODO first', '<!-- TODO second -->', '', '<!--', 'TODO third', 'TODO fourth', '-->'].join(newline);
    const rows = matches(f, text);
    assert.deepEqual(rows.map(row => row.line), [1, 2, 5, 6]);
    assert.ok(rows.every(row => !/[\r\n]/.test(row.text)), 'default matches never cross line boundaries');
  });
}

QUnit.test('manifest default: Markdown lists require dot and whitespace', assert => {
  const f = fixture();
  const rows = matches(
    f,
    ['1X TODO invalid', '1.TODO invalid', '-TODO invalid', '1. TODO numbered', '- TODO bullet', '  12. TODO indented']
      .join('\n'),
  );
  assert.deepEqual(rows.map(row => row.line), [4, 5, 6]);
});

QUnit.test('manifest default: checkboxes remain literal tags', assert => {
  const f = fixture();
  const rows = matches(f, ['- [ ] pending', '- [x] done', '1. [ ] numbered', '  - [x] indented'].join('\n'));
  assert.deepEqual(rows.map(row => row.line), [1, 2, 3, 4]);
});

QUnit.test('explicit custom multiline regex is preserved', assert => {
  const regex = '(/\\*)[ \\t]*($TAGS)[\\s\\S]*?\\*/';
  const f = fixture({ 'todo-tree.regex.regex': regex, 'todo-tree.regex.enableMultiLine': true });
  assert.strictEqual(f.config.regex().regex, regex);
  const rows = matches(f, '/* TODO first\n   continuation\n*/');
  assert.strictEqual(rows.length, 1);
  assert.ok(rows[0].text.includes('\n'), 'custom multiline behavior still works');
});
