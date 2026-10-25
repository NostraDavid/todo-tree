import * as vscode from 'vscode';

import * as attributes from './attributes.js';
import * as config from './config.js';
import * as icons from './icons.js';
import * as utils from './utils.js';

var captureGroupArgument = 'capture-groups';

var lanes: Record<string, vscode.OverviewRulerLane | undefined> = {
  'none': undefined,
  'left': 1,
  'center': 2,
  'right': 4,
  'full': 7,
};

var decorations: Record<string, vscode.TextEditorDecorationType[]> = {};
var highlightTimer: Record<string, ReturnType<typeof setTimeout>> = {};
var context: vscode.ExtensionContext;
var debug: (text: string) => void;

export function init(context_: vscode.ExtensionContext, debug_: (text: string) => void) {
  context = context_;
  debug = debug_;
  context.subscriptions.push(
    new vscode.Disposable(function() {
      Object.values(highlightTimer).forEach(timer => clearTimeout(timer));
      Object.values(decorations).forEach(styles => styles.forEach(style => style.dispose()));
      highlightTimer = {};
      decorations = {};
    }),
  );
}

function applyOpacity(colour: string | vscode.ThemeColor | undefined, opacity: number) {
  if (typeof colour === 'string' && utils.isHexColour(colour)) {
    colour = utils.hexToRgba(colour, opacity < 1 ? opacity * 100 : opacity);
  } else if (typeof colour === 'string' && utils.isRgbColour(colour)) {
    if (opacity !== 100) {
      colour = utils.setRgbAlpha(colour, opacity > 1 ? opacity / 100 : opacity);
    }
  }

  return colour;
}

export function getDecoration(tag: string) {
  var foregroundColour = attributes.getForeground(tag);
  var backgroundColour = attributes.getBackground(tag);

  var opacity = getOpacity(tag);

  var lightForegroundColour: string | vscode.ThemeColor | undefined = foregroundColour;
  var darkForegroundColour: string | vscode.ThemeColor | undefined = foregroundColour;
  var lightBackgroundColour: string | vscode.ThemeColor | undefined = backgroundColour;
  var darkBackgroundColour: string | vscode.ThemeColor | undefined = backgroundColour;

  if (foregroundColour) {
    if (foregroundColour.match(/(foreground|background)/i)) {
      lightForegroundColour = new vscode.ThemeColor(foregroundColour);
      darkForegroundColour = new vscode.ThemeColor(foregroundColour);
    } else if (!utils.isValidColour(foregroundColour)) {
      lightForegroundColour = new vscode.ThemeColor('editor.foreground');
      darkForegroundColour = new vscode.ThemeColor('editor.foreground');
    }
  }

  if (backgroundColour) {
    if (backgroundColour.match(/(foreground|background)/i)) {
      lightBackgroundColour = new vscode.ThemeColor(backgroundColour);
      darkBackgroundColour = new vscode.ThemeColor(backgroundColour);
    } else if (!utils.isValidColour(backgroundColour)) {
      lightBackgroundColour = new vscode.ThemeColor('editor.background');
      darkBackgroundColour = new vscode.ThemeColor('editor.background');
    }

    lightBackgroundColour = applyOpacity(lightBackgroundColour, opacity);
    darkBackgroundColour = applyOpacity(darkBackgroundColour, opacity);
  }

  if (
    lightForegroundColour === undefined && typeof lightBackgroundColour === 'string'
    && utils.isHexColour(lightBackgroundColour)
  ) {
    lightForegroundColour = utils.complementaryColour(lightBackgroundColour);
  }
  if (
    darkForegroundColour === undefined && typeof darkBackgroundColour === 'string'
    && utils.isHexColour(darkBackgroundColour)
  ) {
    darkForegroundColour = utils.complementaryColour(darkBackgroundColour);
  }

  if (lightBackgroundColour === undefined && lightForegroundColour === undefined) {
    lightBackgroundColour = new vscode.ThemeColor('editor.foreground');
    lightForegroundColour = new vscode.ThemeColor('editor.background');
  }

  if (darkBackgroundColour === undefined && darkForegroundColour === undefined) {
    darkBackgroundColour = new vscode.ThemeColor('editor.foreground');
    darkForegroundColour = new vscode.ThemeColor('editor.background');
  }

  var configuredLane = getRulerLane(tag);
  var lane = typeof configuredLane === 'number'
    ? configuredLane
    : Number.isNaN(parseInt(configuredLane))
    ? lanes[configuredLane.toLowerCase()]
    : Number(configuredLane);
  var gutterIcon = showInGutter(tag) ? icons.getIcon(context, tag, debug) : undefined;

  var decorationOptions: vscode.DecorationRenderOptions = {
    borderRadius: getBorderRadius(tag),
    isWholeLine: getType(tag) === 'whole-line',
    fontWeight: getFontWeight(tag),
    fontStyle: getFontStyle(tag),
    textDecoration: getTextDecoration(tag),
    gutterIconPath: gutterIcon && 'dark' in gutterIcon ? gutterIcon.dark : undefined,
  };

  if (lane !== undefined) {
    var rulerColour: string | vscode.ThemeColor | undefined = getRulerColour(
      tag,
      darkBackgroundColour ? darkBackgroundColour : 'editor.foreground',
    );
    var rulerOpacity = getRulerOpacity(tag);

    if (typeof rulerColour === 'string' && utils.isThemeColour(rulerColour)) {
      rulerColour = new vscode.ThemeColor(rulerColour);
    } else {
      rulerColour = applyOpacity(rulerColour, rulerOpacity);
    }

    decorationOptions.overviewRulerColor = rulerColour;
    decorationOptions.overviewRulerLane = lane;
  }

  decorationOptions.light = { backgroundColor: lightBackgroundColour, color: lightForegroundColour };
  decorationOptions.dark = { backgroundColor: darkBackgroundColour, color: darkForegroundColour };

  return vscode.window.createTextEditorDecorationType(decorationOptions);
}

