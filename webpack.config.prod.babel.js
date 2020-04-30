import path from 'path';
import webpack from 'webpack';
import WebpackMd5Hash from 'webpack-md5-hash';
import minimist from 'minimist';
import _ from 'lodash';

const env = process.env.NODE_ENV || 'production';

const argv = minimist(process.argv.slice(2));

const platform = (argv.platform: any) || process.platform;
const arch = (argv.arch: any) || process.arch;
const outputPath = path.join(__dirname, 'lib');

if (process.env.ANALYZER !== 'true') {
  console.log(`\nCompile for ${platform}-${arch} in ${outputPath}\n`); // eslint-disable-line no-console
}

const GLOBALS = {
  'process.env.NODE_ENV': JSON.stringify(env),
  __DEV__: false,
};

const baseConfig = {
  resolve: {
    modules: [__dirname, 'node_modules'],
    extensions: ['.js']
  },
  entry: { 'spacebunny': './src/index.js' },
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
    minimize: false,
  },
  mode: 'production',
  node: {
    __dirname: false,
    __filename: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    module: 'empty'
  },
  plugins: [
    // Hash the files using MD5 so that their names change when the content changes.
    new WebpackMd5Hash(),

    new (webpack: any).DefinePlugin(GLOBALS),

    new (webpack: any).LoaderOptionsPlugin({
      minimize: true,
      debug: false,
      noInfo: true, // set to false to see a list of every file being bundled.
      options: {}
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [{ loader: 'babel-loader', options: { cacheDirectory: true } }]
      },
      {
        include: [
          /mqtt\/bin\/sub/,
          /mqtt\/bin\/pub/,
          /mqtt\/mqtt/,
        ],
        loader: 'string-replace-loader',
        options: {
          search: '#!/usr/bin/env node',
          replace: '',
          flags: 'g'
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

export default [nodejsConfig, browserConfig];
