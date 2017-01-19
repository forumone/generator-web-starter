'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  inquirer = require('inquirer'),
  Promise = require('bluebird'),
  glob = Promise.promisify(require('glob')),
  globby = require('globby'),
  pkg = require('../package.json'),
  ygp = require('yeoman-generator-bluebird');

var plugins = {};
var devDependencies = {};
var sub_generators = [];
var rubyGems = {};

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

function getRubyGems() {
  return rubyGems;
}

function addRubyGem(name, version) {
  rubyGems[name] = version;
}

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
    },
    dependencies : function() {
      addDevDependency(pkg.name, '~' + pkg.version);
    },
    plugins : function() {
      var env = this.env;
      env.lookup(function () {
        // Add local dependencies
        var dependencies = path.join(__dirname, '..', 'node_modules');
        var localGenerators = env.findGeneratorsIn([dependencies]);

        var patterns = [];
        var namespaces = env.namespaces();
        
        // Copied liberally from Yeoman resolver
        env.lookups.forEach(function (lookup) {
          localGenerators.forEach(function (modulePath) {
            patterns.push(path.join(modulePath, lookup));
          });
        });
        
        patterns.forEach(function (pattern) {
          globby.sync('*/index.js', { cwd: pattern }).forEach(function (filename) {
            var generatorReference = path.join(pattern, filename);
            var namespace;
            
            var realPath = fs.realpathSync(generatorReference);
            
            if (realPath !== generatorReference) {
              namespace = env.namespace(generatorReference);
            }
            
            // Ensure we don't add a global module if a local one exists
            if (-1 === _.indexOf(namespaces, namespace)) {
              env.register(realPath, namespace);
            }
          }, env);
        }, env);

        var plugin_vals = _.chain(env.getGeneratorsMeta())
        .map(function(meta, key) {
          var val = '';
          
          var pkg_path = path.dirname(meta.resolved);
          var pkg = JSON.parse(fs.readFileSync(path.join(pkg_path, '..', 'package.json'), 'utf8'));
          
          var namespaces = key.split(':');
          
          if (2 == namespaces.length && 'web-starter' == namespaces[1]) {
            // Make sure we have appropriate keys
            val = _.extend({ 
              category : 'Other', 
              name : key, 
              value : key 
            }, (_.has(pkg, 'webStarter')) ? pkg.webStarter : {});
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
        name : process.env.HOSTNAME,
        plugins : [],
        theme_path : '',
        build_path : '',
        package_file : { devDependencies : { 'generator-web-starter' : pkg.version } },
        ruby_version : '2.3.1',
      }, this.config.getAll());
      
      return this.prompt([{
        type    : 'input',
        name    : 'name',
        message : 'Project name (' + config.name + ')',
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
              addRubyGem : addRubyGem
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
      // Get current system config
      var config = this.answers;
      
      this.fs.copyTpl(
        this.templatePath('_.gitattributes'),
        this.destinationPath('.gitattributes'),
        config
      );
    },
    gitignore : function() {
      // Get current system config
      var config = this.answers;
      
      this.fs.copyTpl(
        this.templatePath('_.gitignore'),
        this.destinationPath('.gitignore'),
        config
      );
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
