const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

module.exports = function() {
  const webpackConfig = require('../webpack.config')({'NODE_ENV': 'development'});
  const compiler = webpack(webpackConfig);
  const serverConfig = Object.assign({}, webpackConfig.devServer);
  const server = new WebpackDevServer(compiler, serverConfig);
  server.listen(serverConfig.port, serverConfig.host);
};
