import Generator from 'yeoman-generator';
import {
  ArtifactDeploymentCollection,
  ArtifactDeploymentDefinition,
  CapistranoDeploymentCollection,
  CapistranoDeploymentDefinition,
  DeploymentCollection,
} from '../manifest/deployment/types';
import { ManifestDefinition } from '../manifest/types';
import YAML from 'yaml';
import { RepositoryDefinition } from '../manifest/resource/Repository/types';

interface BranchMapping {
  readonly source: string;
  readonly target: string;
  readonly remote?: string;
}

interface CapistranoTemplateData {
  readonly branches: Record<string, BranchMapping>;
}

interface ArtifactTemplateData {
  readonly remote?: string;
  readonly branches: Record<string, BranchMapping>;
}

interface PipelineTemplateData {
  readonly serviceDirectory: string;
  readonly deploy: {
    readonly capistrano?: CapistranoTemplateData;
    readonly artifact?: ArtifactTemplateData;
  };
}

class BuildkitePipeline extends Generator {
  private deployments!: DeploymentCollection;
  private manifest!: ManifestDefinition;
  private answers!: Generator.Answers;

  constructor(args: string | string[], options: Generator.GeneratorOptions) {
    super(args, options);
    const manifestPath = this.destinationPath('.f1-manifest.yml');

    // Confirm the manifest file exists or abort.
    if (!this.fs.exists(manifestPath)) {
      throw new Error("Manifest file '.f1-manifest.yml' does not exist.");
    }

    // Read in the manifest file and save the deployment configuration.
    this.manifest = YAML.parse(this.fs.read(manifestPath));
    this.deployments = this.manifest.deployments || {};
    this.answers = {};
  }

  /**
   * Execute initializaition for this generator.
   */
  async initializing() {
    this.answers = this.config.get('promptAnswers') || {};
  }

  /**
   * Execute the configuration phase of this generator.
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

    this.debug(answers);
    this.answers = answers;
  }

  /**
   * Prepare configuration for this generator.
   */
  async configuring() {
    // throw new Error('Method not yet implemented.');
  }

  /**
   * Execute the writing phase of this generator.
   */
  writing() {
    this._createBuildkiteDirectories();
    this._generateBuildkiteDockerComposeFile();
    this._generatePipelineFile();
  }

  /**
   * Ensure required Buildkite directories exist within the repository.
   */
  _createBuildkiteDirectories(): void {
    // Create the Buildkite artifacts directory.
    const artifactsDirectory = this.destinationPath(
      '.buildkite/artifacts/.gitignore',
    );
    this.fs.write(artifactsDirectory, '*');
  }

  /**
   * Generate the templated pipeline.yml file based on configuration options.
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
   */
  _generateBuildkiteDockerComposeFile(): void {
    const templateData = {
      serviceDirectory: this.answers.serviceDirectory,
    };

    this.fs.copyTpl(
      this.templatePath('docker-compose.buildkite.yml.ejs'),
      this.destinationPath('docker-compose.buildkite.yml'),
      templateData,
    );
  }

  /**
   * Get the path to the application's service directory.
   */
  _getServiceDirectory(): string | undefined {
    let servicesPath;

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
   */
  _getTemplateDeploymentData(): PipelineTemplateData {
    const capistranoDeployments: CapistranoDeploymentCollection = {};
    const artifactDeployments: ArtifactDeploymentCollection = {};

    // Organize all deployment data.
    for (const [key, deployment] of Object.entries(this.deployments)) {
      if (deployment.strategy === 'capistrano') {
        capistranoDeployments[
          key
        ] = deployment as CapistranoDeploymentDefinition;
      } else if (deployment.strategy === 'artifact') {
        artifactDeployments[key] = deployment as ArtifactDeploymentDefinition;
      } else {
        throw new Error(
          `Unknown deployment type "${deployment}" for deployment "${key}".`,
        );
      }
    }

    const capistranoDeploymentData = this._prepareCapistranoDeploymentData(
      capistranoDeployments,
    );
    const artifactDeploymentData = this._prepareArtifactDeploymentData(
      artifactDeployments,
    );

    // Organize data into the template data structure.
    const templateData: PipelineTemplateData = {
      serviceDirectory: this.answers.serviceDirectory,
      deploy: {
        capistrano: capistranoDeploymentData,
        artifact: artifactDeploymentData,
      },
    };

    return templateData;
  }

  /**
   * Organize Capistrano deployment data for template usage.
   *
   * @param capistranoDeployments A collection of Capistrano deployments for output.
   * @return Template data for output of Capistrano deployment configuration.
   */
  _prepareCapistranoDeploymentData(
    capistranoDeployments: CapistranoDeploymentCollection,
  ): CapistranoTemplateData | undefined {
    const branches: Record<string, BranchMapping> = {};

    for (const [id, deployment] of Object.entries(capistranoDeployments)) {
      let targetEnvironment: string;
      if (typeof deployment.environment === 'string') {
        targetEnvironment = deployment.environment;
      } else {
        targetEnvironment = deployment.environment.id;
      }

      // Map branches to deployment targets.
      branches[id] = {
        source: deployment.sourceBranch,
        target: targetEnvironment,
      };
    }

    return Object.keys(branches) ? { branches } : undefined;
  }

  /**
   * Organize artifact repository data for template usage.
   *
   * @param artifactDeployments A collection of artifact deployments for output.
   * @return Template data for output of artifact deployment configuration.
   *
   * @todo Streamline output and definition of a singular remote repository.
   */
  _prepareArtifactDeploymentData(
    artifactDeployments: ArtifactDeploymentCollection,
  ): ArtifactTemplateData | undefined {
    const branches: Record<string, BranchMapping> = {};
    const remotes: Record<string, string | RepositoryDefinition> = {};

    for (const [id, deployment] of Object.entries(artifactDeployments)) {
      // @todo Use this to check for only one target repository and cut down output.
      remotes[id] = deployment.targetRepository;

      const targetRepository =
        typeof deployment.targetRepository === 'string'
          ? deployment.targetRepository
          : deployment.targetRepository.url;

      // Map branches to deployment targets.
      branches[id] = {
        source: deployment.sourceBranch,
        target: deployment.targetBranch,
        remote: targetRepository,
      };
    }

    return Object.keys(branches) ? { branches } : undefined;
  }
}

export = BuildkitePipeline;
