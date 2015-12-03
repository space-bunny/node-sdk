const webpack = require('webpack');

module.exports = function(options) {
  const entry = {
    app: [ './lib/web_index.js' ]
  };
  const output = {
    path: __dirname + '/dist',
    filename: 'spacebunny.js'
  };

  const plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('development')
      }
    })
  ];

  return {

    context: __dirname,
    entry: entry,
    output: output,
    plugins: plugins,
    resolve: {
      extensions: ['', '.js'],
      modulesDirectories: ['node_modules']
    },
    node: {
      __filename: true,
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      module: 'empty'
    },
    browser: {
      './package.json': false
    },
    module: {
      preLoaders: [
        { test: /\.js.map$/, loader: 'source-map-loader' }
      ],
      loaders: [
        { test: /\.js?$/, loader: 'babel', exclude: /node_modules/ },
        { test: /\.json$/, loader: 'json-loader' }
      ]
    }
  };
};
