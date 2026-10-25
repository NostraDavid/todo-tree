import fs from 'node:fs';
import path from 'node:path';
import QUnit from 'qunit';
import type { RipgrepOptions } from '../out/src/types.js';
import { Selection, type TestHandler } from './boundary-types.mts';
import { extensionClosures, registeredCommand } from './extension-closures.mts';
import { fixture } from './tree-boundary.mts';
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
  let options: RipgrepOptions | undefined;
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
    let handler!: TestHandler;
    const vscode = {
      commands: {
        registerCommand(_name: string, callback: TestHandler) {
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
      positionAt: (offset: number) => ({
        line: text.slice(0, offset).split('\n').length - 1,
        character: offset - (text.lastIndexOf('\n', offset) + 1),
      }),
    },
    selections: [new Selection({ line: 1, character: 14 }, { line: 1, character: 14 })],
    revealRange() {},
  };
  let handler!: TestHandler;
  f.vscode.commands = {
    registerCommand(_name: string, callback: TestHandler) {
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
  const logs: string[] = [];
  let reads = 0;
  const sandbox = extensionClosures(['purgeFolder'], {
    fs: {
      readdir(_folder: string, callback: (error: Error, files: undefined) => void) {
        reads++;
        callback(new Error('ENOENT fixture'), undefined);
      },
    },
    debug: (message: string) => logs.push(message),
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