function getRulerColour(tag: string, defaultColour: string | vscode.ThemeColor) {
  return attributes.getAttribute(tag, 'rulerColour', undefined) ?? defaultColour;
}

function getRulerLane(tag: string) {
  return attributes.getAttribute(tag, 'rulerLane', 4);
}

function getOpacity(tag: string) {
  return attributes.getAttribute(tag, 'opacity', 100);
}

function getRulerOpacity(tag: string) {
  return attributes.getAttribute(tag, 'rulerOpacity', 100);
}

function getBorderRadius(tag: string) {
  return attributes.getAttribute(tag, 'borderRadius', '0.2em');
}

function getFontStyle(tag: string) {
  return attributes.getAttribute(tag, 'fontStyle', 'normal');
}

function getFontWeight(tag: string) {
  return attributes.getAttribute(tag, 'fontWeight', 'normal');
}

function getTextDecoration(tag: string) {
  return attributes.getAttribute(tag, 'textDecoration', '');
}

function showInGutter(tag: string) {
  return attributes.getAttribute(tag, 'gutterIcon', false);
}

function getType(tag: string) {
  return attributes.getAttribute(
    tag,
    'type',
    vscode.workspace.getConfiguration('todo-tree.highlights').get<string>('highlight'),
  );
}

function editorId(editor: vscode.TextEditor) {
  var id = '';
  if (editor.document) {
    id = JSON.stringify(editor.document.uri);
  }
  if (editor.viewColumn) {
    id += editor.viewColumn;
  }
  return id;
}

