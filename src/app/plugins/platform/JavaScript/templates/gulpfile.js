/**
 * Gulpfile
 */

'use strict';

const gulp = require('gulp');
const webpackDevServer = require('./tasks/webpack-dev-server');
const webpack = require('./tasks/webpack');

exports.build = webpack;
exports.default = webpackDevServer;
