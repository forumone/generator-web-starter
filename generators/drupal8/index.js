'use strict';

var generators = require('yeoman-generator');
var _ = require('lodash');
var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var ygp = require('yeoman-generator-bluebird');
var drupalModules = require('drupal-modules');

module.exports = generators.Base.extend({
  initializing: {
    async: function () {
      ygp(this);
    },
    platform: function () {
      // Set the platform
      this.options.parent.answers.platform = 'drupal8';
    },
  },
  prompting: function () {
    var that = this;

    var config = _.extend({
      features: true,
      drupal_theme: 'gesso',
      drupal_version: '',
    }, this.config.get('drupal8'));

    return drupalModules.getLatestMinorVersions('drupal').then(function (releases) {
      var tags = _.chain(releases)
        .filter({ version_major: 8 })
        .map(function (release) {
          return release.version;
        })
        .value();

      if (config.drupal_version && String(tags[0]) !== String(config.drupal_version)) {
        tags.push(config.drupal_version);
      }

      return Promise.resolve(tags);
    })
    .then(function (tags) {
      return that.prompt([{
        type: 'list',
        name: 'drupal_version',
        choices: tags,
        message: 'Select a version of Drupal',
        default: config.drupal_version,
      },
      {
        type: 'confirm',
        name: 'features',
        message: 'Does it use the Features module?',
        default: config.features,
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
    .then(function (answers) {
      that.config.set('drupal8', answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-drupal8': answers });
    });
  },
  configuring: {
    addCapistrano: function () {
      var config = this.config.get('drupal8');
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';

      // If we're using Capistrano set some additional values
      if (_.has(this.options.parent.answers, 'web-starter-capistrano')) {
        _.extend(this.options.parent.answers['web-starter-capistrano'].config, {
          drupal_features: config.features,
          drupal_db_updates: 'true',
          linked_dirs: '%w[' + docRoot + '/sites/default/files]',
        });
      }
    },
    setThemePath: function () {
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';

      this.options.parent.answers.theme_path = docRoot + '/themes/' + this.options.parent.answers['web-starter-drupal8'].drupal_theme;
      this.options.parent.answers.build_path = docRoot + '/themes/' + this.options.parent.answers['web-starter-drupal8'].drupal_theme;
    },
  },
  writing: {
    drupal: function () {
      var that = this;
      var config = this.config.get('drupal8');
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';

      if (config.install_drupal) {
        // Create a Promise for remote downloading
        return this.remoteAsync('drupal', 'drupal', config.drupal_version)
        .bind({})
        .then(function (remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd: remote.cachePath });
        })
        .then(function (files) {
          var remotePath = this.remotePath;
          _.each(files, function (file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath(docRoot + '/' + file)
            );
          });
        });
      }

      return Promise.resolve();
    },
    settings: function () {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-drupal8'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';
      var that = this;

      var ignoreFiles = [
        '**/aliases.drushrc.php',
      ];

      return glob('**', {
        cwd: this.templatePath('public'),
        dot: true,
        nodir: true,
        ignore: ignoreFiles,
      }).then(function (files) {
        _.each(files, function (file) {
          that.fs.copyTpl(that.templatePath('public/' + file), that.destinationPath(docRoot + '/' + file), config);
        });

        // Don't recreate the alias file if it already exists
        var aliasFile = config.name + '.aliases.drushrc.php';

        if (!that.fs.exists(docRoot + '/sites/all/drush/' + aliasFile)) {
          that.fs.copyTpl(
            that.templatePath('public/sites/all/drush/aliases.drushrc.php'),
            that.destinationPath(docRoot + '/sites/all/drush/' + aliasFile),
            config
          );
        }
      });
    },
    post_provision: function () {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-drupal8'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();

      this.fs.copyTpl(
        this.templatePath('config/shell/custom/post-provision.unprivileged.sh'),
        this.destinationPath('config/shell/custom/post-provision.unprivileged.sh'),
        config
      );
    },
  },
});
