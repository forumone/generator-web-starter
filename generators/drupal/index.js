'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  glob = Promise.promisify(require('glob')),
  ygp = require('yeoman-generator-bluebird'),
  drupal_modules = require('drupal-modules');

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
    },
    platform : function() {
      // Set the platform
      this.options.parent.answers.platform = 'drupal';
    }
  },
  prompting : function() {
    var that = this;

    var config = _.extend({
      features : true,
      cmi : false,
      drupal_theme : 'gesso',
      drupal_version : ''
    }, this.config.get('drupal'));

    return drupal_modules.getLatestMinorVersions('drupal').then(function(releases) {
      var tags = [ _.chain(releases)
        .filter({ version_major : 7 })
        .map(function(release) {
          return release.version;
        })
        .head()
        .value() ];

      if (config.drupal_version && tags[0] != config.drupal_version) {
        tags.push(config.drupal_version);
      }

      return Promise.resolve(tags);
    })
    .then(function(tags) {
      return that.prompt([{
        type : 'list',
        name : 'drupal_version',
        choices : tags,
        message : 'Select a version of Drupal',
        default : config.drupal_version,
      },
      {
        type: 'confirm',
        name: 'features',
        message: 'Does it use the Features module?',
        default: config.features,
      },
      {
        type: 'confirm',
        name: 'cmi',
        message: 'Does it use the Configuration module?',
        default: config.cmi,
      },
      {
        type: 'input',
        name: 'drupal_theme',
        message: 'Theme name (machine name)',
        default: config.drupal_theme,
        validate: function (value) {
          return value !== '';
        },
      },
      {
        type: 'confirm',
        name: 'install_drupal',
        message: 'Install a fresh copy of Drupal?',
        default: false,
      }]);
    })
    .then(function(answers) {
      that.config.set('drupal', answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-drupal' : answers });
    });
  },
  configuring : {
    addCapistrano : function() {
      var config = this.config.get('drupal');

      // If we're using Capistrano set some additional values
      if (_.has(this.options.parent.answers, 'web-starter-capistrano')) {
        _.extend(this.options.parent.answers['web-starter-capistrano'].config, {
          drupal_features : config.features,
          drupal_cmi : config.cmi,
          drupal_db_updates : 'true',
          linked_dirs : '%w[public/sites/default/files]'
        });
      }
    },
    addSolr : function() {
      // Set local variable for Solr if the user has selected to use Puppet
      this.options.parent.answers['web-starter-drupal'].solr = (_.has(this.options.parent.answers, 'web-starter-puppet')) ? this.options.parent.answers['web-starter-puppet'].solr : false;
    },
    setThemePath : function() {
      this.options.parent.answers.theme_path = 'public/sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme;
      this.options.parent.answers.build_path = 'public/sites/all/themes/' + this.options.parent.answers['web-starter-drupal'].drupal_theme;
    }
  },
  writing : {
    drupal : function() {
      var that = this;
      var config = this.config.get('drupal');

      if (config.install_drupal) {
        // Create a Promise for remote downloading
        return this.remoteAsync('drupal', 'drupal', config.drupal_version)
        .bind({})
        .then(function(remote) {
          this.remotePath = remote.cachePath;
          return glob('**', {
            cwd : remote.cachePath,
            dot: true,
            nodir: true
          });
        })
        .then(function(files) {
          var remotePath = this.remotePath;
          _.each(files, function(file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath('public/' + file)
            );
          });
        });
      }
    },
    settings : function() {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-drupal'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();

      var that = this;

      var ignoreFiles = [
        '**/aliases.drushrc.php'
      ];

      return glob('**', {
        cwd : this.templatePath(''),
        dot: true,
        nodir : true,
        ignore : ignoreFiles
      }).then(function(files) {
        _.each(files, function(file) {
          that.fs.copyTpl(that.templatePath(file), that.destinationPath(file), config);
        });

        // Don't recreate the alias file if it already exists
        var aliasFile = config.name + '.aliases.drushrc.php';

        if (!that.fs.exists('public/sites/all/drush/' + aliasFile)) {
          return that.fs.copyTpl(
            that.templatePath('public/sites/all/drush/aliases.drushrc.php'),
            that.destinationPath('public/sites/all/drush/' + aliasFile),
            config
          );
        }
      });
    },
  }
});
