import * as childProcess from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import QUnit from 'qunit';
import * as utils from '../out/src/utils.js';
import { getTestConfig } from './stubs.mts';
QUnit.test('loading highlights leaves native RegExp behavior intact', function(assert) {
  var source = fs.readFileSync(path.join(import.meta.dirname, '../out/src/highlights.js'), 'utf8');
  var script = 'const vm = require("node:vm"); const before = RegExp.prototype.exec;const loaded={exports:{}};'
    + 'vm.runInNewContext(' + JSON.stringify(source)
    + ', {module:loaded,exports:loaded.exports,require:(name)=>name==="regexp-match-indices"?require(name):{}});'
    + 'console.log(before === RegExp.prototype.exec);';
  var result = childProcess.spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(import.meta.dirname, '..'),
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(result.stdout.trim(), 'true', 'does not patch the shared prototype');
});

QUnit.test('editor search provides native capture-group ranges', function(assert) {
  var config = getTestConfig();
  config.regexSource = '(TODO): ([a-z]+)';
  utils.init(config);
  var regex = utils.getRegexForEditorSearch(true);
  var match = regex.exec('before TODO: work after')!;
  assert.deepEqual(match.indices && match.indices[1], [7, 11]);
  assert.deepEqual(match.indices && match.indices[2], [13, 17]);
});
