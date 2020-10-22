import { ManifestAwareGenerator } from '../manifest/manifestAwareGenerator';
import { ComposeHelper } from '../util/docker/composeHelper';

/**
 * A Yeoman generator to configure code quality support for a project.
 *
 * @todo Ensure Composer dependencies and coding standards are included.
 * @todo Ensure CMS-level `.dockerignore` file contains all necessary configuration.
 * @todo Add Buildkite artifacts directory files.
 * @todo Add Buildkite steps as needed.
 */
class CodeQuality extends ManifestAwareGenerator {
  // private answers!: Generator.Answers;

  private cmsData!: { [name: string]: string | undefined };
  private appDirectory?: string;

  /**
   * Execute initializaition for this generator.
   */
  async initializing() {
    this.cmsData = this._getCmsData();
    this.appDirectory = this.cmsData.appDirectory;
  }

  /**
   * Execute the writing phase of this generator.
   */
  writing() {
    this._addCodeQualityDockerService()._createRoboYmlFile();
  }

  /**
   * Get the CMS data configured in this project.
   */
  _getCmsData() {
    const platform = this.manifestHelper.get('platform');
    let cms: string | undefined = undefined;
    let appDirectory: string | undefined = undefined;
    const documentRoot: string | undefined = this.manifestHelper.get(
      'documentRoot',
    );
    if (platform === 'Docker') {
      cms = this.manifestHelper.get('dockerCms');

      // Translate the generator's CMS value to a default service directory.
      // @todo Add configuration support for a non-standard app directory.
      appDirectory = 'services/';
      switch (cms) {
        case 'Drupal7':
        case 'Drupal8':
          appDirectory += 'drupal';
          break;

        case 'WordPress':
          appDirectory += 'wordpress';
          break;

        default:
          throw new Error(
            `Unsupported CMS configuration defined in \`dockerCms\`: ${cms}`,
          );
      }
    } else {
      throw new Error(`Unsupported platform type: ${platform}`);
    }

    return {
      platform,
      cms,
      appDirectory,
      documentRoot,
    };
  }

  /**
   * Add configuration for the `code-quality` Docker service to `docker-compose.cli.yml`.
   */
  _addCodeQualityDockerService() {
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

    return this;
  }

  /**
   * Create an application-specific `robo.yml` within the application directory.
   */
  _createRoboYmlFile() {
    const templateData = {
      cmsPreset: this.cmsData.cms,
      ...this.cmsData,
    };

    this.debug(`Configuring 'robo.yml' file within ${this.appDirectory}.`);
    this.debug(templateData);
    this.fs.copyTpl(
      this.templatePath('robo.yml.ejs'),
      this.destinationPath(`${this.appDirectory}/robo.yml`),
      templateData,
    );

    return this;
  }
}

export = CodeQuality;
