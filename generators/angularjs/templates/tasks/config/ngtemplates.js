{
  cwd : 'src/js',
  src : '**/**.html',
  dest : 'build/js/templates.js',
  options : {
    htmlmin : '<%= htmlmin.myApp %>'
  }
}