import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import QUnit from 'qunit';
import { fake, load, options } from './argv-boundary.mts';
for (
  const [source, expected] of [
    ['--label "a b"', ['--label', 'a b']],
    ["--label 'a b'", ['--label', 'a b']],
    [String.raw`--label a\ b`, ['--label', 'a b']],
    [String.raw`--label "a\"b"`, ['--label', 'a"b']],
    [String.raw`--label 'a'\''b'`, ['--label', "a'b"]],
    [String.raw`--label "C:\Program Files\rg"`, ['--label', String.raw`C:\Program Files\rg`]],
    ['--label ""', ['--label', '']],
    ['--glob=*.js --glob !**/node_modules/**', ['--glob=*.js', '--glob', '!**/node_modules/**']],
    ['--label "$TODO_SHELL_DIR"', ['--label', '/synthetic/a b']],
    ['--label "${TODO_SHELL_DIR}"', ['--label', '/synthetic/a b']],
    ["--label '$TODO_SHELL_DIR'", ['--label', '$TODO_SHELL_DIR']],
    [String.raw`--label \$TODO_SHELL_DIR`, ['--label', '$TODO_SHELL_DIR']],
    ['$TODO_SHELL_FLAGS', ['--hidden', '--no-ignore']],
    ['--missing $TODO_SHELL_UNDEFINED --next', ['--missing', '--next']],
    ['--missing "$TODO_SHELL_UNDEFINED"', ['--missing', '']],
    ['--label "$TODO_SHELL_META"', ['--label', 'x;echo DO_NOT_RUN']],
    [String.raw`--label $'a\tb'`, ['--label', 'a\tb']],
  ]
) {
  QUnit.test('argument tokenizer: ' + source, async assert => {
    const f = fake();
    const promise = f.search.search(os.tmpdir(), options({ additional: source }));
    const call = f.calls[0];
    assert.ok(call, 'execFile invoked after successful parse');
    if (!call) {
      await promise;
      return;
    }
    assert.deepEqual(Array.from(call.args.slice(7, -4)), expected);
    assert.strictEqual(call.options.shell, false);
    call.callback(null, '', '');
    await promise;
  });
}

for (
  const source of [
    '--label "unfinished',
    "--label 'unfinished",
    '--label trailing\\',
    '--x | other',
    '--x && other',
    '--x ; other',
    '--x > result',
    '--x # comment',
    '--x $(touch NOT_CREATED)',
  ]
) {
  QUnit.test('invalid or shell-only syntax rejects before launch: ' + source, async assert => {
    const f = fake();
    await assert.rejects(
      f.search.search(os.tmpdir(), options({ additional: source })),
      /quote|escape|operators|comments/i,
    );
    assert.strictEqual(f.calls.length, 0);
  });
}

QUnit.test('invalid argument-setting type rejects before launch', async assert => {
  const f = fake();
  await assert.rejects(f.search.search(os.tmpdir(), options({ additional: null })), /must be a string/);
  assert.strictEqual(f.calls.length, 0);
});

QUnit.test('multiline flag is one argument rather than shell text', async assert => {
  const f = fake();
  const promise = f.search.search(os.tmpdir(), options({ multiline: true }));
  assert.ok(f.calls[0].args.includes('-U'));
  f.calls[0].callback(null, '', '');
  await promise;
});

QUnit.test('raw patterns, globs and leading-option filenames stay literal argv', async assert => {
  const f = fake();
  const regex = String.raw`TODO\s+"quoted"\$value`;
  const globs = ['!**/a $(touch NO)/**', 'a"b', '!**/x&y/**'];
  const promise = f.search.search(os.tmpdir(), options({ regex, globs, filename: '--help', maxBuffer: 3 }));
  const call = f.calls[0];
  assert.deepEqual(Array.from(call.args.slice(7)), [
    '--no-config',
    '-e',
    regex,
    '-g',
    globs[0],
    '-g',
    globs[1],
    '-g',
    globs[2],
    '--',
    '--help',
  ]);
  assert.strictEqual(call.executable, process.execPath, 'executable gets no shell quoting');
  assert.strictEqual(call.options.maxBuffer, 3 * 1024, 'existing kilobyte setting retained');
  assert.strictEqual(call.options.env.PWD, os.tmpdir(), 'child and expanded PWD agree with cwd');
  call.callback(null, 'file.js:3:4:TODO original text\n', 'nonfatal diagnostic');
  const rows = await promise;
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].line, 3);
  assert.strictEqual(rows[0].column, 4);
});

QUnit.test('environment PWD follows the search working directory', async assert => {
  const f = fake();
  const promise = f.search.search(os.tmpdir(), options({ additional: '--label "$PWD"' }));
  assert.deepEqual(Array.from(f.calls[0].args.slice(7, -4)), ['--label', os.tmpdir()]);
  f.calls[0].callback(null, '', '');
  await promise;
});

