var fs = require('fs');
var os = require('os');
var path = require('path');
var vm = require('vm');
var EventEmitter = require('events');
var requireRipgrep = require('module').createRequire(require.resolve('../src/ripgrep.js'));

QUnit.test('ripgrep.kill interrupts the current search', function(assert) {
  var child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  var receivedSignal;
  child.kill = function(signal) {
    receivedSignal = signal;
  };
  var ripgrepModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/ripgrep.js'), 'utf8'), {
    module: ripgrepModule,
    process: process,
    require: function(name) {
      return name === 'child_process'
        ? {
          exec: function() {
            return child;
          },
        }
        : requireRipgrep(name);
    },
  });

  var search = ripgrepModule.exports.search(os.tmpdir(), {
    rgPath: process.execPath,
    patternFilePath: path.join(__dirname, 'missing-pattern-file'),
    regex: 'TODO',
  });
  ripgrepModule.exports.kill();
  assert.strictEqual(receivedSignal, 'SIGINT', 'signals the process started by search');
  child.emit('close', 0);
  return search;
});
