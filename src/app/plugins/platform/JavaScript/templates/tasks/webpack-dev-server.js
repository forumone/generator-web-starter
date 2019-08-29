const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('../webpack.config');

module.exports = function() {
  const compiler = webpack(webpackConfig);
  const serverConfig = Object.assign({}, webpackConfig.devServer);
  console.log(serverConfig);
  const server = new WebpackDevServer(compiler, serverConfig);
  server.listen(serverConfig.port, serverConfig.host);
};
