{
  src : 'templates/index.html',
  dest : 'public',
  options : {
    prefix : '/',
    beautify : true,
    relative : false,
    scripts : {
      bundle : {
        cwd : 'public',
        files : require('../pipeline.js').jsFilesToInject
      },
    },
    styles : {
      bundle : {
        cwd : 'public',
        files : ['vendor/**/*.css']
      }
    }
  }
}