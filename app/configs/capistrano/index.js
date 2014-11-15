var defaults = {
    deploy_via : 'rsync',
    use_capistrano : true,
    keep_releases : 3
  };

  module.exports = {
    getDefaults : function() {
      return defaults;
    },
    getPrompts : function(config) {
      return [{
        type: 'confirm',
        name: 'use_capistrano',
        message: 'Will it be deployed via Capistrano?',
        default: config.use_capistrano
      },
      {
        type: 'list',
        name: 'deploy_via',
        message: 'Method of deploying code',
        choices: ['rsync', 'git'],
        default: config.deploy_via,
        when: function(answers) {
          return (answers.use_capistrano);
        }
      },
      {
        type: 'input',
        name: 'keep_releases',
        message: 'Number of releases to keep',
        default: config.keep_releases,
        when: function(answers) {
          return (answers.use_capistrano);
        }
      }];
    }
  }