const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const project = path.resolve(__dirname, '..');
const requireProject = createRequire(path.join(project, 'package.json'));
const parser = require('shell-quote').parse;

function load(execFile, overrides = {}) {
  const module = { exports: {} };
  const source = path.join(project, 'out/src/ripgrep.js');
  vm.runInNewContext(fs.readFileSync(source, 'utf8'), {
    module,
    process: {
      platform: process.platform,
      arch: process.arch,
      env: {
        ...process.env,
        TODO_SHELL_FLAGS: '--hidden --no-ignore',
        TODO_SHELL_DIR: '/synthetic/a b',
        TODO_SHELL_META: 'x;echo DO_NOT_RUN',
      },
    },
    require(name) {
      if (name === 'child_process') {
        return {
          execFile,
          exec() {
            throw new Error('Search must launch directly without a shell');
          },
        };
      }
      if (name === 'fs') return { ...fs, ...overrides };
      if (name === 'shell-quote') return { parse: parser };
      if (name === './utils') return requireProject('./out/src/utils.js');
      return requireProject(name);
    },
  }, { filename: source });
  return module.exports;
}

function fake(overrides = {}) {
  const calls = [];
  const search = load((executable, args, options, callback) => {
    const child = {
      signals: [],
      kill(signal) {
        this.signals.push(signal);
        return true;
      },
    };
    calls.push({ executable, args, options, callback, child });
    return child;
  }, overrides);
  return { search, calls };
}

function options(overrides = {}) {
  return { rgPath: process.execPath, regex: 'TODO', additional: '--no-config', ...overrides };
}

module.exports = { load, fake, options, project, requireProject };
