var defaults = {
  wpcfm : false,
  wordpress_theme : 'f1ux',
  wordpress_use_compass : true
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
      name: 'wpcfm',
      message: 'Does it use the WP-CFM plugin?',
      default: config.wpcfm,
      when: function(answers) {
        return (answers.platform == 'wordpress');
      }
    },
    {
      type: 'confirm',
      name: 'wordpress_use_compass',
      message: 'Does it use SASS / Compass?',
      default: config.wordpress_use_compass,
      when: function(answers) {
        return (answers.platform == 'wordpress');
      }
    },
    {
      type: 'input',
      name: 'wordpress_theme',
      message: 'Theme name',
      default: config.wordpress_theme,
      when: function(answers) {
        return (answers.platform == 'wordpress' && answers.wordpress_use_compass);
      }
    }];
  }
}