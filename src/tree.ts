import type { FileUri, LabelData, SearchMatch } from './types';

export interface WorkspaceRoot {
  name: string;
  uri: FileUri;
}
interface NodeBase extends LabelData {
  id: number;
  label: string;
  fsPath: string;
  visible: boolean;
  hidden?: boolean;
  tag?: string;
  subTag?: string;
  isFolder?: boolean;
  isWorkspaceNode?: boolean;
  isRootTagNode?: boolean;
  isExtraLine?: boolean;
  pathElement?: string;
  pathLabel?: string;
  parent?: PathNode;
  expanded?: boolean;
  showCount?: boolean;
  notExported?: false;
  isStatusNode?: false;
}
export interface PathNode extends NodeBase {
  type: 'path';
  nodes: TreeNode[];
  extraLines?: undefined;
}
export interface TodoNode extends NodeBase {
  type: 'todo';
  nodes?: undefined;
  extraLines: TodoNode[];
  uri: FileUri;
  tag: string;
  actualTag: string;
  line: number;
  column: number;
  endColumn: number;
  before: string;
  after: string;
  isFolder?: false;
  isWorkspaceNode?: false;
  isRootTagNode?: false;
}
export type TreeNode = PathNode | TodoNode;
export interface StatusNode {
  isStatusNode: true;
  notExported: true;
  label: string;
  icon: string;
  tooltip?: string;
  empty?: boolean;
  type?: undefined;
  id?: undefined;
  fsPath?: undefined;
  nodes?: undefined;
  extraLines?: undefined;
  tag?: undefined;
  subTag?: undefined;
  actualTag?: undefined;
  line?: undefined;
  column?: undefined;
  pathLabel?: undefined;
  parent?: undefined;
  isRootTagNode?: false;
  isWorkspaceNode?: false;
  isFolder?: false;
}
export type TreeElement = TreeNode | StatusNode;
export interface ExportTree {
  [label: string]: string | ExportTree;
}
type TodoTreeItem = vscode.TreeItem & { fsPath?: string; node?: TreeNode };
type Comparator = (a: TreeNode, b: TreeNode) => number;

function tagIndex(tags: string[], tag: string | undefined): number {
  return tag === undefined ? -1 : tags.indexOf(tag);
}

/* jshint esversion:6 */

import * as path from 'path';
import * as vscode from 'vscode';

import * as config from './config.js';
import * as icons from './icons.js';
import * as utils from './utils.js';

var workspaceFolders: readonly WorkspaceRoot[] | undefined;
var nodes: TreeNode[] = [];
var currentFilter: string | undefined;

const PATH = 'path';
const TODO = 'todo';

var buildCounter = 1;
var nodeCounter = 1;

var expandedNodes: Record<string, boolean> = {};

var treeHasSubTags = false;

var isVisible = function(e: TreeNode) {
  return e.visible === true && e.hidden !== true;
};

var isTodoNode = function(e: TreeElement): e is TodoNode {
  return e.type === TODO;
};

var isPathNode = function(e: TreeElement): e is PathNode {
  return e.type === PATH;
};

var findTagNode = function(this: string, node: TreeNode): node is PathNode {
  if (config.isRegexCaseSensitive()) {
    return isPathNode(node) && node.tag === this.toString();
  }
  return Boolean(isPathNode(node) && node.tag && node.tag.toLowerCase() === this.toString().toLowerCase());
};

var findSubTagNode = function(this: string, node: TreeNode): node is PathNode {
  if (config.isRegexCaseSensitive()) {
    return node.type === PATH && node.subTag === this.toString();
  }
  return Boolean(node.type === PATH && node.subTag && node.subTag.toLowerCase() === this.toString().toLowerCase());
};

var findExactPath = function(this: string, node: TreeNode): node is PathNode {
  return isPathNode(node) && node.fsPath === this.toString();
};

var findPathNode = function(this: string, node: TreeNode): node is PathNode {
  return isPathNode(node) && node.pathElement === this.toString();
};

var findTodoNode = function(this: TodoNode, node: TreeNode): node is TodoNode {
  return isTodoNode(node) && node.label === this.label.toString() && node.fsPath === this.fsPath
    && node.line === this.line;
};

var sortFoldersFirst = function(a: TreeNode, b: TreeNode, same: Comparator) {
  if (a.isFolder === b.isFolder) {
    return same(a, b);
  } else {
    return b.isFolder ? 1 : -1;
  }
};

