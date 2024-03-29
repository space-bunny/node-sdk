const path = require('path');
const webpack = require('webpack');
const WebpackMd5Hash = require('webpack-md5-hash');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const minimist = require('minimist');
const _ = require('lodash');
const { resolve } = require('path');

const env = process.env.NODE_ENV || 'production';

const argv = minimist(process.argv.slice(2));

const platform = (argv.platform) || process.platform;
const arch = (argv.arch) || process.arch;
const outputPath = path.join(__dirname, 'lib');

const copyTypesCommand = 'ncp ./lib/indexNode.d.ts ./lib/index.d.ts';

if (process.env.ANALYZER !== 'true') {
  console.log(`\nCompile for ${platform}-${arch} in ${outputPath}\n`); // eslint-disable-line no-console
}

const GLOBALS = {
  'process.env.NODE_ENV': JSON.stringify(env),
  __DEV__: false,
};

const baseConfig = {
  mode: 'production',
  resolve: {
    modules: [__dirname, 'node_modules'],
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  entry: { spacebunny: './src/indexNode.ts' },
  target: 'node',
  output: {
    path: outputPath,
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  devtool: 'source-map',
  // devtool: 'nosources-source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: false,
          sourceMap: true,
          minify: true,
        }
      })
    ],
  },
  node: {
    __dirname: false,
    __filename: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    module: 'empty'
  },
  plugins: [
    // Optimize the order that items are bundled. This assures the hash is deterministic.
    new webpack.optimize.OccurrenceOrderPlugin(),

    // Hash the files using MD5 so that their names change when the content changes.
    new WebpackMd5Hash(),

    new webpack.DefinePlugin(GLOBALS),

    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
      noInfo: true, // set to false to see a list of every file being bundled.
      options: {}
    }),

    new CopyWebpackPlugin({ patterns: [
      { from: './src/index.js', to: './index.js', toType: 'file' },
      { from: './static/spacebunny.web.d.ts', to: './spacebunny.web.d.ts', toType: 'file' },
    ] }, { debug: false }),

    new WebpackShellPlugin({
      onBuildEnd: [
        copyTypesCommand,
      ],
      safe: true
    }),

  ],
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.ts$/,
        loader: 'eslint-loader',
        exclude: [resolve(__dirname, 'node_modules')],
      }, {
        test: /\.ts$/,
        exclude: [resolve(__dirname, 'node_modules')],
        use: [{
          loader: 'ts-loader'
        }]
      },
      {
        test: /\.(js|mjs|jsx)$/,
        loader: 'string-replace-loader',
        options: {
          search: '#!/usr/bin/env node',
          replace: '',
          // flags: 'g'
        }
      }
    ]
  }
};

const nodejsConfig = _.cloneDeep(baseConfig);
nodejsConfig.target = 'node';
nodejsConfig.output.filename = '[name].js';

const browserConfig = _.cloneDeep(baseConfig);
browserConfig.target = 'web';
browserConfig.output.filename = '[name].var.js';
browserConfig.entry.spacebunny = './src/indexWeb.ts';

const webConfig = _.cloneDeep(browserConfig);
webConfig.output.libraryTarget = 'commonjs2';
webConfig.output.filename = '[name].web.js';

module.exports = [nodejsConfig, browserConfig, webConfig];
