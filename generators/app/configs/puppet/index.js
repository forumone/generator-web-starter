var defaults = {
    puppet : true,
    host : 'f1dev',
    app_webroot : 'public',
    db_name : 'web',
    db_user : 'web',
    php_prefix : 'php54'
  };

var npmPackages = [ 'grunt-contrib-compass' ];

  module.exports = {
    getNpmPackages : function(config) {
      return npmPackages;
    },
    getDefaults : function() {
      return defaults;
    },
    getPrompts : function(config) {
      return [{
        type: 'confirm',
        name: 'puppet',
        message: 'Does the project use Puppet?',
        default: config.puppet
      },
      {
        type: 'input',
        name: 'host',
        message: 'Host configuration to use',
        default: config.host,
        when: function(answers) {
          return (answers.puppet && answers.install_type == 'advanced');
        }
      },
      {
        type: 'input',
        name: 'app_webroot',
        message: 'Application webroot',
        default: config.app_webroot,
        when: function(answers) {
          return (answers.puppet && answers.install_type == 'advanced');
        }
      },
      {
        type: 'input',
        name: 'db_name',
        message: 'Database name',
        default: config.db_name,
        when: function(answers) {
          return (answers.puppet && answers.install_type == 'advanced');
        }
      },
      {
        type: 'input',
        name: 'db_user',
        message: 'Database user',
        default: config.db_user,
        when: function(answers) {
          return (answers.puppet && answers.install_type == 'advanced');
        }
      },
      {
        type: 'list',
        name: 'php_prefix',
        message: 'PHP version',
        choices: ['php', 'php54', 'php55'],
        default: config.php_prefix,
        when : function(answers) {
          return (answers.puppet && answers.install_type == 'advanced');
        }
      }];
    }
  }