var sortByLineAndColumn = function(a: TreeNode, b: TreeNode) {
  return Number(a.line) > Number(b.line)
    ? 1
    : Number(b.line) > Number(a.line)
    ? -1
    : Number(a.column) > Number(b.column)
    ? 1
    : -1;
};

var sortByFilenameAndLine = function(a: TreeNode, b: TreeNode) {
  return sortFoldersFirst(a, b, function(a, b) {
    if (a.isRootTagNode === true && b.isRootTagNode === true) {
      var tags = config.tags();
      return tagIndex(tags, a.tag) > tagIndex(tags, b.tag)
        ? 1
        : tagIndex(tags, b.tag) > tagIndex(tags, a.tag)
        ? -1
        : sortByLineAndColumn(a, b);
    }
    return a.fsPath > b.fsPath ? 1 : b.fsPath > a.fsPath ? -1 : sortByLineAndColumn(a, b);
  });
};

var sortTagsOnlyViewByLabel = function(a: TreeNode, b: TreeNode) {
  return sortFoldersFirst(a, b, function(a, b) {
    return a.label > b.label ? 1 : b.label > a.label ? -1 : sortByLineAndColumn(a, b);
  });
};

var sortTagsOnlyViewByTagOrder = function(a: TreeNode, b: TreeNode) {
  return sortFoldersFirst(a, b, function(a, b) {
    var tags = config.tags();
    var indexA = tagIndex(tags, a.tag);
    var indexB = tagIndex(tags, b.tag);
    return indexA > indexB ? 1 : (indexB > indexA ? -1 : sortByFilenameAndLine(a, b));
  });
};

function createWorkspaceRootNode(folder: WorkspaceRoot): PathNode {
  var id = (buildCounter * 1000000) + nodeCounter++;
  var node: PathNode = {
    isWorkspaceNode: true,
    type: PATH,
    label: folder.uri.scheme === 'file' ? folder.name : folder.uri.authority,
    nodes: [],
    fsPath: folder.uri.scheme === 'file' ? folder.uri.fsPath : (folder.uri.authority + folder.uri.fsPath),
    id: id,
    visible: true,
    isFolder: true,
  };
  return node;
}

function createPathNode(folder: string, pathElements: string[], isFolder?: boolean, subTag?: string): PathNode {
  var id = (buildCounter * 1000000) + nodeCounter++;
  var fsPath = pathElements.length > 0 ? path.join(folder, pathElements.join(path.sep)) : folder;

  return {
    type: PATH,
    fsPath: fsPath,
    pathElement: pathElements[pathElements.length - 1],
    label: pathElements[pathElements.length - 1],
    nodes: [],
    id: id,
    visible: true,
    isFolder: isFolder,
    subTag: subTag,
  };
}

function createFlatNode(fsPath: string, rootNode?: PathNode): PathNode {
  var id = (buildCounter * 1000000) + nodeCounter++;
  var pathLabel = path.dirname(rootNode === undefined ? fsPath : path.relative(rootNode.fsPath, fsPath));

  return {
    type: PATH,
    fsPath: fsPath,
    label: path.basename(fsPath),
    pathLabel: pathLabel === '.' ? '' : '(' + pathLabel + ')',
    nodes: [],
    id: id,
    visible: true,
  };
}

function createTagNode(fsPath: string, tag: string): PathNode {
  var id = (buildCounter * 1000000) + nodeCounter++;

  return {
    isRootTagNode: true,
    type: PATH,
    label: tag,
    fsPath: fsPath,
    nodes: [],
    id: id,
    tag: tag,
    visible: true,
  };
}

function createSubTagNode(subTag: string): PathNode {
  var id = (buildCounter * 1000000) + nodeCounter++;

  return {
    isRootTagNode: true,
    type: PATH,
    label: subTag,
    fsPath: subTag,
    nodes: [],
    id: id,
    subTag: subTag,
    visible: true,
    isFolder: true,
  };
}

