import vm from 'node:vm';
import QUnit from 'qunit';
import manifest from '../package.json' with { type: 'json' };
const menu = manifest.contributes.menus['view/item/context'].find(item => item.command === 'todo-tree.showTreeView')!;

for (const view of ['todo-tree-view', 'other-extension-view']) {
  for (const [flat, tagsOnly] of [[false, false], [true, false], [false, true], [true, true]]) {
    QUnit.test(`tree context menu stays in its view: ${view}, flat=${flat}, tagsOnly=${tagsOnly}`, assert => {
      const expression = menu.when.replace('view =~ /todo-tree/', '/todo-tree/.test(view)')
        .replaceAll('todo-tree-flat', 'flat').replaceAll('todo-tree-tags-only', 'tagsOnly');
      const visible = vm.runInNewContext(expression, { view, flat, tagsOnly });
      assert.strictEqual(visible, view === 'todo-tree-view' && (flat || tagsOnly));
    });
  }
}
