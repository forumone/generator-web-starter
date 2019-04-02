module.exports = grunt => {
  const config = require('../../webpack.config');
  const serverConfig = Object.assign({ webpack: config }, config.devServer);

  grunt.config.set('webpack-dev-server', {
    default: () => serverConfig,
  });
};
