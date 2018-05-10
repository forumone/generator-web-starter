{
  files : [ {
    cwd : 'src/sass',
    src : '**/*',
    dest : 'build/sass',
    expand : true
  },
  {
    cwd : 'src/images',
    src : '**/*',
    dest : 'build/images',
    expand : true
  },
  {
    cwd : 'src/js',
    src : '**/*',
    dest : 'build/js',
    expand : true,
  }],
  verbose : true,
  updateAndDelete : true
}