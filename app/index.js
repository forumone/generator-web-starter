'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var globby = require('globby');
var handlebarsEngine = require('yeoman-handlebars-engine');
var _ = require('underscore');

var puppetTemplateFiles = [
  'puppet/manifests/init.pp',
  'puppet/manifests/hieradata/sites/localhost.localdomain.yaml'
];

var WebStarterGenerator = module.exports = function WebStarterGenerator(args, options, config) {
  options.engine = handlebarsEngine;
  
  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    this.installDependencies({ skipInstall: options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(WebStarterGenerator, yeoman.generators.Base);

WebStarterGenerator.prototype.askFor = function askFor() {
  var cb = this.async();
  var defaults = this.config.getAll();
  
  console.log(defaults);
  
  // have Yeoman greet the user.
  console.log(this.yeoman);

  var prompts = [{
    type: 'input',
    name: 'name',
    message: 'Your project name',
    default: _.has(defaults, 'name') ? defaults.name : this.appname
  },
  {
    type: 'list',
    name: 'platform',
    message: 'Project type',
    choices: ['drupal', 'wordpress', 'javascript'],
    default: _.has(defaults, 'platform') ? defaults.platform : 'drupal'
  },
  {
    type: 'confirm',
    name: 'puppet',
    message: 'Do you want to configure Puppet?',
    default: _.has(defaults, 'puppet') ? defaults.puppet : true
  },
  // Puppet questions
  {
    type: 'input',
    name: 'host',
    message: 'Host configuration to use',
    default: _.has(defaults, 'host') ? defaults.host : 'f1dev',
    when: function(answers) {
      return answers.puppet;
    }
  },
  // Drupal CM questions
  {
    type: 'confirm',
    name: 'features',
    message: 'Does it use the Features module?',
    default: _.has(defaults, 'features') ? defaults.features : true,
    when: function(answers) {
      return (answers.platform == 'drupal');
    }
  },
  {
    type: 'confirm',
    name: 'cmi',
    message: 'Does it use the Configuration module?',
    default: _.has(defaults, 'cmi') ? defaults.cmi : false,
    when: function(answers) {
      return (answers.platform == 'drupal');
    }
  },
  // Wordpress CM question
  {
    type: 'confirm',
    name: 'wpcfm',
    message: 'Does it use the WP-CFM plugin?',
    default: _.has(defaults, 'wpcfm') ? defaults.wpcfm : false,
    when: function(answers) {
      return (answers.platform == 'wordpress');
    }
  }];
  
  this.prompt(prompts, function (props) {
    var that = this;
    
    _.extend(this, props);
    
    _.each(props, function(val, key) {
      that.config.set(key, val);
    });
    cb();
  }.bind(this));
};

WebStarterGenerator.prototype.app = function app() {
  var that = this;
  
  this.remote('forumone', 'web-starter', '1.1.x', function(err, remote) {
    remote.directory('.', '.');
    if (that.puppet) {
      _.each(puppetTemplateFiles, function(file) {
        remote.template(file, file, that);
      });
    }
  });
};

WebStarterGenerator.prototype.projectfiles = function projectfiles() {
};
