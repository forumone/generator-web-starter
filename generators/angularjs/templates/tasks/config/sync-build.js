{
  files : [ {
    cwd : 'build/css',
    src : '**/*.css' ,
    dest : 'public/css',
    expand : true,
  },
  {
    cwd : 'build/images',
    src : '**/*',
    dest : 'public/images',
    expand : true
  },
  {
    cwd : 'build/vendor',
    src : [ '**/*.js', '**/*.js.map' ],
    dest : 'public/vendor/js',
    expand : true,
  },
  {
    cwd : 'build/js',
    src : [ '**/*.js', '**/*.js.map' ],
    dest : 'public/js',
    expand : true,
  }],
  updateAndDelete : true
}