const webpack = require('webpack');
const path = require('path');
// const SplitByPathPlugin = require('webpack-split-by-path');

module.exports = function(options) {
  const devPort = options.devPort ? options.devPort : 8080;
  const devHost = options.devHost ? options.devHost : 'localhost';

  const entry = {
    spacebunny: [ './lib/index.js' ]
  };

  const output = {
    path: options.outputPath ? options.outputPath : path.join(__dirname, 'dist'),
    publicPath: options.publicPath ? options.publicPath : '',
    filename: '[name].js',
    chunkFilename: '[name].js'
  };

  const plugins = [
    new webpack.optimize.CommonsChunkPlugin('vendors', 'vendors.js'),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': options.devServer ? JSON.stringify('development') : JSON.stringify('production')
      }
    })
  ];

  const loaders = [
    {
      test: /\.js?$/,
      include: path.resolve(__dirname, 'src'),
      exclude: [/node_modules/],
      loaders: ['babel']
    },
    { test: /\.json$/, loader: 'json' }
  ];

  if (options.devServer) {
    plugins.unshift(
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('development')
        }
      })
    );
    plugins.unshift(new webpack.HotModuleReplacementPlugin());
  }
  else {
    plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      })
    );
  }

  if (options.hotComponents) {
    entry.spacebunny.unshift('webpack/hot/dev-server');
    entry.spacebunny.unshift('webpack-dev-server/client?http://' + devHost + ':' + devPort);
  }

  return {
    context: __dirname,
    entry: entry,
    output: output,
    devtool: options.devServer ? 'eval' : '',
    debug: options.devServer ? true : false,
    loader: {
      configEnvironment: options.devServer ? 'development' : 'production'
    },
    node: {
      __filename: true,
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      module: 'empty'
    },
    plugins: plugins,
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          exclude: [/node_modules/, /lib/],
          loader: 'eslint-loader'
        }
      ],
      loaders: loaders,
      noParse: []
    },
    resolve: {
      extensions: ['', '.js'],
      modulesDirectories: ['node_modules', 'src']
    }
  };
};
