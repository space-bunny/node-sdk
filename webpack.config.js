module.exports = {
  context: __dirname,
  entry: "./web_index.js",
  output: {
      path: __dirname + '/dist',
      filename: "spacebunny.js"
  },
  resolve: {
    modulesDirectories: ['node_modules']
  },
  node: {
    __filename: true,
    fs: "empty",
    net: "empty",
    tls: "empty",
    module: "empty"
  },
  browser: {
    "./package.json": false
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  }
};
