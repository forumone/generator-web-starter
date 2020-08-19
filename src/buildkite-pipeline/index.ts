import Generator from 'yeoman-generator';
import { DeploymentCollection } from '../manifest/deployment/types';
import { ManifestDefinition } from '../manifest/types';
import YAML from 'yaml';

interface BranchMapping {
  readonly source: string;
  readonly target: string;
}

interface PipelineTemplateData {
  readonly serviceDirectory: string;
  readonly deploy: {
    capistrano: false | Array<BranchMapping>;
    artifact: false | {};
  };
}

class BuildkitePipeline extends Generator {
  private deployments!: DeploymentCollection;
  private manifest!: ManifestDefinition;
  private answers!: Generator.Answers;

  constructor(args: string | string[], options: Generator.GeneratorOptions) {
    super(args, options);

    // Confirm the manifest file exists or abort.
    if (!this.fs.exists('.f1-manifest.yml')) {
      throw new Error("Manifest file '.f1-manifest.yml' does not exist.");
    }

    // Read in the manifest file and save the deployment configuration.
    this.manifest = YAML.parse(this.fs.read('.f1-manifest.yml'));
    this.deployments = this.manifest.deployments || {};
    this.answers = {};
  }

  /**
   * Execute initializaition for this generator.
   *
   * @memberof BuildkitePipeline
   */
  async initializing() {
    this.answers = this.config.get('promptAnswers') || {};
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof BuildkitePipeline
   */
  async prompting() {
    const answers = await this.prompt([
      {
        name: 'serviceDirectory',
        message: 'What directory is the application in?',
        store: true,
        default: () => {
          const serviceDirectory =
            this.answers.serviceDirectory || this._getServiceDirectory() || '';
          return serviceDirectory;
        },
        askAnswered: false,
      },
    ]);

    this.log(answers);

    this.answers = answers;
  }

  /**
   * Prepare configuration for this generator.
   *
   * @memberof BuildkitePipeline
   */
  async configuring() {
    // throw new Error('Method not yet implemented.');
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof BuildkitePipeline
   */
  writing() {
    this._createBuildkiteDirectories();
    // this._generateBuildkiteDockerComposeFile();
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
    const templateData = this._getTemplateDeploymentData();

    this.debug(templateData);

    this.fs.copyTpl(
      this.templatePath('pipeline.yml.ejs'),
      this.destinationPath('.buildkite/pipeline.yml'),
      templateData,
    );
  }

  /**
   * Generate the required Docker Compose file for Buildkite usage.
   *
   * @memberof BuildkitePipeline
   */
  _generateBuildkiteDockerComposeFile(): void {
    throw new Error('Not yet implemented.');
  }

  /**
   * Get the path to the application's service directory.
   *
   * @returns {string | false}
   * @memberof BuildkitePipeline
   */
  _getServiceDirectory(): string | false {
    let servicesPath: string | false = false;

    // Check for Dockerfiles since the exists method will not check for a directory.
    if (this.fs.exists(this.destinationPath('services/drupal/Dockerfile'))) {
      servicesPath = 'services/drupal';
    } else if (
      this.fs.exists(this.destinationPath('services/wordpress/Dockerfile'))
    ) {
      servicesPath = 'services/wordpress';
    } else {
      this.log('Unable to determine the application service path.');
    }

    return servicesPath;
  }

  /**
   * Load deployment configuration from configuration.
   *
   * @returns {PipelineTemplateData}
   * @memberof BuildkitePipeline
   */
  _getTemplateDeploymentData(): PipelineTemplateData {
    const capistranoDeployments: {
      deployments: DeploymentCollection;
      branches: Array<BranchMapping>;
    } = {
      deployments: {},
      branches: [],
    };
    const artifactDeployments = [];

    // Organize all deployment data.
    for (const [key, deployment] of Object.entries(this.deployments)) {
      if (deployment.strategy === 'capistrano') {
        capistranoDeployments.deployments[key] = deployment;

        let targetEnvironment: string;
        if (typeof deployment.environment === 'string') {
          targetEnvironment = deployment.environment;
        } else {
          targetEnvironment = deployment.environment.id;
        }

        // Map branches to deployment targets.
        capistranoDeployments.branches.push({
          source: deployment.sourceBranch,
          target: targetEnvironment,
        });
      } else if (deployment.strategy === 'artifact') {
        artifactDeployments.push(deployment);
      } else {
        throw new Error(
          `Unknown deployment type ${deployment} for deployment ${key}`,
        );
      }
    }

    // Organize data into the template data structure.
    const deployData: Omit<PipelineTemplateData, 'serviceDirectory'> = {
      deploy: {
        capistrano: capistranoDeployments.branches,
        artifact: false,
      },
    };

    const templateData: PipelineTemplateData = {
      serviceDirectory: this.answers.serviceDirectory,
      ...deployData,
    };

    return templateData;
  }
}

export = BuildkitePipeline;
