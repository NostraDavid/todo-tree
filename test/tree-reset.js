const { fixture } = require('./tree-boundary');

for (
  const [mode, settings] of [
    ['tree', {}],
    ['flat', { 'todo-tree.tree.flat': true }],
    ['tags only', { 'todo-tree.tree.tagsOnly': true }],
  ]
) {
  for (const grouped of [false, true]) {
    QUnit.test(`${mode}, grouped=${grouped}: refreshing A preserves B`, assert => {
      const f = fixture({ ...settings, 'todo-tree.tree.groupedByTag': grouped });
      f.add('a.js', 'TODO original A');
      f.add('b.js', 'TODO original B');
      assert.strictEqual(f.todos().length, 2, 'both source results entered through public add()');
      f.provider.reset(f.uri('a.js'));
      f.add('a.js', 'TODO updated A');
      const rows = f.todos();
      assert.deepEqual(rows.map(row => row.file), ['a.js', 'b.js'], 'no duplicate A and no missing B');
      assert.ok(rows.some(row => row.file === 'a.js' && row.label.includes('updated A')), 'A replaced');
      assert.ok(rows.some(row => row.file === 'b.js' && row.label.includes('original B')), 'B retained');
    });

    QUnit.test(`${mode}, grouped=${grouped}: removing the first group member preserves B`, assert => {
      const f = fixture({ ...settings, 'todo-tree.tree.groupedByTag': grouped });
      f.add('a.js', 'TODO original A');
      f.add('b.js', 'TODO original B');
      f.provider.remove(undefined, f.uri('a.js'));
      assert.deepEqual(f.todos().map(row => row.file), ['b.js'], 'B survives even if the group was created by A');
      f.provider.remove(undefined, f.uri('b.js'));
      assert.strictEqual(f.todos().length, 0, 'removing the final member leaves no results');
      assert.deepEqual(Object.keys(f.provider.getTagCountsForActivityBar()), [], 'no stale nonzero badge counts');
    });
  }
}

QUnit.test('grouped tree: refreshing one tag preserves files in other groups', assert => {
  const f = fixture({ 'todo-tree.tree.groupedByTag': true });
  f.add('a.js', 'TODO original A');
  f.add('b.js', 'FIXME original B');
  f.provider.reset(f.uri('a.js'));
  f.add('a.js', 'TODO updated A');
  assert.deepEqual(f.todos().map(row => row.file), ['a.js', 'b.js']);
});
