/**
 * Gulpfile
 */

'use strict';

const gulp = require('gulp');
const webpackDevServer = require('./tasks/webpack-dev-server');
const webpack = require('./tasks/webpack');

gulp.task('build', webpack);
gulp.task('default', webpackDevServer);
