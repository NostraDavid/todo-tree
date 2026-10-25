var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

QUnit.test('release notes match the package version and exclude older entries', function(assert) {
  var root = path.join(__dirname, '..');
  var manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  var notes = execFileSync(process.execPath, [path.join(root, 'scripts/release-notes.mjs'), manifest.version], {
    encoding: 'utf8',
  });
  assert.ok(notes.trim(), 'includes a nonempty release description');
  assert.notOk(notes.includes('## [Unreleased]'));
  assert.notOk(notes.includes('[Unreleased]:'), 'excludes changelog navigation links');
  assert.notOk(/^## /m.test(notes), 'excludes other release headings');
  assert.throws(function() {
    execFileSync(process.execPath, [path.join(root, 'scripts/release-notes.mjs'), '999.0.0'], { stdio: 'pipe' });
  }, 'rejects a tag that does not match the package version');
});