function highlight(editor: vscode.TextEditor | undefined) {
  function addDecoration(startPos: vscode.Position, endPos: vscode.Position) {
    var decoration = { range: new vscode.Range(startPos, endPos) };
    if (documentHighlights[tag] === undefined) {
      documentHighlights[tag] = [];
    }
    documentHighlights[tag].push(decoration);
  }

  var documentHighlights: Record<string, vscode.DecorationOptions[]> = {};
  var subTagHighlights: Record<string, vscode.DecorationOptions[]> = {};
  var customHighlight = config.customHighlight();

  if (editor) {
    var id = editorId(editor);

    if (decorations[id]) {
      decorations[id].forEach(function(decoration) {
        decoration.dispose();
      });
    }

    decorations[id] = [];

    if (vscode.workspace.getConfiguration('todo-tree.highlights').get('enabled', true)) {
      var text = editor.document.getText();
      var regex = utils.getRegexForEditorSearch(true);
      var subTagRegex = new RegExp(config.subTagRegex());

      var match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        var tag = match[0];
        var offsetStart = match.index;
        var offsetEnd = offsetStart + match[0].length;
        var extracted = utils.extractTag(match[0]);
        if (extracted.tag) {
          var line = editor.document.lineAt(editor.document.positionAt(match.index));
          utils.updateBeforeAndAfter(extracted, text.substring(offsetStart, editor.document.offsetAt(line.range.end)));
        }
        if (extracted.tag && extracted.tag.length > 0) {
          var tagGroup = config.tagGroup(extracted.tag);
          tag = tagGroup ? tagGroup : extracted.tag;
          offsetStart = match.index + extracted.tagOffset!;
          offsetEnd = offsetStart + extracted.tag.length;
        } else {
          offsetStart += match[0].search(/\S|$/);
        }
        var type = getType(tag);
        if (type !== 'none') {
          var startPos = editor.document.positionAt(offsetStart);
          var endPos = editor.document.positionAt(offsetEnd);
          var fullEndPos = editor.document.positionAt(match.index + match[0].length);

          if (type === 'text-and-comment') {
            addDecoration(
              editor.document.positionAt(match.index),
              new vscode.Position(fullEndPos.line, editor.document.lineAt(fullEndPos.line).range.end.character),
            );
          } else if (type === 'text') {
            addDecoration(
              startPos,
              new vscode.Position(fullEndPos.line, editor.document.lineAt(fullEndPos.line).range.end.character),
            );
          } else if (type !== undefined && type.indexOf(captureGroupArgument + ':') === 0) {
            const matchIndices = match.indices;
            type.substring(type.indexOf(':') + 1).split(',').map(function(groupText) {
              var group = parseInt(groupText);
              if (matchIndices && matchIndices[group]) {
                addDecoration(
                  editor.document.positionAt(matchIndices[group][0]),
                  editor.document.positionAt(matchIndices[group][1]),
                );
              }
            });
          } else if (type === 'tag-and-subTag' || type === 'tag-and-subtag') {
            addDecoration(startPos, endPos);

            var endOfLineOffset = editor.document.offsetAt(
              new vscode.Position(fullEndPos.line, editor.document.lineAt(fullEndPos.line).range.end.character),
            );
            var todoText = text.substring(offsetEnd, endOfLineOffset);
            var subTagMatch = todoText.match(subTagRegex);
            if (subTagMatch !== null && subTagMatch.length > 1) {
              var subTag = subTagMatch[1];
              if (customHighlight[subTag] !== undefined) {
                var subTagOffset = todoText.indexOf(subTag);
                if (subTagOffset !== -1) {
                  var subTagStartPos = editor.document.positionAt(offsetEnd + subTagOffset);
                  var subTagEndPos = editor.document.positionAt(offsetEnd + subTagOffset + subTagMatch[1].length);
                  var subTagDecoration = { range: new vscode.Range(subTagStartPos, subTagEndPos) };
                  if (subTagHighlights[subTag] === undefined) {
                    subTagHighlights[subTag] = [];
                  }
                  subTagHighlights[subTag].push(subTagDecoration);
                }
              }
            }
          } else if (type === 'tag-and-comment') {
            addDecoration(editor.document.positionAt(match.index), endPos);
          } else if (type === 'line' || type === 'whole-line') {
            addDecoration(
              new vscode.Position(fullEndPos.line, editor.document.lineAt(fullEndPos.line).range.end.character),
              new vscode.Position(startPos.line, 0),
            );
          } else {
            addDecoration(startPos, endPos);
          }
        }
      }

      Object.keys(documentHighlights).forEach(function(tag) {
        var decoration = getDecoration(tag);
        decorations[id].push(decoration);
        editor.setDecorations(decoration, documentHighlights[tag]);
      });

      Object.keys(subTagHighlights).forEach(function(subTag) {
        var decoration = getDecoration(subTag);
        decorations[id].push(decoration);
        editor.setDecorations(decoration, subTagHighlights[subTag]);
      });
    }
  }
}

export function triggerHighlight(editor: vscode.TextEditor | undefined) {
  if (editor) {
    var id = editorId(editor);

    if (highlightTimer[id]) {
      clearTimeout(highlightTimer[id]);
    }
    highlightTimer[id] = setTimeout(
      highlight,
      vscode.workspace.getConfiguration('todo-tree.highlights').highlightDelay,
      editor,
    );
  }
}
