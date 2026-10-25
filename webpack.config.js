'use strict';

const path = require('path');

module.exports = {
  target: 'node16',
  entry: './src/extension.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    library: { type: 'commonjs2' },
    clean: true,
  },
  devtool: 'source-map',
  externals: { vscode: 'commonjs vscode' },
};
