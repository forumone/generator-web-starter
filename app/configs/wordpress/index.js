var _ = require('underscore');

module.exports = function(defaults) {
  return [{
    type: 'confirm',
    name: 'wpcfm',
    message: 'Does it use the WP-CFM plugin?',
    default: _.has(defaults, 'wpcfm') ? defaults.wpcfm : false,
    when: function(answers) {
      return (answers.platform == 'wordpress');
    }
  }];
}