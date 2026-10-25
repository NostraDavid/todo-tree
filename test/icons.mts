import QUnit from 'qunit';
import type { DecorationRenderOptions } from 'vscode';
import { fixture } from './tree-boundary.mts';
for (const icon of ['todo-tree', 'todo-tree-filled', 'not-a-real-icon']) {
  QUnit.test('icon validation recognizes documented built-in names: ' + icon, assert => {
    const f = fixture();
    const workspace = {
      getConfiguration() {
        return {
          get(key: string) {
            return key === 'defaultHighlight.icon' ? icon : undefined;
          },
        };
      },
    };
    const message = f.load('icons.js').validateIcons(
      workspace as unknown as Pick<typeof import('vscode').workspace, 'getConfiguration'>,
    );
    if (icon === 'not-a-real-icon') assert.ok(message.includes(icon));
    else assert.strictEqual(message, '');
  });
}

for (const [rulerLane, expected] of [['right', 4], ['4', 4], [4, 4], ['none', undefined]]) {
  QUnit.test('decorations pass a numeric ruler lane to VS Code: ' + rulerLane, assert => {
    const f = fixture({ 'todo-tree.highlights.defaultHighlight': { rulerLane } });
    let received: DecorationRenderOptions | undefined;
    f.vscode.window = {
      createTextEditorDecorationType(options) {
        received = options;
        return { dispose() {} };
      },
    };
    f.load('highlights.js').getDecoration('TODO');
    assert.strictEqual(received!.overviewRulerLane, expected);
  });
}
