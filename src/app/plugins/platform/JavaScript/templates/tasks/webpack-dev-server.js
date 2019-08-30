const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

module.exports = function() {
  const {devServer, ...webpackConfig} = require('../webpack.config')({mode: 'development'});
  const compiler = webpack(webpackConfig);
  const server = new WebpackDevServer(compiler, devServer);

  server.listen(devServer.port, devServer.host);
};