function createTodoNode(result: SearchMatch): TodoNode {
  var id = (buildCounter * 1000000) + nodeCounter++;
  var joined = result.match.substr(result.column - 1);
  if (result.extraLines) {
    result.extraLines.map(function(extraLine) {
      joined += '\n' + extraLine.match;
    });
  }
  var text = utils.removeBlockComments(joined, result.uri.fsPath);
  var extracted = utils.extractTag(text, result.column);
  var label = (extracted.withoutTag && extracted.withoutTag.length > 0) ? extracted.withoutTag : 'line ' + result.line;

  if (config.shouldGroupByTag() !== true) {
    if (result.extraLines) {
      label = extracted.tag;
    } else {
      label = extracted.tag + ' ' + label;
    }
  }

  var tagGroup = config.tagGroup(extracted.tag);

  var todo: TodoNode = {
    type: TODO,
    fsPath: result.uri.fsPath,
    uri: result.uri,
    label: label,
    tag: tagGroup ? tagGroup : extracted.tag,
    subTag: extracted.subTag,
    actualTag: extracted.tag,
    line: result.line - 1,
    column: result.column,
    endColumn: result.column + result.match.length,
    after: extracted.after ? extracted.after.trim() : '',
    before: extracted.before ? extracted.before.trim() : '',
    id: id,
    visible: true,
    extraLines: [],
  };

  if (result.extraLines) {
    var commentsRemoved = text.split('\n');
    commentsRemoved.shift();
    result.extraLines.map(function(extraLine, index) {
      extraLine.match = commentsRemoved[index];
      var childResult = Object.assign(extraLine, { uri: result.uri });
      if (extraLine.match) {
        var extraLineMatch = extraLine.match.trim();
        if (extraLineMatch && extraLineMatch != todo.tag) {
          var extraLineNode = createTodoNode(childResult);
          extraLineNode.isExtraLine = true;
          todo.extraLines.push(extraLineNode);
        }
      }
    });
  }

  return todo;
}

export function locateWorkspaceNode(filename: string): PathNode | undefined {
  var result: PathNode | undefined;
  nodes.map(function(node) {
    var workspacePath = node.fsPath + (node.fsPath.indexOf(path.sep) === node.fsPath.length - 1 ? '' : path.sep);
    if (node.isWorkspaceNode && (filename === node.fsPath || filename.indexOf(workspacePath) === 0)) {
      result = node;
    }
  });
  return result;
}

function locateFlatChildNode(
  rootNode: PathNode | undefined,
  result: SearchMatch,
  tag: string,
  subTag?: string,
): PathNode {
  var parentNodes = rootNode === undefined ? nodes : rootNode.nodes;
  var parentNode: PathNode | undefined;

  if (config.shouldGroupByTag() && tag) {
    var tagPath = tag;
    parentNode = parentNodes.find(findTagNode, tagPath);
    if (parentNode === undefined) {
      parentNode = createPathNode(
        rootNode ? rootNode.fsPath : JSON.stringify(result),
        [tagPath],
        subTag ? true : undefined,
      );
      parentNode.tag = tagPath;
      parentNode.isRootTagNode = true;
      parentNodes.push(parentNode);
    }
    parentNodes = parentNode.nodes;
  } else if (config.shouldGroupBySubTag() && subTag) {
    var subTagPath = subTag;
    parentNode = parentNodes.find(findSubTagNode, subTagPath);
    if (parentNode === undefined) {
      parentNode = createPathNode(
        rootNode ? rootNode.fsPath : JSON.stringify(result),
        [subTagPath],
        subTag ? true : undefined,
      );
      parentNode.subTag = subTagPath;
      parentNodes.push(parentNode);
    }
    parentNodes = parentNode.nodes;
  }

  var fullPath = result.uri.scheme === 'file' ? result.uri.fsPath : path.join(result.uri.authority, result.uri.fsPath);
  var nodePath = subTag ? path.join(fullPath, subTag) : fullPath;
  var childNode = parentNodes.find(findExactPath, nodePath);
  if (childNode === undefined) {
    childNode = createFlatNode(nodePath, rootNode);
    parentNodes.push(childNode);
  }

  return childNode;
}

