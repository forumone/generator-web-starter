import { ManifestAwareGenerator } from '../manifest/manifestAwareGenerator';
import { ComposeHelper } from '../util/docker/composeHelper';
import YAML from 'yaml';
import { ComposerSchema, VcsRepository } from '../types/composer-json';
import spawnComposer from '../app/plugins/platform/Docker/spawnComposer';

const CODE_QUALITY_REPO = 'https://github.com/forumone/code-quality';
const CODE_QUALITY_DEPENDENCY = 'forumone/code-quality';
const CODE_QUALITY_REPO_REFERENCE: VcsRepository = {
  type: 'github',
  url: CODE_QUALITY_REPO,
};

interface CmsContextData {
  platform: string;
  cms: string;
  appDirectory: string;
  documentRoot: string;
}

/**
 * A Yeoman generator to configure code quality support for a project.
 *
 * @todo Ensure Composer dependencies and coding standards are included.
 * @todo Ensure CMS-level `.dockerignore` file contains all necessary configuration.
 * @todo Add Buildkite artifacts directory files.
 * @todo Add Buildkite steps as needed.
 */
class CodeQuality extends ManifestAwareGenerator {
  private cmsData!: CmsContextData;
  private appDirectory!: string;
  private composerFile!: string;
  private composerPath!: string;
  private addComposerRepositoryReference = false;
  private neededComposerDependencies: NonNullable<
    ComposerSchema['require-dev']
  > = {};
  private addComposerDependencies = false;

  /**
   * Execute initializaition for this generator.
   */
  async initializing() {
    this.cmsData = this._getCmsData();
    this.appDirectory = this.cmsData.appDirectory;
    this.composerFile = `${this.appDirectory}/composer.json`;
    this.composerPath = this.destinationPath(this.composerFile);
  }

  /**
   * Execute the configuring phase for this generator.
   */
  async configuring() {
    // Test if the composer dependency is already present in `composer.lock`.
    if (!this._hasComposerDependency(CODE_QUALITY_DEPENDENCY)) {
      this._addComposerDependency(CODE_QUALITY_DEPENDENCY);

      // Test if the composer repository reference needs to be added.
      if (!this._hasComposerRepositoryReference()) {
        this.addComposerRepositoryReference = true;
      }
    }
  }

  /**
   * Execute the writing phase of this generator.
   */
  writing() {
    this._addCodeQualityDockerService()
      ._createRoboYmlFile()
      ._createDockerComposeEnvFile();

    if (this.addComposerRepositoryReference) {
      this._addComposerRepositoryReference();
    }
  }

  /**
   * Execute the install phase of this generator.
   */
  async install() {
    if (this.addComposerDependencies) {
      // Prepare the list of packages for the require command.
      const dependencies: string[] = [];
      for (const [packageName, version] of Object.entries(
        this.neededComposerDependencies,
      )) {
        dependencies.push(`${packageName}:${version}`);
      }

      this.debug('Installing new composer dependencies: %O', dependencies);
      await spawnComposer(['require', '--dev', ...dependencies], {
        cwd: this.destinationPath(this.appDirectory),
      });
    }
  }

