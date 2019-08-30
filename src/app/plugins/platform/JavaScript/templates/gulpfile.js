/**
 * Gulpfile
 */

'use strict';

const gulp = require('gulp');
const webpackDevServer = require('./tasks/webpack-dev-server');
const webpack = require('./tasks/webpack');

gulp.task('webpack-dev-server', webpackDevServer);
gulp.task('webpack', webpack);
gulp.task('build', gulp.series(webpack));
