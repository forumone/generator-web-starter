{
  options: {
    livereload: true
  },
  files: ['src/js/**/*'],
    tasks: [
      'sync:source',
      'compileScripts',
      // 'compileStyles',
      'sync:vendor',
      'sync:build',
      //'sync:data'
    ]
}