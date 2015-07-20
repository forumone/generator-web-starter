'use strict';
var generators = require('yeoman-generator');
var _ = require('lodash');

module.exports = generators.NamedBase.extend({
  engine : require('yeoman-hoganjs-engine'),
  promptTask : function() {
    var done = this.async();
    var config = this.config.getAll();
    var name = this.name;
    var that = this;
    
    this.setDelimiter('{{', '}}');
    
    // Make sure we have the stage
    config.stages = config.stages || {};
    var stage = _.has(config.stages, name) ? config.stages[name] : {};
    
    var prompts = [{
      type: 'input',
      name: 'site_url',
      message: 'Site URL(s)',
      default: _.has(stage, 'site_url') ? stage.site_url : ''
    },
    {
      type: 'input',
      name: 'site_folder',
      message: 'Site folder(s)',
      default: _.has(stage, 'site_folder') ? stage.site_folder : ''
    },
    {
      type: 'input',
      name: 'webroot',
      message: 'Web root',
      default: _.has(stage, 'webroot') ? stage.webroot : ''
    },
    {
      type: 'input',
      name: 'deploy_to',
      message: 'Deployment path',
      default: _.has(stage, 'deploy_to') ? stage.deploy_to : ''
    },
    {
      type: 'input',
      name: 'branch',
      message: 'Branch',
      default: _.has(stage, 'branch') ? stage.branch : ''
    },
    {
      type: 'input',
      name: 'role_app',
      message: 'Application role(s)',
      default: _.has(stage, 'role_app') ? stage.role_app : ''
    },
    {
      type: 'input',
      name: 'role_web',
      message: 'Web server role(s)',
      default: _.has(stage, 'role_web') ? stage.role_web : ''
    },
    {
      type: 'input',
      name: 'role_db',
      message: 'Database role(s)',
      default: _.has(stage, 'role_db') ? stage.role_db : ''
    }];
    
    
    this.prompt(prompts, function(props) {
      config.stages[name] = props;
      that.config.set('stages', config.stages);
      done();
    }.bind(this));
  },
  app : function() {
    var that = this;
    var done = this.async();
    var config = this.config.getAll();

    var stage = config.stages[this.name];
    stage.name = this.name;
    
    this.remote('forumone', 'web-starter', config.refspec, function(err, remote) {
      if (err) {
        done.err(err);
      } else {
        remote.template('config/deploy/_stage.rb', 'config/deploy/' + that.name + '.rb', stage);
        done();
      }
    }, true);
  }
});
