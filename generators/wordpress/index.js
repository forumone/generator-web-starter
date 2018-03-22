'use strict';

var generators = require('yeoman-generator');
var _ = require('lodash');
var Promise = require('bluebird');
var rp = require('request-promise');
var semver = require('semver');
var glob = Promise.promisify(require('glob'));
var ygp = require('yeoman-generator-bluebird');

module.exports = generators.Base.extend({
  initializing: {
    async: function () {
      ygp(this);
    },
    platform: function () {
      // Set the platform
      this.options.parent.answers.platform = 'wordpress';
    },
  },
  prompting: function () {
    var that = this;

    var config = _.extend({
      wp_starter: false,
      wp_cfm: false,
      wordpress_theme: 'gesso',
      wp_version: '',
    }, this.config.get('wordpress'));

    // Always default to not installing Wordpress
    config.install_wordpress = false;

    return rp({
      url: 'https://api.github.com/repos/WordPress/WordPress/tags',
      headers: {
        'User-Agent': 'generator-web-starter-wordpress',
      },
    }).then(function (response) {
      var tags = _.chain(JSON.parse(response))
        .orderBy('name', 'desc')
        .map(function (tag) {
          var release = _.clone(tag);
          var name = release.name;

          if (!semver.valid(name)) {
            name += '.0';
          }

          release.release = semver.major(name) + '.' + semver.minor(name);

          return release;
        })
        .groupBy('release')
        .map(function (release) {
          return release.shift();
        })
        .map(function (tag) {
          return tag.name;
        })
        .value();

      // If we have an existing version ensure it's available in the list
      if (!_.isEmpty(config.wp_version) && !_.find(tags, config.wp_version)) {
        tags.push(config.wp_version);
        _.reverse(tags.sort());
      } else if (_.isEmpty(config.wp_version)) {
        config.wp_version = tags[0];
      }

      return Promise.resolve(tags);
    }).then(function (tags) {
      return that.prompt([{
        type: 'list',
        name: 'wp_version',
        choices: tags,
        message: 'Select a version of WordPress',
        default: config.wp_version,
      },
      {
        type: 'confirm',
        name: 'wp_starter',
        message: 'Does it use WP Starter (composer)?',
        default: config.wp_starter,
      },
      {
        type: 'confirm',
        name: 'wp_cfm',
        message: 'Does it use the WP-CFM plugin?',
        default: config.wp_cfm,
      },
      {
        type: 'input',
        name: 'wordpress_theme',
        message: 'Theme name (machine name)',
        default: config.wordpress_theme,
        validate: function (value) {
          return value !== '';
        },
      },
      {
        type: 'confirm',
        name: 'install_wordpress',
        message: 'Install a fresh copy of WordPress?',
        default: false,
        when: function (answers) {
          return !answers.wp_starter;
        },
      }]);
    }).then(function (answers) {
      that.config.set('wordpress', answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-wordpress': answers });
    });
  },
  configuring: {
    addCapistrano: function () {
      var config = this.config.get('wordpress');
      var services = this.options.getServices();
      var docRoot = this.options.hasService('web') ? services.web.doc_root : 'public';

      var linkedDirs = [
        docRoot + '/wp-content/uploads',
        docRoot + '/wp-content/upgrade',
        docRoot + '/wp-content/wflogs',
      ];

      // If we're using Capistrano set some additional values
      if (_.has(this.options.parent.answers, 'web-starter-capistrano')) {
        _.extend(this.options.parent.answers['web-starter-capistrano'].config, {
          wordpress_wpcfm: config.wp_cfm,
          linked_dirs: '%w[' + linkedDirs.join(' ') + ']',
        });
      }
    },
    setThemePath: function () {
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';

      this.options.parent.answers.theme_path = docRoot + '/wp-content/themes/' + this.options.parent.answers['web-starter-wordpress'].wordpress_theme;
      this.options.parent.answers.build_path = docRoot + '/wp-content/themes/' + this.options.parent.answers['web-starter-wordpress'].wordpress_theme;
    },
  },
  writing: {
    /**
     * Installs latest version
     *
     * @return {Promise}
     */
    wordpress: function () {
      var that = this;
      var config = this.config.get('wordpress');
      var promise;

      if (config.install_wordpress && !config.wp_starter) {
        // Create a Promise for remote downloading
        promise = this.remoteAsync('WordPress', 'WordPress', config.wp_version)
        .bind({})
        .then(function (remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd: remote.cachePath });
        })
        .then(function (files) {
          var docRoot = that.options.hasService('web') ? that.options.getService('web').doc_root : 'public';
          var remotePath = this.remotePath;

          _.each(files, function (file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath(docRoot + '/' + file)
            );
          });
        });
      } else {
        promise = Promise.resolve();
      }

      return promise;
    },

    /**
     * Installs WP Starter
     */
    wp_starter: function () {
      var config = this.options.parent.answers['web-starter-wordpress'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();

      if (config.wp_starter) {
        this.fs.copyTpl(
          this.templatePath('composer.json'),
          this.destinationPath('composer.json'),
          config
        );
      }
    },
    post_provision: function () {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-wordpress'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();

      this.fs.copyTpl(
        this.templatePath('config/shell/custom/post-provision.unprivileged.sh'),
        this.destinationPath('config/shell/custom/post-provision.unprivileged.sh'),
        config
      );
    },
    settings: function () {
      var docRoot = this.options.hasService('web') ? this.options.getService('web').doc_root : 'public';

      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-wordpress'];
      _.extend(config, this.options.parent.answers);
      config.services = this.options.getServices();

      var that = this;

      // Get unique hashes from Wordpress
      return rp('https://api.wordpress.org/secret-key/1.1/salt/')
      .then(function (hashes) {
        config.hashes = hashes;

        if (config.wp_starter) {
          that.fs.copyTpl(
            that.templatePath('_.env.vm'),
            that.destinationPath('.env.vm'),
            config
          );

          that.fs.copyTpl(
            that.templatePath('public/wp-config.wpstarter.php'),
            that.destinationPath(docRoot + '/wp-config.vm.php'),
            config
          );
        } else {
          that.fs.copyTpl(
            that.templatePath('public/wp-config.vm.php'),
            that.destinationPath(docRoot + '/wp-config.vm.php'),
            config
          );
        }
      });
    },
  },
});
