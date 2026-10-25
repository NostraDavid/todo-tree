import type { DecorationRenderOptions } from 'vscode';
import type { FileUri } from '../out/src/types.js';

export interface TestDisposable {
  dispose(): void;
}
export type TestHandler = (...args: unknown[]) => unknown;
export interface TestPosition {
  line: number;
  character: number;
}
export class Position {
  line: number;
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}
export class Range {
  start: TestPosition;
  end: TestPosition;
  constructor(start: TestPosition, end: TestPosition) {
    this.start = start;
    this.end = end;
  }
}
export class Selection extends Range {
  anchor: TestPosition;
  active: TestPosition;
  constructor(anchor: TestPosition, active: TestPosition) {
    super(anchor, active);
    this.anchor = anchor;
    this.active = active;
  }
}
export class ThemeColor {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}
export class ThemeIcon {
  static Folder = { id: 'folder' };
  static File = { id: 'file' };
  id: string;
  color: unknown;
  constructor(id: string, color?: unknown) {
    this.id = id;
    this.color = color;
  }
}
export class TreeItem {
  label: string;
  constructor(label: string) {
    this.label = label;
  }
}
export class Disposable {
  dispose: () => void;
  constructor(dispose: () => void) {
    this.dispose = dispose;
  }
}
export class EventEmitter {
  event = () => ({ dispose() {} });
  fire(_value?: unknown) {}
  dispose() {}
}
export interface TestStyle extends TestDisposable {
  options?: DecorationRenderOptions;
  disposed?: boolean;
}
export interface TestWindow {
  activeTextEditor?: unknown;
  visibleTextEditors?: unknown[];
  createTextEditorDecorationType?: (options: DecorationRenderOptions) => TestStyle;
}
export interface TestConfiguration extends Record<string, unknown> {
  get(key: string, fallback?: unknown): unknown;
}
export interface TestSDK {
  Uri: { file(fsPath: string): FileUri };
  TreeItem: typeof TreeItem;
  ThemeColor: new(id: string) => { id: string };
  ThemeIcon: typeof ThemeIcon;
  Position: typeof Position;
  Selection: typeof Selection;
  Range: typeof Range;
  Disposable: typeof Disposable;
  TreeItemCollapsibleState: { None: number; Collapsed: number; Expanded: number };
  EventEmitter: typeof EventEmitter;
  env: { appRoot: string };
  window: TestWindow;
  commands: { registerCommand(name: string, callback: TestHandler): TestDisposable };
  workspace: { getConfiguration(section: string): TestConfiguration; workspaceFolders?: { uri: FileUri }[] };
}
export interface TestContext {
  subscriptions: TestDisposable[];
  workspaceState: {
    get<T = unknown>(key: string, fallback?: T): T | undefined;
    update(key: string, value: unknown): void;
  };
  storageUri?: { fsPath: string };
  globalStorageUri?: { fsPath: string };
  asAbsolutePath?: (relative: string) => string;
}
export type RuntimeModules = {
  'config.js': typeof import('../out/src/config.js');
  'utils.js': typeof import('../out/src/utils.js');
  'attributes.js': typeof import('../out/src/attributes.js');
  'tree.js': typeof import('../out/src/tree.js');
  'icons.js': typeof import('../out/src/icons.js');
  'highlights.js': typeof import('../out/src/highlights.js');
  'colours.js': typeof import('../out/src/colours.js');
  'colourNames.js': typeof import('../out/src/colourNames.js');
  'themeColourNames.js': typeof import('../out/src/themeColourNames.js');
  'codiconNames.js': typeof import('../out/src/codiconNames.js');
  'productIconNames.js': typeof import('../out/src/productIconNames.js');
};
