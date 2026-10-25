const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root } = require('./tree-boundary');

// Execute actual closure bodies while stubbing only their editor boundary.
function extensionClosures(names, bindings) {
  const source = fs.readFileSync(path.join(root, 'src/extension.js'), 'utf8');
  const sandbox = vm.createContext({ ...bindings, console });
  const globals = (source.match(/^var \w+[^\n]*;$/gm) || []).filter(line => !line.includes('require('));
  vm.runInContext(globals.join('\n'), sandbox);
  Object.assign(sandbox, bindings);
  for (const name of names) {
    const indent = source.match(new RegExp('^( *)function ' + name + '\\(', 'm'))?.[1];
    if (indent === undefined) throw new Error('Cannot locate actual function ' + name);
    const match = source.match(
      new RegExp('^' + indent + 'function ' + name + '\\([^\\n]*\\) \\{\\n[\\s\\S]*?^' + indent + '\\}', 'm'),
    );
    if (!match) throw new Error('Cannot locate actual extension function ' + name);
    vm.runInContext(match[0], sandbox, { filename: path.join(root, 'src/extension.js') });
  }
  return sandbox;
}

function filterCommand(bindings) {
  const source = fs.readFileSync(path.join(root, 'src/extension.js'), 'utf8');
  const match = source.match(
    /^    context\.subscriptions\.push\(vscode\.commands\.registerCommand\('todo-tree\.filter',[\s\S]*?^    \}\)\);/m,
  );
  if (!match) throw new Error('Cannot locate actual filter registration');
  const sandbox = vm.createContext({ ...bindings, console });
  vm.runInContext(match[0], sandbox, { filename: path.join(root, 'src/extension.js') });
  return sandbox;
}

function restoreFilter(bindings) {
  const source = fs.readFileSync(path.join(root, 'src/extension.js'), 'utf8');
  const match = source.match(
    /  currentFilter = context.workspaceState.get\('currentFilter'\);[\s\S]*?(?=  config.init\(context\);)/,
  );
  if (!match) throw new Error('Cannot locate saved filter initialization');
  const sandbox = vm.createContext({ ...bindings, console });
  vm.runInContext(match[0], sandbox);
  return sandbox;
}

module.exports = { extensionClosures, filterCommand, restoreFilter };
