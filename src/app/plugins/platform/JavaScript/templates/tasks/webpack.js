const webpack = require('webpack');

module.exports = function webpackBuild() {
  return new Promise((resolve, reject) => {
    const webpackConfig = require('../webpack.config')({'NODE_ENV': 'production'});
    webpack(webpackConfig, (err, stats) => {
      if (err) {
        return reject(err)
      }
      if (stats.hasErrors()) {
        return reject(new Error(stats.compilation.errors.join('\n')))
      }
      resolve();
    });
  });
};
