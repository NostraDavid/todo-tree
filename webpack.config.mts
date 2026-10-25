import path from 'node:path';
import type { Configuration } from 'webpack';

const configuration: Configuration = {
  target: 'node16',
  entry: './out/src/extension.js',
  output: {
    path: path.resolve(import.meta.dirname, 'dist'),
    filename: 'extension.js',
    library: { type: 'commonjs2' },
    clean: true,
  },
  devtool: 'source-map',
  externals: { vscode: 'commonjs vscode' },
};
export default configuration;