  /**
   * Get the CMS data configured in this project.
   */
  _getCmsData() {
    const platform = this.manifestHelper.get('platform');
    let cms: string | undefined = undefined;
    let appDirectory = '';
    const documentRoot: string = this.manifestHelper.get('documentRoot');

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
   * Test if a reference to the code-quality repository exists in composer.json.
   */
  _hasComposerRepositoryReference() {
    const composerPath = `${this.appDirectory}/composer.json`;
    const composerFile = this.destinationPath(this.composerPath);
    const composerConfig = this.fs.readJSON(composerFile) as
      | ComposerSchema
      | null
      | undefined;

    if (composerConfig === null || composerConfig === undefined) {
      throw new Error(
        `Unable to parse the composer file at '${composerPath}'.`,
      );
    }

    // Test if the reference already exists.
    const repositories = composerConfig?.repositories;
    let isReferenced = false;
    if (repositories !== undefined) {
      repositories.forEach(repository => {
        if (repository?.url === CODE_QUALITY_REPO) {
          isReferenced = true;
        }
      });
    }

    if (isReferenced) {
      this.debug(
        'A reference to the code quality repository was found. Nothing to add. %O',
        repositories,
      );
      return true;
    } else {
      this.debug(
        'A reference to the code quality repository was NOT found. %O',
        repositories,
      );
      return false;
    }
  }

  /**
   * Search the `composer.lock` file for references to the dependency.
   *
   * @param dependency The name of the dependency to search for.
   */
  _hasComposerDependency(dependency = CODE_QUALITY_REPO) {
    const lockFile = `${this.appDirectory}/composer.lock`;
    const content = this.fs.read(this.destinationPath(lockFile));

    const matches = content.match(new RegExp(dependency));
    const hasDependency = matches !== null;

    if (hasDependency) {
      this.debug("The '%s' dependency was found in %s.", dependency, lockFile);
    } else {
      this.debug(
        "The '%s' dependency was NOT found in %s.",
        dependency,
        lockFile,
      );
    }
    return matches !== null;
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
      'Adding templated `code-quality` service to `docker-compose.cli.yml`:%s',
      `\n${YAML.stringify(codeQualityService)}`,
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

    this.debug(
      "Configuring `robo.yml` file at '%s' using template data:\n%O.",
      `${this.appDirectory}robo.yml`,
      templateData,
    );
    this.fs.copyTpl(
      this.templatePath('robo.yml.ejs'),
      this.destinationPath(`${this.appDirectory}/robo.yml`),
      templateData,
    );

    return this;
  }

  /**
   * Create a top-level `.env` file to inform configuration of Docker Compose services.
   */
  _createDockerComposeEnvFile() {
    const templateData = {
      appDirectory: this.appDirectory,
    };

    // Create an uncommitted .env file for active use.
    this.debug(
      'Creating Docker Compose `.env` file using template data:\n%O',
      templateData,
    );
    this.renderTemplate(
      this.templatePath('docker/_env.example.ejs'),
      this.destinationPath('.env'),
      templateData,
    );

    // Create an example .env file to be committed to the repository as a seed.
    this.debug(
      'Creating Docker Compose `.env.example` file using template data:\n%O',
      templateData,
    );
    this.renderTemplate(
      this.templatePath('docker/_env.example.ejs'),
      this.destinationPath('.env.example'),
      templateData,
    );

    return this;
  }

  /**
   * Add the code-quality repository reference to composer.json if needed.
   */
  _addComposerRepositoryReference() {
    this.debug(
      'Adding code-quality repository reference to %s.\n%O',
      this.composerFile,
      CODE_QUALITY_REPO_REFERENCE,
    );
    this.fs.extendJSON(this.composerPath, {
      repositories: [CODE_QUALITY_REPO_REFERENCE],
    });

    return this;
  }

  /**
   * Add a Composer dependency to the list of packages to be installed.
   *
   * @param dependency The Composer package to be installed.
   * @param version (Optional) The version requirement for the package.
   *
   * @todo Handle versioning for packages added multiple times.
   */
  _addComposerDependency(dependency: string, version = '*') {
    // Flag that new dependencies need to be installed.
    this.addComposerDependencies = true;

    // Throw an error if a package is queued for installation multiple times.
    if (this.neededComposerDependencies[dependency] !== undefined) {
      this.debug(
        "The package '%s:%s' was already queued for installation. Cannot add '%s:%s'.",
        dependency,
        this.neededComposerDependencies[dependency],
        dependency,
        version,
      );
      throw new Error(
        `The Composer depenency ${dependency}:${version} cannot be added multiple times.`,
      );
    }

    this.neededComposerDependencies[dependency] = version;

    return this;
  }
}

export = CodeQuality;
