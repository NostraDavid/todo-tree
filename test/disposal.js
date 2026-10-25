const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fixture, root } = require('./tree-boundary');
const { extensionClosures } = require('./extension-closures');

QUnit.test('tree provider is disposable and releases its event emitter', assert => {
  const f = fixture();
  let disposed = false;
  f.provider._onDidChangeTreeData.dispose = () => {
    disposed = true;
  };
  assert.strictEqual(typeof f.provider.dispose, 'function');
  if (typeof f.provider.dispose === 'function') f.provider.dispose();
  assert.ok(disposed);
});

QUnit.test('highlight subscription disposes styles and cancels pending updates', assert => {
  const f = fixture();
  f.context.subscriptions = [];
  f.vscode.Disposable = class {
    constructor(dispose) {
      this.dispose = dispose;
    }
  };
  f.vscode.ThemeColor = class {
    constructor(id) {
      this.id = id;
    }
  };
  f.vscode.Position = class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  };
  f.vscode.Range = class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  };
  const styles = [];
  f.vscode.window = {
    createTextEditorDecorationType() {
      const style = {
        disposed: false,
        dispose() {
          this.disposed = true;
        },
      };
      styles.push(style);
      return style;
    },
  };
  const pending = new Map();
  let next = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'out/src/highlights.js'), 'utf8'), {
    module,
    exports: module.exports,
    require(name) {
      return name === 'vscode'
        ? f.vscode
        : name === './config.js'
        ? f.config
        : name === './utils.js'
        ? f.utils
        : name === './attributes.js'
        ? f.attributes
        : {};
    },
    setTimeout(callback, _ms, ...args) {
      const id = ++next;
      pending.set(id, () => callback(...args));
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
  });
  const text = '// TODO work';
  const editor = {
    document: {
      uri: f.uri('a.js'),
      getText: () => text,
      positionAt: offset => ({ line: 0, character: offset }),
      offsetAt: position => position.character,
      lineAt: () => ({ text, range: { end: { line: 0, character: text.length } } }),
    },
    setDecorations() {},
  };
  module.exports.init(f.context, () => {});
  module.exports.triggerHighlight(editor);
  for (const [id, callback] of pending) {
    pending.delete(id);
    callback();
  }
  assert.strictEqual(styles.length, 1);
  module.exports.triggerHighlight(editor);
  const subscription = f.context.subscriptions[0];
  assert.strictEqual(typeof subscription?.dispose, 'function');
  if (typeof subscription?.dispose === 'function') subscription.dispose();
  assert.ok(styles.every(style => style.disposed));
  assert.strictEqual(pending.size, 0);
});

for (const debug of [false, true]) {
  QUnit.test('output channel subscription is valid, debug=' + debug, assert => {
    const f = fixture({ 'todo-tree.general.debug': debug });
    f.context.subscriptions = [];
    f.vscode.Disposable = class {
      constructor(dispose) {
        this.dispose = dispose;
      }
    };
    const channel = {
      disposed: false,
      dispose() {
        this.disposed = true;
      },
    };
    f.vscode.window = { createOutputChannel: () => channel };
    const sandbox = extensionClosures(['resetOutputChannel'], {
      context: f.context,
      vscode: f.vscode,
      outputChannel: undefined,
    });
    const source = fs.readFileSync(path.join(root, 'out/src/extension.js'), 'utf8');
    const registration = source.match(
      / +context\.subscriptions\.push\(\s*(?:outputChannel|new vscode\.Disposable\([\s\S]*?\))\s*,?\s*\);\s*resetOutputChannel\(\);/,
    );
    assert.ok(registration, 'actual output channel registration');
    vm.runInContext(registration[0], sandbox);
    for (const subscription of f.context.subscriptions) {
      assert.strictEqual(typeof subscription?.dispose, 'function');
      if (typeof subscription?.dispose === 'function') subscription.dispose();
    }
    assert.strictEqual(channel.disposed, debug);
  });
}
