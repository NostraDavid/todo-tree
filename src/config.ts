import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as attributes from './attributes.js';
import type { Highlight, RegexConfiguration, ScanMode } from './types';
import * as utils from './utils.js';

var context: Pick<vscode.ExtensionContext, 'workspaceState'>;

var tagGroupLookup: Record<string, string> = {};

export function init(c: Pick<vscode.ExtensionContext, 'workspaceState'>) {
  context = c;

  refreshTagGroupLookup();
}

export function shouldGroupByTag() {
  return context.workspaceState.get(
    'groupedByTag',
    vscode.workspace.getConfiguration('todo-tree.tree').get('groupedByTag', false),
  );
}

export function shouldGroupBySubTag() {
  return context.workspaceState.get(
    'groupedBySubTag',
    vscode.workspace.getConfiguration('todo-tree.tree').get('groupedBySubTag', false),
  );
}

export function shouldExpand() {
  return context.workspaceState.get(
    'expanded',
    vscode.workspace.getConfiguration('todo-tree.tree').get('expanded', false),
  );
}

export function shouldFlatten() {
  return context.workspaceState.get('flat', vscode.workspace.getConfiguration('todo-tree.tree').get('flat', false));
}

export function shouldShowTagsOnly() {
  return context.workspaceState.get(
    'tagsOnly',
    vscode.workspace.getConfiguration('todo-tree.tree').get('tagsOnly', false),
  );
}

export function shouldShowCounts() {
  return vscode.workspace.getConfiguration('todo-tree.tree').get('showCountsInTree', false);
}

export function shouldHideIconsWhenGroupedByTag() {
  return vscode.workspace.getConfiguration('todo-tree.tree').get('hideIconsWhenGroupedByTag', false);
}

export function showFilterCaseSensitive() {
  return vscode.workspace.getConfiguration('todo-tree.tree').get('filterCaseSensitive', false);
}

export function isRegexCaseSensitive() {
  return vscode.workspace.getConfiguration('todo-tree.regex').get('regexCaseSensitive', true);
}

export function showBadges() {
  return vscode.workspace.getConfiguration('todo-tree.tree').get('showBadges', false);
}

export function regex(): RegexConfiguration {
  return {
    tags: tags(),
    regex: vscode.workspace.getConfiguration('todo-tree.regex').get<string>('regex')!,
    caseSensitive: vscode.workspace.getConfiguration('todo-tree.regex').get<boolean>('regexCaseSensitive')!,
    multiLine: vscode.workspace.getConfiguration('todo-tree.regex').get('enableMultiLine'),
  };
}

export function subTagRegex(): string {
  return vscode.workspace.getConfiguration('todo-tree.regex').get<string>('subTagRegex')!;
}

export function ripgrepPath(): string | undefined {
  function exeName() {
    var isWin = process.platform.startsWith('win');
    return isWin ? 'rg.exe' : 'rg';
  }

  function exePathIsDefined(rgExePath: string | undefined) {
    return rgExePath && fs.existsSync(rgExePath) ? rgExePath : undefined;
  }

  var rgPath: string | undefined = '';

  rgPath = exePathIsDefined(utils.expandTilde(vscode.workspace.getConfiguration('todo-tree.ripgrep').ripgrep));
  if (rgPath) return rgPath;

  rgPath = exePathIsDefined(path.join(vscode.env.appRoot, 'node_modules/vscode-ripgrep/bin/', exeName()));
  if (rgPath) return rgPath;

  rgPath = exePathIsDefined(path.join(vscode.env.appRoot, 'node_modules.asar.unpacked/vscode-ripgrep/bin/', exeName()));
  if (rgPath) return rgPath;

  rgPath = exePathIsDefined(path.join(vscode.env.appRoot, 'node_modules/@vscode/ripgrep/bin/', exeName()));
  if (rgPath) return rgPath;

  rgPath = exePathIsDefined(
    path.join(vscode.env.appRoot, 'node_modules.asar.unpacked/@vscode/ripgrep/bin/', exeName()),
  );
  if (rgPath) return rgPath;

  for (var modules of ['node_modules', 'node_modules.asar.unpacked']) {
    rgPath = exePathIsDefined(
      path.join(
        vscode.env.appRoot,
        modules,
        '@vscode/ripgrep-universal/bin',
        process.platform + '-' + process.arch,
        exeName(),
      ),
    );
    if (rgPath) return rgPath;
  }

  return rgPath;
}

export function tags(): string[] {
  var tags = vscode.workspace.getConfiguration('todo-tree.general').tags;
  return tags.length > 0 ? tags : ['TODO'];
}

