import QUnit from 'qunit';
import { extensionClosures } from './extension-closures.mts';
import { fixture } from './tree-boundary.mts';
for (const groupAlsoTag of [false, true]) {
  for (const mode of ['tags', 'current file', 'top three', 'total']) {
    QUnit.test(`status labels include groups once, mode=${mode}, groupAlsoTag=${groupAlsoTag}`, assert => {
      const f = fixture({
        'todo-tree.general.tags': ['TODO', 'FIXME', 'HACK', ...(groupAlsoTag ? ['work'] : [])],
        'todo-tree.general.tagGroups': { work: ['TODO', 'FIXME'], other: ['HACK'] },
        'todo-tree.general.statusBar': mode,
        'todo-tree.general.showIconsInsteadOfTagsInStatusBar': false,
      });
      f.add('a.js', 'TODO first');
      f.add('b.js', 'FIXME second');
      f.add('c.js', 'HACK third');
      assert.deepEqual(
        JSON.parse(JSON.stringify(f.provider.getTagCountsForActivityBar())),
        { work: 2, other: 1 },
        'real provider counts use group labels',
      );
      f.vscode.window = { activeTextEditor: { document: { fileName: f.uri('a.js').fsPath } } };
      const indicator = { text: '', show() {}, hide() {} };
      const sandbox = extensionClosures(['updateInformation'], {
        vscode: f.vscode,
        provider: f.provider,
        config: f.config,
        attributes: f.attributes,
        utils: f.utils,
        todoTreeView: { title: 'Todo Tree' },
        statusBarIndicator: indicator,
      });
      sandbox.updateInformation();
      if (mode === 'total') assert.strictEqual(indicator.text, '$(check) 3');
      else {
        assert.ok(indicator.text.includes(`work: ${mode === 'current file' ? 1 : 2}`), 'group count visible');
        assert.strictEqual(
          (indicator.text.match(/work:/g) || []).length,
          1,
          'group not duplicated if also declared as tag',
        );
        if (mode !== 'current file') assert.ok(indicator.text.includes('other: 1'), 'second group visible');
      }
    });
  }
}

for (const mode of ['tags', 'current file', 'top three', 'total']) {
  QUnit.test('status with no results remains zero, mode=' + mode, assert => {
    const f = fixture({ 'todo-tree.general.statusBar': mode, 'todo-tree.general.tagGroups': { work: ['TODO'] } });
    f.vscode.window = {};
    const indicator = { text: '', show() {}, hide() {} };
    const sandbox = extensionClosures(['updateInformation'], {
      vscode: f.vscode,
      provider: f.provider,
      config: f.config,
      attributes: f.attributes,
      utils: f.utils,
      todoTreeView: { title: 'Todo Tree' },
      statusBarIndicator: indicator,
    });
    sandbox.updateInformation();
    assert.strictEqual(indicator.text, '$(check) 0');
  });
}
