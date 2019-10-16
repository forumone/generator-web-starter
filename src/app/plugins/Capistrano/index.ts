import Generator from 'yeoman-generator';

/**
 * Subgenerator to add Capistrano deployment configuration to a project. This generator
 * expects to be composed with a great many options, listed here:
 *
 * * `name` (string) - the name of the project
 * * `config` (optional object) - key/value pairs of arbitrary config to serialize
 * * `linkedDirectories` (optional string[]) - directory names to link on release
 * * `linkedFiles` (optional string[]) - file names to link on release
 * * `webroot` (string) - the name of the project's web root, as a single path component
 * * `appWebroot` (string) - the full path to the project's web root
 * * `platform` (string) - the name of the platform; used to determine which `.rb` file
 *   to include (see `capistrano/tasks` in the templates directory)
 */
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
    this.log('Remember to run f1 cap:stage to install a new Capistrano stage.');
  }
}

export = Capistrano;
