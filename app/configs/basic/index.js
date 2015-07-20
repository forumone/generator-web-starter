var defaults = {
  install_type : 'basic',
  name : '',
  version : '0.1.0',
  refspec : '1.1.x',
  platform : 'drupal',
  repository : ''
};

var npmPackages = [ 'grunt', 'grunt-contrib-watch', 'grunt-simple-watch', 'load-grunt-tasks', 'include-all' ];

module.exports = {
  getNpmPackages : function(config) {
    return npmPackages;
  },
  getDefaults : function() {
    return defaults;
  },
  getPrompts : function(config) {
    return [{
      type: 'list',
      name: 'install_type',
      message: 'Installation type',
      choices: ['basic', 'advanced'],
      default: config.install_type
    },
    {
      type: 'input',
      name: 'name',
      message: 'Your project name',
      default: config.name
    },
    {
      type: 'input',
      name: 'version',
      message: 'Your project version',
      default: config.version
    },
    {
      type: 'input',
      name: 'refspec',
      message: 'Web Starter version to use',
      default: config.refspec
    },
    {
      type: 'list',
      name: 'platform',
      message: 'Project type',
      choices: ['drupal', 'wordpress', 'javascript'],
      default: config.platform
    },
    {
      type: 'input',
      name: 'repository',
      message: 'Repository URL',
      default: config.repository
    }];
  }
}