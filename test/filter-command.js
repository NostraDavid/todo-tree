const { fixture } = require('./tree-boundary');
const { registeredCommand } = require('./extension-closures');

for (const term of ['(', undefined, 'banana', '']) {
  QUnit.test(`filter command commits only accepted input, term=${JSON.stringify(term)}`, async assert => {
    const f = fixture();
    f.add('a.js', 'TODO apple');
    f.add('b.js', 'TODO banana');
    f.provider.filter('apple');
    f.context.workspaceState.update('currentFilter', 'apple');
    f.context.workspaceState.update('filtered', true);
    const before = f.todos();
    const errors = [];
    let handler;
    let escapedError;
    let inputOptions;
    const vscode = {
      commands: {
        registerCommand(name, callback) {
          handler = callback;
          return { dispose() {} };
        },
      },
      window: {
        showInputBox(options) {
          inputOptions = options;
          return Promise.resolve(term);
        },
        showErrorMessage(message) {
          errors.push(message);
        },
      },
    };
    f.context.subscriptions = [];
    const sandbox = registeredCommand('todo-tree.filter', {
      vscode,
      context: f.context,
      provider: f.provider,
      currentFilter: 'apple',
      refreshTree() {},
    });
    try {
      await handler();
    } catch (error) {
      escapedError = error;
    }
    if (term === 'banana') {
      assert.strictEqual(f.context.workspaceState.get('currentFilter'), 'banana');
      assert.deepEqual(f.todos().map(row => row.file), ['b.js']);
    } else if (term === '') {
      assert.strictEqual(f.context.workspaceState.get('filtered'), false);
      assert.strictEqual(sandbox.currentFilter, '');
      assert.deepEqual(f.todos().map(row => row.file), ['a.js', 'b.js']);
    } else if (term === undefined) {
      assert.strictEqual(sandbox.currentFilter, 'apple', 'cancel leaves current in-memory filter');
      assert.strictEqual(f.context.workspaceState.get('currentFilter'), 'apple');
      assert.deepEqual(f.todos(), before);
    } else {
      const uiValidation = typeof inputOptions.validateInput === 'function'
        ? inputOptions.validateInput(term)
        : undefined;
      assert.ok(errors.length > 0 || uiValidation, 'invalid syntax has visible feedback');
      assert.strictEqual(f.context.workspaceState.get('currentFilter'), 'apple', 'invalid regex is not persisted');
      assert.deepEqual(f.todos(), before, 'old visible tree remains');
      assert.notOk(escapedError, 'no exception escapes completion callback');
    }
  });
}

for (const term of ['(', 'banana', undefined]) {
  QUnit.test('saved filter is validated before any search, term=' + JSON.stringify(term), assert => {
    const { restoreFilter } = require('./extension-closures');
    const f = fixture();
    f.context.workspaceState.update('currentFilter', term);
    f.context.workspaceState.update('filtered', Boolean(term));
    const errors = [];
    const sandbox = restoreFilter({
      context: f.context,
      vscode: {
        window: {
          showErrorMessage(message) {
            errors.push(message);
          },
        },
      },
    });
    if (term === '(') {
      assert.strictEqual(sandbox.currentFilter, undefined);
      assert.strictEqual(f.context.workspaceState.get('currentFilter'), undefined);
      assert.strictEqual(f.context.workspaceState.get('filtered'), false);
      assert.strictEqual(errors.length, 1);
    } else {
      assert.strictEqual(sandbox.currentFilter, term);
      assert.strictEqual(errors.length, 0);
    }
  });
}
