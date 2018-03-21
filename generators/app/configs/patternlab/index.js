var defaults = {
  use_patternlab : true,
};

var npmPackages = [ 'grunt-shell', 'grunt-contrib-copy' ];

module.exports = {
  getNpmPackages : function(config) {
    return npmPackages;
  },
  getDefaults : function() {
    return defaults;
  },
  getPrompts : function(config) {
    return [
    {
      type: 'confirm',
      name: 'use_patternlab',
      message: 'Does it use Patternlab?',
      default: config.use_patternlab,
    }
    ];
  }
}