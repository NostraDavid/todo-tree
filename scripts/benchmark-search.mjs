import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import searchResults from '../src/searchResults.js';
import closures from '../test/extension-closures.js';
import boundary from '../test/tree-boundary.js';

const fixture = boundary.fixture();
const measurements = [];
for (const spacing of [100, 1]) {
  const row = '// TODO task ' + 'x'.repeat(20) + '\n';
  const plain = 'const n = 0;'.padEnd(row.length - 1) + '\n';
  const text = Array.from({ length: 50000 }, (_, index) => index % spacing === 0 ? row : plain).join('');
  const uri = fixture.uri('large.js');
  const document = {
    uri,
    fileName: uri.fsPath,
    getText: () => text,
    positionAt: offset => ({ line: Math.floor(offset / row.length), character: offset % row.length }),
    lineAt: line => ({ text: text.slice(line * row.length, (line + 1) * row.length - 1) }),
  };
  const extension = closures.extensionClosures(['refreshFile'], {
    config: fixture.config,
    utils: fixture.utils,
    searchResults,
    isIncluded: () => true,
    provider: { reset() {}, remove() {} },
    addResultsToTree() {},
    vscode: fixture.vscode,
  });
  searchResults.clear();
  const start = performance.now();
  extension.refreshFile(document);
  const milliseconds = performance.now() - start;
  assert.equal(searchResults.count(), 50000 / spacing);
  measurements.push({ lines: 50000, comments: searchResults.count(), milliseconds });
}
searchResults.clear();
console.log(JSON.stringify(measurements, null, 2));
