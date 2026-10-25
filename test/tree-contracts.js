const os = require('node:os');
const path = require('node:path');
const { fixture } = require('./tree-boundary');

for (const flat of [false, true]) {
  for (const grouping of ['groupedByTag', 'groupedBySubTag']) {
    QUnit.test(`group nodes use boolean folder flags: flat=${flat}, ${grouping}`, assert => {
      const f = fixture({ 'todo-tree.regex.subTagRegex': '\\(([^)]+)\\)' });
      f.context.workspaceState.update('flat', flat);
      f.context.workspaceState.update(grouping, true);
      f.add('a.js', 'TODO (home) first');
      f.add('b.js', 'TODO (work) second');
      const root = f.provider.getChildren().find(node => node.isWorkspaceNode);
      assert.ok(root);
      for (const group of root.nodes) assert.strictEqual(group.isFolder, true);
    });
  }
}

QUnit.test('tree items use string IDs and command titles required by VS Code', assert => {
  const f = fixture({ 'todo-tree.highlights.defaultHighlight': { icon: '$(check)' } });
  f.context.globalStorageUri = { fsPath: os.tmpdir() };
  f.context.asAbsolutePath = relative => path.join(f.root, relative);
  f.add('a.js', 'TODO work');
  const root = f.provider.getChildren().find(node => node.isWorkspaceNode);
  const file = root.nodes[0];
  const todo = file.nodes[0];
  const item = f.provider.getTreeItem(todo);
  assert.strictEqual(typeof item.id, 'string');
  assert.strictEqual(item.command.title, todo.label);
});

QUnit.test('folder compaction selects a path child when TODOs are also present', assert => {
  const f = fixture({ 'explorer.compactFolders': true });
  const todo = {
    type: 'todo',
    id: 4,
    label: 'TODO work',
    fsPath: '/workspace/root/file.js',
    line: 0,
    column: 1,
    endColumn: 10,
    visible: true,
    extraLines: [],
  };
  const deep = {
    type: 'path',
    id: 3,
    label: 'deep',
    fsPath: '/workspace/root/nested/deep',
    visible: true,
    isFolder: true,
    nodes: [{ ...todo, id: 5 }],
  };
  const nested = {
    type: 'path',
    id: 2,
    label: 'nested',
    fsPath: '/workspace/root/nested',
    visible: true,
    isFolder: true,
    nodes: [deep],
  };
  const root = {
    type: 'path',
    id: 1,
    label: 'root',
    fsPath: '/workspace/root',
    visible: true,
    isFolder: true,
    nodes: [todo, nested],
  };
  let error;
  let item;
  try {
    item = f.provider.getTreeItem(root);
  } catch (caught) {
    error = caught;
  }
  assert.notOk(error);
  assert.strictEqual(item?.label, 'root/nested');
});
