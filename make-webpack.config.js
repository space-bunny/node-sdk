module.exports = {
  context: __dirname,
  entry: './lib/web_index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'spacebunny.js'
  },
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
    loaders: [
      { test: /\.js?$/, loader: 'babel', exclude: /node_modules/ },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  }
};
