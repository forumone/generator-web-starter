'use strict';
var generators = require('yeoman-generator');
var _ = require('lodash');
var git = require('gitty');
var updateNotifier = require('update-notifier');
var path = require('path');
var yosay = require('yosay');

// Configs
var configs = require('./configs');

module.exports = generators.Base.extend({
  engine : require('yeoman-hoganjs-engine'),

  start : function() {
    var package_path = path.join(this.sourceRoot(), '../../package.json');
    var pkg = require(package_path);

    var notifier = updateNotifier({
      packageName : pkg.name,
      packageVersion : pkg.version,
      updateCheckInterval : 1000 * 60 * 60 * 24 // daily
    });

    if (notifier.update && notifier.update.latest != notifier.update.current) {
      console.log(yosay('Update available: ' + notifier.update.latest + ' (current: ' + notifier.update.current + ')'
          + '\n\nRun npm update -g ' + pkg.name));
    }

    var done = this.async();
    done();
  },
  promptTask : function() {
    var repo = git(this.destinationRoot());
    var remotes = {};

    try {
      remotes = repo.getRemotesSync();
    } catch (e) {
      // If we're not in a repo it will cause an exception, we can trap this
      // silently
    }

    var defaults = {
      name : this.appname,
      repository : _.has(remotes, 'origin') ? remotes.origin : ''
    };

    var defaultValues = _.chain(configs).map(function(config) {
      return config.getDefaults();
    })
    .reduce(function(result, n, key) {
      return _.merge(result, n);
    })
    .extend(this.config.getAll())
    .value();

    var prompts = _.chain(configs).map(function(config) {
      return config.getPrompts(defaultValues);
    })
    .flatten()
    .value();
    
    var done = this.async();

    this.prompt(prompts, function(props) {
      _.extend(this, defaultValues, props);

      var that = this;

      _.each(props, function(val, key) {
        that.config.set(key, val);
      });

      // Set variables for platform
      // TODO: Fix duplication of labels
      that.is_drupal = (that.platform == 'drupal');
      that.is_wordpress = (that.platform == 'wordpress');
      that.is_javascript = (that.platform == 'javascript');

      done();
    }.bind(this));
  },
  app : function() {
    var that = this;
    var done = this.async();
    var config = this.config.getAll();

    this.remote('forumone', 'web-starter', that.refspec, function(err, remote) {
      if (err) {
        done.err(err);
      } else {
        // Build a map of template and target files
        var template_map = {};
        var templates = that.expand('**/_*', {
          cwd : remote.src._base
        });
        _.each(templates, function(template) {
          template_map[template] = path.dirname(template) + '/' + path.basename(template).substring(1);
        });

        // Get list of all files to transfer
        var files = that.expandFiles('**', {
          cwd : remote.src._base,
          dot : true
        });

        // Exclude templates and targets from general transfer
        var transfer_files = _.difference(files, _.values(template_map), _.keys(template_map));

        // Remove stages if they are defined in configuration
        if (_.has(config, 'stages')) {
          _.each(config.stages, function(value, key) {
            transfer_files = _.difference(transfer_files, [ 'config/deploy/' + key + '.rb' ]);
          });
        }
        
        // Copy files to the current
        _.each(transfer_files, function(file) {
          remote.copy(file, file);
        });

        // Process template files
        _.each(template_map, function(dest, source) {
          remote.template(source, dest, that);
        });

        done();
      }
    }, true);
  },
  setStages : function() {
    var config = this.config.getAll();
    var done = this.async();
    var that = this;

    this.remote('forumone', 'web-starter', that.refspec, function(err, remote) {
      // Set stage files from configuration 
      var stages = _.has(config, 'stages') ? config.stages : {};
      _.each(stages, function(value, key) {
        value.name = key;
        remote.template('config/deploy/_stage.rb', 'config/deploy/' + key + '.rb', value);
      });

      done();
    });
  },
  end : function() {
    var config = this.config.getAll();
    var done = this.async();
    var npm_packages = _.chain(configs).map(function(config) {
      return config.getNpmPackages(config);
    })
    .flatten()
    .uniq()
    .value();
    
    this.npmInstall(npm_packages, {
      'saveDev' : true
    }, done);
  }
});
