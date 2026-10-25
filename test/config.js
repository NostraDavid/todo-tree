var fs = require('fs');
var os = require('os');
var path = require('path');
var vm = require('vm');
var requireConfig = require('module').createRequire(require.resolve('../src/config.js'));

QUnit.test('config.ripgrepPath expands tilde and preserves executable lookup', function(assert) {
  var home = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-tree home $-'));
  var homedir = os.homedir;
  var configuredPath = '~/.local/bin/rg';
  var rgPath = path.join(home, '.local/bin/rg');
  var vscode = {
    env: { appRoot: home },
    workspace: {
      getConfiguration: function() {
        return { ripgrep: configuredPath };
      },
    },
  };
  var configModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/config.js'), 'utf8'), {
    module: configModule,
    process: process,
    require: function(name) {
      return name === 'vscode' ? vscode : requireConfig(name);
    },
  });

  try {
    os.homedir = function() {
      return home;
    };
    fs.mkdirSync(path.dirname(rgPath), { recursive: true });
    fs.writeFileSync(rgPath, '');
    assert.strictEqual(configModule.exports.ripgrepPath(), rgPath, 'expands a home-relative executable path');

    configuredPath = rgPath;
    assert.strictEqual(configModule.exports.ripgrepPath(), rgPath, 'preserves an absolute executable path');
    configuredPath = path.relative(process.cwd(), rgPath);
    assert.strictEqual(configModule.exports.ripgrepPath(), configuredPath, 'preserves a relative executable path');
    configuredPath = '~/missing-rg';
    assert.strictEqual(configModule.exports.ripgrepPath(), undefined, 'rejects a missing home-relative executable');

    var bundledPath = path.join(
      home,
      'node_modules/vscode-ripgrep/bin',
      process.platform === 'win32' ? 'rg.exe' : 'rg',
    );
    fs.mkdirSync(path.dirname(bundledPath), { recursive: true });
    fs.writeFileSync(bundledPath, '');
    assert.strictEqual(
      configModule.exports.ripgrepPath(),
      bundledPath,
      'falls back when the configured executable is missing',
    );
    configuredPath = '';
    assert.strictEqual(configModule.exports.ripgrepPath(), bundledPath, 'falls back when the setting is empty');
    configuredPath = undefined;
    assert.strictEqual(configModule.exports.ripgrepPath(), bundledPath, 'falls back when the setting is unset');
    configuredPath = '~/.local/bin/rg';
    assert.strictEqual(
      configModule.exports.ripgrepPath(),
      rgPath,
      'prefers the configured executable over bundled ripgrep',
    );
  } finally {
    os.homedir = homedir;
    fs.rmSync(home, { recursive: true, force: true });
  }
});

QUnit.test('config.ripgrepPath finds current universal binaries on every supported host', function(assert) {
  ['linux', 'darwin', 'win32'].forEach(function(platform) {
    ['x64', 'arm64'].forEach(function(arch) {
      ['node_modules', 'node_modules.asar.unpacked'].forEach(function(modules) {
        var expected = path.join(
          '/app',
          modules,
          '@vscode/ripgrep-universal/bin',
          platform + '-' + arch,
          platform === 'win32' ? 'rg.exe' : 'rg',
        );
        var configModule = { exports: {} };
        vm.runInNewContext(fs.readFileSync(require.resolve('../src/config.js'), 'utf8'), {
          module: configModule,
          process: { platform: platform, arch: arch },
          require: function(name) {
            if (name === 'fs') {
              return {
                existsSync: function(file) {
                  return file === expected;
                },
              };
            }
            if (name === 'vscode') {
              return {
                env: { appRoot: '/app' },
                workspace: {
                  getConfiguration: function() {
                    return { ripgrep: '' };
                  },
                },
              };
            }
            return requireConfig(name);
          },
        });
        assert.strictEqual(configModule.exports.ripgrepPath(), expected, platform + '-' + arch + ' / ' + modules);
      });
    });
  });
});

QUnit.test('built-in excludes distinguish all four configured modes', function(assert) {
  var fixture = require('./tree-boundary').fixture;
  for (
    var choice of [
      ['none', false, false],
      ['file excludes', true, false],
      ['search excludes', false, true],
      ['file and search excludes', true, true],
    ]
  ) {
    var config = fixture({ 'todo-tree.filtering.useBuiltInExcludes': choice[0] }).config;
    assert.strictEqual(config.shouldUseBuiltInFileExcludes(), choice[1], choice[0] + ': files');
    assert.strictEqual(config.shouldUseBuiltInSearchExcludes(), choice[2], choice[0] + ': search');
  }
});
