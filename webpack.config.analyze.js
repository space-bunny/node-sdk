const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const nodejsConfig = require('./webpack.config.prod')[0];

const analyzerPlugin = new BundleAnalyzerPlugin();

nodejsConfig.plugins.push(analyzerPlugin);

module.exports = nodejsConfig;
