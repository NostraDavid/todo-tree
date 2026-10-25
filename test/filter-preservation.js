const { fixture } = require('./tree-boundary');

QUnit.test('a rejected regex does not partially change the visible tree', assert => {
  const f = fixture();
  f.add('a.js', 'TODO apple');
  f.add('b.js', 'TODO banana');
  f.provider.filter('apple');
  const before = f.todos();
  assert.deepEqual(before.map(row => row.file), ['a.js']);
  assert.throws(
    () => f.provider.filter('('),
    /Invalid regular expression/,
    'existing provider API rejects incomplete syntax',
  );
  assert.deepEqual(f.todos(), before, 'compile failure leaves all visibility unchanged');
  f.provider.filter('banana');
  assert.deepEqual(f.todos().map(row => row.file), ['b.js'], 'a later valid regex still works');
  f.provider.clearTreeFilter();
  assert.deepEqual(f.todos().map(row => row.file), ['a.js', 'b.js'], 'clear restores both rows');
});
