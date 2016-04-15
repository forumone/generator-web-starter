'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  inquirer = require('inquirer'),
  globby = require('globby'),
  GruntfileEditor = require('gruntfile-editor'),
  pkg = require('../package.json');

var plugins = {};
var sub_generators = [];

function getPlugins() {
  return plugins;
}

/**
 * Returns the functionality exposed by a plugin
 */
function getPlugin(name) {
  return plugins.hasOwnProperty(name) ? plugins[name] : null; 
}

function addPlugin(name, value) {
  plugins[plugin] = value;
}

module.exports = generators.Base.extend({
  initializing : {
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
      var done = this.async();
      var that = this;
      var config = _.extend({
        plugins : [],
        refspec : '1.1.x',
        theme_path : '',
        package_file : { devDependencies : { 'generator-web-starter' : pkg.version } }
      }, this.config.getAll());
      
      this.prompt([{
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
        type    : 'checkbox',
        name    : 'plugins',
        message : 'Select plugins',
        choices : sub_generators,
        default : config.plugins
      },
      {
        type    : 'input',
        name    : 'refspec',
        message : 'Version',
        default : config.refspec
      }], function (answers) {
        this.config.set(answers);

        this.answers = _.extend(config, answers);
        
        _.each(answers.plugins, function(plugin) {
          that.composeWith(plugin, {
            options : {
              parent : that,
              getPlugins : getPlugins,
              addPlugin : addPlugin,
              getPlugin : getPlugin
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
            cwd : remote.cachePath
          });
          
          var template_map = _.each(templates, function(template) {
            return path.dirname(template) + '/' + path.basename(template).substring(1);
          });
          
          // Get list of all files to transfer
          var files = that.expandFiles('**', {
            cwd : remote.cachePath,
            dot : true
          });

          // Exclude templates and targets from general transfer
          var transfer_files = _.difference(files, _.values(template_map), _.keys(template_map));
          
          // Copy files to the current
          _.each(transfer_files, function(file) {
            that.fs.copyTpl(
              remote.cachePath + '/' + file,
              that.destinationPath(file),
              {},
              { delimiter: '$' }
            );
          });
          
          done();
        }
      }, true);
    },
    
    // Template Gemfile
    gemfile : function() {
      var done = this.async();
      
      // Get current system config
      var config = this.answers;
      
      this.fs.copyTpl(
        this.templatePath('Gemfile'),
        this.destinationPath('Gemfile'),
        config
      );
      
      done();
    },
    // Template package.json file
    package : function() {
      var done = this.async();
      
      // Get current system config
      var config = this.answers;
      
      // Set package.json attributes
      var package_file_string = JSON.stringify(config.package_file, null, 2);
      config.package_file = package_file_string.substring(1, (package_file_string.length - 2));
      
      this.fs.copyTpl(
        this.templatePath('package.json'),
        this.destinationPath('package.json'),
        config
      );
      
      done();
    }
  }
});
