import assert from 'assert-plus';
import Generator from 'yeoman-generator';

interface BranchMapping {
  readonly source: string;
  readonly target: string;
}

class BuildkitePipeline extends Generator {
  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof BuildkitePipeline
   */
  async prompting() {
    const projectName = this.config.get('projectName');
    assert.string(projectName, 'config.projectName');

    await this._promptForDeploymentMethod();
    await this._promptForBranchMapping();
  }

  /**
   *Prompt for the deployment method that should be used for this project.
   *
   * @memberof BuildkitePipeline
   */
  async _promptForDeploymentMethod() {
    const deploymentOptions = [
      {
        name: 'Capistrano',
        value: 'capistrano',
      },
      {
        name: 'Artifact repository',
        value: 'artifact',
      },
    ];

    await this.prompt([
      {
        type: 'list',
        name: 'deploymentMethod',
        message: 'Deployment method',
        choices: deploymentOptions,
        store: true,
      },
    ]);
  }

  /**
   * Prompt the user for branch mappings.
   *
   * @memberof BuildkitePipeline
   */
  async _promptForBranchMapping() {
    const deployBranches: Array<BranchMapping> =
      this.config.get('deployBranches') || [];

    assert.object(deployBranches, 'config.deployBranches');

    while (true) {
      const { branch } = await this.prompt([
        {
          type: 'input',
          name: 'branch',
          message: 'Name of branch (blank to finish):',
          // validate: value => value === '' || value.match(/^\S+$/),
        },
      ]);

      if (!branch) {
        break;
      }

      const { remoteTarget } = await this.prompt([
        {
          type: 'input',
          name: 'remoteTarget',
          message: 'Remote branch or Capistrano target:',
          validate: value => value !== '',
        },
      ]);

      deployBranches.push({
        source: branch,
        target: remoteTarget,
      });
    }

    this.config.set('deployBranches', deployBranches);
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof BuildkitePipeline
   */
  writing() {
    this._createBuildkiteDirectories();
    this._generatePipelineFile();
  }

  /**
   * Ensure required Buildkite directories exist within the repository.
   *
   * @memberof BuildkitePipeline
   */
  _createBuildkiteDirectories(): void {
    const destinationPath = this.destinationRoot();

    // Create the Buildkite artifacts directory.
    const artifactsDirectory = `${destinationPath}/.buildkite/artifacts/.gitignore`;
    this.fs.write(artifactsDirectory, '*');
  }

  /**
   * Generate the templated pipeline.yml file based on configuration options.
   *
   * @memberof BuildkitePipeline
   */
  _generatePipelineFile(): void {
    const branches = this.config.get('deployBranches');
    if (!branches) {
      return;
    }

    const templateData = {
      capistrano: true,
      deployBranches: branches,
    };

    this.fs.copyTpl(
      this.templatePath('pipeline.yml.ejs'),
      this.destinationPath('.buildkite/pipeline.yml'),
      templateData,
    );
  }
}

export = BuildkitePipeline;
