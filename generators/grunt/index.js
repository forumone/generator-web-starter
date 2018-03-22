'use strict';

var generators = require('yeoman-generator');
var _ = require('lodash');
var GruntfileEditor = require('gruntfile-editor');

/**
 * @type {Object.<string, GruntFileEditor>}
 */
var gruntTasks = {};

/**
 * @type {Object.<string, Object>}
 */
var registeredTasks = {};

/**
 * @type {Object.<string, GruntFileEditor>}
 */
var registeredTasksEditor = {};

/**
 * @type {string[]}
 */
var watchTasks = [];

/**
 * Creates a GruntFileEditor for a given Grunt task
 *
 * @param {string} task
 * @return {GruntFileEditor}
 */
function getGruntTask(task) {
  if (!_.has(gruntTasks, task)) {
    gruntTasks[task] = new GruntfileEditor();
  }

  return gruntTasks[task];
}

/**
 * Registers a task to be run during the watch phase
 *
 * @param {string} task
 * @return {string[]}
 */
function registerWatchTask(task) {
  if (watchTasks.indexOf(task) === -1) {
    watchTasks.push(task);
  }

  return watchTasks;
}

/**
 * Registers a task to be run by Grunt
 *
 * @param {string} name
 * @param {string} task
 * @param {number} priority
 * @return {GruntFileEditor}
 */
function registerTask(name, task, priority) {
  if (!_.has(registeredTasks, name)) {
    registeredTasks[name] = [];
    registeredTasksEditor[name] = new GruntfileEditor();
  }

  // Allow multiple tasks to be added at once
  if (_.isArray(task)) {
    registeredTasks[name] = registeredTasks[name].concat(task);
  } else {
    registeredTasks[name].push({ task: task, priority: priority });
  }
  return registeredTasksEditor[name];
}

module.exports = generators.Base.extend({
  initializing: function () {
    this.options.addPlugin('grunt', {
      getGruntTask: getGruntTask,
      registerTask: registerTask,
      registerWatchTask: registerWatchTask,
    });
  },
  configuring: {
    addDefautTasks: function () {
      this.options.addDevDependency('grunt', '^0.4.5');
      this.options.addDevDependency('include-all', '^0.1.6');
      this.options.addDevDependency('load-grunt-tasks', '^3.2.0');
      this.options.addDevDependency('grunt-concurrent', '^2.3.1');

      var concurrent = getGruntTask('concurrent');
      concurrent.insertConfig('concurrent.watch', JSON.stringify({
        tasks: watchTasks,
        options: {
          logConcurrentOutput: true,
        },
      }));

      concurrent.loadNpmTasks('grunt-concurrent');
    },
  },
  writing: {
    writeGruntFile: function () {
      var done = this.async();

      this.fs.copyTpl(
        this.templatePath('Gruntfile.js'),
        this.destinationPath('Gruntfile.js'),
        {}
      );
      done();
    },
    taskConfig: function () {
      var done = this.async();
      var that = this;

      _.each(gruntTasks, function (editor, task) {
        that.fs.write(that.destinationPath('tasks/config/' + task + '.js'), editor.toString());
      });

      done();
    },
    registeredTasks: function () {
      var done = this.async();
      var that = this;

      _.each(registeredTasks, function (tasks, name) {
        var editor = registeredTasksEditor[name];
        var sorted = _.chain(tasks)
          .sortBy(['priority'])
          .map(function (task) {
            return task.task;
          })
          .value();

        editor.registerTask(name, sorted);
        that.fs.write(that.destinationPath('tasks/register/' + name + '.js'), editor.toString());
      });

      done();
    },
  },
});
