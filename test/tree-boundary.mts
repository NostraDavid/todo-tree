import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import type { ExtensionContext } from 'vscode';
import type { TreeElement } from '../out/src/tree.js';
import {
  Disposable,
  EventEmitter,
  Position,
  Range,
  Selection,
  ThemeColor,
  ThemeIcon,
  TreeItem,
} from './boundary-types.mts';
import type { RuntimeModules, TestConfiguration, TestContext, TestSDK } from './boundary-types.mts';
const root = path.resolve(import.meta.dirname, '..');
const requireProject = createRequire(path.join(root, 'package.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  contributes: { configuration: { properties: Record<string, { default?: unknown }> }[] };
};

function fixture(overrides: Record<string, unknown> = {}) {
  const values = Object.fromEntries(
    manifest.contributes.configuration.flatMap(group =>
      Object.entries(group.properties).map(([key, definition]) => [key, structuredClone(definition.default)])
    ),
  );
  Object.assign(values, overrides);
  const state = new Map<string, unknown>();
  const vscode: TestSDK = {
    Uri: { file: fsPath => ({ scheme: 'file', authority: '', fsPath }) },
    TreeItem,
    ThemeColor,
    ThemeIcon,
    Position,
    Range,
    Selection,
    Disposable,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    EventEmitter,
    env: { appRoot: '' },
    window: {},
    commands: {
      registerCommand() {
        return { dispose() {} };
      },
    },
    workspace: {
      getConfiguration(section: string) {
        const object: Record<string, unknown> = Object.fromEntries(
          Object.entries(values)
            .filter(([key]) => key.startsWith(section + '.'))
            .map(([key, value]) => [key.slice(section.length + 1), value]),
        );
        const get = (key: string, fallback?: unknown) => object[key] === undefined ? fallback : object[key];
        return Object.assign(object, { get }) as TestConfiguration;
      },
    },
  };
  const context: TestContext = {
    subscriptions: [],
    workspaceState: {
      get<T>(key: string, fallback?: T) {
        return (state.has(key) ? state.get(key) : fallback) as T | undefined;
      },
      update(key: string, value: unknown) {
        state.set(key, value);
      },
    },
  };
  const cache = new Map<string, { exports: unknown }>();
  function load<K extends keyof RuntimeModules>(filename: K): RuntimeModules[K] {
    const absolute = path.join(root, 'out/src', filename);
    if (cache.has(absolute)) return cache.get(absolute)!.exports as RuntimeModules[K];
    const module = { exports: {} };
    cache.set(absolute, module);
    vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), {
      module,
      exports: module.exports,
      process,
      console,
      require(name: string) {
        if (name === 'vscode') return vscode;
        if (name.startsWith('./')) {
          return load(path.basename(name.endsWith('.js') ? name : name + '.js') as keyof RuntimeModules);
        }
        return requireProject(name);
      },
    }, { filename: absolute });
    return module.exports as RuntimeModules[K];
  }
  const config = load('config.js');
  const utils = load('utils.js');
  const attributes = load('attributes.js');
  config.init(context as unknown as ExtensionContext);
  utils.init(config);
  attributes.init(config);
  const { TreeNodeProvider } = load('tree.js');
  const provider = new TreeNodeProvider(context as unknown as ExtensionContext, () => {});
  const workspaceRoot = path.resolve('todo-tree-fixture-workspace');
  const uri = (filename: string) => ({ scheme: 'file', authority: '', fsPath: path.join(workspaceRoot, filename) });
  provider.clear([{ name: 'fixture', uri: uri('') }]);
  const add = (filename: string, text: string, line = 1) =>
    provider.add({ uri: uri(filename), match: text, column: 1, line });
  function todos(node?: TreeElement) {
    const output: { file: string; line: number; label: string }[] = [];
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

export { fixture, root };
