'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  yeoman = require('yeoman-environment'),
  path = require('path');

var plugins = [];

module.exports = generators.Base.extend({
  engine : require('yeoman-hoganjs-engine'),
  initializing : {
    plugins : function() {
      var env = yeoman.createEnv();
      env.lookup(function () {
        plugins = _.chain(env.getGeneratorsMeta())
        .map(function(meta, key) {
          var namespaces = key.split(':');
          return (2 == namespaces.length && 'web-starter' == namespaces[1]) ? key : ''; 
        })
        .compact()
        .value();
      });
    }
  },
  prompting : {
    plugins : function() {
      var done = this.async();
      var that = this;
      var config = _.extend({
        plugins : [],
        refspec : '1.1.x',
      }, this.config.getAll());
      
      this.prompt([{
        type    : 'checkbox',
        name    : 'plugins',
        message : 'Select plugins',
        choices : plugins,
        default : config.plugins
      },
      {
        type    : 'input',
        name    : 'refspec',
        message : 'Version',
        default : config.refspec
      }], function (answers) {
        this.config.set(answers);

        this.answers = answers;
        
        _.each(answers.plugins, function(plugin) {
          that.composeWith(plugin, {
            options : {
              parent : that
            }
          }, {});
        });
        
        done();
      }.bind(this));
    }
  },
  writing : {
    repo : function() {
      var that = this;
      var done = this.async();
      var config = this.config.getAll();
      
      this.remote('forumone', 'web-starter', config.refspec, function(err, remote) {
        if (err) {
          done.err(err);
        } else {
          // Build a map of template and target files
          var templates = that.expand('**/_*', {
            cwd : remote.src._base
          });
          
          var template_map = _.each(templates, function(template) {
            return path.dirname(template) + '/' + path.basename(template).substring(1);
          });

          // Get list of all files to transfer
          var files = that.expandFiles('**', {
            cwd : remote.src._base,
            dot : true
          });

          // Exclude templates and targets from general transfer
          var transfer_files = _.difference(files, _.values(template_map), _.keys(template_map));

          // Copy files to the current
          _.each(transfer_files, function(file) {
            remote.copy(file, file);
          });
          
          done();
        }
      }, true);
    }
  }
});
