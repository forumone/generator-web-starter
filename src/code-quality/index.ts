import { ManifestAwareGenerator } from '../manifest/manifestAwareGenerator';
import { ComposeHelper } from '../util/docker/composeHelper';

/**
 * A Yeoman generator to configure code quality support for a project.
 *
 * @todo Ensure Code Climate configuration is added to `docker-compose.cli.yml`.
 * @todo Ensure Composer dependencies and coding standards are included.
 * @todo Ensure CMS-level `.dockerignore` file contains all necessary configuration.
 * @todo Add Buildkite artifacts directory files.
 */
class CodeQuality extends ManifestAwareGenerator {
  // private answers!: Generator.Answers;

  private cms!: string;

  /**
   * Execute initializaition for this generator.
   */
  async initializing() {
    // this.answers = this.config.get('promptAnswers') || {};
  }

  /**
   * Execute the configuration phase of this generator.
   */
  async prompting() {
    // @todo Add prompting logic.
  }

  /**
   * Prepare configuration for this generator.
   *
   * @todo Check for
   */
  async configuring() {
    // @todo Add configuration logic.
  }

  /**
   * Execute the writing phase of this generator.
   */
  writing() {
    const serviceTemplateHelper = new ComposeHelper(
      this.templatePath('docker/docker-compose.services.yml'),
    );
    const cliComposeHelper = new ComposeHelper(
      this.destinationPath('docker-compose.cli.yml'),
    );

    const codeQualityService = serviceTemplateHelper.service('code-quality');

    this.debug(
      'Adding templated `code-quality` service to `docker-compose.cli.yml`.',
    );
    cliComposeHelper.addService('code-quality', codeQualityService);

    this.fs.write('docker-compose.cli.yml', cliComposeHelper.toString());
  }

  /**
   * Get the CMS in use on this project.
   *
   * @todo Implement this method.
   */
  _getCms(): string | undefined {
    // @todo Load the CMS data from the manifest file.
    this.debug('CMS identification logic incomplete.');

    if (this.manifest.cms === undefined) {
      throw new Error('Unknown CMS.');
    }

    this.cms = this.manifest.cms;
    return this.cms;
  }

  /**
   * Ensure required Buildkite directories exist within the repository.
   */
  _createBuildkiteArtifactsDirectory(): void {
    // Create the Buildkite artifacts directory.
    const artifactsDirectory = this.destinationPath(
      '.buildkite/artifacts/.gitignore',
    );
    this.fs.write(artifactsDirectory, '*');
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
}

export = CodeQuality;
