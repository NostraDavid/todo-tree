const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./tree-boundary');
const { extensionClosures, registeredCommand } = require('./extension-closures');

QUnit.test('search options work without workspace storage', assert => {
  const f = fixture({ 'todo-tree.ripgrep.ripgrep': process.execPath, 'todo-tree.filtering.passGlobsToRipgrep': false });
  const sandbox = extensionClosures(['getOptions'], {
    vscode: f.vscode,
    context: f.context,
    config: f.config,
    utils: f.utils,
    path,
    fs,
    outputChannel: undefined,
    debug() {},
  });
  let options;
  let error;
  try {
    options = sandbox.getOptions('a.js');
  } catch (caught) {
    error = caught;
  }
  assert.notOk(error);
  assert.strictEqual(options?.patternFileDirectory, undefined);
  assert.strictEqual(options?.filename, 'a.js');
});

QUnit.test('workspace-relative roots produce no work when no workspace exists', assert => {
  const f = fixture({ 'todo-tree.general.rootFolder': '${workspaceFolder}/work' });
  const sandbox = extensionClosures(['getRootFolders'], { vscode: f.vscode, config: f.config, utils: f.utils, path });
  const roots = sandbox.getRootFolders();
  assert.ok(Array.isArray(roots));
  assert.deepEqual(roots, []);
});

for (const command of ['todo-tree.goToNext', 'todo-tree.goToPrevious']) {
  QUnit.test('navigation without an active editor is a no-op: ' + command, assert => {
    let handler;
    const vscode = {
      commands: {
        registerCommand(_name, callback) {
          handler = callback;
          return { dispose() {} };
        },
      },
      window: { activeTextEditor: undefined },
    };
    registeredCommand(command, { vscode, context: { subscriptions: [] } });
    let error;
    try {
      handler();
    } catch (caught) {
      error = caught;
    }
    assert.notOk(error);
  });
}

QUnit.test('previous navigation selects a real match without leaking a global result', assert => {
  const f = fixture();
  const text = '// TODO first\n// TODO second';
  const editor = {
    document: {
      getText: () => text,
      offsetAt: () => text.length,
      positionAt: offset => ({
        line: text.slice(0, offset).split('\n').length - 1,
        character: offset - (text.lastIndexOf('\n', offset) + 1),
      }),
    },
    selections: [{ start: { line: 1, character: 14 } }],
    revealRange() {},
  };
  let handler;
  f.vscode.commands = {
    registerCommand(_name, callback) {
      handler = callback;
      return { dispose() {} };
    },
  };
  f.vscode.window = { activeTextEditor: editor };
  const sandbox = registeredCommand('todo-tree.goToPrevious', {
    vscode: f.vscode,
    utils: f.utils,
    context: { subscriptions: [] },
  });
  handler();
  assert.notOk(Object.hasOwn(sandbox, 'result'));
  assert.strictEqual(editor.selections[0].anchor.line, 1);
  assert.strictEqual(editor.selections[0].anchor.character, 0);
});

QUnit.test('cache cleanup handles absent folders and directory-read errors', assert => {
  const logs = [];
  let reads = 0;
  const sandbox = extensionClosures(['purgeFolder'], {
    fs: {
      readdir(_folder, callback) {
        reads++;
        callback(new Error('ENOENT fixture'), undefined);
      },
    },
    debug: message => logs.push(message),
  });
  let error;
  try {
    sandbox.purgeFolder(undefined);
    sandbox.purgeFolder('/synthetic/cache');
  } catch (caught) {
    error = caught;
  }
  assert.notOk(error);
  assert.strictEqual(reads, 1);
  assert.strictEqual(logs.length, 1);
});

QUnit.test('legacy array settings require real arrays', assert => {
  const sandbox = extensionClosures(['typeMatch'], {});
  assert.strictEqual(sandbox.typeMatch(['TODO'], 'array'), true);
  for (const value of [null, undefined, 'TODO', { length: 1 }]) {
    assert.strictEqual(sandbox.typeMatch(value, 'array'), false);
  }
});
