import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import QUnit from 'qunit';
QUnit.test('release notes match the package version and exclude older entries', function(assert) {
  var root = path.join(import.meta.dirname, '..');
  var manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  var notes = execFileSync(process.execPath, [path.join(root, 'scripts/release-notes.mts'), manifest.version], {
    encoding: 'utf8',
  });
  assert.ok(notes.trim(), 'includes a nonempty release description');
  assert.notOk(notes.includes('## [Unreleased]'));
  assert.notOk(notes.includes('[Unreleased]:'), 'excludes changelog navigation links');
  assert.notOk(/^## /m.test(notes), 'excludes other release headings');
  assert.throws(function() {
    execFileSync(process.execPath, [path.join(root, 'scripts/release-notes.mts'), '999.0.0'], { stdio: 'pipe' });
  }, 'rejects a tag that does not match the package version');
});