function locateTreeChildNode(
  rootNode: PathNode,
  pathElements: string[],
  tag: string,
  subTag?: string,
): PathNode | undefined {
  var childNode: PathNode | undefined;

  var parentNodes = rootNode.nodes;
  var parentNode: PathNode | undefined;

  if (config.shouldGroupByTag() && tag) {
    parentNode = parentNodes.find(findTagNode, tag);
    if (parentNode === undefined) {
      var tagPathList = [];
      if (subTag) {
        tagPathList.push(subTag);
      }
      tagPathList.push(tag);
      parentNode = createPathNode(rootNode.fsPath, tagPathList, subTag ? true : undefined);
      parentNode.isRootTagNode = true;
      parentNode.tag = tag;
      parentNodes.push(parentNode);
    }
    parentNodes = parentNode.nodes;
  } else if (config.shouldGroupBySubTag() && subTag) {
    parentNode = parentNodes.find(findSubTagNode, subTag);
    if (parentNode === undefined) {
      var subTagPathList = [];
      subTagPathList.push(subTag);
      parentNode = createPathNode(rootNode.fsPath, subTagPathList, subTag ? true : undefined);
      parentNode.subTag = subTag;
      parentNodes.push(parentNode);
    }
    parentNodes = parentNode.nodes;
  }

  pathElements.map(function(element, level) {
    childNode = parentNodes.find(findPathNode, element);
    if (childNode === undefined) {
      childNode = createPathNode(
        rootNode.fsPath,
        pathElements.slice(0, level + 1),
        level < pathElements.length - 1,
        subTag,
      );
      parentNodes.push(childNode);
      parentNodes = childNode.nodes;
    } else {
      parentNodes = childNode.nodes;
    }
  });

  return childNode;
}

function countTags(
  child: TreeNode,
  tagCounts: Record<string, number>,
  forStatusBar: boolean,
  fileFilter?: string,
): void {
  function countTag(node: TreeNode) {
    if (isTodoNode(node)) {
      var tag = node.tag ? node.tag : 'TODO';
      if (isVisible(node) && (!fileFilter || fileFilter === node.fsPath)) {
        var hide = false;

        if (forStatusBar && config.shouldHideFromStatusBar(tag)) {
          hide = true;
        }

        if (!forStatusBar && config.shouldHideFromActivityBar(tag)) {
          hide = true;
        }

        if (!hide) {
          tagCounts[tag] = tagCounts[tag] === undefined ? 1 : tagCounts[tag] + 1;
        }
      }
    }
  }

  countTag(child);

  if (child.nodes !== undefined) {
    countChildTags(child.nodes.filter(isPathNode), tagCounts, forStatusBar, fileFilter);
    child.nodes.filter(isTodoNode).map(function(node) {
      countTag(node);
    });
  }
}

function countChildTags(
  children: TreeNode[],
  tagCounts: Record<string, number>,
  forStatusBar: boolean,
  fileFilter?: string,
): Record<string, number> {
  children.map(function(child) {
    return countTags(child, tagCounts, forStatusBar, fileFilter);
  });
  return tagCounts;
}

function addWorkspaceFolders() {
  if (workspaceFolders && config.shouldShowTagsOnly() === false) {
    workspaceFolders.map(function(folder) {
      nodes.push(createWorkspaceRootNode(folder));
    });
  }
}

export class TreeNodeProvider implements vscode.TreeDataProvider<TreeElement> {
  declare readonly _context: vscode.ExtensionContext;
  declare readonly _debug: (text: string) => void;
  declare readonly onTreeRefreshed: (() => void) | undefined;
  declare readonly _onDidChangeTreeData: vscode.EventEmitter<TreeElement | undefined>;
  declare readonly onDidChangeTreeData: vscode.Event<TreeElement | undefined>;
  declare nodesToGet: number;

  constructor(_context: vscode.ExtensionContext, debug: (text: string) => void, onTreeRefreshed?: () => void) {
    this._context = _context;
    this._debug = debug;
    this.onTreeRefreshed = onTreeRefreshed;

    this._onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    this.nodesToGet = 0;

    buildCounter = _context.workspaceState.get('buildCounter', 1);
    expandedNodes = _context.workspaceState.get('expandedNodes', {});
  }

  dispose() {
    this._onDidChangeTreeData.dispose();
  }

