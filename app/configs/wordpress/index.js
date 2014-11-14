var defaults = {
  wpcfm : false
};

module.exports = {
  getDefaults : function() {
    return defaults;
  },
  getPrompts : function(config) {
    return [{
      type: 'confirm',
      name: 'wpcfm',
      message: 'Does it use the WP-CFM plugin?',
      default: config.wpcfm,
      when: function(answers) {
        return (answers.platform == 'wordpress');
      }
    }];
  }
}