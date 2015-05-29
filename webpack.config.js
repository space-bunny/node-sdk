module.exports = {
  context: __dirname,
  entry: "./index.js",
  output: {
      path: __dirname + '/web_builds',
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