  getChildren(node?: TreeElement): TreeElement[] {
    if (node === undefined) {
      var result: TreeElement[] = [];

      var availableNodes = nodes.filter(function(node) {
        return node.nodes === undefined || (node.nodes.length > 0);
      });
      var rootNodes = availableNodes.filter(isVisible);
      if (rootNodes.length > 0) {
        result = rootNodes;

        this.nodesToGet = result.length;
      }

      var filterStatusNode: StatusNode = { label: '', notExported: true, isStatusNode: true, icon: 'issues' };
      var includeGlobs = utils.toGlobArray(this._context.workspaceState.get('includeGlobs'));
      var excludeGlobs = utils.toGlobArray(this._context.workspaceState.get('excludeGlobs'));
      var totalFilters = includeGlobs.length + excludeGlobs.length;
      var tooltip = '';

      if (currentFilter) {
        tooltip += 'Tree Filter: "' + currentFilter + '"\n';
        totalFilters++;
      }

      if (includeGlobs.length + excludeGlobs.length > 0) {
        includeGlobs.map(function(glob) {
          tooltip += 'Include: ' + glob + '\n';
        });
        excludeGlobs.map(function(glob) {
          tooltip += 'Exclude: ' + glob + '\n';
        });
      }

      if (totalFilters > 0) {
        filterStatusNode.label = totalFilters + ' filter' + (totalFilters === 1 ? '' : 's') + ' active';
        filterStatusNode.tooltip = tooltip + '\nRight click for filter options';
        filterStatusNode.icon = 'filter';
      }

      if (result.length === 0) {
        if (filterStatusNode.label !== '') {
          filterStatusNode.label += ', ';
        }
        filterStatusNode.label += 'Nothing found';
        filterStatusNode.icon = 'issues';

        filterStatusNode.empty = availableNodes.length === 0;
      }

      if (filterStatusNode.label !== '') {
        result.unshift(filterStatusNode);
      }

      if (config.shouldShowScanModeInTree()) {
        var scanMode: string = config.scanMode();
        if (scanMode === 'workspace') {
          scanMode += ' and open files';
        }
        var scanModeNode: StatusNode = {
          label: 'Scan mode: ' + scanMode,
          notExported: true,
          isStatusNode: true,
          icon: 'search',
        };
        result.unshift(scanModeNode);
      }

      var compacted: TreeElement[] = [];
      result.map(function(child) {
        if (child.isRootTagNode === true && child.nodes.length === 1) {
          compacted.push(child.nodes[0]);
        } else {
          compacted.push(child);
        }
      });

      return compacted;
    } else if (isPathNode(node)) {
      if (config.shouldCompactFolders() && node.tag === undefined) {
        while (
          node.nodes && node.nodes.length === 1 && node.nodes[0].nodes && node.nodes[0].nodes.length > 0
          && node.nodes[0].isFolder
        ) {
          node = node.nodes[0];
        }
      }

      if (node.nodes && node.nodes.length > 0) {
        return node.nodes.filter(isVisible);
      }
    } else if (isTodoNode(node)) {
      if (node.extraLines && node.extraLines.length > 0) {
        return node.extraLines.filter(isVisible);
      }
    }
    return [];
  }

  getParent(node: TreeElement): PathNode | undefined {
    return node.parent;
  }