QUnit.test('exit one means no matches; code two never returns partial results', async assert => {
  const f = fake();
  const absent = f.search.search(os.tmpdir(), options());
  f.calls[0].callback(Object.assign(new Error('exit 1'), { code: 1 }), '', '');
  assert.deepEqual(Array.from(await absent), []);
  const failed = f.search.search(os.tmpdir(), options());
  const rejection = assert.rejects(
    failed,
    (error: Error & { stderr?: string }) => error.message === 'exit 2' && error.stderr === 'bad input',
  );
  f.calls[1].callback(Object.assign(new Error('exit 2'), { code: 2 }), 'file:1:1:TODO partial\n', 'bad input');
  await rejection;
});

for (
  const failure of [
    { code: 'ENOENT', message: 'not found' },
    { code: 'EACCES', message: 'not executable' },
    { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', message: 'maxBuffer exceeded', killed: true },
    { code: null, signal: 'SIGTERM', message: 'unexpected termination' },
  ]
) {
  QUnit.test('process failure stays a failure: ' + failure.code + '/' + failure.message, async assert => {
    const f = fake();
    const promise = f.search.search(os.tmpdir(), options());
    const rejected = assert.rejects(promise, (error: Error & { stderr?: string }) => error.message === failure.message);
    f.calls[0].callback(Object.assign(new Error(failure.message), failure), '', 'diagnostic');
    await rejected;
  });
}

QUnit.test('overlapping searches own different pattern files and cleanup only themselves', async assert => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-pattern-fixture-'));
  try {
    const sentinel = path.join(directory, 'existing-user-file');
    fs.writeFileSync(sentinel, 'preserve');
    const f = fake();
    const first = f.search.search(os.tmpdir(), options({ regex: 'TODO first', patternFileDirectory: directory }));
    const second = f.search.search(os.tmpdir(), options({ regex: 'TODO second', patternFileDirectory: directory }));
    const pattern = (call: import('./argv-boundary.mts').SearchCall) => call.args[call.args.indexOf('-f') + 1];
    const firstPath = pattern(f.calls[0]);
    const secondPath = pattern(f.calls[1]);
    assert.notEqual(firstPath, secondPath, 'same storage directory creates independent files');
    assert.strictEqual(fs.readFileSync(firstPath, 'utf8'), 'TODO first\n');
    assert.strictEqual(fs.readFileSync(secondPath, 'utf8'), 'TODO second\n');
    f.calls[1].callback(null, '', '');
    await second;
    assert.notOk(fs.existsSync(secondPath));
    assert.ok(fs.existsSync(firstPath), 'other active search file retained');
    f.calls[0].callback(null, '', '');
    await first;
    assert.deepEqual(fs.readdirSync(directory), ['existing-user-file']);
    assert.strictEqual(fs.readFileSync(sentinel, 'utf8'), 'preserve');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

QUnit.test('intentional stop cancels every active child and suppresses partial matches', async assert => {
  const f = fake();
  const first = f.search.search(os.tmpdir(), options());
  const second = f.search.search(os.tmpdir(), options());
  f.search.kill();
  for (const call of f.calls) {
    assert.deepEqual(call.child.signals, ['SIGINT']);
    call.callback(
      Object.assign(new Error('cancelled'), { signal: 'SIGINT', killed: true }),
      'file:1:1:TODO partial',
      '',
    );
  }
  assert.deepEqual(Array.from(await first), []);
  assert.deepEqual(Array.from(await second), []);
  f.search.kill();
  for (const call of f.calls) {
    assert.strictEqual(call.child.signals.length, 1, 'completed children no longer signalled');
  }
});

QUnit.test('completed earlier search does not hide a still active child from stop', async assert => {
  const f = fake();
  const first = f.search.search(os.tmpdir(), options());
  const second = f.search.search(os.tmpdir(), options());
  f.calls[0].callback(null, '', '');
  await first;
  f.search.kill();
  assert.deepEqual(f.calls[0].child.signals, []);
  assert.deepEqual(f.calls[1].child.signals, ['SIGINT']);
  f.calls[1].callback(null, '', '');
  await second;
});

QUnit.test('failed pattern write removes the private directory', async assert => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-write-fixture-'));
  try {
    const f = fake({
      writeFileSync() {
        throw new Error('simulated write failure');
      },
    });
    await assert.rejects(
      f.search.search(os.tmpdir(), options({ patternFileDirectory: directory })),
      /simulated write failure/,
    );
    assert.deepEqual(fs.readdirSync(directory), []);
    assert.strictEqual(f.calls.length, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

QUnit.test('synchronous spawn rejection also cleans the private pattern directory', async assert => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-spawn-fixture-'));
  try {
    const search = load(() => {
      throw new Error('simulated spawn failure');
    });
    await assert.rejects(
      search.search(os.tmpdir(), options({ patternFileDirectory: directory })),
      /simulated spawn failure/,
    );
    assert.deepEqual(fs.readdirSync(directory), []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
