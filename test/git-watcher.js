const { createRequire } = require('node:module');
const path = require('node:path');
const { fixture, root } = require('./tree-boundary');
const { extensionClosures } = require('./extension-closures');

function watcher() {
  const f = fixture({ 'todo-tree.general.automaticGitRefreshInterval': 1 });
  f.vscode.workspace.workspaceFolders = [{ uri: f.uri('a') }, { uri: f.uri('b') }];
  const intervals = new Map();
  const timeouts = new Map();
  const processes = [];
  let nextTimer = 1;
  const start = (...args) => {
    const options = args.find(value => value && typeof value === 'object' && !Array.isArray(value));
    const callback = args.findLast(value => typeof value === 'function');
    const child = {
      cwd: options.cwd,
      callback,
      killed: false,
      kill() {
        this.killed = true;
      },
      on() {
        return this;
      },
    };
    processes.push(child);
    return child;
  };
  const sandbox = extensionClosures(['triggerRescan', 'resetGitWatcher', 'deactivate'], {
    vscode: f.vscode,
    provider: f.provider,
    ripgrep: createRequire(path.join(root, 'package.json'))('./src/ripgrep.js'),
    child_process: { exec: start, execFile: start },
    autoGitRefreshTimer: undefined,
    periodicRefreshTimer: undefined,
    refreshTimeout: undefined,
    fileRefreshTimeout: undefined,
    hideTimeout: undefined,
    lastGitHead: {},
    debug() {},
    setInterval(callback, ms) {
      const id = nextTimer++;
      intervals.set(id, { callback, ms });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout(callback, ms) {
      const id = nextTimer++;
      timeouts.set(id, { callback, ms });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
  });
  return {
    f,
    sandbox,
    intervals,
    timeouts,
    processes,
    tick() {
      for (const timer of intervals.values()) timer.callback();
    },
  };
}

QUnit.test('Git polling does not overlap and releases each root independently', assert => {
  const w = watcher();
  w.sandbox.resetGitWatcher();
  w.tick();
  assert.strictEqual(w.processes.length, 2, 'one request per root');
  w.tick();
  assert.strictEqual(w.processes.length, 2, 'slow Git calls do not multiply');
  w.processes[0].callback(null, 'abc\n');
  w.tick();
  assert.strictEqual(w.processes.length, 3, 'finished A can poll again while B remains busy');
  assert.strictEqual(w.processes.at(-1).cwd, w.f.uri('a').fsPath);
});

QUnit.test('Git polling resets interval, disables at zero, and ignores unavailable stdout', assert => {
  const w = watcher();
  w.sandbox.resetGitWatcher();
  w.sandbox.resetGitWatcher();
  assert.strictEqual(w.intervals.size, 1, 'configuration reset replaces timer');
  w.tick();
  let error;
  try {
    w.processes[0].callback(new Error('git unavailable'), undefined);
  } catch (caught) {
    error = caught;
  }
  assert.notOk(error, 'failed Git lookup does not dereference missing stdout');
  assert.strictEqual(w.timeouts.size, 0, 'failed lookup does not schedule rescan');
  w.tick();
  assert.strictEqual(w.processes.length, 3, 'failure releases A while B remains busy');
  w.f.values['todo-tree.general.automaticGitRefreshInterval'] = 0;
  w.sandbox.resetGitWatcher();
  assert.strictEqual(w.intervals.size, 0, 'zero disables polling');
});

QUnit.test('deactivation clears Git poll timer and does not allow later launches', assert => {
  const w = watcher();
  w.sandbox.resetGitWatcher();
  w.tick();
  for (const child of w.processes) w.sandbox.lastGitHead[child.cwd] = 'before-stop\n';
  w.sandbox.deactivate();
  assert.strictEqual(w.intervals.size, 0, 'timer disposed');
  const before = w.processes.length;
  w.tick();
  assert.strictEqual(w.processes.length, before, 'no further process after deactivation');
  assert.ok(w.processes.every(child => child.killed), 'pending Git children are cancelled');
  for (const child of w.processes) child.callback(null, 'changed-after-stop\n');
  assert.strictEqual(w.timeouts.size, 0, 'late completion after stop does not schedule a rescan');
});

QUnit.test('disabling Git polling cancels pending checks and ignores late output', assert => {
  const w = watcher();
  w.sandbox.resetGitWatcher();
  w.tick();
  for (const child of w.processes) w.sandbox.lastGitHead[child.cwd] = 'before-stop\n';
  w.f.values['todo-tree.general.automaticGitRefreshInterval'] = 0;
  w.sandbox.resetGitWatcher();
  assert.ok(w.processes.every(child => child.killed));
  for (const child of w.processes) child.callback(null, 'changed-after-stop\n');
  assert.strictEqual(w.timeouts.size, 0);
});
