const util = require('util');
const webpack = require('webpack');
const asyncWebpack = util.promisify(webpack);

module.exports = async function webpackBuild() {
  const webpackConfig = require('../webpack.config')({mode: 'production'});
  const stats = await asyncWebpack(webpackConfig);
  if (stats.hasErrors()) {
    throw new Error(stats.compilation.errors.join('\n'));
  }
};
