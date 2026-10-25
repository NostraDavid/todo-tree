import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root } from './tree-boundary.mts';
// Execute actual closure bodies while stubbing only their editor boundary.
function extensionClosures(names: readonly string[], bindings: Record<string, unknown>) {
  const source = fs.readFileSync(path.join(root, 'out/src/extension.js'), 'utf8');
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
    vm.runInContext(match[0], sandbox, { filename: path.join(root, 'out/src/extension.js') });
  }
  return sandbox;
}

function registeredCommand(command: string, bindings: Record<string, unknown>) {
  const source = fs.readFileSync(path.join(root, 'out/src/extension.js'), 'utf8');
  const match = source.match(
    new RegExp(
      "^( *)context\\.subscriptions\\.push\\(vscode\\.commands\\.registerCommand\\('" + command.replaceAll('.', '\\.')
        + "',[\\s\\S]*?^\\1\\}\\)\\);",
      'm',
    ),
  );
  if (!match) throw new Error('Cannot locate actual filter registration');
  const sandbox = vm.createContext({ ...bindings, console });
  vm.runInContext(match[0], sandbox, { filename: path.join(root, 'out/src/extension.js') });
  return sandbox;
}

function restoreFilter(bindings: Record<string, unknown>) {
  const source = fs.readFileSync(path.join(root, 'out/src/extension.js'), 'utf8');
  const match = source.match(
    / +currentFilter = context.workspaceState.get\('currentFilter'\);[\s\S]*?(?= +config.init\(context\);)/,
  );
  if (!match) throw new Error('Cannot locate saved filter initialization');
  const sandbox = vm.createContext({ ...bindings, console });
  vm.runInContext(match[0], sandbox);
  return sandbox;
}

export { extensionClosures, registeredCommand, restoreFilter };
