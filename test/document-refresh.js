const path = require('node:path');
const { fixture } = require('./tree-boundary');
const { extensionClosures } = require('./extension-closures');
const results = require('../out/src/searchResults');

QUnit.test('editing two documents retains one pending refresh for each', assert => {
  const f = fixture();
  const pending = new Map();
  const refreshed = [];
  let next = 0;
  f.vscode.window = { visibleTextEditors: [] };
  const sandbox = extensionClosures(['documentChanged', 'deactivate'], {
    vscode: f.vscode,
    config: f.config,
    path,
    isIncluded: () => true,
    shouldRefreshFile: () => true,
    ripgrep: { kill() {} },
    provider: { clear() {} },
    clearInterval() {},
    refreshFile: document => refreshed.push(document.fileName),
    setTimeout(callback, _ms, ...args) {
      const id = ++next;
      pending.set(id, () => callback(...args));
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
  });
  const a = { uri: f.uri('a.js'), fileName: 'a.js' }, b = { uri: f.uri('b.js'), fileName: 'b.js' };
  sandbox.documentChanged(a);
  sandbox.documentChanged(b);
  sandbox.documentChanged(a);
  assert.strictEqual(pending.size, 2, 'edits in A never cancel B');
  for (const [id, callback] of pending) {
    pending.delete(id);
    callback();
  }
  assert.deepEqual(refreshed.sort(), ['a.js', 'b.js']);
  sandbox.documentChanged(a);
  sandbox.documentChanged(b);
  sandbox.deactivate();
  assert.strictEqual(pending.size, 0, 'shutdown cancels every pending document');
});

for (
  const [name, text, regex, expected] of [
    ['dense file', '// TODO task\n'.repeat(5000), undefined, 5000],
    ['custom matches with repeated normalized positions', 'a\nb', '[\\s\\S]', 2],
  ]
) {
  QUnit.test('file refresh replaces own matches and preserves other files: ' + name, assert => {
    const f = fixture(regex ? { 'todo-tree.regex.regex': regex } : {});
    const uri = f.uri('a.js');
    const lines = text.split('\n');
    const document = {
      uri,
      fileName: uri.fsPath,
      getText: () => text,
      positionAt(offset) {
        const rows = text.slice(0, offset).split('\n');
        return { line: rows.length - 1, character: rows.at(-1).length };
      },
      lineAt: line => ({ text: lines[line] }),
    };
    const sandbox = extensionClosures(['refreshFile'], {
      config: f.config,
      utils: f.utils,
      searchResults: results,
      isIncluded: () => true,
      provider: { reset() {}, remove() {} },
      addResultsToTree() {},
      vscode: f.vscode,
    });
    results.clear();
    results.add({ uri: f.uri('b.js'), line: 1, column: 1, match: 'TODO B' });
    sandbox.refreshFile(document);
    assert.strictEqual(results.count(), expected + 1);
    sandbox.refreshFile(document);
    assert.strictEqual(results.count(), expected + 1, 'refresh replaces previous A results');
    const matches = [];
    results.addToTree({ add: result => matches.push(result) });
    assert.strictEqual(matches.filter(result => result.uri === uri).length, expected);
    results.clear();
  });
}