  getTreeItem(node: TreeElement): TodoTreeItem {
    var treeItem: TodoTreeItem;
    try {
      treeItem = new vscode.TreeItem(node.label + (node.pathLabel ? (' ' + node.pathLabel) : ''));
    } catch (e) {
      console.log('Failed to create tree item: ' + e);
      throw e;
    }

    treeItem.id = node.id === undefined ? undefined : String(node.id);
    treeItem.fsPath = node.fsPath;

    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;

    if (node.fsPath) {
      treeItem.node = node;
      if (config.showBadges() && !node.tag && !node.subTag) {
        treeItem.resourceUri = vscode.Uri.file(node.fsPath);
      }

      if (isTodoNode(treeItem.node)) {
        treeItem.tooltip = config.tooltipFormat();
        treeItem.tooltip = utils.formatLabel(config.tooltipFormat(), node);
      } else {
        treeItem.tooltip = treeItem.fsPath;
      }

      if (isPathNode(node)) {
        if (config.shouldCompactFolders() && node.tag === undefined) {
          var onlyChild = node.nodes.filter(isPathNode).length === 1 ? node.nodes.find(isPathNode) : undefined;
          var onlyChildParent = node;
          while (
            onlyChild && onlyChild.nodes.filter(isPathNode).length > 0
            && onlyChildParent.nodes.filter(isPathNode).length === 1
          ) {
            treeItem.label += '/' + onlyChild.label;
            onlyChildParent = onlyChild;
            onlyChild = onlyChild.nodes.find(isPathNode);
          }
        }

        if (expandedNodes[node.fsPath] !== undefined) {
          treeItem.collapsibleState = (expandedNodes[node.fsPath] === true)
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        } else {
          treeItem.collapsibleState = config.shouldExpand()
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        }

        if (treeItem.collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
          this.nodesToGet += node.nodes.filter(isVisible).length;
        }

        if (node.tag) {
          treeItem.iconPath = icons.getIcon(this._context, node.tag ? node.tag : node.label, this._debug);
        } else if (node.isWorkspaceNode) {
          treeItem.iconPath = new vscode.ThemeIcon('window');
        } else if (node.isFolder) {
          treeItem.iconPath = vscode.ThemeIcon.Folder;
        } else {
          treeItem.iconPath = vscode.ThemeIcon.File;
        }

        if (node.subTag !== undefined) {
          var url = config.subTagClickUrl();

          if (url.trim() !== '') {
            url = utils.formatLabel(url, node);
            treeItem.command = {
              command: 'todo-tree.openUrl',
              title: node.label,
              arguments: [
                url,
              ],
            };
            treeItem.tooltip = 'Click to open ' + url;
          }
        }
      } else if (isTodoNode(node)) {
        if (node.extraLines && node.extraLines.length > 0) {
          treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        }

        if (
          config.shouldHideIconsWhenGroupedByTag() !== true
          || (config.shouldGroupByTag() !== true && config.shouldGroupBySubTag() !== true)
        ) {
          if (node.isExtraLine !== true) {
            treeItem.iconPath = icons.getIcon(this._context, node.tag ? node.tag : node.label, this._debug);
          } else {
            treeItem.iconPath = 'no-icon';
          }
        }

        var format = config.labelFormat();
        if (format !== '' && (node.extraLines === undefined || node.extraLines.length === 0)) {
          treeItem.label = utils.formatLabel(format, node) + (node.pathLabel ? (' ' + node.pathLabel) : '');
        }

        var revealBehaviour = vscode.workspace.getConfiguration('todo-tree.general').get('revealBehaviour');

        var todoSelection;
        if (revealBehaviour === 'end of todo') {
          var todoEnd = new vscode.Position(node.line, node.endColumn - 1);
          todoSelection = new vscode.Selection(todoEnd, todoEnd);
        } else if (revealBehaviour === 'start of line') {
          var lineStart = new vscode.Position(node.line, 0);
          todoSelection = new vscode.Selection(lineStart, lineStart);
        } else if (revealBehaviour === 'start of todo') {
          var todoStart = new vscode.Position(node.line, node.column - 1);
          todoSelection = new vscode.Selection(todoStart, todoStart);
        }

        treeItem.command = {
          command: 'todo-tree.revealInFile',
          title: node.label,
          arguments: [
            node.uri ? node.uri : vscode.Uri.file(node.fsPath),
            { selection: todoSelection },
          ],
        };
      }
    } else if (node.isStatusNode) {
      treeItem.description = node.label;
      treeItem.label = '';
      treeItem.tooltip = node.tooltip;
      treeItem.iconPath = new vscode.ThemeIcon(node.icon);
    }

    if (config.shouldShowCounts() && isPathNode(node)) {
      var tagCounts: Record<string, number> = {};
      countTags(node, tagCounts, false);
      var total = Object.values(tagCounts).reduce(function(a, b) {
        return a + b;
      }, 0);
      treeItem.description = total.toString();
    }

    if (node.isFolder === true) {
      treeItem.contextValue = 'folder';
    } else if (
      !node.isRootTagNode && !node.isWorkspaceNode && !node.isStatusNode && node.type !== TODO
      && node.subTag === undefined
    ) {
      treeItem.contextValue = 'file';
    }

    if (node.subTag !== undefined) {
      treeHasSubTags = true;
    }

    if (!node.isStatusNode) {
      this.nodesToGet--;
    }

    if (this.nodesToGet === 0 && this.onTreeRefreshed) {
      this.onTreeRefreshed();
    }

    return treeItem;
  }

  clear(folders: readonly WorkspaceRoot[] | undefined): void {
    nodes = [];

    workspaceFolders = folders;

    addWorkspaceFolders();
  }

  rebuild() {
    buildCounter = (buildCounter + 1) % 100;
  }

  refresh() {
    treeHasSubTags = false;

    this.sort();

    this._onDidChangeTreeData.fire(undefined);
  }

  filter(text: string | undefined, children?: TreeNode[]): void {
    var matcher = new RegExp(text ?? '', config.showFilterCaseSensitive() ? '' : 'i');

    if (children === undefined) {
      currentFilter = text;
      children = nodes;
    }
    children.forEach(child => {
      if (child.type === TODO) {
        var match = matcher.test(child.label);
        child.visible = !text || match;
      }

      if (child.nodes !== undefined) {
        this.filter(text, child.nodes);
      }
      if (child.extraLines !== undefined) {
        this.filter(text, child.extraLines);
      }
      if ((child.nodes && child.nodes.length > 0) || (child.extraLines && child.extraLines.length > 0)) {
        var visibleNodes = child.nodes ? child.nodes.filter(isVisible).length : 0;
        var visibleExtraLines = child.extraLines ? child.extraLines.filter(isVisible).length : 0;
        child.visible = visibleNodes + visibleExtraLines > 0;
      }
    });
  }

