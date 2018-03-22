'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  inquirer = require('inquirer'),
  Promise = require('bluebird'),
  glob = Promise.promisify(require('glob')),
  globby = require('globby'),
  pkg = require('../../package.json'),
  ygp = require('yeoman-generator-bluebird');

var wsGeneratorRegex = /^web-starter:(.*)/;
var plugins = {};
var devDependencies = {};
var sub_generators = [];
var rubyGems = {};
var services = {};

/** @type {Array.<string>} */
var gitignore = [];

/** @type {Array.<string>} */
var gitattributes = [];

/**
 * @param {string} content
 */
function addToGitignore(content) {
  gitignore.push(content);
}

/**
 * @param {string} content
 */
function addToGitattributes(content) {
  gitattributes.push(content);
}

/**
 * Returns all plugins and functionality
 *
 * @returns []
 */
function getPlugins() {
  return plugins;
}

/**
 * Returns the functionality exposed by a plugin
 *
 * @returns {}
 */
function getPlugin(name) {
  return plugins.hasOwnProperty(name) ? plugins[name] : null;
}

function addService(name, settings) {
  services[name] = settings;
}

function getServices() {
  return services;
}

function getService(name) {
  return (services.hasOwnProperty(name)) ? services[name] : null;
}

function hasService(name) {
  return services.hasOwnProperty(name);
}

/**
 * Adds plugin functionality
 */
function addPlugin(name, value) {
  plugins[name] = value;
}

/**
 * Returns all devDependencies and functionality
 *
 * @returns []
 */
function getDevDependencies() {
  return devDependencies;
}

/**
 * Returns the functionality exposed by a devDependency
 *
 * @returns {}
 */
function getDevDependency(name) {
  return devDependencies.hasOwnProperty(name) ? devDependencies[name] : null;
}

/**
 * Adds devDependency functionality
 */
function addDevDependency(name, value) {
  devDependencies[name] = value;
}

/**
 * Returns Ruby Gems
 *
 * @returns {}
 */
function getRubyGems() {
  return rubyGems;
}

/**
 * Adds a Ruby Gem
 *
 * @param string name
 * @param string version
 */
function addRubyGem(name, version) {
  rubyGems[name] = version;
}

module.exports = generators.Base.extend({
  initializing : {
    gitFiles: function () {
      addToGitignore(this.fs.read(this.templatePath('_.gitignore')));
      addToGitattributes(this.fs.read(this.templatePath('_.gitattributes')));
    },
    async : function() {
      ygp(this);
    },
    dependencies : function() {
      addDevDependency(pkg.name, '~' + pkg.version);
    },
    plugins : function() {
      var env = this.env;
      env.lookup(function () {
        var plugin_vals = _.chain(env.getGeneratorsMeta())
        .map(function(meta, generator) {
          var val = '';

          var packageName = wsGeneratorRegex.exec(generator);

          if (packageName && packageName[1] !== 'app') {
            var pkgPath = path.dirname(meta.resolved);
            var generatorMetadata = {};

            if (fs.existsSync(path.join(pkgPath, 'meta.json'))) {
              generatorMetadata = JSON.parse(fs.readFileSync(path.join(pkgPath, 'meta.json'), 'utf8'));
            }

            // Make sure we have appropriate keys
            val = _.extend({
              category : 'Other',
              name : generator,
              value : generator
            }, generatorMetadata);
          }

          return val;
        })
        .compact()
        .sortBy('label')
        .sortBy('category')
        .value();

        // Convert into correct Inquirer format with separators
        plugin_vals.forEach(function(item, idx) {
          if (0 == idx || (item.category != plugin_vals[idx - 1].category)) {
            sub_generators.push(new inquirer.Separator(item.category));
          }
          sub_generators.push({
            name : item.name,
            value : item.value
          });
        });
      });
    }
  },
  prompting : {
    plugins : function() {
      var that = this;
      var config = _.extend({
        plugins : [],
        theme_path : '',
        build_path : '',
        package_file : { devDependencies : { 'generator-web-starter' : pkg.version } },
        ruby_version : '2.3.1',
      }, this.config.getAll());

      return this.prompt([{
        type    : 'input',
        name    : 'name',
        message : 'Project name (machine name)',
        default : config.name
      },
      {
        type    : 'input',
        name    : 'repository',
        message : 'Repository clone URL',
        default : config.repository
      },
      {
        type    : 'list',
        name    : 'ruby_version',
        message : 'Ruby version',
        default : config.ruby_version,
        choices : [ '2.3.0', '2.2.4', '2.1.8', '2.0.0', '1.9.3' ]
      },
      {
        type    : 'checkbox',
        name    : 'plugins',
        message : 'Select plugins',
        choices : sub_generators,
        default : config.plugins
      }]).then(function(answers) {
        that.config.set(answers);

        that.answers = _.extend(config, answers);

        _.each(answers.plugins, function(plugin) {
          that.composeWith(plugin, {
            options : {
              parent : that,
              getPlugins : getPlugins,
              addPlugin : addPlugin,
              getPlugin : getPlugin,
              getDevDependencies : getDevDependencies,
              addDevDependency : addDevDependency,
              getDevDependency : getDevDependency,
              getRubyGems : getRubyGems,
              addRubyGem : addRubyGem,
              addService: addService,
              getService: getService,
              getServices: getServices,
              hasService: hasService,
              addToGitignore: addToGitignore,
              addToGitattributes: addToGitattributes,
            }
          }, {});
        });
      });
    }
  },
  writing : {
    // Template Gemfile
    gemfile : function() {
      // Get current system config
      var config = this.answers;

      config.gems = _.map(getRubyGems(), function(value, key) {
        return 'gem "' + key + '", "' + value + '"';
      }).join("\n");

      this.fs.copyTpl(
        this.templatePath('Gemfile'),
        this.destinationPath('Gemfile'),
        config
      );
    },
    // Template package.json file
    package : function() {

      // Get current system config
      var config = this.answers;

      // Unfortunately we're unable to simply add them to the package file by using
      // the normal Yeoman method since that invokes `npm install` from the host
      config.dev_dependencies = _.map(getDevDependencies(), function(value, key) {
        return '"' + key + '": "' + value + '"';
      }).join(",\n    ");

      config.name = _.snakeCase(config.name);
      this.fs.copyTpl(
        this.templatePath('package.json'),
        this.destinationPath('package.json'),
        config
      );
    },
    bower : function() {
      // Get current system config
      var config = this.answers;

      config.name = _.snakeCase(config.name);

      this.fs.copyTpl(
        this.templatePath('bower.json'),
        this.destinationPath('bower.json'),
        config
      );
    },
    gitattributes : function() {
      this.fs.write(this.destinationPath('.gitattributes'), gitattributes.join('\n'));
    },
    gitignore : function() {
      this.fs.write(this.destinationPath('.gitignore'), gitignore.join('\n'));
    },
    rubyVersion : function() {
      // Get current system config
      var config = this.answers;

      this.fs.copyTpl(
        this.templatePath('_.ruby-version'),
        this.destinationPath('.ruby-version'),
        config
      );
    }
  }
});
