type Workspace = Pick<typeof import('vscode').workspace, 'getConfiguration'>;
import * as vscode from 'vscode';
import * as utils from './utils.js';

export function validateColours(workspace: Workspace) {
  function check(setting: string) {
    var definedColour = workspace.getConfiguration('todo-tree.highlights').get(setting);
    if (definedColour !== undefined && !utils.isValidColour(definedColour)) {
      invalidColours.push(setting + ' (' + definedColour + ')');
    }
  }

  var invalidColours: string[] = [];
  var result = '';

  var attributeList = ['foreground', 'background', 'iconColour', 'rulerColour'];
  attributeList.forEach(function(attribute) {
    check('defaultHighlight.' + attribute);
  });

  var config = vscode.workspace.getConfiguration('todo-tree.highlights');
  Object.keys(config.customHighlight).forEach(function(tag) {
    attributeList.forEach(function(attribute) {
      check('customHighlight.' + tag + '.' + attribute);
    });
  });

  if (invalidColours.length > 0) {
    result = 'Invalid colour settings: ' + invalidColours.join(', ');
  }

  return result;
}

export function validateIconColours(workspace: Workspace) {
  var hasInvalidCodiconColour = false;
  var hasInvalidOcticonColour = false;

  function checkIconColour(setting: string) {
    var icon = workspace.getConfiguration('todo-tree.highlights').get<string>(setting + '.icon');
    var iconColour = workspace.getConfiguration('todo-tree.highlights').get<string>(setting + '.iconColour');
    if (icon !== undefined && iconColour !== undefined) {
      if (utils.isCodicon(icon)) {
        if (utils.isHexColour(iconColour) || utils.isRgbColour(iconColour) || utils.isNamedColour(iconColour)) {
          invalidIconColours.push(setting + '.iconColour (' + iconColour + ')');
          hasInvalidCodiconColour = true;
        }
      } else {
        if (utils.isThemeColour(iconColour)) {
          invalidIconColours.push(setting + '.iconColour (' + iconColour + ')');
          hasInvalidOcticonColour = true;
        }
      }
    }
  }

  var invalidIconColours: string[] = [];
  var result = '';

  checkIconColour('defaultHighlight');

  var config = vscode.workspace.getConfiguration('todo-tree.highlights');
  Object.keys(config.customHighlight).forEach(function(tag) {
    checkIconColour('customHighlight.' + tag);
  });

  if (invalidIconColours.length > 0) {
    result = 'Invalid icon colour settings: ' + invalidIconColours.join(', ') + '.';
    if (hasInvalidCodiconColour) {
      result += ' Codicons can only use theme colours.';
    }
    if (hasInvalidOcticonColour) {
      result += ' Theme colours can only be used with Codicons.';
    }
  }

  return result;
}
