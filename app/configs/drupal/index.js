var defaults = {
    features : true,
    cmi : false,
    solr : true,
    drupal_theme : 'f1ux',
    drupal_use_compass : true
  };

  module.exports = {
    getDefaults : function() {
      return defaults;
    },
    getPrompts : function(config) {
      return [{
        type: 'confirm',
        name: 'features',
        message: 'Does it use the Features module?',
        default: config.features,
        when: function(answers) {
          return (answers.platform == 'drupal' && answers.install_type == 'advanced');
        }
      },
      {
        type: 'confirm',
        name: 'cmi',
        message: 'Does it use the Configuration module?',
        default: config.cmi,
        when: function(answers) {
          return (answers.platform == 'drupal' && answers.install_type == 'advanced');
        }
      },
      {
        type: 'confirm',
        name: 'solr',
        message: 'Does it use Solr?',
        default: config.solr,
        when: function(answers) {
          return (answers.platform == 'drupal' && answers.install_type == 'advanced');
        }
      },
      {
        type: 'confirm',
        name: 'drupal_use_compass',
        message: 'Does it use SASS / Compass?',
        default: config.drupal_use_compass,
        when: function(answers) {
          return (answers.platform == 'drupal');
        }
      },
      {
        type: 'input',
        name: 'drupal_theme',
        message: 'Theme name',
        default: config.drupal_theme,
        when: function(answers) {
          return (answers.platform == 'drupal' && answers.drupal_use_compass);
        }
      }];
    }
  }