  clearTreeFilter(children?: TreeNode[]): void {
    currentFilter = undefined;

    if (children === undefined) {
      children = nodes;
    }
    children.forEach(function(this: TreeNodeProvider, child) {
      child.visible = true;
      if (child.nodes !== undefined) {
        this.clearTreeFilter(child.nodes);
      }
      if (child.extraLines !== undefined) {
        this.clearTreeFilter(child.extraLines);
      }
    }, this);
  }

  add(result: SearchMatch): void {
    if (nodes.length === 0) {
      addWorkspaceFolders();
    }

    var fullPath = result.uri.scheme === 'file'
      ? result.uri.fsPath
      : path.join(result.uri.authority, result.uri.fsPath);

    var rootNode = locateWorkspaceNode(fullPath);
    var todoNode = createTodoNode(result);

    if (config.shouldHideFromTree(todoNode.tag ? todoNode.tag : todoNode.label)) {
      todoNode.hidden = true;
    }
    var childNode: PathNode | undefined;

    var tagPath = todoNode.subTag ? todoNode.tag + ' (' + todoNode.subTag + ')' : todoNode.tag;

    if (config.shouldShowTagsOnly()) {
      if (config.shouldGroupByTag()) {
        if (todoNode.tag) {
          childNode = nodes.find(findTagNode, tagPath);
          if (childNode === undefined) {
            childNode = createTagNode(todoNode.fsPath, tagPath);
            nodes.push(childNode);
          }
        } else if (nodes.find(findTodoNode, todoNode) === undefined) {
          nodes.push(todoNode);
        }
      } else if (config.shouldGroupBySubTag()) {
        if (todoNode.subTag) {
          childNode = nodes.find(findSubTagNode, todoNode.subTag);
          if (childNode === undefined) {
            childNode = createSubTagNode(todoNode.subTag);
            nodes.unshift(childNode);
          }
        } else if (nodes.find(findTodoNode, todoNode) === undefined) {
          nodes.push(todoNode);
        }
      } else {
        if (nodes.find(findTodoNode, todoNode) === undefined) {
          nodes.push(todoNode);
        }
      }
    } else if (config.shouldFlatten() || rootNode === undefined) {
      childNode = locateFlatChildNode(rootNode, result, todoNode.tag, todoNode.subTag);
    } else if (rootNode) {
      var relativePath = path.relative(rootNode.fsPath, fullPath);
      var pathElements: string[] = [];
      if (relativePath !== '') {
        pathElements = relativePath.split(path.sep);
      }
      if (todoNode.subTag) {
        if (config.shouldGroupBySubTag() !== true) {
          pathElements.push(todoNode.subTag);
        }
      }
      childNode = locateTreeChildNode(rootNode, pathElements, todoNode.tag, todoNode.subTag);
    }

    if (childNode) {
      // needed?
      if (childNode.nodes === undefined) {
        childNode.nodes = [];
      }

      childNode.expanded = result.expanded;

      if (childNode.nodes.find(findTodoNode, todoNode) === undefined) {
        todoNode.parent = childNode;
        childNode.nodes.push(todoNode);
        childNode.showCount = true;
      }
    }
  }

  reset(uri: FileUri, children?: TreeNode[]): TreeNode[] {
    var fullPath = uri.scheme === 'file' ? uri.fsPath : path.join(uri.authority, uri.fsPath);
    var root = children === undefined;
    children = (children === undefined ? nodes : children).filter(function(this: TreeNodeProvider, child) {
      if (child.nodes !== undefined) {
        child.nodes = this.reset(uri, child.nodes);
      }
      return child.type !== TODO || child.fsPath !== fullPath;
    }, this);
    if (root) nodes = children;
    return children;
  }

