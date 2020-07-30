import assert from 'assert-plus';
import Generator from 'yeoman-generator';
import { StageDefinition } from '../cap-stage';

interface BranchMapping {
  readonly source: string;
  readonly target: string;
}

interface PipelineDeploymentData {
  readonly method: 'artifact' | 'capistrano';
  readonly branches: Array<BranchMapping>;
}

interface PipelineTemplateData {
  readonly deploy?: PipelineDeploymentData | false;
}

interface GeneratorPromptResponses {
  readonly deploymentMethod?: 'artifact' | 'capistrano';
}

class BuildkitePipeline extends Generator {
  private answers = {} as GeneratorPromptResponses;

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof BuildkitePipeline
   */
  async prompting() {
    const projectName = this.config.get('projectName');
    assert.string(projectName, 'config.projectName');

    const deploymentMethod = await this._promptForDeploymentMethod();
    this.answers = Object.assign(this.answers, deploymentMethod);

    // Prompt for branch mappings if we need to.
    let branchMapping;
    if (this.config.get('deploymentMethod') === 'artifact') {
      branchMapping = await this._promptForArtifactBranchMapping();
    } else {
      // If we're deploying with Capistrano, infer mappings from defined stages.
      this.log(
        'Branch mappings will be identified from generated Capistrano stages.',
      );
      branchMapping = this._getCapistranoBranchMapping();
    }
    this.config.set('deployBranches', branchMapping);
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

    const answers = await this.prompt([
      {
        type: 'list',
        name: 'deploymentMethod',
        message: 'Deployment method',
        choices: deploymentOptions,
        store: true,
      },
    ]);

    return answers;
  }

  /**
   * Prompt the user for branch mappings.
   *
   * @memberof BuildkitePipeline
   */
  async _promptForArtifactBranchMapping(): Promise<Array<BranchMapping>> {
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

    return deployBranches;
  }

  /**
   * Load defined Capistrano stages from configuration.
   *
   * @returns {Record<string, StageDefinition>}
   * @memberof BuildkitePipeline
   */
  _getCapistranoStages(): Record<string, StageDefinition> {
    const configuredStages = this.config.get('stages') as Record<
      string,
      StageDefinition
    >;

    return configuredStages;
  }

  /**
   * Parse branch mappings from configured Capistrano stages.
   *
   * @returns {Array<BranchMapping>}
   * @memberof BuildkitePipeline
   */
  _getCapistranoBranchMapping(): Array<BranchMapping> {
    const branchMapping = [] as Array<BranchMapping>;

    // @todo Handle missing configuration value.
    const configuredStages = this._getCapistranoStages();

    // Extract stage and target branch mapping.
    const stages = Object.entries(configuredStages);
    for (const [stage, { branch }] of stages) {
      branchMapping.push({
        source: branch,
        target: stage,
      });
    }

    return branchMapping;
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
      deploy: this._getTemplateDeploymentData(),
    } as PipelineTemplateData;

    this.fs.copyTpl(
      this.templatePath('pipeline.yml.ejs'),
      this.destinationPath('.buildkite/pipeline.yml'),
      templateData,
    );
  }

  /**
   * Load deployment configuration from configuration.
   *
   * @returns {PipelineDeploymentData|false}
   * @memberof BuildkitePipeline
   */
  _getTemplateDeploymentData(): PipelineDeploymentData | false {
    const method = this.answers.deploymentMethod || false;

    if (method) {
      return {
        method,
        branches: this.config.get('deployBranches'),
      };
    } else {
      return false;
    }
  }
}

export = BuildkitePipeline;
