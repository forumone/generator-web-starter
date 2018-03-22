'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  ygp = require('yeoman-generator-bluebird');

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
      this.options.addRubyGem('capistrano', '3.4');
      this.options.addRubyGem('json', '~>1.8');
    },
  },
  prompting : function() {
    var that = this;

    var config = _.extend({
      deploy_via : 'rsync',
      keep_releases : 3
    }, this.config.get('capistrano'));

    return this.prompt([{
      type: 'list',
      name: 'deploy_via',
      message: 'Method of deploying code',
      choices: ['rsync', 'git'],
      default: config.deploy_via
    },
    {
      type: 'input',
      name: 'keep_releases',
      message: 'Number of releases to keep',
      default: config.keep_releases
    }])
    .then(function(answers) {
      that.config.set('capistrano', answers);

      answers.config = {};
      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-capistrano' : answers });
    });
  },
  writing : {
    deploy : function() {
      // copy main capistrano scaffolding
      this.fs.copy(
        this.templatePath('capistrano'),
        this.destinationPath('capistrano')
      );

      this.fs.copy(
        this.templatePath('lib'),
        this.destinationPath('lib')
      );

      // Get current system config for this sub-generator
      var config = Object.assign({
        platform: 'html'
      }, this.options.parent.answers['web-starter-capistrano'], this.options.parent.answers);
      config.services = this.options.getServices();

      config.config = _.map(config.config, function(val, idx) {
        return {
          key : idx,
          value : val.toString()
        }
      });

      this.fs.copyTpl(
        this.templatePath('config/capistrano/deploy.rb'),
        this.destinationPath('config/capistrano/deploy.rb'),
        config
      );
    },
    capfile : function() {
      // Get current system config for this sub-generator
      var config = this.options.parent.answers['web-starter-capistrano'];
      _.extend(config, this.options.parent.answers);

      config.config = _.map(config.config, function(val, idx) {
        return {
          key : idx,
          value : val.toString()
        }
      });

      this.fs.copyTpl(
        this.templatePath('Capfile'),
        this.destinationPath('Capfile'),
        config
      );
    }
  }
});
