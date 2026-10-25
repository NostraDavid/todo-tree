import type { ChildProcess, ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { parse as parser } from 'shell-quote';
import type { RipgrepOptions } from '../out/src/types.js';

export interface ProcessFailure extends Error {
  code?: string | number | null;
  signal?: string;
  killed?: boolean;
}
export interface SearchProcess extends Pick<ChildProcess, 'kill'> {
  signals: (NodeJS.Signals | number | undefined)[];
}
interface ExecOptions extends ExecFileOptionsWithStringEncoding {
  cwd: string;
  env: NodeJS.ProcessEnv;
  maxBuffer: number;
  shell: false;
}
export interface SearchCall {
  executable: string;
  args: string[];
  options: ExecOptions;
  callback(error: ProcessFailure | null, stdout: string, stderr: string): void;
  child: SearchProcess;
}
type ExecFile = (
  executable: string,
  args: string[],
  options: ExecOptions,
  callback: SearchCall['callback'],
) => Pick<ChildProcess, 'kill'>;
type FsOverrides = Partial<Pick<typeof fs, 'writeFileSync'>>;
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const project = path.resolve(import.meta.dirname, '..');
const requireProject = createRequire(path.join(project, 'package.json'));

function load(execFile: ExecFile, overrides: FsOverrides = {}): typeof import('../out/src/ripgrep.js') {
  const module = { exports: {} };
  const source = path.join(project, 'out/src/ripgrep.js');
  vm.runInNewContext(fs.readFileSync(source, 'utf8'), {
    module,
    exports: module.exports,
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
    require(name: string) {
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
  return module.exports as typeof import('../out/src/ripgrep.js');
}

function fake(overrides: FsOverrides = {}) {
  const calls: SearchCall[] = [];
  const search = load((executable, args, options, callback) => {
    const child: SearchProcess = {
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

function options(overrides: Partial<RipgrepOptions> = {}): RipgrepOptions {
  return { rgPath: process.execPath, regex: 'TODO', additional: '--no-config', ...overrides };
}

export { fake, load, options, project, requireProject };
