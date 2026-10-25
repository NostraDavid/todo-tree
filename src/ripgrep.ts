/* jshint esversion:6, node: true */
/* eslint-env node */

/**
 * This is a modified version of the ripgrep-js module from npm
 * written by alexlafroscia (github.com/alexlafroscia/ripgrep-js)
 * Instead of assuming that ripgrep is in the users path, it uses the
 * ripgrep binary downloaded via vscode-ripgrep.
 */

'use strict';
import * as child_process from 'child_process';
import type { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'shell-quote';
import type { RipgrepOptions } from './types';
import * as utils from './utils';

var activeProcesses = new Map<ChildProcess, () => void>();

class RipgrepError {
  message: string;
  stderr: string;
  constructor(error: string, stderr: string) {
    this.message = error;
    this.stderr = stderr;
  }
}

function formatResults(stdout: string, multiline?: boolean): Match[] {
  stdout = stdout.trim();

  if (!stdout) {
    return [];
  }

  if (multiline === true) {
    var results: Match[] = [];
    var regex = utils.getRegexForEditorSearch(true);
    var lines = stdout.split('\n');

    var buffer: string[] = [];
    var matches: Match[] = [];
    var text = '';

    lines.map(function(line) {
      var resultMatch = new Match(line);
      buffer.push(line);
      matches.push(resultMatch);

      text = (text === '') ? resultMatch.match : text + '\n' + resultMatch.match;

      var fullMatch = text.match(regex);
      if (fullMatch) {
        resultMatch = matches[0];
        matches.shift();
        resultMatch.extraLines = matches;
        results.push(resultMatch);
        buffer = [];
        matches = [];
        text = '';
      }
    });

    return results;
  }

  return stdout
    .split('\n')
    .map((line) => new Match(line));
}

function parseAdditional(value: unknown, cwd: string): string[] {
  if (value === undefined) value = '';
  if (typeof value !== 'string') throw new Error('todo-tree.ripgrep.ripgrepArgs must be a string');
  var quote: string | undefined;
  var escaped = false;
  var ansi = false;
  for (var index = 0; index < value.length; ++index) {
    var character = value[index];
    if (escaped) {
      escaped = false;
    } else if (quote === "'") {
      if (ansi && character === '\\') escaped = true;
      else if (character === "'") quote = undefined;
    } else if (character === '\\') {
      escaped = true;
    } else if (quote === '"') {
      if (character === '"') quote = undefined;
    } else if (character === "'" || character === '"') {
      quote = character;
      ansi = character === "'" && value[index - 1] === '$';
    }
  }
  if (quote || escaped) throw new Error('Unclosed quote or trailing escape in todo-tree.ripgrep.ripgrepArgs');
  var environment = Object.assign(Object.create(null), process.env, { PWD: cwd });
  return parse(value, environment, { splitUnquoted: true }).map(function(argument) {
    if (typeof argument === 'string') return argument;
    if ('op' in argument && argument.op === 'glob') return argument.pattern;
    throw new Error('Shell operators and comments are not supported in todo-tree.ripgrep.ripgrepArgs');
  });
}

export async function search(cwd: string | undefined, options: RipgrepOptions | undefined): Promise<Match[]> {
  if (!cwd) throw new Error('No cwd provided');
  if (!options) throw new Error('No search options provided');
  const rgPath = options.rgPath;
  const outputChannel = options.outputChannel;
  if (!rgPath || !fs.existsSync(rgPath)) throw new Error('ripgrep executable not found (' + rgPath + ')');
  if (!fs.existsSync(cwd)) throw new Error('root folder not found (' + cwd + ')');
  function debug(text: string) {
    if (outputChannel) {
      var now = new Date();
      outputChannel.appendLine(
        now.toLocaleTimeString('en', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0') + ' '
          + text,
      );
    }
  }
  var args = ['--no-messages', '--vimgrep', '-H', '--column', '--line-number', '--color', 'never']
    .concat(parseAdditional(options.additional, cwd));
  if (options.multiline) args.push('-U');
  var patternDirectory;
  try {
    if (options.patternFileDirectory) {
      patternDirectory = fs.mkdtempSync(path.join(options.patternFileDirectory, 'todo-tree-rg-'));
      var patternFile = path.join(patternDirectory, 'pattern');
      fs.writeFileSync(patternFile, (options.regex || '') + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      args.push('-f', patternFile);
    } else {
      args.push('-e', options.regex || '');
    }
    (options.globs || []).forEach(function(glob) {
      args.push('-g', glob);
    });
    args.push('--', options.filename || '.');
    debug('Command: ' + JSON.stringify([rgPath].concat(args)));
    var stdout = await new Promise<string>(function(resolve, reject) {
      var cancelled = false;
      var child = child_process.execFile(rgPath, args, {
        cwd: cwd,
        encoding: 'utf8',
        maxBuffer: (options.maxBuffer || 200) * 1024,
        windowsHide: true,
        shell: false,
        env: Object.assign({}, process.env, { PWD: cwd }),
      }, function(error, stdout, stderr) {
        activeProcesses.delete(child);
        if (cancelled) return resolve('');
        if (error && error.code === 1 && !error.signal && !error.killed) return resolve('');
        if (error) return reject(new RipgrepError(error.message, stderr || ''));
        if (stderr) debug('Search stderr: ' + stderr);
        resolve(stdout);
      });
      activeProcesses.set(child, function() {
        cancelled = true;
        child.kill('SIGINT');
      });
    });
    debug('Search results:\n' + stdout);
    return formatResults(stdout, options.multiline);
  } finally {
    if (patternDirectory) fs.rmSync(patternDirectory, { recursive: true, force: true });
  }
}

export function kill() {
  activeProcesses.forEach(function(cancel) {
    cancel();
  });
}

export class Match {
  declare fsPath: string;
  declare line: number;
  declare column: number;
  declare match: string;
  declare extraLines?: Match[];
  constructor(matchText: string) {
    // Detect file, line number and column which is formatted in the
    // following format: {file}:{line}:{column}:{code match}
    var regex = RegExp(/^(?<file>.*):(?<line>\d+):(?<column>\d+):(?<todo>.*)/);

    var match = regex.exec(matchText);
    if (match && match.groups) {
      this.fsPath = match.groups.file;
      this.line = parseInt(match.groups.line);
      this.column = parseInt(match.groups.column);
      this.match = match.groups.todo;
    } // Fall back to old method
    else {
      this.fsPath = '';

      if (matchText.length > 1 && matchText[1] === ':') {
        this.fsPath = matchText.substr(0, 2);
        matchText = matchText.substr(2);
      }
      var parts = matchText.split(':');
      var hasColumn = parts.length === 4;
      this.fsPath += parts.shift();
      this.line = parseInt(parts.shift() as string);
      if (hasColumn === true) {
        this.column = parseInt(parts.shift() as string);
      } else {
        this.column = 1;
      }
      this.match = parts.join(':');
    }
  }
}
