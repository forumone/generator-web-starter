module.exports = grunt => {
  const config = require('../../webpack.config');

  grunt.config.set('webpack', {
    default: () => config,
  });
};
