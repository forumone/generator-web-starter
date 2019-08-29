/**
 * Gulpfile
 */

'use strict';

const gulp = require('gulp');
const webpackDevServer = require('./tasks/webpack-dev-server');

gulp.task('webpack-dev-server', webpackDevServer);