  remove(callback: ((filename: string) => void) | null | undefined, uri: FileUri, children?: TreeNode[]): TreeNode[] {
    var fullPath = uri.scheme === 'file' ? uri.fsPath : path.join(uri.authority, uri.fsPath);

    function removeNodesByFilename(children: TreeNode[], me: TreeNodeProvider) {
      return children.filter(function(child) {
        if (child.nodes !== undefined) {
          child.nodes = me.remove(callback, uri, child.nodes);
        }
        var shouldRemove = child.fsPath === fullPath && !child.isRootTagNode;
        if (shouldRemove) {
          delete expandedNodes[child.fsPath];
          me._context.workspaceState.update('expandedNodes', expandedNodes);
          if (callback) {
            callback(child.fsPath);
          }
        }
        return shouldRemove === false;
      }, me);
    }

    function removeEmptyNodes(children: TreeNode[], me: TreeNodeProvider) {
      return children.filter(function(child) {
        if (child.nodes !== undefined) {
          child.nodes = me.remove(callback, uri, child.nodes);
        }
        var shouldRemove = child.nodes && child.nodes.length === 0 && child.isWorkspaceNode !== true;
        if (shouldRemove) {
          delete expandedNodes[child.fsPath];
          me._context.workspaceState.update('expandedNodes', expandedNodes);
          if (callback) {
            callback(child.fsPath);
          }
        }
        return shouldRemove !== true;
      }, me);
    }

    var root = children === undefined;
    if (children === undefined) {
      children = nodes;
    }

    children = removeNodesByFilename(children, this);
    children = removeEmptyNodes(children, this);

    if (root) {
      nodes = children;
    }

    return children;
  }

  getElement(filename: string, found: (node: TreeNode) => void, children?: TreeNode[]): void {
    if (children === undefined) {
      children = nodes;
    }
    children.forEach(function(this: TreeNodeProvider, child) {
      if (child.fsPath === filename) {
        found(child);
      } else if (child.nodes !== undefined) {
        return this.getElement(filename, found, child.nodes);
      }
    }, this);
  }

  setExpanded(path: string, expanded: boolean): void {
    expandedNodes[path] = expanded;
    this._context.workspaceState.update('expandedNodes', expandedNodes);
  }

  clearExpansionState() {
    expandedNodes = {};
    this._context.workspaceState.update('expandedNodes', expandedNodes);
  }

  getTagCountsForStatusBar(fileFilter?: string): Record<string, number> {
    var tagCounts: Record<string, number> = {};
    return countChildTags(nodes, tagCounts, true, fileFilter);
  }

  getTagCountsForActivityBar(): Record<string, number> {
    var tagCounts: Record<string, number> = {};
    return countChildTags(nodes, tagCounts, false);
  }

  exportChildren(parent: ExportTree, children: TreeElement[]): ExportTree {
    children.forEach(function(this: TreeNodeProvider, child) {
      if (child.type === PATH) {
        const branch: ExportTree = {};
        parent[child.label] = branch;
        this.exportChildren(branch, this.getChildren(child));
      } else if (!child.notExported) {
        var format = config.labelFormat();
        var itemLabel = 'line ' + (child.line + 1);
        if (config.shouldShowTagsOnly() === true) {
          itemLabel = child.fsPath + ' ' + itemLabel;
        }
        parent[itemLabel] = (format !== '')
          ? utils.formatLabel(format, child) + (child.pathLabel ? (' ' + child.pathLabel) : '')
          : child.label;
      }
    }, this);
    return parent;
  }

  exportTree(): ExportTree {
    var exported: ExportTree = {};
    var children = this.getChildren();
    exported = this.exportChildren(exported, children);
    return exported;
  }

  getFirstNode(): TreeNode | undefined {
    var availableNodes = nodes.filter(function(node) {
      return node.nodes === undefined || (node.nodes.length > 0);
    });
    var rootNodes = availableNodes.filter(isVisible);
    if (rootNodes.length > 0) {
      return rootNodes[0];
    }
    return undefined;
  }

  hasSubTags() {
    return treeHasSubTags;
  }

  sort(children?: TreeNode[]): void {
    if (config.shouldSortTree()) {
      if (children === undefined) {
        children = nodes;
      }
      children.forEach(function(this: TreeNodeProvider, child) {
        if (child.nodes !== undefined) {
          this.sort(child.nodes);
        }
      }, this);

      if (config.shouldShowTagsOnly()) {
        if (config.shouldSortTagsOnlyViewAlphabetically()) {
          children.sort(sortTagsOnlyViewByLabel);
        } else {
          children.sort(sortTagsOnlyViewByTagOrder);
        }
      } else {
        children.sort(sortByFilenameAndLine);
      }
    }
  }
}
