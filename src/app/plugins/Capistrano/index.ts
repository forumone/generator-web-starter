import Generator from 'yeoman-generator';

class Capistrano extends Generator {
  private deployMethod!: string;
  private repository!: string;
  private keepReleases!: number;

  private _copyFile(source: string, target = source) {
    this.fs.copy(this.templatePath(source), this.destinationPath(target));
  }

  async configuring() {
    const answers = await this.prompt([
      {
        type: 'list',
        name: 'capistranoDeployMethod',
        message: 'Method of deploying code',
        choices: ['rsync', 'git'],
        default: 'rsync',
        store: true,
      },
      {
        type: 'input',
        default: 3,
        name: 'capistranoReleases',
        message: 'Number of releases to keep?',
        validate: value => value !== '' && isFinite(value) && Number(value) > 0,
        store: true,
      },
      {
        type: 'input',
        name: 'capistranoRepository',
        message: 'Git repo URL:',
        store: true,
      },
    ]);

    this.deployMethod = answers.capistranoDeployMethod;
    this.repository = answers.capistranoRepository;
    this.keepReleases = Number(answers.capistranoReleases);
  }

  writing() {
    this._copyFile('Capfile');
    this._copyFile('Gemfile');
    this._copyFile('capistrano/rsync.rb');
    this._copyFile('capistrano/rsync');
    this._copyFile('capistrano/tasks');

    const {
      config = {},
      linkedDirectories = [],
      linkedFiles = [],
    } = this.options;

    // Write out the deploy.rb file
    const data = {
      application: this.options.name,
      repo_url: this.repository,
      scm: this.deployMethod,
      keep_releases: this.keepReleases,
      platform: this.options.platform,
      app_webroot: this.options.appWebroot,
      webroot: this.options.webroot,
      linked_dirs: linkedDirectories,
      linked_files: linkedFiles,
      config,
    };

    this.fs.copyTpl(
      this.templatePath('capistrano/deploy.rb.ejs'),
      this.destinationPath('capistrano/deploy.rb'),
      data,
    );
  }

  end() {
    this.log(
      'Remember to run yo web-starter:cap-stage to install a new Capistrano stage.',
    );
  }
}

export = Capistrano;
