var jsFilesToInject = [ 'vendor/js/jquery/**/*.js', 
'vendor/js/angular/**/*.js', 
'vendor/js/lodash/**/*.js', 
'vendor/js/leaflet/**/*.js',
'vendor/js/**/*.js',
'js/index.js',
'js/templates.js',
'**/*.js' ];

module.exports.jsFilesToInject = jsFilesToInject.map(function(path) {
  return path;
});
