import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import QUnit from 'qunit';
import { extensionClosures } from './extension-closures.mts';
import { fixture } from './tree-boundary.mts';
for (const usePatternFile of [false, true]) {
  QUnit.test('getOptions passes raw regex and per-search storage directory, patternFile=' + usePatternFile, assert => {
    const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-options-'));
    try {
      const regex = String.raw`TODO "quoted" \$value`;
      const f = fixture({
        'todo-tree.ripgrep.ripgrep': process.execPath,
        'todo-tree.ripgrep.usePatternFile': usePatternFile,
        'todo-tree.filtering.passGlobsToRipgrep': false,
        'todo-tree.regex.regex': regex,
      });
      f.context.storageUri = { fsPath: storage };
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
      const result = sandbox.getOptions('example.txt');
      assert.strictEqual(result.regex, regex, 'no shell wrapper quotes');
      assert.strictEqual(result.unquotedRegex, undefined, 'duplicate representation removed');
      assert.strictEqual(result.patternFileDirectory, usePatternFile ? storage : undefined);
      assert.strictEqual(result.patternFilePath, undefined, 'caller no longer chooses a filename');
    } finally {
      fs.rmSync(storage, { recursive: true, force: true });
    }
  });
}

QUnit.test('stop prevents launching queued workspaces after current search settles', async assert => {
  const launched: string[] = [];
  let complete!: () => void;
  const sandbox = extensionClosures(['iterateSearchList'], {
    searchList: ['first', 'second'],
    interrupted: false,
    search(options: string) {
      launched.push(options);
      return new Promise<void>(resolve => {
        complete = resolve;
      });
    },
    getOptions(filename: string) {
      return filename;
    },
    searchResults: {
      count() {
        return 0;
      },
    },
    vscode: {
      workspace: {
        getConfiguration() {
          return {
            get() {
              return true;
            },
          };
        },
      },
    },
    addResultsToTree() {},
    setButtonsAndContext() {},
    debug() {},
  });
  const pending = sandbox.iterateSearchList();
  await Promise.resolve();
  assert.deepEqual(launched, ['first']);
  sandbox.interrupted = true;
  complete();
  await pending;
  assert.deepEqual(launched, ['first'], 'second queued root remains unstarted');
});
