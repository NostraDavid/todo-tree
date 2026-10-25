import { spawnSync } from 'node:child_process';
import path from 'node:path';
import QUnit from 'qunit';
QUnit.test('gitignore allows project paths and excludes unlisted root files', function(assert) {
  var root = path.join(import.meta.dirname, '..');
  var allowed = [
    '.gitignore',
    '.editorconfig',
    '.gitattributes',
    '.npmrc',
    '.node-version',
    '.oxlintrc.json',
    '.pre-commit-config.yaml',
    '.vscodeignore',
    'AGENTS.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'Justfile',
    'License.txt',
    'README.md',
    'dprint.json',
    'flake.nix',
    'flake.lock',
    'package.json',
    'package-lock.json',
    'package.nls.json',
    'package.nls.zh-cn.json',
    'webpack.config.mts',
    'tsconfig.json',
    'tsconfig.tools.json',
    '.github/workflows/new.yml',
    '.vscode/launch.json',
    '.vscode/tasks.json',
    'docs/new-guide.md',
    'resources/new-icon.svg',
    'scripts/new-check.mts',
    'src/new-feature.ts',
    'test/new-test.mts',
  ];
  var ignored = [
    'scratch.txt',
    '.env',
    'local-secrets/token.json',
    'node_modules/example/index.js',
    'dist/extension.js',
    'out/src/extension.js',
    'test-files/example.js',
    'release-notes.md',
    'published-extension.json',
    'nostradavid-todo-tree-1.0.0.vsix',
    '.direnv/environment',
    'result',
    '.vscode/settings.json',
  ];
  var result = spawnSync('git', ['-c', 'core.excludesFile=', 'check-ignore', '--no-index', '--stdin'], {
    cwd: root,
    input: allowed.concat(ignored).join('\n') + '\n',
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), ignored);
});
