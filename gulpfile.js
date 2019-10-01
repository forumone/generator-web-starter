// @ts-check

'use strict';

const path = require('path');
const util = require('util');

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const eslint = require('gulp-eslint');
const typescript = require('gulp-typescript');

const rimraf = util.promisify(require('rimraf'));

const typescriptFileGlob = 'src/**/*.ts';
const templateFileGlob = 'src/**/templates/**/*';

const typescriptSources = [typescriptFileGlob, '!' + templateFileGlob];

const copyFileSources = templateFileGlob;

function clean() {
  return rimraf(path.join(__dirname, 'generators'));
}

function lint() {
  return gulp
    .src(typescriptSources, { since: gulp.lastRun(lint) })
    .pipe(eslint({ formatter: 'codeFrame' }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function copy() {
  return gulp
    .src(copyFileSources, { base: 'src', since: gulp.lastRun(copy) })
    .pipe(gulp.dest('generators'));
}

const project = typescript.createProject('./tsconfig.json');

function compile() {
  return project
    .src()
    .pipe(sourcemaps.init())
    .pipe(project())
    .js.pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('generators'));
}

const build = gulp.series(lint, compile);

function watch() {
  gulp.watch(typescriptSources, build);
  gulp.watch(copyFileSources, copy);
}

const defaultTask = gulp.series(clean, build, copy);

exports.default = defaultTask;
exports.watch = gulp.series(defaultTask, watch);
