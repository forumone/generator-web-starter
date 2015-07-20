var defaults = {
  use_compass : true,
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
    return [
    {
      type: 'confirm',
      name: 'use_compass',
      message: 'Does it use SASS / Compass?',
      default: config.use_compass,
    }
    ];
  }
}