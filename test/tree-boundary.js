const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const requireProject = createRequire(path.join(root, 'package.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function fixture(overrides = {}) {
  const values = Object.fromEntries(
    manifest.contributes.configuration.flatMap(group =>
      Object.entries(group.properties).map(([key, definition]) => [key, structuredClone(definition.default)])
    ),
  );
  Object.assign(values, overrides);
  const state = new Map();
  const vscode = {
    EventEmitter: class {
      constructor() {
        this.event = () => ({ dispose() {} });
      }
      fire() {}
      dispose() {}
    },
    workspace: {
      getConfiguration(section) {
        const object = Object.fromEntries(
          Object.entries(values)
            .filter(([key]) => key.startsWith(section + '.'))
            .map(([key, value]) => [key.slice(section.length + 1), value]),
        );
        object.get = (key, fallback) => object[key] === undefined ? fallback : object[key];
        return object;
      },
    },
  };
  const context = {
    workspaceState: {
      get(key, fallback) {
        return state.has(key) ? state.get(key) : fallback;
      },
      update(key, value) {
        state.set(key, value);
      },
    },
  };
  const cache = new Map();
  function load(filename) {
    const absolute = path.join(root, 'out/src', filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), {
      module,
      exports: module.exports,
      process,
      console,
      require(name) {
        if (name === 'vscode') return vscode;
        if (name.startsWith('./')) return load(path.basename(name.endsWith('.js') ? name : name + '.js'));
        return requireProject(name);
      },
    }, { filename: absolute });
    return module.exports;
  }
  const config = load('config.js');
  const utils = load('utils.js');
  const attributes = load('attributes.js');
  config.init(context);
  utils.init(config);
  attributes.init(config);
  const { TreeNodeProvider } = load('tree.js');
  const provider = new TreeNodeProvider(context, () => {});
  const workspaceRoot = path.resolve('todo-tree-fixture-workspace');
  const uri = filename => ({ scheme: 'file', fsPath: path.join(workspaceRoot, filename) });
  provider.clear([{ name: 'fixture', uri: uri('') }]);
  const add = (filename, text, line = 1) => provider.add({ uri: uri(filename), match: text, column: 1, line });
  function todos(node) {
    const output = [];
    for (const child of provider.getChildren(node) || []) {
      if (child.isStatusNode) continue;
      if (child.type === 'todo') {
        output.push({ file: path.relative(workspaceRoot, child.fsPath), line: child.line + 1, label: child.label });
      } else output.push(...todos(child));
    }
    return output.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  }
  return { provider, config, utils, attributes, vscode, values, add, uri, todos, root, context, load };
}

module.exports = { fixture, root };