export function shouldSortTagsOnlyViewAlphabetically() {
  return vscode.workspace.getConfiguration('todo-tree.tree').sortTagsOnlyViewAlphabetically;
}

export function labelFormat(): string {
  return vscode.workspace.getConfiguration('todo-tree.tree').labelFormat;
}

export function tooltipFormat(): string {
  return vscode.workspace.getConfiguration('todo-tree.tree').tooltipFormat;
}

export function clickingStatusBarShouldRevealTree() {
  return vscode.workspace.getConfiguration('todo-tree.general').statusBarClickBehaviour === 'reveal';
}

export function clickingStatusBarShouldToggleHighlights() {
  return vscode.workspace.getConfiguration('todo-tree.general').statusBarClickBehaviour === 'toggle highlights';
}

export function isValidScheme(uri: Pick<vscode.Uri, 'scheme'> | undefined): boolean {
  var schemes = vscode.workspace.getConfiguration('todo-tree.general').schemes;
  return Boolean(uri && uri.scheme && schemes && schemes.length && schemes.indexOf(uri.scheme) !== -1);
}

export function shouldUseBuiltInFileExcludes() {
  var useBuiltInExcludes = vscode.workspace.getConfiguration('todo-tree.filtering').useBuiltInExcludes;
  return useBuiltInExcludes === 'file excludes' || useBuiltInExcludes === 'file and search excludes';
}

export function shouldUseBuiltInSearchExcludes() {
  var useBuiltInExcludes = vscode.workspace.getConfiguration('todo-tree.filtering').useBuiltInExcludes;
  return useBuiltInExcludes === 'search excludes' || useBuiltInExcludes === 'file and search excludes';
}

export function shouldIgnoreGitSubmodules() {
  return vscode.workspace.getConfiguration('todo-tree.filtering').ignoreGitSubmodules;
}

export function refreshTagGroupLookup() {
  var tagGroups = vscode.workspace.getConfiguration('todo-tree.general').tagGroups as Record<string, string[]>;
  tagGroupLookup = Object.keys(tagGroups).reduce<Record<string, string>>(
    (acc, propName) =>
      tagGroups[propName].reduce((a, num) => {
        a[num] = propName;
        return a;
      }, acc),
    {},
  );
}

export function tagGroup(tag: string): string | undefined {
  return tagGroupLookup[tag];
}

export function shouldCompactFolders() {
  return vscode.workspace.getConfiguration('explorer').compactFolders
    && vscode.workspace.getConfiguration('todo-tree.tree').disableCompactFolders !== true;
}

export function shouldHideFromTree(tag: string) {
  return attributes.getAttribute(tag, 'hideFromTree', false);
}

export function shouldHideFromStatusBar(tag: string) {
  return attributes.getAttribute(tag, 'hideFromStatusBar', false);
}

export function shouldHideFromActivityBar(tag: string) {
  return attributes.getAttribute(tag, 'hideFromActivityBar', false);
}

export function shouldSortTree() {
  return vscode.workspace.getConfiguration('todo-tree.tree').sort;
}

export function scanMode(): ScanMode {
  return vscode.workspace.getConfiguration('todo-tree.tree').scanMode;
}

export function shouldShowScanModeInTree() {
  return vscode.workspace.getConfiguration('todo-tree.tree').showCurrentScanMode;
}

export function shouldUseColourScheme() {
  return vscode.workspace.getConfiguration('todo-tree.highlights').useColourScheme;
}

export function foregroundColourScheme(): string[] {
  return vscode.workspace.getConfiguration('todo-tree.highlights').foregroundColourScheme;
}

export function backgroundColourScheme(): string[] {
  return vscode.workspace.getConfiguration('todo-tree.highlights').backgroundColourScheme;
}

export function defaultHighlight(): Highlight {
  return vscode.workspace.getConfiguration('todo-tree.highlights').defaultHighlight;
}

export function customHighlight(): Record<string, Highlight> {
  return vscode.workspace.getConfiguration('todo-tree.highlights').customHighlight;
}

export function subTagClickUrl(): string {
  return vscode.workspace.getConfiguration('todo-tree.tree').subTagClickUrl;
}

export function shouldShowIconsInsteadOfTagsInStatusBar() {
  return vscode.workspace.getConfiguration('todo-tree.general').showIconsInsteadOfTagsInStatusBar;
}

export function shouldShowActivityBarBadge() {
  return vscode.workspace.getConfiguration('todo-tree.general').showActivityBarBadge;
}
